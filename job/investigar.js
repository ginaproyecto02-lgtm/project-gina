#!/usr/bin/env node
// SPDX-License-Identifier: MIT
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
const crypto = require("crypto");
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

function hash8(str) {
  return crypto.createHash("sha256").update(String(str || ""), "utf8").digest("hex").slice(0, 8);
}

function truncateUtf8(str, maxBytes = 20480) {
  let clean = String(str || "").replace(/\s+/g, " ").trim();
  if (Buffer.byteLength(clean, "utf8") <= maxBytes) return clean;
  clean = clean.slice(0, maxBytes);
  while (Buffer.byteLength(clean, "utf8") > maxBytes) {
    clean = clean.slice(0, Math.floor(clean.length * 0.9));
  }
  return clean;
}

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

  let finalUrl = resolved.finalUrl || source.url;
  let text = "";

  if (resolved.ok) {
    text = extractText(resolved.body, resolved.contentType);
  } else if (source.fromLibrary && (source.extracto || source.cita)) {
    finalUrl = source.url;
    text = String(source.extracto || source.cita || "");
  } else {
    return { ok: false, motivo: resolved.error || `HTTP ${resolved.status}`, url: source.url };
  }

  const sb = await checkSafeBrowsing(finalUrl, options.safeBrowsingKey, fetchImpl);
  if (!sb.safe) return { ok: false, motivo: "Safe Browsing detectó amenaza", url: finalUrl };

  const nivel = classifyDomain(finalUrl, dominios);
  if (nivel === "bloqueado") return { ok: false, motivo: "Dominio bloqueado", nivel: "bloqueado", url: finalUrl };
  if (!nivel) return { ok: false, motivo: "Dominio no listado en dominios.json", nivel: null, url: finalUrl };

  const cita = findCitationSentence(text, company, controller);
  if (!cita) {
    return { ok: false, motivo: "Página no contiene cita del controlador ni porcentaje", url: finalUrl };
  }

  let archivoUrl = source.archivo_url || `https://web.archive.org/web/${finalUrl}`;
  if (!options.skipArchive && !source.fromLibrary) {
    archivoUrl = await archiveWayback(finalUrl, fetchImpl);
  }

  return {
    ok: true,
    url_final: finalUrl,
    nivel_dominio: nivel,
    cita,
    extracto: truncateUtf8(text, 20480),
    archivo_url: archivoUrl,
    safe_browsing: sb.status || "ok"
  };
}

// ---------------------------------------------------------------- Etapa 3: CONTRASTAR propuesta con reglas y registros
async function contrastProposal(prop, existingGroup, dominios, options = {}, fetchImpl = fetch) {
  const verifiedSources = [];
  const domainHosts = new Set();
  let hasOficial = false;

  const rawSources = prop.fuentes || prop.fuentes_esperadas || [];
  for (const f of rawSources) {
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

function defaultExecFile(cmd, args, opts) {
  if (process.platform === "win32" && (cmd === "gh" || cmd === "git")) {
    const pathDirs = String(process.env.PATH || "").split(path.delimiter);
    for (const d of pathDirs) {
      if (!d) continue;
      const jsShim = path.join(d, cmd + ".js");
      if (fs.existsSync(jsShim)) {
        return execFileSync(process.execPath, [jsShim, ...(args || [])], opts);
      }
    }
  }
  return execFileSync(cmd, args, opts);
}

function getNextBranchName(baseName, execFileImpl = defaultExecFile, cwd = ROOT) {
  let suffix = 1;
  while (true) {
    const candidate = suffix === 1 ? baseName : `${baseName}-${suffix}`;
    let exists = false;
    try {
      const outLocal = execFileImpl("git", ["branch", "--list", candidate], { cwd, encoding: "utf8" });
      if (outLocal && outLocal.includes(candidate)) exists = true;
    } catch (_) {}
    if (!exists) {
      try {
        const outRemote = execFileImpl("git", ["ls-remote", "--heads", "origin", candidate], { cwd, encoding: "utf8" });
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
async function createReviewPR({ branchName, reportMarkdown, changesList, dryRun, token, repo, execFileImpl = defaultExecFile, rootDir = ROOT }) {
  const finalBranchName = getNextBranchName(branchName, execFileImpl, rootDir);
  const statePath = path.join(rootDir, "job", "estado.json");

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
    const prsOut = execFileImpl("gh", ["pr", "list", "--repo", repo, "--state", "open", "--json", "number,headRefName,createdAt"], { cwd: rootDir, encoding: "utf8" });
    const prs = JSON.parse(prsOut || "[]");
    const now = Date.now();
    for (const pr of prs) {
      if (pr.headRefName && pr.headRefName.startsWith("datos/")) {
        const ageDays = (now - Date.parse(pr.createdAt)) / DAY;
        if (ageDays >= 14) {
          execFileImpl("gh", ["pr", "close", String(pr.number), "--repo", repo, "--comment", "Cerrado automáticamente tras 14 días sin revisión; reemplazado por la ejecución actual."], { cwd: rootDir, stdio: "ignore" });
        }
      }
    }
  } catch (_) {}

  // 2. Crear rama y commit
  execFileImpl("git", ["checkout", "-b", finalBranchName], { cwd: rootDir });

  // Asegurar job/estado.json si no existe (P0.3)
  if (!fs.existsSync(statePath)) {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify({ marcas: {}, revalidados: {}, lastRun: Date.now() }, null, 2), "utf8");
  }

  const candidatePaths = [
    "extension/data/brands.json",
    "datagen/evidencias.csv",
    "job/estado.json",
    "job/reportes",
    "datagen/fuentes"
  ];
  const pathsToAdd = candidatePaths.filter((p) => fs.existsSync(path.resolve(rootDir, p)));
  if (pathsToAdd.length > 0) {
    execFileImpl("git", ["add", ...pathsToAdd], { cwd: rootDir });
  }

  execFileImpl("git", ["commit", "-m", `datos: propuesta semanal ${finalBranchName.replace("datos/", "")} (${changesList ? changesList.length : 0} cambios)`], { cwd: rootDir });

  // 3. Verificar rutas permitidas DENTRO de createReviewPR antes de git push (P0.5)
  const diffSet = new Set();
  const addLines = (out) => {
    for (const line of String(out || "").split("\n")) {
      const clean = line.trim().replace(/\\/g, "/");
      if (clean) diffSet.add(clean);
    }
  };
  try {
    addLines(execFileImpl("git", ["diff", "--name-only", "main...HEAD"], { cwd: rootDir, encoding: "utf8" }));
  } catch (_) {
    try {
      addLines(execFileImpl("git", ["diff", "--name-only", "main"], { cwd: rootDir, encoding: "utf8" }));
    } catch (_) {
      try {
        addLines(execFileImpl("git", ["diff", "--name-only", "HEAD~1"], { cwd: rootDir, encoding: "utf8" }));
      } catch (_) {}
    }
  }
  try {
    addLines(execFileImpl("git", ["diff", "--name-only"], { cwd: rootDir, encoding: "utf8" }));
  } catch (_) {}
  try {
    addLines(execFileImpl("git", ["diff", "--cached", "--name-only"], { cwd: rootDir, encoding: "utf8" }));
  } catch (_) {}

  const files = Array.from(diffSet);
  const ALLOWED_REGEX = /^(extension\/data\/brands\.json|datagen\/evidencias\.csv|job\/estado\.json|job\/reportes\/|datagen\/fuentes\/)/;
  const disallowed = files.filter((f) => !ALLOWED_REGEX.test(f));
  if (disallowed.length > 0) {
    throw new Error(`Rutas no permitidas modificadas antes del push: ${disallowed.join(", ")}`);
  }

  // 4. Git push
  execFileImpl("git", ["push", "origin", finalBranchName], { cwd: rootDir });

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
    prUrl = (execFileImpl("gh", prArgs, { cwd: rootDir, encoding: "utf8" }) || "").trim();
  } finally {
    try { fs.unlinkSync(tmpBodyFile); } catch (_) {}
  }

  execFileImpl("git", ["checkout", "main"], { cwd: rootDir });

  return { branch: finalBranchName, prUrl, dryRun: false, changesCount: changesList ? changesList.length : 0 };
}

// ---------------------------------------------------------------- Biblioteca local de fuentes (P2.14)
function queryLibrary(brand, { fuentesDir = path.join(DATAGEN, "fuentes"), indiceDbPath = path.join(DATAGEN, "indice_fuentes.sqlite") } = {}) {
  const normBrand = QED.norm(brand);
  if (!normBrand) return null;

  const candidates = [];
  const indiceScript = path.join(DATAGEN, "indice_fuentes.py");
  if (fs.existsSync(indiceScript) && fs.existsSync(fuentesDir)) {
    for (const pyBin of ["python3", "python"]) {
      try {
        const out = execFileSync(
          pyBin,
          [indiceScript, "--no-sync", "--db", indiceDbPath, "--dir", fuentesDir, "--query", brand],
          { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
        );
        if (out) {
          const rows = JSON.parse(out);
          if (Array.isArray(rows)) candidates.push(...rows);
        }
        break;
      } catch (_) {}
    }
  }

  if (fs.existsSync(fuentesDir)) {
    const files = fs.readdirSync(fuentesDir).filter((x) => x.endsWith(".json"));
    for (const f of files) {
      const fData = readJSON(path.join(fuentesDir, f), null);
      if (fData) candidates.push(Object.assign({ archivo: f }, fData));
    }
  }

  for (const fData of candidates) {
    if (!fData || !fData.fecha || !fData.url_final || !fData.cita) continue;
    const age = Date.now() - new Date(fData.fecha).getTime();
    if (!(age < 365 * DAY)) continue; // Menos de 12 meses
    const haystack = [
      fData.cita || "",
      fData.extracto || "",
      fData.empresa || "",
      fData.marca || "",
      fData.archivo || ""
    ].map((x) => QED.norm(x)).join(" ");
    if (haystack.includes(normBrand)) {
      return {
        grupo_id: fData.grupo_id || null,
        empresa: fData.empresa || brand,
        marca: brand,
        campo: "controlador",
        valor_nuevo: fData.controlador || fData.empresa || brand,
        pais: fData.pais || "México",
        tipo: fData.tipo || "Corporación",
        licencia_origen: fData.licencia_origen || undefined,
        atribucion: fData.atribucion || fData.nota || undefined,
        fuentes: [{
          url: fData.url_final,
          cita: fData.cita,
          extracto: fData.extracto || fData.cita,
          archivo_url: fData.archivo_url || `https://web.archive.org/web/${fData.url_final}`,
          fromLibrary: true
        }]
      };
    }
  }
  return null;
}

function inferSourceLicense(origen, urlFinal, nivelDominio) {
  const u = String(urlFinal || "").toLowerCase();
  const o = String(origen || "").toLowerCase();
  if (o === "cc0" || o === "wikidata" || u.includes("wikidata.org")) return "CC0";
  if (o === "odbl" || o === "openfoodfacts" || u.includes("openfoodfacts.org")) return "ODbL";
  if (o === "oficial" || nivelDominio === "oficial") return "oficial";
  return "prensa";
}


// ---------------------------------------------------------------- Helpers de sugerencias y pendientes
function loadPending(pendDir = PEND_DIR) {
  const items = new Map();
  if (!fs.existsSync(pendDir)) return items;
  for (const f of fs.readdirSync(pendDir).filter((x) => x.endsWith(".json"))) {
    const data = readJSON(path.join(pendDir, f), null);
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
    const mTitle = title.match(/(?:Marca faltante|Sugerencia de marca):\s*(.+)/i);
    if (mTitle) brand = mTitle[1].trim();
  }
  const mStore = body.match(/###\s*Tienda\s*\r?\n+([^\r\n#]+)/i);
  const mPais = body.match(/###\s*Pa[ií]s\s*\r?\n+([^\r\n#]+)/i);
  const mProd = body.match(/###\s*Producto\s*\r?\n+([^\r\n#]+)/i);
  const mDueno = body.match(/###\s*Due[ñn]o[^\r\n]*\r?\n+([^\r\n#]+)/i);
  const mFuente = body.match(/###\s*Fuente[^\r\n]*\r?\n+([^\r\n#]+)/i);

  if (brand && !/^_No response_$/i.test(brand)) {
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

async function loadIssues(repo, token, execFileImpl = defaultExecFile, fetchImpl = fetch, cwd = ROOT) {
  if (!repo) return [];
  let issues = null;
  try {
    const out = execFileImpl("gh", ["issue", "list", "--repo", repo, "--state", "open", "--json", "number,title,body,labels,createdAt", "--limit", "100"], { cwd, encoding: "utf8" });
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
// ---------------------------------------------------------------- C4: revalidación de evidencias
// CSV mínimo con comillas dobles ("" = comilla literal).
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); if (row.some((c) => c !== "")) rows.push(row); }
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
}

// ¿La cita sigue en la página? Igualdad normalizada o, si el HTML cambió de forma, ≥80% de sus palabras de 5+ letras.
function citaPresente(pageText, cita) {
  const page = normalizeText(pageText || "");
  const c = normalizeText(cita || "");
  if (!c) return false;
  if (page.includes(c)) return true;
  const words = c.split(" ").filter((w) => w.length >= 5);
  if (words.length < 4) return false;
  const hits = words.filter((w) => page.includes(w)).length;
  return hits / words.length >= 0.8;
}

async function revalidateEvidencias({ evidenciasPath, db, state, limit, fetchImpl = fetch, now = Date.now() }) {
  const out = { vigentes: [], fallidas: [] };
  if (!fs.existsSync(evidenciasPath) || !(limit > 0)) return out;
  state.revalidados = state.revalidados || {};
  const rows = parseCsv(fs.readFileSync(evidenciasPath, "utf8"))
    .filter((r) => r.grupo_id && /^https:\/\//.test(r.url_final || "") && db.grupos && db.grupos[r.grupo_id])
    // No repetir una revisión de menos de 90 días
    .filter((r) => !(state.revalidados[r.grupo_id] && now - Date.parse(state.revalidados[r.grupo_id]) < 90 * DAY))
    // Las más viejas primero (las de más de 12 meses quedan al principio)
    .sort((a, b) => String(a.fecha_consulta || "").localeCompare(String(b.fecha_consulta || "")))
    .slice(0, limit);
  const hoy = new Date(now).toISOString().slice(0, 10);
  for (const r of rows) {
    const g = db.grupos[r.grupo_id];
    let motivo = "";
    const res = await resolveUrl(r.url_final, fetchImpl);
    if (!res.ok) motivo = `Fuente ya no disponible (${hoy}): ${res.error || "HTTP " + res.status}`;
    else if (!citaPresente(extractText(res.body, res.contentType), r.cita)) motivo = `Fuente ya no disponible (${hoy}): la cita ya no aparece en la página`;
    state.revalidados[r.grupo_id] = new Date(now).toISOString();
    if (!motivo) { out.vigentes.push(g.empresa); continue; }
    const antes = g.confianza;
    g.confianza = "Verificar";
    g.nota = [g.nota, motivo].filter(Boolean).join(" ");
    out.fallidas.push({ gid: r.grupo_id, empresa: g.empresa, antes, url: r.url_final, archivo: r.archivo_url, motivo });
  }
  return out;
}

async function main(options = {}) {
  const rootDir = options.rootDir || ROOT;
  const brandsPath = options.brandsPath || path.join(rootDir, "extension", "data", "brands.json");
  const pendDir = options.pendDir || path.join(rootDir, "job", "pendientes");
  const statePath = options.statePath || path.join(rootDir, "job", "estado.json");
  const reportsDir = options.reportsDir || path.join(rootDir, "job", "reportes");
  const dominiosPath = options.dominiosPath || path.join(rootDir, "datagen", "dominios.json");
  const evidenciasPath = options.evidenciasPath || path.join(rootDir, "datagen", "evidencias.csv");
  const fuentesDir = options.fuentesDir || path.join(rootDir, "datagen", "fuentes");
  const indiceDbPath = options.indiceDbPath || path.join(rootDir, "datagen", "indice_fuentes.sqlite");

  const provider = options.provider || env("PROVIDER", "anthropic");
  const p = AI.PROVIDERS[provider];
  if (!p) throw new Error(`Proveedor desconocido: ${provider}`);
  const envKey = { anthropic: "ANTHROPIC_API_KEY", gemini: "GEMINI_API_KEY", groq: "GROQ_API_KEY", xai: "XAI_API_KEY", openai: "OPENAI_API_KEY" }[provider];
  const apiKey = options.apiKey !== undefined ? options.apiKey : env("API_KEY", process.env[envKey] || "");

  const cfg = {
    provider,
    model: options.model || env("MODEL", p.classifyModel || p.researchModel),
    key: apiKey,
    base: env("BASE_URL", ""),
    maxSearches: parseInt(env("MAX_SEARCHES", "3"), 10)
  };
  const dry = options.dryRun !== undefined ? !!options.dryRun : env("DRY_RUN", "") === "1";
  const limit = Math.min(25, parseInt(options.limit !== undefined ? options.limit : env("LIMIT", "25"), 10)); // Límite máx 25 cambios por PR
  const everyDays = parseFloat(options.everyDays || env("EVERY_DAYS", "14"));
  const force = options.force !== undefined ? options.force : (dry || env("FORCE", "") === "1");
  const revalidateLimit = parseInt(options.revalidate !== undefined ? options.revalidate : env("REVALIDATE", "0"), 10);
  const repLimit = parseInt(options.repLimit !== undefined ? options.repLimit : env("REP_LIMIT", "0"), 10);

  const dominios = loadDominios(dominiosPath);
  const repo = options.repo || process.env.GITHUB_REPOSITORY || "ginaproyecto02-lgtm/project-gina";
  const token = options.token || process.env.GITHUB_TOKEN || "";
  const execFileImpl = options.execFileImpl || defaultExecFile;
  const fetchImpl = options.fetchImpl || fetch;
  const aiResearchImpl = options.aiResearchImpl || ((c, it, grps) => AI.research(c, it, grps, fetchImpl));
  const skipArchive = options.skipArchive !== undefined ? options.skipArchive : false;

  // El estado (última ejecución, revalidaciones) solo lo escribe el robot en GitHub Actions; una corrida local
  // nunca debe dejar un ultimoRun versionado que bloquee la ejecución programada del lunes.
  const writeState = !dry && (process.env.GITHUB_ACTIONS === "true" || !!options.rootDir || !!options.statePath || env("WRITE_STATE", "") === "1");

  const db = readJSON(brandsPath, null);
  if (!db) throw new Error("No se pudo leer " + brandsPath);
  const state = readJSON(statePath, { marcas: {}, revalidados: {}, ultimoRun: null, rechazosAltosSeguidos: 0 });

  // P1.12: Restaurar GINA_EVERY_DAYS (con job/estado.json)
  if (!force && state.ultimoRun && Date.now() - new Date(state.ultimoRun).getTime() < everyDays * DAY) {
    console.log(`Menos de ${everyDays} días desde la última ejecución (${state.ultimoRun}); se omite la ejecución periódica.`);
    return { report: { inicio: new Date().toISOString(), cambios: [], rechazadas: [], propuestas: [] }, prResult: null };
  }


  const metricas = {
    issuesLeidos: 0,
    propuestas: 0,
    aprobadas: 0,
    rechazadasPorMotivo: {},
    resueltasPor: { yaExistia: 0, biblioteca: 0, wikidata: 0, ia: 0 },
    llamadasIA: 0,
    tokensEntrada: 0,
    tokensSalida: 0,
    busquedasWeb: 0,
    costoEstimadoUsd: 0,
    diasIssueMerge: "N/A"
  };

  function addRejectReason(brandOrCompany, reason) {
    const cleanReason = String(reason || "Motivo no especificado").trim();
    report.rechazadas.push(`${brandOrCompany}: ${cleanReason}`);
    metricas.rechazadasPorMotivo[cleanReason] = (metricas.rechazadasPorMotivo[cleanReason] || 0) + 1;
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
    errores: [],
    metricas,
    alertaRobot: false
  };

  // P1.12: main() llama a loadIssues() y une los issues con pendientes/; quita duplicados por marca normalizada
  const queue = [];
  const seenBrands = new Map(); // normBrand -> issueNumber
  const parsedIssues = await loadIssues(repo, token, execFileImpl, fetchImpl, rootDir);
  metricas.issuesLeidos = parsedIssues.length;

  for (const iss of parsedIssues) {
    // Más de 30 días en sin-fuente → cerrar explicando
    if (iss.labels.includes("sin-fuente")) {
      const ageMs = Date.now() - new Date(iss.createdAt).getTime();
      if (ageMs > 30 * DAY) {
        if (!dry) {
          try {
            execFileImpl("gh", ["issue", "comment", String(iss.number), "--repo", repo, "--body", "Cerrado automáticamente: más de 30 días sin fuente verificable."], { cwd: rootDir });
            execFileImpl("gh", ["issue", "close", String(iss.number), "--repo", repo, "--reason", "completed"], { cwd: rootDir });
          } catch (_) {}
        }
        continue;
      }
    }

    for (const it of iss.items) {
      if (!it.brand) continue;
      const nb = QED.norm(it.brand);
      if (seenBrands.has(nb)) {
        // duplicado → "Duplicada de #N" + cerrar
        const firstNum = seenBrands.get(nb);
        if (firstNum && iss.number !== firstNum && !dry) {
          try {
            execFileImpl("gh", ["issue", "comment", String(iss.number), "--repo", repo, "--body", `Duplicada de #${firstNum}`], { cwd: rootDir });
            execFileImpl("gh", ["issue", "close", String(iss.number), "--repo", repo, "--reason", "completed"], { cwd: rootDir });
          } catch (_) {}
        }
        continue;
      }
      seenBrands.set(nb, iss.number);
      queue.push(Object.assign({}, it, { issueNumber: iss.number, issueLabels: iss.labels, issueCreatedAt: iss.createdAt }));
    }
  }

  // Unir con pendientes locales
  const pendingMap = loadPending(pendDir);
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
  const issueAgesDays = [];

  for (const item of toProcess) {
    const normBrand = QED.norm(item.brand);

    // P1.12: (a) ¿La marca ya existe? → comentar y cerrar
    const existingMarca = db.marcas.find((m) => QED.norm(m.n) === normBrand);
    if (existingMarca) {
      const g = db.grupos[existingMarca.g];
      const grpName = g ? g.empresa : existingMarca.g;
      metricas.resueltasPor.yaExistia++;
      if (item.issueNumber && !dry) {
        try {
          execFileImpl("gh", ["issue", "comment", String(item.issueNumber), "--repo", repo, "--body", `Ya está en la base (grupo ${grpName})`], { cwd: rootDir });
          execFileImpl("gh", ["issue", "close", String(item.issueNumber), "--repo", repo, "--reason", "completed"], { cwd: rootDir });
        } catch (_) {}
      }
      continue;
    }

    // P1.12 & P2.14: (b) Biblioteca local datagen/fuentes/ (< 12 meses, consulta índice FTS5 / JSON)
    let prop = queryLibrary(item.brand, { fuentesDir, indiceDbPath });
    let origen = prop ? "biblioteca" : "";

    // P1.12: (c) Wikidata con referencia (wikidataOwner)
    if (!prop) {
      try {
        const wikiHits = await wikidataOwner(item.brand, fetchImpl);
        const wikiWithRef = wikiHits.filter((w) => w.refUrl && /^https:\/\//i.test(w.refUrl));
        if (wikiWithRef.length > 0) {
          const wikiRef = wikiWithRef[0];
          const matchedGid = Object.keys(db.grupos).find((id) => QED.norm(db.grupos[id].empresa) === QED.norm(wikiRef.owner)) || null;
          prop = {
            grupo_id: matchedGid,
            empresa: matchedGid ? db.grupos[matchedGid].empresa : wikiRef.owner,
            marca: item.brand,
            campo: "controlador",
            valor_nuevo: matchedGid ? db.grupos[matchedGid].controlador : wikiRef.owner,
            pais: (matchedGid && db.grupos[matchedGid].pais) || item.pais || "EE.UU.",
            tipo: (matchedGid && db.grupos[matchedGid].tipo) || "Corporación",
            fuentes: wikiWithRef.map((w) => ({ url: w.refUrl, cita: wikiRef.owner }))
          };
          origen = "wikidata";
        }
      } catch (_) {}
    }

    // P1.12: (d) IA solo si lo anterior no resolvió
    if (!prop && cfg.key) {
      try {
        metricas.llamadasIA++;
        const r = await aiResearchImpl(cfg, { brand: item.brand, title: item.title, site: item.site, hint: item.hint }, db.grupos);
        if (r && r.usage) {
          metricas.tokensEntrada += r.usage.input || 0;
          metricas.tokensSalida += r.usage.output || 0;
        }
        if (r && r.searches) {
          metricas.busquedasWeb += r.searches || 0;
        }
        if (r && r.normalized && r.normalized.propuesta && AI.validateProposal(r.normalized.propuesta)) {
          prop = r.normalized.propuesta;
          origen = "ia";
        }
      } catch (e) {
        report.errores.push(`${item.brand || item.title}: ${e.message}`);
      }
    }

    // Si ninguna vía dio con fuente verificable
    if (!prop) {
      addRejectReason(item.brand, "Sin fuente verificable");
      if (item.issueNumber && !dry) {
        try {
          execFileImpl("gh", ["issue", "edit", String(item.issueNumber), "--repo", repo, "--add-label", "sin-fuente"], { cwd: rootDir });
          execFileImpl("gh", ["issue", "comment", String(item.issueNumber), "--repo", repo, "--body", "No se encontró una fuente verificable para esta marca. Si tienes un enlace oficial o de registro público, compártelo aquí para reabrirla."], { cwd: rootDir });
        } catch (_) {}
      }
      continue;
    }

    report.propuestas.push(prop);
    metricas.propuestas++;

    // 2 & 3. Verificar y Contrastar
    try {
      const check = await contrastProposal(prop, db.grupos[prop.grupo_id], dominios, { safeBrowsingKey: process.env.GINA_SAFEBROWSING_KEY, skipArchive }, fetchImpl);
      if (check.aprobada && check.fuentes.length > 0) {
        let factcheckStatus = "na";
        if (process.env.GINA_FACTCHECK_KEY) {
          const fc = await checkFactCheck(prop.empresa, prop.valor_nuevo, process.env.GINA_FACTCHECK_KEY, fetchImpl);
          factcheckStatus = fc.status || "na";
          if (fc.status === "conflicto") {
            addRejectReason(prop.empresa, "Conflicto en Fact Check");
            continue;
          }
        }

        const f0 = check.fuentes[0];
        const licenciaOrigen = prop.licencia_origen && ["CC0", "ODbL", "oficial", "prensa"].includes(prop.licencia_origen)
          ? prop.licencia_origen
          : inferSourceLicense(origen, f0.url_final, f0.nivel_dominio);
        let gid = prop.grupo_id;
        if (!gid || !db.grupos[gid]) {
          gid = gid || ("inv_" + slug(prop.empresa));
          db.grupos[gid] = {
            empresa: prop.empresa,
            controlador: prop.valor_nuevo,
            pais: prop.pais || item.pais || "EE.UU.",
            tipo: prop.tipo || "Corporación",
            confianza: "Alta", // P1.12: Grupo nuevo o cambiado por el robot: confianza "Alta" en la rama
            investigado: new Date().toISOString(),
            fuente: f0.nivel_dominio === "oficial" ? "Registro oficial" : "Prensa de referencia",
            url: f0.url_final,
            licencia_origen: licenciaOrigen,
            atribucion: prop.atribucion || prop.nota || undefined,
            lei: check.gleif.lei !== "na" ? check.gleif.lei : undefined
          };
        } else {
          db.grupos[gid].controlador = prop.valor_nuevo;
          db.grupos[gid].confianza = "Alta"; // P1.12: Grupo nuevo o cambiado por el robot: confianza "Alta" en la rama
          db.grupos[gid].investigado = new Date().toISOString();
          db.grupos[gid].url = f0.url_final;
          db.grupos[gid].licencia_origen = licenciaOrigen;
          if (prop.atribucion || prop.nota) db.grupos[gid].atribucion = prop.atribucion || prop.nota;
          if (check.gleif.lei !== "na") db.grupos[gid].lei = check.gleif.lei;
        }

        // P1.12: Al aprobar una propuesta: agregar la MARCA a db.marcas → {n, g, job:1} además del grupo
        let brandEntry = db.marcas.find((m) => QED.norm(m.n) === normBrand);
        if (!brandEntry) {
          const newBrand = { n: item.brand, g: gid, job: 1, licencia_origen: licenciaOrigen };
          if (prop.atribucion || prop.nota) newBrand.atribucion = prop.atribucion || prop.nota;
          db.marcas.push(newBrand);
        } else {
          brandEntry.g = gid;
          brandEntry.job = 1;
          brandEntry.licencia_origen = licenciaOrigen;
          if (prop.atribucion || prop.nota) brandEntry.atribucion = prop.atribucion || prop.nota;
        }

        if (origen && metricas.resueltasPor[origen] !== undefined) {
          metricas.resueltasPor[origen]++;
        }

        // P2.14: Guardar evidencia en datagen/fuentes/<grupo_id>-<hash8>.json
        if (!dry) {
          fs.mkdirSync(fuentesDir, { recursive: true });
          for (const src of check.fuentes) {
            const h8 = hash8(src.url_final);
            const fuenteFile = path.join(fuentesDir, `${gid}-${h8}.json`);
            const srcLicencia = prop.licencia_origen && ["CC0", "ODbL", "oficial", "prensa"].includes(prop.licencia_origen)
              ? prop.licencia_origen
              : inferSourceLicense(origen, src.url_final, src.nivel_dominio);
            const fuentePayload = {
              grupo_id: gid,
              empresa: prop.empresa,
              controlador: prop.valor_nuevo,
              pais: db.grupos[gid].pais,
              tipo: db.grupos[gid].tipo,
              url_final: src.url_final,
              archivo_url: src.archivo_url,
              fecha: report.inicio.slice(0, 10),
              cita: src.cita,
              extracto: truncateUtf8(src.extracto || src.cita || "", 20480),
              licencia_origen: srcLicencia,
              atribucion: prop.atribucion || prop.nota || undefined
            };
            fs.writeFileSync(fuenteFile, JSON.stringify(fuentePayload, null, 2), "utf8");
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
          marca: item.brand,
          origen,
          licencia_origen: licenciaOrigen,
          antes: prop.valor_anterior || "(nuevo)",
          despues: prop.valor_nuevo,
          url: f0.url_final,
          cita: f0.cita,
          archivo: f0.archivo_url,
          issueNumber: item.issueNumber
        });
        metricas.aprobadas++;

        if (item.issueNumber) {
          issuesToClose.push(item.issueNumber);
          if (item.issueCreatedAt) {
            const ageDays = Math.max(0, (Date.now() - new Date(item.issueCreatedAt).getTime()) / DAY);
            if (!Number.isNaN(ageDays)) issueAgesDays.push(ageDays);
          }
        }
      } else {
        addRejectReason(prop.empresa, check.motivo);
        if (item.issueNumber && !dry) {
          try {
            execFileImpl("gh", ["issue", "edit", String(item.issueNumber), "--repo", repo, "--add-label", "sin-fuente"], { cwd: rootDir });
            execFileImpl("gh", ["issue", "comment", String(item.issueNumber), "--repo", repo, "--body", `No se pudo verificar la fuente: ${check.motivo}`], { cwd: rootDir });
          } catch (_) {}
        }
      }
    } catch (e) {
      report.errores.push(`${item.brand || item.title}: ${e.message}`);
    }
  }

  // C4: Revalidación determinista de evidencias (GINA_REVALIDATE por ejecución, las más viejas primero).
  // La URL debe seguir abriendo (200) y la cita seguir en la página; si no, el grupo pasa a «Verificar» y va al PR.
  let brandsChanged = false;
  if (revalidateLimit > 0) {
    const rev = await revalidateEvidencias({
      evidenciasPath, db, state, limit: revalidateLimit, fetchImpl, now: Date.now()
    });
    for (const f of rev.fallidas) {
      report.cambios.push({ grupo: f.empresa, gid: f.gid, antes: f.antes, despues: "Verificar", url: f.url, cita: f.motivo, archivo: f.archivo || "" });
      metricas.rechazadasPorMotivo["Fuente ya no disponible"] = (metricas.rechazadasPorMotivo["Fuente ya no disponible"] || 0) + 1;
      brandsChanged = true;
    }
    for (const ok of rev.vigentes) report.revalidadas.push(ok);
  }

  if (repLimit > 0 && cfg.key && AI.researchReputation && QED.REP) {
    const ids = Object.keys(db.grupos || {}).filter((id) => QED.REP.needsResearch(db.reputacion || {}, id, 180)).slice(0, repLimit);
    for (const id of ids) {
      const g = db.grupos[id];
      try {
        metricas.llamadasIA++;
        const r = await AI.researchReputation(cfg, { nombre: g.empresa, pais: g.pais, ya: [] }, fetchImpl);
        if (r && r.verificable) report.reputacion.push(g.empresa);
      } catch (e) {
        report.errores.push(`Reputación ${g.empresa}: ${e.message}`);
      }
    }
  }

  // P2.15: Calcular métricas finales y alerta por >50% de rechazos dos ejecuciones seguidas
  metricas.costoEstimadoUsd = Number(
    (metricas.tokensEntrada / 1e6 * 0.10 + metricas.tokensSalida / 1e6 * 0.50 + metricas.busquedasWeb * 0.01).toFixed(4)
  );
  if (issueAgesDays.length > 0) {
    const avg = issueAgesDays.reduce((a, b) => a + b, 0) / issueAgesDays.length;
    metricas.diasIssueMerge = avg.toFixed(1);
  }

  const totalEvaluadas = metricas.aprobadas + report.rechazadas.length;
  if (totalEvaluadas > 0) {
    const rejectRatio = report.rechazadas.length / totalEvaluadas;
    if (rejectRatio > 0.5) {
      state.rechazosAltosSeguidos = (state.rechazosAltosSeguidos || 0) + 1;
    } else {
      state.rechazosAltosSeguidos = 0;
    }
    if (state.rechazosAltosSeguidos >= 2) {
      report.alertaRobot = true;
      if (!dry) {
        try {
          execFileImpl("gh", [
            "issue", "create",
            "--repo", repo,
            "--title", "Revisar el robot",
            "--body", `Se rechazó más del 50% de las propuestas en ${state.rechazosAltosSeguidos} ejecuciones seguidas (${report.rechazadas.length}/${totalEvaluadas} en ${report.inicio.slice(0, 10)}).`
          ], { cwd: rootDir });
        } catch (_) {}
      }
    }
  }

  // Generar reporte en Markdown para el PR
  const dateStr = report.inicio.slice(0, 10);
  const branchName = `datos/${dateStr}`;
  const tableRows = report.cambios.map(
    (c) => `| ${c.grupo} (\`${c.gid}\`) | ${c.antes} → **${c.despues}** | [Fuente](${c.url}) | «${c.cita}» | [Archivo](${c.archivo}) |`
  );

  const motivosLines = Object.entries(metricas.rechazadasPorMotivo).map(
    ([motivo, count]) => `  - ${motivo}: ${count}`
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
    "",
    "### Métricas de la ejecución",
    `- **Issues leídos**: ${metricas.issuesLeidos}`,
    `- **Propuestas**: ${metricas.propuestas}`,
    `- **Aprobadas**: ${metricas.aprobadas}`,
    `- **Rechazadas por motivo**: ${report.rechazadas.length}`,
    ...motivosLines,
    `- **Resueltas por**: ya existía (${metricas.resueltasPor.yaExistia}) · biblioteca (${metricas.resueltasPor.biblioteca}) · Wikidata (${metricas.resueltasPor.wikidata}) · IA (${metricas.resueltasPor.ia})`,
    `- **Costo estimado**: US$${metricas.costoEstimadoUsd.toFixed(4)} (${metricas.llamadasIA} llamadas IA, ${metricas.busquedasWeb} búsquedas)`,
    `- **Días issue→merge**: ${metricas.diasIssueMerge}`,
    ...closesLines,
    "",
    `Proveedor: ${report.proveedor} · Modelo: ${report.modelo} · Fecha: ${dateStr}`
  ].join("\n");

  // Guardar estado solo cuando no es dryRun (P2.16: canario DRY_RUN=1 sin escribir)
  state.ultimoRun = new Date().toISOString();
  if (writeState) {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
  }

  // Si hay cambios y no es dryRun, agregar filas a evidencias.csv y guardar brands.json
  if (!dry && (nuevasEvidencias.length > 0 || brandsChanged)) {
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
    fs.mkdirSync(path.dirname(evidenciasPath), { recursive: true });
    if (csvContent) fs.appendFileSync(evidenciasPath, csvContent, "utf8");
    fs.mkdirSync(path.dirname(brandsPath), { recursive: true });
    fs.writeFileSync(brandsPath, JSON.stringify(db, null, 1), "utf8");
  }

  // P0.4: Escribir job/reportes/AAAA-MM-DD.md ANTES del commit
  if (!dry) {
    fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(path.join(reportsDir, `${dateStr}.md`), prMarkdown, "utf8");
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
    execFileImpl,
    rootDir
  });

  // P1.12: Comentar en issues: propuesta → "Propuesta en PR #X"
  if (!dry) {
    const rawPrUrl = (prResult && prResult.prUrl) ? prResult.prUrl : branchName;
    const prNumMatch = String(rawPrUrl).match(/\/pull\/(\d+)/);
    const prLabel = prNumMatch ? `#${prNumMatch[1]} (${rawPrUrl})` : rawPrUrl;
    for (const n of issuesToClose) {
      try {
        execFileImpl("gh", ["issue", "comment", String(n), "--repo", repo, "--body", `Propuesta en PR ${prLabel}`], { cwd: rootDir });
      } catch (_) {}
    }
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
  parseCsv,
  citaPresente,
  revalidateEvidencias,
  hash8,
  truncateUtf8,
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
  queryLibrary,
  inferSourceLicense,
  verifyEnergyStarModel,
  getNextBranchName,
  serializeCsvRow,
  createReviewPR,
  loadIssues,
  parseIssueContent,
  main
};

