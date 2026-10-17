#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Project Gina — Detección y verificación de sitios oficiales y buscadores de marcas (E3).
// Consulta la propiedad P856 de Wikidata y detecta el motor de búsqueda mediante OpenSearch XML o Schema.org SearchAction.
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BRANDS_PATH = path.join(ROOT, "extension", "data", "brands.json");
const STATE_PATH = path.join(__dirname, "estado.json");
const UA = "project-gina-bot/1.0 (https://github.com/ginaproyecto02-lgtm/project-gina)";

// ---------------------------------------------------------------- Seguridad (auditoría 2026-10-16)
// Solo https públicos: sin IP literales, sin nombres internos, sin credenciales ni puertos raros (evita SSRF desde CI).
const PRIVATE_HOST = /(^|\.)(localhost|local|internal|intranet|lan|corp|home|home\.arpa|localdomain)$/i;
function isPublicHttps(u) {
  let x;
  try { x = new URL(String(u)); } catch (_) { return false; }
  if (x.protocol !== "https:" || x.username || x.password) return false;
  if (x.port && x.port !== "443") return false;
  const h = x.hostname.toLowerCase();
  if (!h.includes(".") || PRIVATE_HOST.test(h)) return false;
  if (/^\d+(\.\d+){3}$/.test(h) || h.includes(":") || h.startsWith("[")) return false;   // IPv4/IPv6 literales
  if (/^0x|^\d+$/.test(h)) return false;                                                  // 0x7f000001, 2130706433
  return true;
}
const PRIVATE_IP = /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|::1$|f[cd][0-9a-f]{2}:|fe80:|::ffff:(10|127|169\.254|192\.168)\.)/i;
async function dnsIsPublic(host) {
  try {
    const addrs = await require("dns").promises.lookup(host, { all: true });
    return addrs.length > 0 && addrs.every((a) => !PRIVATE_IP.test(a.address));
  } catch (_) { return false; }
}
// Dominio registrable aproximado (eTLD+1) para exigir que el buscador sea del mismo sitio.
const SECOND_LEVEL = /^(co|com|net|org|gob|gov|ac|edu)\.(uk|mx|br|jp|au|nz|ar|co|in|za|sg|kr|tr|cn|il|cl|pe|ec|uy|ve|tw|hk|my|id|ph)$/;
function regDomain(host) {
  const parts = String(host || "").toLowerCase().replace(/\.$/, "").split(".");
  const last2 = parts.slice(-2).join(".");
  return SECOND_LEVEL.test(last2) ? parts.slice(-3).join(".") : last2;
}
function sameSite(a, b) {
  try { return regDomain(new URL(a).hostname) === regDomain(new URL(b).hostname); } catch (_) { return false; }
}
// Plantilla aceptable: https pública, mismo sitio que la portada, exactamente un {q}, largo razonable.
function validTemplate(template, siteUrl) {
  if (typeof template !== "string" || template.length > 300) return false;
  if ((template.match(/\{q\}/g) || []).length !== 1) return false;
  const probe = template.replace("{q}", "x");
  return isPublicHttps(probe) && sameSite(probe, siteUrl);
}
// fetch con límite de tiempo, sin seguir redirecciones a ciegas (cada salto se valida) y con identificación.
async function safeFetch(url, opts = {}, fetchImpl = fetch, resolveImpl = null) {
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    if (!isPublicHttps(current)) return null;
    if (resolveImpl && !(await resolveImpl(new URL(current).hostname))) return null;
    const res = await fetchImpl(current, Object.assign({ redirect: "manual", signal: AbortSignal.timeout(10000) }, opts, {
      headers: Object.assign({ "User-Agent": UA }, opts.headers || {})
    }));
    if (!res) return null;
    const loc = res.headers && typeof res.headers.get === "function" ? res.headers.get("location") : null;
    if (res.status >= 300 && res.status < 400 && loc) { current = new URL(loc, current).href; continue; }
    const len = res.headers && typeof res.headers.get === "function" ? Number(res.headers.get("content-length") || 0) : 0;
    if (len > 3 * 1024 * 1024) return null;
    return res;
  }
  return null;
}
// La página de Wikipedia debe ser de la MARCA, no del dueño (el sitio de P&G no es la tienda de Olay).
const normName = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/\(.*?\)/g, " ").replace(/[^a-z0-9]+/g, " ")
  .replace(/\b(inc|incorporated|company|co|corp|corporation|group|holdings?|ag|sa|s a|llc|ltd|limited|plc|gmbh|spa|nv|bv|oyj|ab|international|brands?)\b/g, " ")
  .replace(/\s+/g, " ").trim();

// new URL() codifica «{ }» en la ruta (%7B…%7D): se protegen los marcadores antes de resolver la URL.
function resolveTemplate(template, base) {
  const keep = [];
  const masked = String(template).replace(/\{[^{}]{1,40}\}/g, (m) => { keep.push(m); return `GINAPH${keep.length - 1}X`; });
  let out = new URL(masked, base).href;
  keep.forEach((m, i) => { out = out.replace(`GINAPH${i}X`, m); });
  return out;
}
function titleIsBrand(title, brand) { const a = normName(title), b = normName(brand); return !!a && !!b && a === b; }

/**
 * Extrae la plantilla de búsqueda desde un enlace OpenSearch en el HTML y su archivo XML correspondiente.
 * @param {string} html 
 * @param {string} baseUrl 
 * @param {Function} fetchImpl 
 * @returns {Promise<string|null>}
 */
async function extractOpenSearch(html, baseUrl, fetchImpl = fetch, resolveImpl = null) {
  if (!html || typeof html !== "string") return null;

  // Busca etiqueta <link> que tenga rel="search" y type="application/opensearchdescription+xml"
  const linkRegex = /<link\b[^>]*>/gi;
  let match;
  let xmlHref = null;

  while ((match = linkRegex.exec(html)) !== null) {
    const tag = match[0];
    const hasRelSearch = /\brel=["'][^"']*\bsearch\b[^"']*["']/i.test(tag);
    const hasOpenSearchType = /\btype=["']application\/opensearchdescription\+xml["']/i.test(tag);

    if (hasRelSearch && hasOpenSearchType) {
      const hrefMatch = /\bhref=["']([^"']+)["']/i.exec(tag);
      if (hrefMatch) {
        xmlHref = hrefMatch[1];
        break;
      }
    }
  }

  if (!xmlHref) return null;

  try {
    const xmlUrl = new URL(xmlHref, baseUrl).href;
    const res = await safeFetch(xmlUrl, { headers: { "Accept": "application/opensearchdescription+xml, text/xml, application/xml" } }, fetchImpl, resolveImpl);
    if (!res || !res.ok) return null;
    const xml = await res.text();

    // Busca <Url ... template="..." ...>
    const urlTagMatch = /<Url\b[^>]*\btemplate=["']([^"']+)["'][^>]*>/i.exec(xml);
    if (!urlTagMatch) return null;

    let template = urlTagMatch[1];
    // Resolver URL relativa si corresponde
    template = resolveTemplate(template, xmlUrl);

    // Normalizar a https://
    template = template.replace(/^http:\/\//i, "https://");

    // Reemplazar {searchTerms}, {searchTerm}, etc. por {q}
    template = template.replace(/\{(?:searchTerms|searchTerm|search_terms|search_term|q|query)\}/gi, "{q}");
    // Si aún tiene llaves genéricas de parámetro, reemplazar la primera por {q}
    if (!template.includes("{q}") && /\{[^}]+\}/.test(template)) {
      template = template.replace(/\{[^}]+\}/, "{q}");
    }

    if (validTemplate(template, baseUrl)) return template;
  } catch (_) {}

  return null;
}

/**
 * Extrae la plantilla de búsqueda desde JSON-LD Schema.org SearchAction.
 * @param {string} html 
 * @param {string} baseUrl 
 * @returns {string|null}
 */
function extractSearchAction(html, baseUrl) {
  if (!html || typeof html !== "string") return null;

  const scriptRegex = /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const found = findSearchActionInObj(parsed);
      if (found) {
        let template = found;
        try {
          template = resolveTemplate(template, baseUrl);
        } catch (_) {}

        template = template.replace(/^http:\/\//i, "https://");
        template = template.replace(/\{(?:search_term_string|search_terms|searchTerm|search_term|query|q)\}/gi, "{q}");
        if (!template.includes("{q}") && /\{[^}]+\}/.test(template)) {
          template = template.replace(/\{[^}]+\}/, "{q}");
        }

        if (validTemplate(template, baseUrl)) return template;
      }
    } catch (_) {}
  }

  return null;
}

function findSearchActionInObj(obj) {
  if (!obj || typeof obj !== "object") return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const res = findSearchActionInObj(item);
      if (res) return res;
    }
    return null;
  }

  if (obj["@type"] === "SearchAction") {
    if (typeof obj.target === "string") return obj.target;
    if (obj.target && typeof obj.target.urlTemplate === "string") return obj.target.urlTemplate;
  }

  if (obj.potentialAction) {
    const res = findSearchActionInObj(obj.potentialAction);
    if (res) return res;
  }

  if (obj["@graph"] && Array.isArray(obj["@graph"])) {
    const res = findSearchActionInObj(obj["@graph"]);
    if (res) return res;
  }

  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === "object" && obj[k] !== null) {
      const res = findSearchActionInObj(obj[k]);
      if (res) return res;
    }
  }

  return null;
}

/**
 * Detecta la plantilla de búsqueda probando OpenSearch y SearchAction.
 * @param {string} html 
 * @param {string} baseUrl 
 * @param {Function} fetchImpl 
 * @returns {Promise<string|null>}
 */
async function detectSearchTemplate(html, baseUrl, fetchImpl = fetch, resolveImpl = null) {
  const opensearch = await extractOpenSearch(html, baseUrl, fetchImpl, resolveImpl);
  if (opensearch) return opensearch;

  const searchAction = extractSearchAction(html, baseUrl);
  if (searchAction) return searchAction;

  return null;
}

/**
 * Consulta la propiedad P856 (sitio web oficial) en Wikidata.
 * @param {string} identifier Título de Wikipedia o nombre de marca
 * @param {object} options
 * @returns {Promise<string|null>}
 */
async function queryWikidataP856(identifier, { fetchImpl = fetch, byTitle = false } = {}) {
  if (!identifier || typeof identifier !== "string") return null;

  try {
    if (byTitle) {
      // Buscar entidad por título en Wikipedia en inglés o español
      for (const site of ["enwiki", "eswiki"]) {
        const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=${site}&titles=${encodeURIComponent(identifier)}&props=claims&format=json`;
        const res = await fetchImpl(url, { headers: { "Accept": "application/json", "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
        if (!res || !res.ok) continue;
        const data = await res.json();
        if (data && data.entities) {
          const entityId = Object.keys(data.entities)[0];
          if (entityId && entityId !== "-1") {
            const siteUrl = extractP856FromEntity(data.entities[entityId]);
            if (siteUrl) return siteUrl;
          }
        }
      }
    } else {
      // Buscar entidad por término
      const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(identifier)}&language=es&format=json`;
      const res = await fetchImpl(searchUrl, { headers: { "Accept": "application/json" } });
      if (!res || !res.ok) return null;
      const data = await res.json();
      if (data && Array.isArray(data.search) && data.search.length > 0) {
        const entityId = data.search[0].id;
        const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&props=claims&format=json`;
        const entRes = await fetchImpl(entityUrl, { headers: { "Accept": "application/json" } });
        if (entRes && entRes.ok) {
          const entData = await entRes.json();
          if (entData && entData.entities && entData.entities[entityId]) {
            const siteUrl = extractP856FromEntity(entData.entities[entityId]);
            if (siteUrl) return siteUrl;
          }
        }
      }
    }
  } catch (_) {}

  return null;
}

function extractP856FromEntity(entity) {
  if (!entity || !entity.claims || !entity.claims.P856) return null;
  const claims = entity.claims.P856;
  if (!Array.isArray(claims) || claims.length === 0) return null;

  for (const c of claims) {
    const val = c?.mainsnak?.datavalue?.value;
    if (typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://"))) {
      let norm = val.trim();
      norm = norm.replace(/^http:\/\//i, "https://");
      // Quitar barra final estética para homogeneizar si solo es host
      try {
        const u = new URL(norm);
        return u.href;
      } catch (_) {
        return norm;
      }
    }
  }
  return null;
}

/**
 * Investiga el sitio oficial de una marca o grupo y su buscador.
 * @param {object} item { brand, wikipedia_title, url, grupo }
 * @param {object} options
 * @returns {Promise<object|null>}
 */
async function investigateBrandOfficialSite(item, { fetchImpl = fetch, resolveImpl, now = new Date().toISOString().slice(0, 10) } = {}) {
  // En producción se comprueba también el DNS (que el nombre no apunte a una IP interna); en pruebas, fetch simulado.
  const resolver = resolveImpl !== undefined ? resolveImpl : (fetchImpl === fetch ? dnsIsPublic : null);
  const brand = item.brand || item.n || "";
  const wikiUrl = item.wikipedia_url || item.url || "";
  let wikiTitle = item.wikipedia_title || "";
  if (!wikiTitle && wikiUrl.includes("/wiki/")) {
    try { wikiTitle = decodeURIComponent(wikiUrl.split("/wiki/")[1].split("#")[0].split("?")[0]).replace(/_/g, " "); } catch (_) { wikiTitle = ""; }
  }
  // Sin página de Wikipedia de la PROPIA marca no se adivina: una búsqueda por nombre («Gain», «On», «Fox»)
  // devuelve otra entidad, y la página del dueño daría el sitio corporativo, no la tienda de la marca.
  if (!wikiTitle || !titleIsBrand(wikiTitle, brand)) return null;

  const siteUrl = await queryWikidataP856(wikiTitle, { fetchImpl, byTitle: true });
  if (!siteUrl || !isPublicHttps(siteUrl)) return null;

  let busqueda = null;
  try {
    const res = await safeFetch(siteUrl, {}, fetchImpl, resolver);
    if (res && res.ok) {
      const html = String(await res.text()).slice(0, 2 * 1024 * 1024);
      busqueda = await detectSearchTemplate(html, siteUrl, fetchImpl, resolver);
    }
  } catch (_) {}

  const result = { sitio_oficial: siteUrl, fuente: `Wikidata P856 (${wikiTitle})`, verificado: now };
  if (busqueda) result.busqueda_oficial = busqueda;
  if (item.paises) result.paises = item.paises;
  return result;
}

/**
 * Procesa un lote de marcas (máx 50) para detectar sitio oficial y buscador.
 */
async function processBatch(options = {}) {
  const rootDir = options.rootDir || ROOT;
  const brandsPath = options.brandsPath || BRANDS_PATH;
  const statePath = options.statePath || STATE_PATH;
  const limit = options.limit !== undefined ? options.limit : 50;
  const fetchImpl = options.fetchImpl || fetch;
  const now = options.now || new Date().toISOString().slice(0, 10);
  const dry = options.dryRun !== undefined ? options.dryRun : false;

  const inMemory = !!options.db;
  let db = options.db || null;
  if (!db) {
    try {
      db = JSON.parse(fs.readFileSync(brandsPath, "utf8"));
    } catch (e) {
      throw new Error("No se pudo leer " + brandsPath);
    }
  }

  let state = options.state || { marcas: {}, revalidados: {}, sitios_oficiales: { revisados: {} } };
  try {
    if (!options.state && fs.existsSync(statePath)) {
      state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    }
  } catch (_) {}
  state.sitios_oficiales = state.sitios_oficiales || { revisados: {} };

  const revisados = state.sitios_oficiales.revisados || {};
  const candidatos = [];

  for (const m of db.marcas || []) {
    const name = m.n;
    if (m.sitio_oficial || revisados[name]) continue;
    const grp = db.grupos && db.grupos[m.g] ? db.grupos[m.g] : null;
    candidatos.push({
      n: name,
      g: m.g,
      brand: name,
      url: grp?.url || "",
      empresa: grp?.empresa || "",
      entry: m
    });
    if (candidatos.length >= limit) break;
  }

  const cambios = [];
  for (const item of candidatos) {
    revisados[item.n] = now;
    const res = await investigateBrandOfficialSite(item, { fetchImpl, now, resolveImpl: options.resolveImpl });
    if (res) {
      item.entry.sitio_oficial = res.sitio_oficial;
      if (res.busqueda_oficial) item.entry.busqueda_oficial = res.busqueda_oficial;
      item.entry.fuente = res.fuente;
      item.entry.verificado = res.verificado;
      cambios.push({
        marca: item.n,
        grupo: item.g,
        sitio_oficial: res.sitio_oficial,
        busqueda_oficial: res.busqueda_oficial || null
      });
    }
  }

  state.sitios_oficiales.revisados = revisados;
  if (cambios.length > 0 && !dry && !inMemory) {
    fs.writeFileSync(brandsPath, JSON.stringify(db, null, 1), "utf8");
    state.sitios_oficiales.revisados = revisados;
    state.sitios_oficiales.ultimoRun = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
  }

  return { candidatosCount: candidatos.length, cambios };
}

if (require.main === module) {
  processBatch().then((res) => {
    console.log(`Procesadas ${res.candidatosCount} marcas. Cambios encontrados: ${res.cambios.length}`);
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = {
  isPublicHttps,
  regDomain,
  validTemplate,
  titleIsBrand,
  extractOpenSearch,
  extractSearchAction,
  detectSearchTemplate,
  queryWikidataP856,
  investigateBrandOfficialSite,
  processBatch
};
