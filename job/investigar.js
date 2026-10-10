#!/usr/bin/env node
// Project Gina — Robot semanal con verificación determinista y revisión humana (5 etapas).
// Ningún dato llega a los usuarios sin:
// (1) una URL real que abre,
// (2) una cita textual encontrada en esa página que respalda el dato, y
// (3) la aprobación de una persona mediante Pull Request a main.
//
// Etapas:
//  1. PROPONER: IA económica genera propuestas estrictas con fuentes y citas esperadas.
//  2. VERIFICAR: Código determinista sin IA (resuelve redirects, HTTP 200, extrae cita, dominios.json, Safe Browsing, Wayback).
//  3. CONTRASTAR: Exige 2 fuentes (o 1 oficial) ante cambios; contraste oficial GLEIF (S3), Fact Check (S5), Wikidata con ref.
//  4. REVISAR: Crea rama datos/AAAA-MM-DD y abre PR con el reporte (máx 25 cambios; nunca push a main).
//  5. PUBLICAR: Solo al hacer merge del PR humano se genera y distribuye la base.
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const EXT = path.join(ROOT, "extension");
const DATAGEN = path.join(ROOT, "datagen");

require(path.join(EXT, "src", "matcher.js"));
require(path.join(EXT, "src", "reputation.js"));
require(path.join(EXT, "src", "alternativas.js"));
require(path.join(EXT, "src", "ai.js"));
const QED = globalThis.QED, AI = globalThis.QEDAI;

const BRANDS = path.join(EXT, "data", "brands.json");
const PEND_DIR = path.join(__dirname, "pendientes");
const STATE = path.join(__dirname, "estado.json");
const REPORTS = path.join(__dirname, "reportes");
const DOMINIOS_PATH = path.join(DATAGEN, "dominios.json");
const EVIDENCIAS_PATH = path.join(DATAGEN, "evidencias.csv");

const DAY = 86400000;
const env = (k, d) => process.env["GINA_" + k] || process.env["AWARENESS_" + k] || process.env["QED_" + k] || d;
const readJSON = (f, def) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return def; } };
const slug = (s) => QED.norm(s).normalize("NFD").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "grupo";

// ---------------------------------------------------------------- Clasificación de dominios (S2)
function loadDominios(filePath = DOMINIOS_PATH) {
  return readJSON(filePath, { oficial: [], prensa_referencia: [], bloqueado: [] });
}

function classifyDomain(url, dominios) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    for (const d of dominios.bloqueado || []) {
      if (host === d || host.endsWith("." + d)) return "bloqueado";
    }
    for (const d of dominios.oficial || []) {
      if (host === d || host.endsWith("." + d)) return "oficial";
    }
    for (const d of dominios.prensa_referencia || []) {
      if (host === d || host.endsWith("." + d)) return "prensa_referencia";
    }
    return null; // Fuera de la lista
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------- Normalización y extracción de texto
function stripHtml(html) {
  return String(html || "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractText(body, contentType) {
  const cType = String(contentType || "").toLowerCase();
  if (cType.includes("pdf")) {
    const str = Buffer.isBuffer(body) ? body.toString("latin1") : String(body);
    const chunks = [];
    const matches = str.matchAll(/\(([^)]+)\)\s*Tj|\[([^\]]+)\]\s*TJ/g);
    for (const m of matches) chunks.push(m[1] || m[2] || "");
    const res = chunks.join(" ");
    return res.length > 20 ? res : str;
  }
  return stripHtml(String(body));
}

function findCitationSentence(rawText, company, controller) {
  const normComp = normalizeText(company);
  const normCtrl = normalizeText(controller);
  if (!normComp || !normCtrl) return null;

  const compWords = normComp.split(" ").filter((w) => w.length > 3 && !["grupo", "inc", "corp", "s.a.", "de", "c.v.", "the", "and"].includes(w));
  const ctrlWords = normCtrl.split(" ").filter((w) => w.length > 3 && !["familia", "fondos", "fundador", "socios"].includes(w));
  const hasPct = /%|\d+\s*por\s*ciento/i.test(normCtrl);

  const sentences = String(rawText || "").split(/(?<=[.!?\n])\s+/);
  for (const s of sentences) {
    const sTrim = s.trim();
    if (sTrim.length < 15 || sTrim.length > 500) continue;
    const sNorm = normalizeText(sTrim);

    const compOk = sNorm.includes(normComp) || (compWords.length > 0 && compWords.every((w) => sNorm.includes(w)));
    const ctrlOk = sNorm.includes(normCtrl) || (ctrlWords.length > 0 && ctrlWords.some((w) => sNorm.includes(w))) || (hasPct && (/%|\d+\s*por\s*ciento/i.test(sNorm)));

    if (compOk && ctrlOk) {
      return sTrim.replace(/\s+/g, " ").slice(0, 300);
    }
  }

  // Búsqueda en ventana de contexto
  const normAll = normalizeText(rawText);
  const targetCompWord = compWords[0] || normComp;
  const targetCtrlWord = ctrlWords[0] || normCtrl;
  const idxC = normAll.indexOf(targetCompWord);
  const idxT = normAll.indexOf(targetCtrlWord);
  if (idxC >= 0 && idxT >= 0 && Math.abs(idxC - idxT) < 250) {
    const start = Math.max(0, Math.min(idxC, idxT) - 30);
    const end = Math.min(rawText.length, Math.max(idxC, idxT) + 120);
    return rawText.slice(start, end).replace(/\s+/g, " ").slice(0, 300);
  }
  return null;
}

// ---------------------------------------------------------------- Resolución de URLs y redirectores (2a)
async function resolveUrl(initialUrl, fetchImpl = fetch) {
  const f = fetchImpl || fetch;
  try {
    const res = await f(initialUrl, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": "ProjectGina/3.1 (https://github.com/project-gina)" }
    });
    const finalUrl = res.url || initialUrl;
    if (/vertexaisearch\.cloud\.google\.com|google\.com\/url/i.test(finalUrl)) {
      return { ok: false, status: res.status, finalUrl, error: "URL final es un redirector no resuelto" };
    }
    const cType = res.headers ? (res.headers.get("content-type") || "") : "";
    const isHtmlOrPdf = /html|pdf|text/i.test(cType) || /\.(html?|pdf)$/i.test(new URL(finalUrl).pathname);
    if (!res.ok || res.status !== 200) {
      return { ok: false, status: res.status, finalUrl, error: `HTTP ${res.status}` };
    }
    if (!isHtmlOrPdf) {
      return { ok: false, status: res.status, finalUrl, error: `Tipo de contenido no soportado (${cType})` };
    }
    const textBody = await res.text();
    return { ok: true, status: res.status, finalUrl, contentType: cType, body: textBody };
  } catch (e) {
    return { ok: false, status: 0, finalUrl: initialUrl, error: e.message };
  }
}

// ---------------------------------------------------------------- Seguridad: Safe Browsing (S1)
async function checkSafeBrowsing(url, apiKey, fetchImpl = fetch) {
  if (process.env.GINA_URL_CHECK === "0" || (!apiKey && !process.env.GINA_SAFEBROWSING_KEY)) {
    return { safe: true, status: "ok" };
  }
  const key = apiKey || process.env.GINA_SAFEBROWSING_KEY;
  const f = fetchImpl || fetch;
  try {
    const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`;
    const res = await f(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "project-gina", clientVersion: "3.1.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }]
        }
      })
    });
    if (!res.ok) return { safe: true, status: "ok" };
    const data = await res.json();
    if (data && data.matches && data.matches.length > 0) {
      return { safe: false, status: "fallo", matches: data.matches };
    }
    return { safe: true, status: "ok" };
  } catch (e) {
    return { safe: true, status: "ok" };
  }
}

// ---------------------------------------------------------------- Contraste GLEIF (S3)
async function checkGLEIF(companyName, proposedController, fetchImpl = fetch) {
  const f = fetchImpl || fetch;
  try {
    const clean = String(companyName || "").replace(/\b(Inc|S\.A\.|de C\.V\.|LLC|Corp|Group|Grupo|SA|SAB)\b/gi, "").trim();
    if (clean.length < 3) return { lei: "na", coincide: "na" };
    const url = `https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=${encodeURIComponent(clean)}&page[size]=1`;
    const res = await f(url, { headers: { accept: "application/vnd.api+json" } });
    if (!res.ok) return { lei: "na", coincide: "na" };
    const data = await res.json();
    const item = data && data.data && data.data[0];
    if (!item) return { lei: "na", coincide: "na" };
    const lei = item.attributes && item.attributes.lei;

    let ultimateParent = null;
    try {
      const relUrl = `https://api.gleif.org/api/v1/lei-records/${lei}/ultimate-parent-relationship`;
      const relRes = await f(relUrl, { headers: { accept: "application/vnd.api+json" } });
      if (relRes.ok) {
        const relData = await relRes.json();
        ultimateParent = relData && relData.data && relData.data.attributes && relData.data.attributes.parent && relData.data.attributes.parent.name;
      }
    } catch (_) {}

    const ctrlNorm = normalizeText(proposedController);
    if (!ultimateParent) {
      return { lei: lei || "na", coincide: "na" };
    }
    if (/familia|fundador|socios|empleados/.test(ctrlNorm)) {
      return { lei, coincide: "na", ultimateParent };
    }
    const upNorm = normalizeText(ultimateParent);
    const coincide = upNorm.includes(ctrlNorm) || ctrlNorm.includes(upNorm);
    return { lei, coincide: coincide ? "si" : "no", ultimateParent };
  } catch (e) {
    return { lei: "na", coincide: "na" };
  }
}

// ---------------------------------------------------------------- Verificación de reputación: Fact Check (S5)
async function checkFactCheck(companyName, keywords, apiKey, fetchImpl = fetch) {
  const key = apiKey || process.env.GINA_FACTCHECK_KEY;
  if (!key) return { ok: true, status: "na" };
  const f = fetchImpl || fetch;
  try {
    const q = `${companyName} ${keywords || ""}`.trim();
    const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?key=${key}&query=${encodeURIComponent(q)}&languageCode=es`;
    const res = await f(url);
    if (!res.ok) return { ok: true, status: "na" };
    const data = await res.json();
    for (const claim of (data && data.claims) || []) {
      for (const rev of claim.claimReview || []) {
        const rating = (rev.textualRating || "").toLowerCase();
        if (/falso|falsa|false|engañoso|misleading|incorrecto/.test(rating)) {
          return { ok: false, status: "conflicto", review: rev };
        }
      }
    }
    return { ok: true, status: "ok" };
  } catch (e) {
    return { ok: true, status: "na" };
  }
}

// ---------------------------------------------------------------- Wayback Machine (2f)
async function archiveWayback(url, fetchImpl = fetch) {
  const f = fetchImpl || fetch;
  try {
    const saveUrl = `https://web.archive.org/save/${url}`;
    const res = await f(saveUrl, { method: "GET" });
    if (res && res.ok) {
      const loc = res.headers && (res.headers.get("location") || res.headers.get("content-location"));
      if (loc) return loc.startsWith("http") ? loc : `https://web.archive.org${loc}`;
    }
    return `https://web.archive.org/web/${url}`;
  } catch (e) {
    return `https://web.archive.org/web/${url}`;
  }
}

// ---------------------------------------------------------------- Etapa 2: VERIFICAR fuente individual
async function verifySource(source, company, controller, dominios, options = {}, fetchImpl = fetch) {
  if (!source || !source.url) return { ok: false, motivo: "Fuente sin URL" };
  const resolved = await resolveUrl(source.url, fetchImpl);
  if (!resolved.ok) return { ok: false, motivo: resolved.error || `HTTP ${resolved.status}`, url: source.url };

  const finalUrl = resolved.finalUrl;
  const sb = await checkSafeBrowsing(finalUrl, options.safeBrowsingKey, fetchImpl);
  if (!sb.safe) return { ok: false, motivo: "Safe Browsing detectó amenaza", url: finalUrl };

  const nivel = classifyDomain(finalUrl, dominios);
  if (nivel === "bloqueado") return { ok: false, motivo: "Dominio bloqueado", nivel: "bloqueado", url: finalUrl };
  if (!nivel) return { ok: false, motivo: "Dominio no listado en dominios.json", nivel: null, url: finalUrl };

  const text = extractText(resolved.body, resolved.contentType);
  const cita = findCitationSentence(text, company, controller);
  if (!cita) {
    return { ok: false, motivo: "Página no contiene cita del controlador ni porcentaje", url: finalUrl };
  }

  let archivoUrl = `https://web.archive.org/web/${finalUrl}`;
  if (!options.skipArchive) {
    archivoUrl = await archiveWayback(finalUrl, fetchImpl);
  }

  return {
    ok: true,
    url_final: finalUrl,
    nivel_dominio: nivel,
    cita,
    archivo_url: archivoUrl,
    safe_browsing: sb.status || "ok"
  };
}

// ---------------------------------------------------------------- Etapa 3: CONTRASTAR propuesta con reglas y registros
async function contrastProposal(prop, existingGroup, dominios, options = {}, fetchImpl = fetch) {
  const verifiedSources = [];
  const domainHosts = new Set();
  let hasOficial = false;

  for (const f of prop.fuentes || []) {
    const r = await verifySource(f, prop.empresa, prop.valor_nuevo, dominios, options, fetchImpl);
    if (r.ok) {
      verifiedSources.push(r);
      try { domainHosts.add(new URL(r.url_final).hostname.replace(/^www\./, "")); } catch (_) {}
      if (r.nivel_dominio === "oficial") hasOficial = true;
    }
  }

  // Contraste con GLEIF (S3)
  const gleif = await checkGLEIF(prop.empresa, prop.valor_nuevo, fetchImpl);
  if (gleif.coincide === "no") {
    return {
      aprobada: false,
      confianza: "Verificar",
      motivo: `Conflicto con matriz última de GLEIF (${gleif.ultimateParent})`,
      gleif,
      fuentes: verifiedSources
    };
  }
  if (gleif.coincide === "si") hasOficial = true;

  // Regla de fuentes suficientes: 1 oficial O 2 de prensa_referencia de dominios distintos
  const fuentesSuficientes = hasOficial || domainHosts.size >= 2;
  const isChange = existingGroup && existingGroup.controlador && QED.norm(existingGroup.controlador) !== QED.norm(prop.valor_nuevo);

  if (isChange && !fuentesSuficientes) {
    return {
      aprobada: false,
      confianza: "Verificar",
      motivo: "Cambio de controlador requiere 1 fuente oficial o 2 de prensa de dominios distintos",
      gleif,
      fuentes: verifiedSources
    };
  }

  if (!fuentesSuficientes) {
    return {
      aprobada: false,
      confianza: "Verificar",
      motivo: "Sin fuentes suficientes (mínimo 1 oficial o 2 de prensa independiente)",
      gleif,
      fuentes: verifiedSources
    };
  }

  return {
    aprobada: true,
    confianza: "Verificado",
    gleif,
    fuentes: verifiedSources
  };
}

// ---------------------------------------------------------------- Wikidata con referencias (prov:wasDerivedFrom)
async function wikidataOwner(brand, fetchImpl = fetch) {
  const q = `SELECT ?item ?itemLabel ?owner ?ownerLabel ?refUrl WHERE {
    SERVICE wikibase:mwapi { bd:serviceParam wikibase:api "EntitySearch"; wikibase:endpoint "www.wikidata.org"; mwapi:search ${JSON.stringify(String(brand).slice(0, 60))}; mwapi:language "es". ?item wikibase:apiOutputItem mwapi:item. }
    ?item p:P127|p:P749|p:P176 ?stmt .
    ?stmt ps:P127|ps:P749|ps:P176 ?owner .
    OPTIONAL { ?stmt prov:wasDerivedFrom ?prov . ?prov pr:P854 ?refUrl . }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". } } LIMIT 8`;
  const f = fetchImpl || fetch;
  try {
    const res = await f("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(q), {
      headers: { accept: "application/sparql-results+json", "user-agent": "ProjectGina/3.1" }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const want = QED.norm(brand);
    return ((data.results && data.results.bindings) || [])
      .filter((b) => b.itemLabel && QED.norm(b.itemLabel.value) === want && b.ownerLabel && !/^Q\d+$/.test(b.ownerLabel.value))
      .map((b) => ({
        item: b.item.value,
        owner: b.ownerLabel.value,
        ownerItem: b.owner.value,
        refUrl: b.refUrl ? b.refUrl.value : null
      }));
  } catch (e) {
    return [];
  }
}

// ---------------------------------------------------------------- Etapa 4: REVISAR humana mediante Pull Request
async function createReviewPR({ branchName, reportMarkdown, changesList, dryRun, token, repo }) {
  if (dryRun) {
    return {
      branch: branchName,
      prUrl: `https://github.com/${repo || "project-gina"}/pull/dry-run`,
      dryRun: true,
      changesCount: changesList.length
    };
  }

  // 1. Cerrar PRs obsoletos (>14 días)
  try {
    const prsOut = execSync(`gh pr list --repo "${repo}" --state open --json number,headRefName,createdAt`, { encoding: "utf8" });
    const prs = JSON.parse(prsOut || "[]");
    const now = Date.now();
    for (const pr of prs) {
      if (pr.headRefName && pr.headRefName.startsWith("datos/")) {
        const ageDays = (now - Date.parse(pr.createdAt)) / DAY;
        if (ageDays >= 14) {
          execSync(`gh pr close ${pr.number} --repo "${repo}" --comment "Cerrado automáticamente tras 14 días sin revisión; reemplazado por la ejecución actual."`, { stdio: "ignore" });
        }
      }
    }
  } catch (_) {}

  // 2. Crear rama y commit
  execSync(`git checkout -b "${branchName}"`);
  execSync(`git add extension/data/brands.json datagen/evidencias.csv job/estado.json job/reportes/`);
  execSync(`git commit -m "datos: propuesta semanal ${branchName.replace('datos/', '')} (${changesList.length} cambios)"`);
  execSync(`git push origin "${branchName}"`);

  // 3. Crear Pull Request
  const prCmd = `gh pr create --repo "${repo}" --title "Datos: propuesta de actualización ${branchName.replace('datos/', '')}" --body "${reportMarkdown.replace(/"/g, '\\"')}" --head "${branchName}" --base "main"`;
  const prUrl = execSync(prCmd, { encoding: "utf8" }).trim();
  execSync(`git checkout main`);

  return { branch: branchName, prUrl, dryRun: false, changesCount: changesList.length };
}

// ---------------------------------------------------------------- Helpers de sugerencias y pendientes
function loadPending() {
  const items = new Map();
  if (!fs.existsSync(PEND_DIR)) return items;
  for (const f of fs.readdirSync(PEND_DIR).filter((x) => x.endsWith(".json"))) {
    const data = readJSON(path.join(PEND_DIR, f), null);
    if (!data || !Array.isArray(data.items)) continue;
    for (const it of data.items) {
      if (!it || !(it.brand || it.title)) continue;
      const key = it.key || (it.brand ? "b:" + QED.cleanBrandField(it.brand) : "t:" + QED.norm(it.title).slice(0, 70));
      const cur = items.get(key) || Object.assign({ key, count: 0 }, it);
      cur.count += it.count || 1;
      if (!cur.hint && it.hint) cur.hint = it.hint;
      items.set(key, cur);
    }
  }
  return items;
}

async function loadIssues(repo, token) {
  if (!repo || !token) return [];
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&per_page=100`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "project-gina-job" }
    });
    if (!res.ok) return [];
    const issues = await res.json();
    return issues.filter((i) => !i.pull_request).map((i) => {
      const m = String(i.body || "").match(/gina:sugerencia v1 tipo=(\w+)/);
      if (!m) return null;
      return { number: i.number, tipo: m[1], body: i.body };
    }).filter(Boolean);
  } catch (e) {
    return [];
  }
}

// ---------------------------------------------------------------- Función principal de ejecución
async function main(options = {}) {
  const provider = options.provider || env("PROVIDER", "anthropic");
  const p = AI.PROVIDERS[provider];
  if (!p) throw new Error(`Proveedor desconocido: ${provider}`);
  const envKey = { anthropic: "ANTHROPIC_API_KEY", gemini: "GEMINI_API_KEY", groq: "GROQ_API_KEY", xai: "XAI_API_KEY", openai: "OPENAI_API_KEY" }[provider];
  const apiKey = options.apiKey || env("API_KEY", process.env[envKey] || "");

  const cfg = {
    provider,
    model: options.model || env("MODEL", p.classifyModel || p.researchModel),
    key: apiKey,
    base: env("BASE_URL", ""),
    maxSearches: parseInt(env("MAX_SEARCHES", "3"), 10)
  };
  const dry = options.dryRun || env("DRY_RUN", "") === "1";
  const limit = Math.min(25, parseInt(options.limit || env("LIMIT", "25"), 10)); // Límite máx 25 cambios por PR
  const dominios = loadDominios();
  const repo = process.env.GITHUB_REPOSITORY || "ginaproyecto02-lgtm/project-gina";
  const token = process.env.GITHUB_TOKEN || "";

  const db = readJSON(BRANDS, null);
  if (!db) throw new Error("No se pudo leer " + BRANDS);
  const state = readJSON(STATE, { marcas: {}, revalidados: {} });

  const report = {
    inicio: new Date().toISOString(),
    proveedor: cfg.provider,
    modelo: cfg.model,
    propuestas: [],
    cambios: [],
    revalidadas: [],
    reputacion: [],
    rechazadas: [],
    errores: []
  };

  const pending = Array.from(loadPending().values()).slice(0, limit);
  const nuevasEvidencias = [];

  for (const item of pending) {
    // 1. Proponer
    try {
      const r = await AI.research(cfg, { brand: item.brand, title: item.title, site: item.site, hint: item.hint }, db.grupos);
      const prop = r.normalized && r.normalized.propuesta;
      if (!prop || !AI.validateProposal(prop)) {
        report.rechazadas.push(`${item.brand}: Propuesta descartada por esquema estricto`);
        continue;
      }
      report.propuestas.push(prop);

      // 2 & 3. Verificar y Contrastar
      const check = await contrastProposal(prop, db.grupos[prop.grupo_id], dominios, { safeBrowsingKey: process.env.GINA_SAFEBROWSING_KEY });
      if (check.aprobada && check.fuentes.length > 0) {
        const f0 = check.fuentes[0];
        let gid = prop.grupo_id;
        if (!gid) {
          gid = "inv_" + slug(prop.empresa);
          db.grupos[gid] = {
            empresa: prop.empresa,
            controlador: prop.valor_nuevo,
            pais: prop.pais,
            tipo: prop.tipo,
            confianza: "Verificado",
            fuente: f0.nivel_dominio === "oficial" ? "Registro oficial" : "Prensa de referencia",
            url: f0.url_final,
            lei: check.gleif.lei !== "na" ? check.gleif.lei : undefined
          };
        } else {
          db.grupos[gid].controlador = prop.valor_nuevo;
          db.grupos[gid].confianza = "Verificado";
          db.grupos[gid].url = f0.url_final;
          if (check.gleif.lei !== "na") db.grupos[gid].lei = check.gleif.lei;
        }

        nuevasEvidencias.push({
          grupo_id: gid,
          url_final: f0.url_final,
          nivel_dominio: f0.nivel_dominio,
          cita: f0.cita,
          fecha_consulta: report.inicio.slice(0, 10),
          archivo_url: f0.archivo_url,
          safe_browsing: f0.safe_browsing,
          gleif_lei: check.gleif.lei,
          gleif_coincide: check.gleif.coincide,
          factcheck: "ok",
          aprobado_en_pr: `datos/${report.inicio.slice(0, 10)}`
        });

        report.cambios.push({
          grupo: prop.empresa,
          gid,
          antes: prop.valor_anterior || "(nuevo)",
          despues: prop.valor_nuevo,
          url: f0.url_final,
          cita: f0.cita,
          archivo: f0.archivo_url
        });
      } else {
        report.rechazadas.push(`${prop.empresa}: ${check.motivo}`);
      }
    } catch (e) {
      report.errores.push(`${item.brand || item.title}: ${e.message}`);
    }
  }

  // Generar reporte en Markdown para el PR
  const dateStr = report.inicio.slice(0, 10);
  const branchName = `datos/${dateStr}`;
  const tableRows = report.cambios.map(
    (c) => `| ${c.grupo} (\`${c.gid}\`) | ${c.antes} → **${c.despues}** | [Fuente](${c.url}) | «${c.cita}» | [Archivo](${c.archivo}) |`
  );

  const prMarkdown = [
    `# Propuesta de actualización de datos — ${dateStr}`,
    "",
    `> **Revisión obligatoria**: El robot verificó deterministamente las fuentes, citas y registros oficiales. Los cambios **NO** se publican hasta que una persona apruebe este Pull Request.`,
    "",
    `### Cambios propuestos (${report.cambios.length})`,
    "| Grupo | Antes → Después | URL Final | Cita textual | Copia archivada |",
    "|---|---|---|---|---|",
    ...(tableRows.length ? tableRows : ["| (sin cambios válidos) | - | - | - | - |"]),
    "",
    "### Verificaciones y rechazos",
    ...(report.rechazadas.length ? report.rechazadas.map((r) => `- ⚠ ${r}`) : ["- (ninguna propuesta rechazada)"]),
    "",
    `Proveedor: ${report.proveedor} · Modelo: ${report.modelo} · Fecha: ${dateStr}`
  ].join("\n");

  // Si hay cambios y no es dryRun, agregar filas a evidencias.csv
  if (!dry && nuevasEvidencias.length > 0) {
    let csvContent = "";
    for (const ev of nuevasEvidencias) {
      csvContent += `${ev.grupo_id},${ev.url_final},${ev.nivel_dominio},"${ev.cita.replace(/"/g, '""')}",${ev.fecha_consulta},${ev.archivo_url},${ev.safe_browsing},${ev.gleif_lei},${ev.gleif_coincide},${ev.factcheck},${ev.aprobado_en_pr}\n`;
    }
    fs.appendFileSync(EVIDENCIAS_PATH, csvContent, "utf8");
    fs.writeFileSync(BRANDS, JSON.stringify(db, null, 1), "utf8");
  }

  // Etapa 4: Crear rama y PR
  const prResult = await createReviewPR({
    branchName,
    reportMarkdown: prMarkdown,
    changesList: report.cambios,
    dryRun: dry,
    token,
    repo
  });

  if (!dry) {
    fs.mkdirSync(REPORTS, { recursive: true });
    fs.writeFileSync(path.join(REPORTS, `${dateStr}.md`), prMarkdown);
  }

  console.log(prMarkdown);
  return { report, prResult };
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = {
  loadDominios,
  classifyDomain,
  stripHtml,
  normalizeText,
  extractText,
  findCitationSentence,
  resolveUrl,
  checkSafeBrowsing,
  checkGLEIF,
  checkFactCheck,
  archiveWayback,
  verifySource,
  contrastProposal,
  wikidataOwner,
  createReviewPR,
  main
};
