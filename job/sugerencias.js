#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Project Gina — Sugerencias de Google Drive / Sheets → issues de GitHub (paso del robot semanal).
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const BRANDS_PATH = path.join(ROOT, "extension", "data", "brands.json");
const PROY_PATH = path.join(ROOT, "datagen", "proyecto.json");

const comun = require("./sugerencias_comun.js");
const { sanitize, buildIssueBody, isDuplicateBrand } = comun;

const MAX_DEFAULT = 25;

async function fetchSuggestions(url, token, fetchImpl = fetch) {
  const reqUrl = `${url}?token=${encodeURIComponent(token)}`;
  const res = await fetchImpl(reqUrl, { method: "GET", headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  if (!data || data.ok !== true) throw new Error((data && data.e) || "error_desconocido");
  return data.filas || [];
}

async function ackSuggestions(url, token, ids, fetchImpl = fetch) {
  if (!ids || !ids.length) return { ok: true, procesados: 0 };
  const reqUrl = `${url}?token=${encodeURIComponent(token)}&op=ack&ids=${encodeURIComponent(ids.join(","))}`;
  const res = await fetchImpl(reqUrl, { method: "GET", headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  return data;
}

async function processSuggestions({ url, token, brandsDb, openIssues, issues, repo, dryRun, execFile = execFileSync, max, fetchImpl = fetch }) {
  const limit = Number(max || process.env.GINA_SUGERENCIAS_MAX || MAX_DEFAULT);
  const known = (issues || openIssues || []).slice();
  const results = { read: 0, created: 0, duplicates: 0, invalid: 0, skipped: 0, acked: 0, issues: [] };

  const filas = await fetchSuggestions(url, token, fetchImpl);
  results.read = filas.length;

  const toAck = [];

  for (const fila of filas) {
    if (results.created >= limit) {
      results.skipped++;
      continue;
    }

    const parsed = sanitize({
      tipo: fila.tipo,
      marca: fila.marca,
      tienda: fila.tienda,
      producto: fila.producto,
      pais: fila.pais,
      fecha: fila.fecha ? fila.fecha.slice(0, 10) : ""
    });

    if (!parsed) {
      results.invalid++;
      if (fila.id) toAck.push(fila.id);
      continue;
    }

    if (isDuplicateBrand(parsed.marca, brandsDb, known)) {
      results.duplicates++;
      if (fila.id) toAck.push(fila.id);
      continue;
    }

    const title = `${parsed.tipo === "alternativa" ? "Alternativa local" : "Marca faltante"}: ${parsed.marca}`;
    const footer = "(Sugerencia recibida de la comunidad y procesada automáticamente. Datos personales omitidos por privacidad.)";
    const body = buildIssueBody(parsed, footer);

    const labels = ["sugerencia"];
    const veces = Number(fila.veces || 1);
    if (veces >= 3) {
      labels.push("pedida-por-varios");
    }

    if (!dryRun) {
      const args = ["issue", "create", "--repo", repo, "--title", title, "--body", body];
      for (const l of labels) {
        args.push("--label", l);
      }
      execFile("gh", args);
    }

    results.created++;
    results.issues.push({ title, brand: parsed.marca, veces, labels });
    known.push({ title, body });
    if (fila.id) toAck.push(fila.id);
  }

  if (toAck.length > 0) {
    if (!dryRun) {
      try {
        const ackRes = await ackSuggestions(url, token, toAck, fetchImpl);
        results.acked = (ackRes && ackRes.procesados) || toAck.length;
      } catch (err) {
        console.warn("No se pudo confirmar el ack en Apps Script:", err.message);
      }
    } else {
      results.acked = toAck.length;
    }
  }

  return results;
}

async function main() {
  const token = process.env.GINA_SUGERENCIAS_TOKEN;
  if (!token) {
    console.log("Token GINA_SUGERENCIAS_TOKEN no configurado; omitiendo paso");
    return { ok: true, skipped: true, reason: "GINA_SUGERENCIAS_TOKEN no configurado" };
  }

  let url = process.env.GINA_SUGERENCIAS_URL;
  if (!url) {
    try {
      const proy = JSON.parse(fs.readFileSync(PROY_PATH, "utf8"));
      url = proy.sugerencias_url;
    } catch (_) {}
  }

  if (!url) {
    console.log("URL de sugerencias no configurada en proyecto.json ni GINA_SUGERENCIAS_URL; omitiendo paso");
    return { ok: true, skipped: true, reason: "URL no configurada" };
  }

  const repo = process.env.GITHUB_REPOSITORY || "ginaproyecto02-lgtm/project-gina";
  let brandsDb = { marcas: [], grupos: {} };
  try { brandsDb = JSON.parse(fs.readFileSync(BRANDS_PATH, "utf8")); } catch (e) { console.error("No se pudo cargar brands.json:", e.message); }

  let issues = [];
  try {
    issues = JSON.parse(execFileSync("gh", ["issue", "list", "--repo", repo, "--state", "all", "--label", "sugerencia",
      "--json", "number,title,body,state", "--limit", "1000"], { encoding: "utf8" }));
  } catch (e) { console.warn("No se pudieron listar los issues de sugerencias:", e.message); }

  try {
    const summary = await processSuggestions({ url, token, brandsDb, issues, repo });
    console.log(`Sugerencias Drive: ${summary.read} · issues creados: ${summary.created} · duplicados: ${summary.duplicates} · inválidos: ${summary.invalid} · para la próxima: ${summary.skipped}`);
    return { ok: true, summary };
  } catch (err) {
    console.error("::warning::Error en lectura de sugerencias:", err.message);
    return { ok: false, error: err.message };
  }
}

if (require.main === module) {
  main().then((r) => process.exit(r && r.ok === false ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = {
  fetchSuggestions,
  ackSuggestions,
  processSuggestions,
  main
};
