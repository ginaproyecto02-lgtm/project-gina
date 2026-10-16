#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Project Gina — Procesamiento semanal de sugerencias por correo vía IMAP.
// Lee correos entrantes, sanitiza completamente remitentes (cero datos personales),
// verifica duplicados contra brands.json e issues abiertos de GitHub,
// y crea issues con la etiqueta «sugerencia».
"use strict";

const fs = require("fs");
const path = require("path");
const tls = require("tls");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const BRANDS_PATH = path.join(ROOT, "extension", "data", "brands.json");
require(path.join(ROOT, "extension", "src", "matcher.js"));
const QED = globalThis.QED;

function parseEmailBody(rawEmail) {
  if (!rawEmail) return null;
  const rawStr = String(rawEmail);

  // Extraer el bloque estructurado <!-- gina:sugerencia ... -->
  const m = rawStr.match(/<!--\s*gina:sugerencia\s+v1(?:\s+tipo=(\w+))?\s*-->([\s\S]*?)(?:-->|$|\n\n\(Enviado|\(Sugerencia)/i);
  let tipo = "marca";
  let content = "";
  if (m) {
    tipo = m[1] || "marca";
    content = m[2];
  } else {
    // Si el cliente de correo quitó los comentarios HTML, buscar las líneas estructuradas
    content = rawStr;
  }

  const marcaM = content.match(/(?:^|\n)\s*[-*•]?\s*marca\s*:\s*([^\n\r|]+)/i);
  const altM = content.match(/(?:^|\n)\s*[-*•]?\s*alternativa\s*:\s*([^\n\r|]+)/i);
  const tiendaM = content.match(/(?:^|\n)\s*[-*•]?\s*tienda\s*:\s*([^\n\r|]+)/i);
  const prodM = content.match(/(?:^|\n)\s*[-*•]?\s*producto\s*:\s*([^\n\r|]+)/i);
  const fechaM = content.match(/(?:^|\n)\s*[-*•]?\s*fecha\s*:\s*([^\n\r|]+)/i);
  const catM = content.match(/(?:^|\n)\s*[-*•]?\s*categor[ií]a\s*:\s*([^\n\r|]+)/i);
  const paisM = content.match(/(?:^|\n)\s*[-*•]?\s*pa[ií]s\s*:\s*([^\n\r|]+)/i);
  const duenoM = content.match(/(?:^|\n)\s*[-*•]?\s*dueño\s*:\s*([^\n\r|]+)/i);
  const fuenteM = content.match(/(?:^|\n)\s*[-*•]?\s*fuente\s*:\s*([^\n\r|]+)/i);

  const brand = (marcaM ? marcaM[1] : (altM ? altM[1] : "")).trim();
  if (!brand) return null;

  return {
    tipo: altM ? "alternativa" : tipo,
    marca: brand,
    tienda: tiendaM ? tiendaM[1].trim() : "",
    producto: prodM ? prodM[1].trim() : "",
    fecha: fechaM ? fechaM[1].trim() : "",
    categoria: catM ? catM[1].trim() : "",
    pais: paisM ? paisM[1].trim() : "",
    dueno: duenoM ? duenoM[1].trim() : "",
    fuente: fuenteM ? fuenteM[1].trim() : ""
  };
}

function buildIssueBody(parsed) {
  const lines = [
    `<!-- gina:sugerencia v1 tipo=${parsed.tipo || "marca"} -->`,
    `- marca: ${parsed.marca}`
  ];
  if (parsed.tipo === "alternativa") {
    if (parsed.categoria) lines.push(`- categoría: ${parsed.categoria}`);
    if (parsed.pais) lines.push(`- país: ${parsed.pais}`);
    if (parsed.dueno) lines.push(`- dueño: ${parsed.dueno}`);
    if (parsed.fuente) lines.push(`- fuente: ${parsed.fuente}`);
  } else {
    lines.push(`- tienda: ${parsed.tienda || "No indicada"}`);
    lines.push(`- producto: ${parsed.producto || "No indicado"}`);
  }
  if (parsed.fecha) lines.push(`- fecha: ${parsed.fecha}`);
  lines.push("");
  lines.push("(Sugerencia recibida por correo y procesada automáticamente. Datos personales del remitente omitidos por privacidad.)");
  return lines.join("\n");
}

function isDuplicateBrand(brand, brandsDb, openIssues) {
  if (!brand) return true;
  const normBrand = QED.cleanBrandField ? QED.cleanBrandField(brand) : QED.norm(brand);
  if (!normBrand) return true;

  // 1. Marcas en brands.json (exactas y alias)
  for (const m of (brandsDb && brandsDb.marcas) || []) {
    const km = QED.norm(m.n);
    if (km === normBrand) return true;
  }
  // 2. Grupos en brands.json
  for (const g of Object.values((brandsDb && brandsDb.grupos) || {})) {
    if (g && g.empresa && QED.norm(g.empresa) === normBrand) return true;
  }
  // 3. Issues abiertos con etiqueta sugerencia
  for (const iss of openIssues || []) {
    const titleMatch = (iss.title || "").match(/(?:Marca faltante|Alternativa local):\s*(.+)/i);
    if (titleMatch) {
      const ki = QED.cleanBrandField ? QED.cleanBrandField(titleMatch[1]) : QED.norm(titleMatch[1]);
      if (ki === normBrand) return true;
    }
    const bodyMatch = (iss.body || "").match(/[-*•]?\s*(?:marca|alternativa)\s*:\s*([^\n\r|]+)/i);
    if (bodyMatch) {
      const kb = QED.cleanBrandField ? QED.cleanBrandField(bodyMatch[1]) : QED.norm(bodyMatch[1]);
      if (kb === normBrand) return true;
    }
  }
  return false;
}

class SimpleImapClient {
  constructor({ host, port, user, pass }) {
    this.host = host || "imap.gmail.com";
    this.port = Number(port) || 993;
    this.user = user;
    this.pass = pass;
    this.tagSeq = 0;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = tls.connect({ host: this.host, port: this.port, rejectUnauthorized: true }, () => {
        resolve();
      });
      this.socket.setEncoding("utf8");
      this.buffer = "";
      this.socket.on("data", (chunk) => {
        this.buffer += chunk;
        if (this._onData) this._onData();
      });
      this.socket.on("error", (err) => {
        if (this._onError) this._onError(err);
        else reject(err);
      });
    });
  }

  async sendCommand(cmd) {
    const tag = "A" + (++this.tagSeq);
    const line = `${tag} ${cmd}\r\n`;
    return new Promise((resolve, reject) => {
      this._onError = reject;
      this._onData = () => {
        const idx = this.buffer.indexOf(`${tag} `);
        if (idx !== -1) {
          const endIdx = this.buffer.indexOf("\r\n", idx);
          if (endIdx !== -1) {
            const statusLine = this.buffer.slice(idx, endIdx);
            const fullOutput = this.buffer.slice(0, endIdx);
            this.buffer = this.buffer.slice(endIdx + 2);
            this._onData = null;
            this._onError = null;
            if (statusLine.includes(`${tag} OK`)) {
              resolve({ ok: true, output: fullOutput, statusLine });
            } else {
              resolve({ ok: false, output: fullOutput, statusLine });
            }
          }
        }
      };
      this.socket.write(line);
      this._onData();
    });
  }

  async login() {
    await new Promise((resolve) => {
      if (this.buffer.includes("* OK")) return resolve();
      this._onData = () => {
        if (this.buffer.includes("* OK")) {
          this._onData = null;
          resolve();
        }
      };
    });
    return this.sendCommand(`LOGIN "${this.user}" "${this.pass}"`);
  }

  async select(folder = "INBOX") {
    return this.sendCommand(`SELECT "${folder}"`);
  }

  async searchUnseen() {
    const res = await this.sendCommand("SEARCH UNSEEN");
    if (!res.ok) return [];
    const m = res.output.match(/\*\s+SEARCH\s+([0-9\s]+)/i);
    if (!m) return [];
    return m[1].trim().split(/\s+/).filter(Boolean).map(Number);
  }

  async fetchBody(seqId) {
    const res = await this.sendCommand(`FETCH ${seqId} (BODY[TEXT])`);
    return res.output;
  }

  async moveToProcessed(seqId) {
    await this.sendCommand('CREATE "gina/procesado"');
    await this.sendCommand(`COPY ${seqId} "gina/procesado"`);
    await this.sendCommand(`STORE ${seqId} +FLAGS (\\Seen \\Deleted)`);
    await this.sendCommand("EXPUNGE");
  }

  async logout() {
    try {
      await this.sendCommand("LOGOUT");
    } catch (_) {}
    try {
      this.socket.end();
    } catch (_) {}
  }
}

async function processEmails({ imap, brandsDb, openIssues, repo, dryRun, execFile = execFileSync }) {
  const results = { read: 0, created: 0, duplicates: 0, invalid: 0, issues: [] };
  const unseenIds = await imap.searchUnseen();
  results.read = (unseenIds || []).length;

  for (const seqId of (unseenIds || [])) {
    const raw = await imap.fetchBody(seqId);
    const parsed = parseEmailBody(raw);
    if (!parsed || !parsed.marca) {
      results.invalid++;
      if (imap.moveToProcessed) await imap.moveToProcessed(seqId);
      continue;
    }

    if (isDuplicateBrand(parsed.marca, brandsDb, openIssues)) {
      results.duplicates++;
      if (imap.moveToProcessed) await imap.moveToProcessed(seqId);
      continue;
    }

    const title = parsed.tipo === "alternativa"
      ? `Alternativa local: ${parsed.marca}`
      : `Marca faltante: ${parsed.marca}`;
    const body = buildIssueBody(parsed);

    if (!dryRun) {
      execFile("gh", [
        "issue", "create",
        "--repo", repo,
        "--title", title,
        "--body", body,
        "--label", "sugerencia"
      ]);
    }
    results.created++;
    results.issues.push({ title, brand: parsed.marca });
    openIssues.push({ title, body });
    if (imap.moveToProcessed) await imap.moveToProcessed(seqId);
  }

  return results;
}

async function main() {
  const user = process.env.GINA_IMAP_USER;
  const pass = process.env.GINA_IMAP_PASS;
  if (!user || !pass) {
    console.log("Credenciales IMAP no configuradas; omitiendo lectura de correos");
    return { ok: true, skipped: true, reason: "Credenciales IMAP no configuradas" };
  }

  const host = process.env.GINA_IMAP_HOST || "imap.gmail.com";
  const port = process.env.GINA_IMAP_PORT || 993;
  const repo = process.env.GITHUB_REPOSITORY || "ginaproyecto02-lgtm/project-gina";

  let brandsDb = { marcas: [], grupos: {} };
  try {
    brandsDb = JSON.parse(fs.readFileSync(BRANDS_PATH, "utf8"));
  } catch (e) {
    console.error("No se pudo cargar brands.json:", e.message);
  }

  let openIssues = [];
  try {
    const raw = execFileSync("gh", [
      "issue", "list",
      "--repo", repo,
      "--state", "open",
      "--label", "sugerencia",
      "--json", "number,title,body",
      "--limit", "200"
    ], { encoding: "utf8" });
    openIssues = JSON.parse(raw);
  } catch (e) {
    console.warn("No se pudieron listar issues abiertos de GitHub:", e.message);
  }

  const imap = new SimpleImapClient({ host, port, user, pass });
  try {
    await imap.connect();
    const loginRes = await imap.login();
    if (!loginRes.ok) {
      console.error("Fallo al autenticar en IMAP:", loginRes.statusLine);
      return { ok: false, error: "Auth failed" };
    }
    await imap.select("INBOX");
    const summary = await processEmails({ imap, brandsDb, openIssues, repo });
    console.log(`Correos leídos: ${summary.read}, Creados: ${summary.created}, Duplicados: ${summary.duplicates}, Inválidos: ${summary.invalid}`);
    await imap.logout();
    return { ok: true, summary };
  } catch (err) {
    console.error("Error en lectura IMAP:", err.message);
    try { await imap.logout(); } catch (_) {}
    return { ok: false, error: err.message };
  }
}

if (require.main === module) {
  main().then((r) => {
    if (r && r.ok === false) process.exit(1);
    process.exit(0);
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = {
  parseEmailBody,
  buildIssueBody,
  isDuplicateBrand,
  SimpleImapClient,
  processEmails,
  main
};
