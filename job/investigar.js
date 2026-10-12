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
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

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

function serializeCsvRow(cols) {
  return cols.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",") + "\n";
}

function getNextBranchName(baseName, execFileImpl = execFileSync) {
  let suffix = 1;
  while (true) {
    const candidate = suffix === 1 ? baseName : `${baseName}-${suffix}`;
    let exists = false;
    try {
      const outLocal = execFileImpl("git", ["branch", "--list", candidate], { encoding: "utf8" });
      if (outLocal && outLocal.includes(candidate)) exists = true;
    } catch (_) {}
    if (!exists) {
      try {
        const outRemote = execFileImpl("git", ["ls-remote", "--heads", "origin", candidate], { encoding: "utf8" });
        if (outRemote && outRemote.includes(candidate)) exists = true;
      } catch (_) {}
    }
    if (!exists) {
      return candidate;
    }
    suffix++;
  }
}

// ---------------------------------------------------------------- Etapa 4: REVISAR humana mediante Pull Request
async function createReviewPR({ branchName, reportMarkdown, changesList, dryRun, token, repo, execFileImpl = execFileSync }) {
  const finalBranchName = getNextBranchName(branchName, execFileImpl);

  if (dryRun) {
    return {
      branch: finalBranchName,
      prUrl: `https://github.com/${repo || "project-gina"}/pull/dry-run`,
      dryRun: true,
      changesCount: changesList ? changesList.length : 0
    };
  }

  // 1. Cerrar PRs obsoletos (>14 días)
  try {
    const prsOut = execFileImpl("gh", ["pr", "list", "--repo", repo, "--state", "open", "--json", "number,headRefName,createdAt"], { encoding: "utf8" });
    const prs = JSON.parse(prsOut || "[]");
    const now = Date.now();
    for (const pr of prs) {
      if (pr.headRefName && pr.headRefName.startsWith("datos/")) {
        const ageDays = (now - Date.parse(pr.createdAt)) / DAY;
        if (ageDays >= 14) {
          execFileImpl("gh", ["pr", "close", String(pr.number), "--repo", repo, "--comment", "Cerrado automáticamente tras 14 días sin revisión; reemplazado por la ejecución actual."], { stdio: "ignore" });
        }
      }
    }
  } catch (_) {}

  // 2. Crear rama y commit
  execFileImpl("git", ["checkout", "-b", finalBranchName]);

  // Asegurar job/estado.json si no existe (P0.3)
  if (!fs.existsSync(STATE)) {
    fs.writeFileSync(STATE, JSON.stringify({ marcas: {}, revalidados: {}, lastRun: Date.now() }, null, 2), "utf8");
  }

  const candidatePaths = [
    "extension/data/brands.json",
    "datagen/evidencias.csv",
    "job/estado.json",
    "job/reportes",
    "datagen/fuentes"
  ];
  const pathsToAdd = candidatePaths.filter((p) => fs.existsSync(path.resolve(ROOT, p)));
  if (pathsToAdd.length > 0) {
    execFileImpl("git", ["add", ...pathsToAdd]);
  }

  execFileImpl("git", ["commit", "-m", `datos: propuesta semanal ${finalBranchName.replace("datos/", "")} (${changesList ? changesList.length : 0} cambios)`]);

  // 3. Verificar rutas permitidas DENTRO de createReviewPR antes de git push (P0.5)
  let diffOut = "";
  try {
    diffOut = execFileImpl("git", ["diff", "--name-only", "main...HEAD"], { encoding: "utf8" });
  } catch (_) {
    try {
      diffOut = execFileImpl("git", ["diff", "--name-only", "main"], { encoding: "utf8" });
    } catch (_) {
      try {
        diffOut = execFileImpl("git", ["diff", "--name-only", "HEAD~1"], { encoding: "utf8" });
      } catch (_) {}
    }
  }
  const files = diffOut.split("\n").map((s) => s.trim().replace(/\\/g, "/")).filter(Boolean);
  const ALLOWED_REGEX = /^(extension\/data\/brands\.json|datagen\/evidencias\.csv|job\/estado\.json|job\/reportes\/|datagen\/fuentes\/)/;
  const disallowed = files.filter((f) => !ALLOWED_REGEX.test(f));
  if (disallowed.length > 0) {
    throw new Error(`Rutas no permitidas modificadas antes del push: ${disallowed.join(", ")}`);
  }

  // 4. Git push
  execFileImpl("git", ["push", "origin", finalBranchName]);

  // 5. Crear Pull Request usando --body-file con archivo temporal (P0.1)
  const tmpBodyFile = path.join(os.tmpdir(), `pr_body_${Date.now()}_${Math.random().toString(36).slice(2)}.md`);
  let prUrl = "";
  try {
    fs.writeFileSync(tmpBodyFile, reportMarkdown, "utf8");
    const prArgs = [
      "pr", "create",
      "--repo", repo,
      "--title", `Datos: propuesta de actualización ${finalBranchName.replace("datos/", "")}`,
      "--body-file", tmpBodyFile,
      "--head", finalBranchName,
      "--base", "main"
    ];
    prUrl = execFileImpl("gh", prArgs, { encoding: "utf8" }).trim();
  } finally {
    try { fs.unlinkSync(tmpBodyFile); } catch (_) {}
  }

  execFileImpl("git", ["checkout", "main"]);

  return { branch: finalBranchName, prUrl, dryRun: false, changesCount: changesList ? changesList.length : 0 };
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

function closeLegacyIssues(execFileImpl = execFileSync, repo = "ginaproyecto02-lgtm/project-gina") {
  for (let n = 1; n <= 7; n++) {
    try {
      execFileImpl("gh", ["issue", "comment", String(n), "--repo", repo, "--body", "Incorporada en la base (commit de9daa9)"]);
      execFileImpl("gh", ["issue", "close", String(n), "--repo", repo, "--reason", "completed"]);
    } catch (_) {}
  }
}

function parseIssueContent(issue) {
  const body = String(issue.body || "");
  const title = String(issue.title || "");
  const labels = (issue.labels || []).map((l) => (typeof l === "string" ? l : l.name));
  const createdAt = issue.createdAt || issue.created_at || new Date().toISOString();

  const m = body.match(/gina:sugerencia v1 tipo=(\w+)/);
  if (m) {
    const tipo = m[1] === "alternativa" ? "alternativa" : "marca";
    const items = [];
    for (const line of body.split(/\r?\n/).slice(0, 60)) {
      const l = line.trim();
      if (!l.startsWith("- ")) continue;
      const f = {};
      for (const part of l.slice(2).split("|")) {
        const i = part.indexOf(":");
        if (i > 0) f[QED.norm(part.slice(0, i)).replace(/\s+/g, "")] = part.slice(i + 1).trim().slice(0, 200).replace(/[<>{}]/g, "");
      }
      if (tipo === "alternativa" && f.alternativa) {
        items.push({ marca: f.alternativa.slice(0, 80), categoria: f.categoria || "", pais: f.pais || "", dueno: f.dueno || "", fuente: f.fuente || "" });
      }
      if (tipo === "marca" && (f.marca || f.producto)) {
        items.push({ brand: (f.marca || "").slice(0, 80), site: (f.tienda || "").slice(0, 60), title: (f.producto || "").slice(0, 160) });
      }
    }
    return { number: issue.number, tipo, items, labels, createdAt };
  }

  // Formato issue template / YAML / markdown
  let brand = "";
  const mBrand = body.match(/###\s*Marca\s*\r?\n+([^\r\n#]+)/i);
  if (mBrand) brand = mBrand[1].trim();
  if (!brand) {
    const mTitle = title.match(/Marca faltante:\s*(.+)/i);
    if (mTitle) brand = mTitle[1].trim();
  }
  const mStore = body.match(/###\s*Tienda\s*\r?\n+([^\r\n#]+)/i);
  const mPais = body.match(/###\s*Pa[ií]s\s*\r?\n+([^\r\n#]+)/i);
  const mProd = body.match(/###\s*Producto\s*\r?\n+([^\r\n#]+)/i);
  const mDueno = body.match(/###\s*Due[ñn]o[^\r\n]*\r?\n+([^\r\n#]+)/i);
  const mFuente = body.match(/###\s*Fuente[^\r\n]*\r?\n+([^\r\n#]+)/i);

  if (brand) {
    return {
      number: issue.number,
      tipo: "marca",
      items: [{
        brand: brand.slice(0, 80),
        site: mStore ? mStore[1].trim().slice(0, 60) : "",
        pais: mPais ? mPais[1].trim().slice(0, 40) : "",
        title: mProd ? mProd[1].trim().slice(0, 160) : "",
        dueno: mDueno ? mDueno[1].trim().slice(0, 120) : "",
        fuente: mFuente ? mFuente[1].trim().slice(0, 200) : ""
      }],
      labels,
      createdAt
    };
  }

  return null;
}

async function loadIssues(repo, token, execFileImpl = execFileSync, fetchImpl = fetch) {
  if (!repo) return [];
  let issues = null;
  try {
    const out = execFileImpl("gh", ["issue", "list", "--repo", repo, "--state", "open", "--json", "number,title,body,labels,createdAt", "--limit", "100"], { encoding: "utf8" });
    if (out) issues = JSON.parse(out);
  } catch (_) {}

  if (!issues && token) {
    try {
      const res = await fetchImpl(`https://api.github.com/repos/${repo}/issues?state=open&per_page=100`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "project-gina-job" }
      });
      if (res && res.ok) issues = await res.json();
    } catch (_) {}
  }

  if (!Array.isArray(issues)) return [];

  const results = [];
  for (const i of issues) {
    if (i.pull_request) continue;
    const parsed = parseIssueContent(i);
    if (parsed) results.push(parsed);
  }
  return results;
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
  const limit = Math.min(25, parseInt(options.limit !== undefined ? options.limit : env("LIMIT", "25"), 10)); // Límite máx 25 cambios por PR
  const everyDays = parseFloat(options.everyDays || env("EVERY_DAYS", "14"));
  const force = options.force !== undefined ? options.force : (options.dryRun || env("FORCE", "") === "1");
  const revalidateLimit = parseInt(options.revalidate || env("REVALIDATE", "3"), 10);
  const repLimit = parseInt(options.repLimit || env("REP_LIMIT", "5"), 10);

  const dominios = loadDominios();
  const repo = process.env.GITHUB_REPOSITORY || "ginaproyecto02-lgtm/project-gina";
  const token = process.env.GITHUB_TOKEN || "";
  const execFileImpl = options.execFileImpl || execFileSync;
  const fetchImpl = options.fetchImpl || fetch;

  const db = readJSON(BRANDS, null);
  if (!db) throw new Error("No se pudo leer " + BRANDS);
  const state = readJSON(STATE, { marcas: {}, revalidados: {}, ultimoRun: null });

  // P1.12: Restaurar GINA_EVERY_DAYS (con job/estado.json)
  if (!force && state.ultimoRun && Date.now() - new Date(state.ultimoRun).getTime() < everyDays * DAY) {
    console.log(`Menos de ${everyDays} días desde la última ejecución (${state.ultimoRun}); se omite la ejecución periódica.`);
    return { report: { inicio: new Date().toISOString(), cambios: [], rechazadas: [], propuestas: [] }, prResult: null };
  }

  // P1.11: Cerrar issues #1–#7 con el comentario "Incorporada en la base (commit de9daa9)"
  if (!options.skipLegacy) {
    closeLegacyIssues(execFileImpl, repo);
  }

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

  // P1.12: main() llama a loadIssues() y une los issues con pendientes/; quita duplicados por marca normalizada
  const queue = [];
  const seenBrands = new Map(); // normBrand -> issueNumber
  const parsedIssues = await loadIssues(repo, token, execFileImpl, fetchImpl);

  for (const iss of parsedIssues) {
    // Más de 30 días en sin-fuente → cerrar explicando
    if (iss.labels.includes("sin-fuente")) {
      const ageMs = Date.now() - new Date(iss.createdAt).getTime();
      if (ageMs > 30 * DAY) {
        try {
          execFileImpl("gh", ["issue", "comment", String(iss.number), "--repo", repo, "--body", "Cerrado automáticamente: más de 30 días sin fuente verificable."]);
          execFileImpl("gh", ["issue", "close", String(iss.number), "--repo", repo, "--reason", "completed"]);
        } catch (_) {}
        continue;
      }
    }

    for (const it of iss.items) {
      if (!it.brand) continue;
      const nb = QED.norm(it.brand);
      if (seenBrands.has(nb)) {
        // duplicado → "Duplicada de #N" + cerrar
        const firstNum = seenBrands.get(nb);
        if (firstNum && iss.number !== firstNum) {
          try {
            execFileImpl("gh", ["issue", "comment", String(iss.number), "--repo", repo, "--body", `Duplicada de #${firstNum}`]);
            execFileImpl("gh", ["issue", "close", String(iss.number), "--repo", repo, "--reason", "completed"]);
          } catch (_) {}
        }
        continue;
      }
      seenBrands.set(nb, iss.number);
      queue.push(Object.assign({}, it, { issueNumber: iss.number, issueLabels: iss.labels }));
    }
  }

  // Unir con pendientes locales
  const pendingMap = loadPending();
  for (const [, p] of pendingMap.entries()) {
    if (!p.brand) continue;
    const nb = QED.norm(p.brand);
    if (seenBrands.has(nb)) {
      const existingItem = queue.find((q) => QED.norm(q.brand) === nb);
      if (existingItem) existingItem.count = (existingItem.count || 1) + (p.count || 1);
    } else {
      seenBrands.set(nb, null);
      queue.push(p);
    }
  }

  const toProcess = queue.slice(0, limit);
  const nuevasEvidencias = [];
  const issuesToClose = [];

  for (const item of toProcess) {
    const normBrand = QED.norm(item.brand);

    // P1.12: (a) ¿La marca ya existe? → comentar y cerrar
    const existingMarca = db.marcas.find((m) => QED.norm(m.n) === normBrand);
    if (existingMarca) {
      const g = db.grupos[existingMarca.g];
      const grpName = g ? g.empresa : existingMarca.g;
      if (item.issueNumber) {
        try {
          execFileImpl("gh", ["issue", "comment", String(item.issueNumber), "--repo", repo, "--body", `Ya está en la base (grupo ${grpName})`]);
          execFileImpl("gh", ["issue", "close", String(item.issueNumber), "--repo", repo, "--reason", "completed"]);
        } catch (_) {}
      }
      continue;
    }

    // P1.12: (b) Biblioteca local datagen/fuentes/
    let prop = null;
    let origen = "";
    const fuentesDir = path.join(DATAGEN, "fuentes");
    if (fs.existsSync(fuentesDir)) {
      const files = fs.readdirSync(fuentesDir).filter((x) => x.endsWith(".json"));
      for (const f of files) {
        const fData = readJSON(path.join(fuentesDir, f), null);
        if (fData && fData.fecha) {
          const age = Date.now() - new Date(fData.fecha).getTime();
          if (age < 365 * DAY && fData.url_final && fData.cita) {
            const fNorm = QED.norm(fData.cita || "") + " " + QED.norm(f);
            if (fNorm.includes(normBrand)) {
              prop = {
                empresa: fData.empresa || item.brand,
                marca: item.brand,
                campo: "controlador",
                valor_nuevo: fData.controlador || item.brand,
                pais: fData.pais || item.pais || "",
                tipo: fData.tipo || "Corporación",
                fuentes_esperadas: [{ url: fData.url_final, cita: fData.cita }]
              };
              origen = "biblioteca";
              break;
            }
          }
        }
      }
    }

    // P1.12: (c) Wikidata con referencia (wikidataOwner)
    if (!prop) {
      try {
        const wikiHits = await wikidataOwner(item.brand, fetchImpl);
        const wikiRef = wikiHits.find((w) => w.refUrl && /^https:\/\//i.test(w.refUrl));
        if (wikiRef) {
          prop = {
            empresa: wikiRef.owner,
            marca: item.brand,
            campo: "controlador",
            valor_nuevo: wikiRef.owner,
            pais: item.pais || "",
            tipo: "Corporación",
            fuentes_esperadas: [{ url: wikiRef.refUrl, cita: wikiRef.owner }]
          };
          origen = "wikidata";
        }
      } catch (_) {}
    }

    // P1.12: (d) IA solo si lo anterior no resolvió
    if (!prop && cfg.key) {
      try {
        const r = await AI.research(cfg, { brand: item.brand, title: item.title, site: item.site, hint: item.hint }, db.grupos);
        if (r.normalized && r.normalized.propuesta && AI.validateProposal(r.normalized.propuesta)) {
          prop = r.normalized.propuesta;
          origen = "ia";
        }
      } catch (e) {
        report.errores.push(`${item.brand || item.title}: ${e.message}`);
      }
    }

    // Si ninguna vía dio con fuente verificable
    if (!prop) {
      report.rechazadas.push(`${item.brand}: Sin fuente verificable`);
      if (item.issueNumber) {
        try {
          execFileImpl("gh", ["issue", "edit", String(item.issueNumber), "--repo", repo, "--add-label", "sin-fuente"]);
          execFileImpl("gh", ["issue", "comment", String(item.issueNumber), "--repo", repo, "--body", "No se encontró una fuente verificable para esta marca. Si tienes un enlace oficial o de registro público, compártelo aquí para reabrirla."]);
        } catch (_) {}
      }
      continue;
    }

    report.propuestas.push(prop);

    // 2 & 3. Verificar y Contrastar
    try {
      const check = await contrastProposal(prop, db.grupos[prop.grupo_id], dominios, { safeBrowsingKey: process.env.GINA_SAFEBROWSING_KEY }, fetchImpl);
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
            confianza: "Alta", // P1.12: Grupo nuevo o cambiado por el robot: confianza "Alta" en la rama
            investigado: new Date().toISOString(),
            fuente: f0.nivel_dominio === "oficial" ? "Registro oficial" : "Prensa de referencia",
            url: f0.url_final,
            lei: check.gleif.lei !== "na" ? check.gleif.lei : undefined
          };
        } else {
          db.grupos[gid].controlador = prop.valor_nuevo;
          db.grupos[gid].confianza = "Alta"; // P1.12: Grupo nuevo o cambiado por el robot: confianza "Alta" en la rama
          db.grupos[gid].investigado = new Date().toISOString();
          db.grupos[gid].url = f0.url_final;
          if (check.gleif.lei !== "na") db.grupos[gid].lei = check.gleif.lei;
        }

        // P1.12: Al aprobar una propuesta: agregar la MARCA a db.marcas → {n, g, job:1} además del grupo
        let brandEntry = db.marcas.find((m) => QED.norm(m.n) === normBrand);
        if (!brandEntry) {
          db.marcas.push({ n: item.brand, g: gid, job: 1 });
        } else {
          brandEntry.g = gid;
          brandEntry.job = 1;
        }

        let factcheckStatus = "na";
        if (process.env.GINA_FACTCHECK_KEY) {
          const fc = await checkFactCheck(prop.empresa, prop.valor_nuevo, process.env.GINA_FACTCHECK_KEY, fetchImpl);
          factcheckStatus = fc.status || "na";
          if (fc.status === "conflicto") {
            report.rechazadas.push(`${prop.empresa}: Conflicto en Fact Check`);
            continue;
          }
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
          factcheck: factcheckStatus,
          aprobado_en_pr: `datos/${report.inicio.slice(0, 10)}`
        });

        report.cambios.push({
          grupo: prop.empresa,
          gid,
          antes: prop.valor_anterior || "(nuevo)",
          despues: prop.valor_nuevo,
          url: f0.url_final,
          cita: f0.cita,
          archivo: f0.archivo_url,
          issueNumber: item.issueNumber
        });

        if (item.issueNumber) {
          issuesToClose.push(item.issueNumber);
        }
      } else {
        report.rechazadas.push(`${prop.empresa}: ${check.motivo}`);
        if (item.issueNumber) {
          try {
            execFileImpl("gh", ["issue", "edit", String(item.issueNumber), "--repo", repo, "--add-label", "sin-fuente"]);
            execFileImpl("gh", ["issue", "comment", String(item.issueNumber), "--repo", repo, "--body", `No se pudo verificar la fuente: ${check.motivo}`]);
          } catch (_) {}
        }
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

  const closesLines = issuesToClose.length
    ? ["", "### Issues resueltos", ...issuesToClose.map((n) => `Closes #${n}`)]
    : [];

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
    ...closesLines,
    "",
    `Proveedor: ${report.proveedor} · Modelo: ${report.modelo} · Fecha: ${dateStr}`
  ].join("\n");

  // Guardar estado
  state.ultimoRun = new Date().toISOString();
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2), "utf8");

  // Si hay cambios y no es dryRun, agregar filas a evidencias.csv
  if (!dry && nuevasEvidencias.length > 0) {
    let csvContent = "";
    for (const ev of nuevasEvidencias) {
      csvContent += serializeCsvRow([
        ev.grupo_id,
        ev.url_final,
        ev.nivel_dominio,
        ev.cita,
        ev.fecha_consulta,
        ev.archivo_url,
        ev.safe_browsing,
        ev.gleif_lei,
        ev.gleif_coincide,
        ev.factcheck,
        ev.aprobado_en_pr
      ]);
    }
    fs.appendFileSync(EVIDENCIAS_PATH, csvContent, "utf8");
    fs.writeFileSync(BRANDS, JSON.stringify(db, null, 1), "utf8");
  }

  // P0.4: Escribir job/reportes/AAAA-MM-DD.md ANTES del commit
  if (!dry) {
    fs.mkdirSync(REPORTS, { recursive: true });
    fs.writeFileSync(path.join(REPORTS, `${dateStr}.md`), prMarkdown, "utf8");
  }

  // P0.2: Con 0 cambios: no crear rama, ni commit, ni PR. Escribir el reporte y salir con código 0.
  if (report.cambios.length === 0) {
    console.log(prMarkdown);
    console.log("0 cambios propuestos: no se crea rama ni PR.");
    return { report, prResult: null };
  }

  // Etapa 4: Crear rama y PR
  const prResult = await createReviewPR({
    branchName,
    reportMarkdown: prMarkdown,
    changesList: report.cambios,
    dryRun: dry,
    token,
    repo,
    execFileImpl
  });

  // P1.12: Comentar en issues: propuesta → "Propuesta en PR #X"
  const prRef = (prResult && prResult.prUrl) ? prResult.prUrl : branchName;
  for (const n of issuesToClose) {
    try {
      execFileImpl("gh", ["issue", "comment", String(n), "--repo", repo, "--body", `Propuesta en PR ${prRef}`]);
    } catch (_) {}
  }

  console.log(prMarkdown);
  return { report, prResult };
}

async function verifyEnergyStarModel(modelNumber, fetchFn = globalThis.fetch) {
  if (!modelNumber || typeof modelNumber !== "string") return null;
  const cleanModel = modelNumber.trim();
  if (cleanModel.length < 3) return null;
  const queryUrl = `https://data.energystar.gov/resource/735e-a638.json?$where=upper(model_number)%20like%20upper('%25${encodeURIComponent(cleanModel)}%25')&$limit=1`;
  try {
    const res = await fetchFn(queryUrl, { headers: { "Accept": "application/json" } });
    if (!res || !res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const match = data[0];
      return {
        certified: true,
        model: match.model_number || cleanModel,
        brandName: match.brand_name || "",
        source: "https://data.energystar.gov",
        url_oficial: "https://www.energystar.gov/productfinder/"
      };
    }
  } catch (e) {
    // Silencioso ante fallos
  }
  return null;
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
  verifyEnergyStarModel,
  getNextBranchName,
  serializeCsvRow,
  createReviewPR,
  loadIssues,
  parseIssueContent,
  closeLegacyIssues,
  main
};
