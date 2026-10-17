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

/**
 * Extrae la plantilla de búsqueda desde un enlace OpenSearch en el HTML y su archivo XML correspondiente.
 * @param {string} html 
 * @param {string} baseUrl 
 * @param {Function} fetchImpl 
 * @returns {Promise<string|null>}
 */
async function extractOpenSearch(html, baseUrl, fetchImpl = fetch) {
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
    const res = await fetchImpl(xmlUrl, {
      headers: { "Accept": "application/opensearchdescription+xml, text/xml, application/xml" }
    });
    if (!res || !res.ok) return null;
    const xml = await res.text();

    // Busca <Url ... template="..." ...>
    const urlTagMatch = /<Url\b[^>]*\btemplate=["']([^"']+)["'][^>]*>/i.exec(xml);
    if (!urlTagMatch) return null;

    let template = urlTagMatch[1];
    // Resolver URL relativa si corresponde
    template = new URL(template, xmlUrl).href;

    // Normalizar a https://
    template = template.replace(/^http:\/\//i, "https://");

    // Reemplazar {searchTerms}, {searchTerm}, etc. por {q}
    template = template.replace(/\{(?:searchTerms|searchTerm|search_terms|search_term|q|query)\}/gi, "{q}");
    // Si aún tiene llaves genéricas de parámetro, reemplazar la primera por {q}
    if (!template.includes("{q}") && /\{[^}]+\}/.test(template)) {
      template = template.replace(/\{[^}]+\}/, "{q}");
    }

    if (template.startsWith("https://") && template.includes("{q}")) {
      return template;
    }
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
          template = new URL(template, baseUrl).href;
        } catch (_) {}

        template = template.replace(/^http:\/\//i, "https://");
        template = template.replace(/\{(?:search_term_string|search_terms|searchTerm|search_term|query|q)\}/gi, "{q}");
        if (!template.includes("{q}") && /\{[^}]+\}/.test(template)) {
          template = template.replace(/\{[^}]+\}/, "{q}");
        }

        if (template.startsWith("https://") && template.includes("{q}")) {
          return template;
        }
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
async function detectSearchTemplate(html, baseUrl, fetchImpl = fetch) {
  const opensearch = await extractOpenSearch(html, baseUrl, fetchImpl);
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
        const res = await fetchImpl(url, { headers: { "Accept": "application/json" } });
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
async function investigateBrandOfficialSite(item, { fetchImpl = fetch, now = new Date().toISOString().slice(0, 10) } = {}) {
  let siteUrl = null;

  // 1. Si tiene URL de Wikipedia directa
  const wikiUrl = item.wikipedia_url || item.url || "";
  let wikiTitle = item.wikipedia_title || "";
  if (!wikiTitle && wikiUrl.includes("/wiki/")) {
    const parts = wikiUrl.split("/wiki/");
    wikiTitle = decodeURIComponent(parts[1].split("#")[0].split("?")[0]);
  }

  if (wikiTitle) {
    siteUrl = await queryWikidataP856(wikiTitle, { fetchImpl, byTitle: true });
  }

  // 2. Si no dio con Wikipedia, buscar por nombre de marca o empresa
  if (!siteUrl && (item.brand || item.n || item.empresa)) {
    siteUrl = await queryWikidataP856(item.brand || item.n || item.empresa, { fetchImpl, byTitle: false });
  }

  // Si no tiene P856 en Wikidata → no se escribe nada
  if (!siteUrl) return null;

  // 3. Inspeccionar portada para detectar buscador
  let busqueda = null;
  try {
    const res = await fetchImpl(siteUrl, {
      headers: { "User-Agent": "project-gina-bot/1.0 (https://github.com/ginaproyecto02-lgtm/project-gina)" }
    });
    if (res && res.ok) {
      const html = await res.text();
      busqueda = await detectSearchTemplate(html, siteUrl, fetchImpl);
    }
  } catch (_) {}

  const result = {
    sitio_oficial: siteUrl,
    fuente: "Wikidata P856",
    verificado: now
  };
  if (busqueda) {
    result.busqueda_oficial = busqueda;
  }
  if (item.paises) {
    result.paises = item.paises;
  }

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

  let db = null;
  try {
    db = JSON.parse(fs.readFileSync(brandsPath, "utf8"));
  } catch (e) {
    throw new Error("No se pudo leer " + brandsPath);
  }

  let state = { marcas: {}, revalidados: {}, sitios_oficiales: { revisados: {} } };
  try {
    if (fs.existsSync(statePath)) {
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
    const res = await investigateBrandOfficialSite(item, { fetchImpl, now });
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

  if (cambios.length > 0 && !dry) {
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
  extractOpenSearch,
  extractSearchAction,
  detectSearchTemplate,
  queryWikidataP856,
  investigateBrandOfficialSite,
  processBatch
};
