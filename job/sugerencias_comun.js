// SPDX-License-Identifier: MIT
// Project Gina — Funciones comunes para procesamiento de sugerencias (correo o Google Drive / Apps Script).
"use strict";

const path = require("path");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "extension", "src", "matcher.js"));
const QED = globalThis.QED;

// Una marca plausible: letras (con acentos), números, espacios y & ' . , + - / ( ) — sin HTML, URL, menciones ni markdown.
const BRAND_OK = /^[\p{L}\p{N}][\p{L}\p{N}\p{M} &'’.,+\-/()]{0,79}$/u;
const DANGER = /<|>|`|\]\(|!\[|:\/\/|javascript:|data:|@\w|\{\{|\$\{/i;
function plausibleBrand(s) { const v = String(s || "").trim(); return BRAND_OK.test(v) && !DANGER.test(v); }

// Texto libre (tienda, producto, categoría…): sin control, HTML, markdown de enlace/imagen, menciones ni referencias #123.
function safeText(s, n) {
  return String(s || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/<!--|-->|[<>`|]/g, " ")
    .replace(/!\[|\]\(|\[|\]/g, " ")
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S*/gi, " ")
    .replace(/javascript:|data:/gi, " ")
    .replace(/@(?=\w)/g, "")
    .replace(/#(?=\d)/g, "")
    .replace(/\s+/g, " ").trim().slice(0, n);
}
const safeUrl = (u) => (/^https:\/\/[^\s<>"'`|]{4,200}$/.test(String(u || "").trim()) ? String(u).trim() : "");
const safeDate = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(String(d || "").trim()) ? String(d).trim() : "");

function sanitize(parsed) {
  if (!parsed || !plausibleBrand(parsed.marca)) return null;
  return {
    tipo: parsed.tipo === "alternativa" ? "alternativa" : "marca",
    marca: parsed.marca.trim(),
    tienda: safeText(parsed.tienda, 60),
    producto: safeText(parsed.producto, 140),
    fecha: safeDate(parsed.fecha),
    categoria: safeText(parsed.categoria, 40),
    pais: safeText(parsed.pais, 40),
    dueno: safeText(parsed.dueno, 120),
    fuente: safeUrl(parsed.fuente)
  };
}

// Formato que entiende el robot (job/investigar.js → parseIssueContent): UNA línea por sugerencia, campos separados por «|».
function buildIssueBody(parsed, footer) {
  const alt = parsed.tipo === "alternativa";
  const fields = alt
    ? [["alternativa", parsed.marca], ["categoría", parsed.categoria], ["país", parsed.pais], ["dueño", parsed.dueno], ["fuente", parsed.fuente]]
    : [["marca", parsed.marca], ["tienda", parsed.tienda || "No indicada"], ["producto", parsed.producto || "No indicado"]];
  if (parsed.fecha) fields.push(["fecha", parsed.fecha]);
  const line = "- " + fields.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" | ");
  const foot = footer || "(Sugerencia recibida por correo y procesada automáticamente. Datos personales del remitente omitidos por privacidad.)";
  return [`<!-- gina:sugerencia v1 tipo=${alt ? "alternativa" : "marca"} -->`, line, "", foot].join("\n");
}

let indexCache = null, indexDb = null;
function isDuplicateBrand(brand, brandsDb, issues) {
  if (!brand) return true;
  const clean = QED.cleanBrandField ? QED.cleanBrandField(brand) : QED.norm(brand);
  const key = QED.norm(clean || brand);
  if (!key) return true;
  if (brandsDb && QED.buildIndex && QED.isKnownBrand) {
    if (indexDb !== brandsDb) { try { indexCache = QED.buildIndex(brandsDb, [], {}, {}); indexDb = brandsDb; } catch (_) { indexCache = null; } }
    if (indexCache && QED.isKnownBrand(indexCache, brand)) return true;
  }
  for (const m of (brandsDb && brandsDb.marcas) || []) if (QED.norm(m.n) === key) return true;
  for (const g of Object.values((brandsDb && brandsDb.grupos) || {})) if (g && g.empresa && QED.norm(g.empresa) === key) return true;
  for (const iss of issues || []) {   // abiertos y cerrados
    const t = String(iss.title || "").match(/(?:Marca faltante|Alternativa local):\s*(.+)/i);
    const b = String(iss.body || "").match(/[-*•]?\s*(?:marca|alternativa)\s*:\s*([^\n\r|]+)/i);
    for (const x of [t && t[1], b && b[1]]) {
      if (!x) continue;
      const k = QED.norm(QED.cleanBrandField ? QED.cleanBrandField(x) : x);
      if (k && k === key) return true;
    }
  }
  return false;
}

module.exports = {
  BRAND_OK,
  DANGER,
  plausibleBrand,
  safeText,
  safeUrl,
  safeDate,
  sanitize,
  buildIssueBody,
  isDuplicateBrand
};
