#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Project Gina — Sugerencias por correo → issues de GitHub (paso del robot semanal).
//
// Reglas (auditoría 2026-10-16):
//  · Solo toca correos cuyo ASUNTO lleva «[gina:sugerencia]». El resto del buzón ni se lee ni se mueve.
//  · Usa UID (los números de secuencia cambian cuando el servidor mueve o borra mensajes).
//  · Lee con BODY.PEEK[] (no marca como leído) y nunca borra: al terminar, mueve a la etiqueta «gina/procesado».
//  · Decodifica MIME real (multipart, quoted-printable, base64, charset, asuntos RFC 2047).
//  · El issue no lleva remitente ni cabeceras; la marca debe parecer una marca (sin HTML, URL, menciones ni markdown).
//  · Máximo GINA_CORREO_MAX issues por ejecución (25 por defecto); lo demás queda sin leer para la próxima.
//  · Duplicados: contra la base (con alias, como la extensión) y contra issues abiertos Y cerrados.
"use strict";

const fs = require("fs");
const path = require("path");
const tls = require("tls");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const BRANDS_PATH = path.join(ROOT, "extension", "data", "brands.json");
require(path.join(ROOT, "extension", "src", "matcher.js"));
const QED = globalThis.QED;

const SUBJECT_TAG = /\[gina:sugerencia\]/i;
const PROCESSED_BOX = "gina/procesado";
const MAX_DEFAULT = 25;

// ---------------------------------------------------------------- MIME
function decodeQP(str) {
  const bytes = [];
  const s = String(str).replace(/=\r?\n/g, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "=" && /^[0-9A-Fa-f]{2}$/.test(s.substr(i + 1, 2))) { bytes.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
    else bytes.push(s.charCodeAt(i) & 0xff);
  }
  return Buffer.from(bytes);
}

function decodeBytes(buf, charset) {
  const cs = String(charset || "utf-8").toLowerCase().replace(/^"|"$/g, "");
  try { return new TextDecoder(cs === "us-ascii" ? "utf-8" : cs).decode(buf); } catch (_) { return buf.toString("utf8"); }
}

// RFC 2047: =?UTF-8?B?...?= y =?UTF-8?Q?...?=
function decodeWords(s) {
  return String(s || "").replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=(\s+(?==\?))?/g, (_, cs, enc, txt) => {
    const buf = /b/i.test(enc) ? Buffer.from(txt, "base64") : decodeQP(txt.replace(/_/g, " "));
    return decodeBytes(buf, cs);
  });
}

function parseHeaders(text) {
  const out = {};
  const unfolded = String(text).replace(/\r?\n[ \t]+/g, " ");
  for (const line of unfolded.split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return out;
}

const param = (h, name) => { const m = String(h || "").match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|[^;\\s]+)`, "i")); return m ? (m[2] != null ? m[2] : m[1]) : ""; };

// Devuelve { headers, subject, text } con el primer text/plain (o text/html sin etiquetas) decodificado.
function parseMime(raw) {
  const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw || ""), "utf8");
  const str = buf.toString("latin1");
  const sep = str.search(/\r?\n\r?\n/);
  const headText = sep >= 0 ? str.slice(0, sep) : str;
  const bodyStart = sep >= 0 ? sep + (str.slice(sep).startsWith("\r\n\r\n") ? 4 : 2) : str.length;
  const headers = parseHeaders(headText);
  const subject = decodeWords(headers.subject || "");
  const text = partText(headers, buf.slice(bodyStart), 0);
  return { headers, subject, text };
}

function partText(headers, body, depth) {
  const ctype = String(headers["content-type"] || "text/plain").toLowerCase();
  if (depth > 5) return "";
  if (ctype.startsWith("multipart/")) {
    const boundary = param(headers["content-type"], "boundary");
    if (!boundary) return "";
    const parts = body.toString("latin1").split(new RegExp(`\\r?\\n?--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:--)?\\s*\\r?\\n`));
    let html = "";
    for (const p of parts) {
      const sep = p.search(/\r?\n\r?\n/);
      if (sep < 0) continue;
      const h = parseHeaders(p.slice(0, sep));
      const b = Buffer.from(p.slice(sep).replace(/^\r?\n\r?\n/, ""), "latin1");
      const ct = String(h["content-type"] || "text/plain").toLowerCase();
      if (ct.startsWith("text/plain") || ct.startsWith("multipart/")) { const t = partText(h, b, depth + 1); if (t.trim()) return t; }
      else if (ct.startsWith("text/html") && !html) html = partText(h, b, depth + 1);
    }
    return html;
  }
  const cte = String(headers["content-transfer-encoding"] || "7bit").toLowerCase();
  let bytes = body;
  if (cte === "base64") bytes = Buffer.from(body.toString("latin1").replace(/\s+/g, ""), "base64");
  else if (cte === "quoted-printable") bytes = decodeQP(body.toString("latin1"));
  let text = decodeBytes(bytes, param(headers["content-type"], "charset") || "utf-8");
  if (ctype.startsWith("text/html")) {
    text = text.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li)>/gi, "\n").replace(/<!--(?!\s*gina:)[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  }
  return text;
}

// ---------------------------------------------------------------- Sugerencia
// Acepta el texto ya decodificado (o un correo crudo, por compatibilidad: se decodifica primero).
function parseEmailBody(rawOrText) {
  if (!rawOrText) return null;
  let text = String(rawOrText);
  if (/^[\w-]+:\s/m.test(text.split(/\r?\n\r?\n/)[0]) && /\r?\n\r?\n/.test(text)) text = parseMime(text).text || text;

  const m = text.match(/<!--\s*gina:sugerencia\s+v1(?:\s+tipo=(\w+))?\s*-->([\s\S]*)/i);
  const tipo0 = m && m[1] === "alternativa" ? "alternativa" : "marca";
  const content = (m ? m[2] : text).split(/\n\s*\n\(/)[0];
  const field = (re) => { const x = content.match(re); return x ? x[1].trim() : ""; };
  const marca = field(/(?:^|\n|\|)\s*[-*•]?\s*marca\s*:\s*([^\n\r|]+)/i);
  const alt = field(/(?:^|\n|\|)\s*[-*•]?\s*alternativa\s*:\s*([^\n\r|]+)/i);
  const brand = marca || alt;
  if (!brand) return null;
  return {
    tipo: alt && !marca ? "alternativa" : tipo0,
    marca: brand,
    tienda: field(/(?:^|\n|\|)\s*[-*•]?\s*tienda\s*:\s*([^\n\r|]+)/i),
    producto: field(/(?:^|\n|\|)\s*[-*•]?\s*producto\s*:\s*([^\n\r|]+)/i),
    fecha: field(/(?:^|\n|\|)\s*[-*•]?\s*fecha\s*:\s*([^\n\r|]+)/i),
    categoria: field(/(?:^|\n|\|)\s*[-*•]?\s*categor[ií]a\s*:\s*([^\n\r|]+)/i),
    pais: field(/(?:^|\n|\|)\s*[-*•]?\s*pa[ií]s\s*:\s*([^\n\r|]+)/i),
    dueno: field(/(?:^|\n|\|)\s*[-*•]?\s*due[ñn]o\s*:\s*([^\n\r|]+)/i),
    fuente: field(/(?:^|\n|\|)\s*[-*•]?\s*fuente\s*:\s*([^\n\r|]+)/i)
  };
}

const comun = require("./sugerencias_comun.js");
const { plausibleBrand, safeText, safeUrl, safeDate, sanitize, buildIssueBody, isDuplicateBrand } = comun;


// ---------------------------------------------------------------- IMAP mínimo (literales por bytes, comandos con UID)
function quoteImap(s) {
  const v = String(s == null ? "" : s);
  if (/[\r\n\0]/.test(v)) throw new Error("Credencial IMAP con caracteres no permitidos");
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

class SimpleImapClient {
  constructor({ host, port, user, pass, timeoutMs, socketFactory }) {
    this.socketFactory = socketFactory || null; // solo pruebas: socket sin TLS hacia un servidor simulado
    this.host = host || "imap.gmail.com";
    this.port = Number(port) || 993;
    this.user = user; this.pass = pass;
    this.timeoutMs = timeoutMs || 30000;
    this.seq = 0; this.buf = Buffer.alloc(0); this.cur = { text: "", literals: [] };
    this.pending = null; this.greeted = false; this.caps = "";
  }
  connect() {
    return new Promise((resolve, reject) => {
      this.socket = this.socketFactory ? this.socketFactory() : tls.connect({ host: this.host, port: this.port, servername: this.host, rejectUnauthorized: true });
      this.socket.setTimeout(this.timeoutMs, () => this.socket.destroy(new Error("IMAP: tiempo de espera agotado")));
      this.socket.on("data", (chunk) => { this.buf = Buffer.concat([this.buf, chunk]); this._pump(); });
      this.socket.on("error", (e) => { if (this.pending) this.pending.reject(e); else reject(e); });
      this._onGreeting = resolve;
    });
  }
  _pump() {
    for (;;) {
      const idx = this.buf.indexOf("\r\n");
      if (idx < 0) return;
      const line = this.buf.slice(0, idx).toString("latin1");
      const lit = line.match(/\{(\d+)\}$/);
      if (lit) {
        const n = Number(lit[1]);
        if (this.buf.length < idx + 2 + n) return; // esperar el literal completo
        this.cur.text += line;
        this.cur.literals.push(this.buf.slice(idx + 2, idx + 2 + n));
        this.buf = this.buf.slice(idx + 2 + n);
        continue;
      }
      this.cur.text += line;
      this.buf = this.buf.slice(idx + 2);
      const resp = this.cur; this.cur = { text: "", literals: [] };
      this._dispatch(resp);
    }
  }
  _dispatch(resp) {
    if (!this.greeted) { this.greeted = true; if (this._onGreeting) this._onGreeting(resp); return; }
    const p = this.pending;
    if (!p) return;
    if (resp.text.startsWith(p.tag + " ")) {
      this.pending = null;
      p.resolve({ ok: new RegExp(`^${p.tag} OK`, "i").test(resp.text), status: resp.text, untagged: p.untagged });
    } else p.untagged.push(resp);
  }
  command(cmd) {
    if (this.pending) return Promise.reject(new Error("IMAP: comando en curso"));
    const tag = "G" + (++this.seq);
    return new Promise((resolve, reject) => {
      this.pending = { tag, resolve, reject, untagged: [] };
      this.socket.write(`${tag} ${cmd}\r\n`);
    });
  }
  async login() {
    const r = await this.command(`LOGIN ${quoteImap(this.user)} ${quoteImap(this.pass)}`);
    const c = await this.command("CAPABILITY");
    this.caps = c.untagged.map((u) => u.text).join(" ").toUpperCase();
    return r;
  }
  select(box = "INBOX") { return this.command(`SELECT ${quoteImap(box)}`); }
  async searchGina() {
    // Con MOVE, lo procesado sale del INBOX: se buscan TODOS los correos de Gina (aunque el dueño ya los haya abierto en Gmail).
    // Sin MOVE (solo se copian y marcan como leídos) se buscan los no leídos para no repetir.
    const r = await this.command(`UID SEARCH ${/\bMOVE\b/.test(this.caps) ? "" : "UNSEEN "}SUBJECT ${quoteImap("gina:sugerencia")}`);
    const line = r.untagged.map((u) => u.text).find((t) => /^\* SEARCH/i.test(t)) || "";
    return line.replace(/^\* SEARCH/i, "").trim().split(/\s+/).filter(Boolean).map(Number).filter((n) => n > 0);
  }
  async fetchRaw(uid) {
    const r = await this.command(`UID FETCH ${Number(uid)} (BODY.PEEK[])`);
    const withLit = r.untagged.find((u) => u.literals.length);
    return withLit ? withLit.literals[0] : Buffer.alloc(0);
  }
  async markProcessed(uid) {
    await this.command(`CREATE ${quoteImap(PROCESSED_BOX)}`); // falla sin problema si ya existe
    if (/\bMOVE\b/.test(this.caps)) return this.command(`UID MOVE ${Number(uid)} ${quoteImap(PROCESSED_BOX)}`);
    await this.command(`UID COPY ${Number(uid)} ${quoteImap(PROCESSED_BOX)}`);
    return this.command(`UID STORE ${Number(uid)} +FLAGS.SILENT (\\Seen)`);
  }
  async logout() {
    try { if (!this.pending) await this.command("LOGOUT"); } catch (_) {}
    try { this.socket.end(); } catch (_) {}
  }
}

// ---------------------------------------------------------------- Proceso
async function processEmails({ imap, brandsDb, openIssues, issues, repo, dryRun, execFile = execFileSync, max }) {
  const limit = Number(max || process.env.GINA_CORREO_MAX || MAX_DEFAULT);
  const known = (issues || openIssues || []).slice();
  const results = { read: 0, created: 0, duplicates: 0, invalid: 0, skipped: 0, issues: [] };
  const uids = imap.searchGina ? await imap.searchGina() : [];
  results.read = uids.length;
  const done = imap.markProcessed || imap.moveToProcessed;

  for (const uid of uids) {
    if (results.created >= limit) { results.skipped++; continue; } // queda sin leer para la próxima ejecución
    const raw = imap.fetchRaw ? await imap.fetchRaw(uid) : await imap.fetchBody(uid);
    const mail = parseMime(raw);
    if (!SUBJECT_TAG.test(mail.subject)) { results.skipped++; continue; } // la búsqueda del servidor es aproximada: no se toca
    const parsed = sanitize(parseEmailBody(mail.text));
    if (!parsed) { results.invalid++; if (done) await done.call(imap, uid); continue; }
    if (isDuplicateBrand(parsed.marca, brandsDb, known)) { results.duplicates++; if (done) await done.call(imap, uid); continue; }

    const title = `${parsed.tipo === "alternativa" ? "Alternativa local" : "Marca faltante"}: ${parsed.marca}`;
    const body = buildIssueBody(parsed);
    if (!dryRun) execFile("gh", ["issue", "create", "--repo", repo, "--title", title, "--body", body, "--label", "sugerencia"]);
    results.created++;
    results.issues.push({ title, brand: parsed.marca });
    known.push({ title, body });
    if (done) await done.call(imap, uid);
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
  const repo = process.env.GITHUB_REPOSITORY || "ginaproyecto02-lgtm/project-gina";
  let brandsDb = { marcas: [], grupos: {} };
  try { brandsDb = JSON.parse(fs.readFileSync(BRANDS_PATH, "utf8")); } catch (e) { console.error("No se pudo cargar brands.json:", e.message); }

  let issues = [];
  try {
    issues = JSON.parse(execFileSync("gh", ["issue", "list", "--repo", repo, "--state", "all", "--label", "sugerencia",
      "--json", "number,title,body,state", "--limit", "1000"], { encoding: "utf8" }));
  } catch (e) { console.warn("No se pudieron listar los issues de sugerencias:", e.message); }

  const imap = new SimpleImapClient({ host: process.env.GINA_IMAP_HOST, port: process.env.GINA_IMAP_PORT, user, pass });
  try {
    await imap.connect();
    const login = await imap.login();
    if (!login.ok) { console.error("::warning::IMAP rechazó las credenciales"); await imap.logout(); return { ok: false, error: "Auth failed" }; }
    await imap.select("INBOX");
    const summary = await processEmails({ imap, brandsDb, issues, repo });
    console.log(`Correos de Gina: ${summary.read} · issues creados: ${summary.created} · duplicados: ${summary.duplicates} · inválidos: ${summary.invalid} · para la próxima: ${summary.skipped}`);
    await imap.logout();
    return { ok: true, summary };
  } catch (err) {
    console.error("::warning::Error en lectura IMAP:", err.message);
    await imap.logout();
    return { ok: false, error: err.message };
  }
}

if (require.main === module) {
  main().then((r) => process.exit(r && r.ok === false ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { parseMime, decodeWords, parseEmailBody, sanitize, plausibleBrand, buildIssueBody, isDuplicateBrand, quoteImap, SimpleImapClient, processEmails, main };
