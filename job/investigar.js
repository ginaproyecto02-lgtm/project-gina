#!/usr/bin/env node
// Project Gina — job de servidor (cada 1–2 semanas): investiga las marcas pendientes y las sugerencias de los usuarios,
// revalida los grupos marcados «Verificar», arma historiales de reputación y publica extension/data/brands.json,
// que todas las extensiones descargan gratis (sin claves).
//
// Para gastar poco: primero consulta Wikidata (gratis); solo lo que no resuelve va a la IA, con un modelo
// económico (Claude Haiku / Gemini Flash-Lite por defecto) y pocas búsquedas web por marca.
//
// Uso:   node job/investigar.js            (Node 18 o superior; sin dependencias)
// Claves (variables de entorno, una según el proveedor; también se aceptan con el prefijo antiguo QED_):
//   GINA_PROVIDER = anthropic | gemini | groq | xai | openai        (por defecto: anthropic)
//   GINA_MODEL    = modelo de investigación                          (por defecto: el recomendado del proveedor)
//   GINA_API_KEY  o ANTHROPIC_API_KEY / GEMINI_API_KEY / GROQ_API_KEY / XAI_API_KEY / OPENAI_API_KEY
//   GINA_BASE_URL = URL base si el proveedor es «openai» (compatible con OpenAI)
//   GINA_LIMIT = marcas por ejecución (25) · GINA_REVALIDATE = grupos a revalidar (3)
//   GINA_REP_LIMIT = historiales de reputación por ejecución (5) · GINA_DRY_RUN=1 no escribe archivos
//   GINA_MAX_SEARCHES = búsquedas web por consulta (3) · GINA_EVERY_DAYS = días entre ejecuciones (14) · GINA_FORCE=1 ignora el intervalo
//   GINA_WIKIDATA=0 desactiva la consulta gratuita a Wikidata
//   GITHUB_TOKEN + GITHUB_REPOSITORY (los pone GitHub Actions): lee las sugerencias enviadas como issues desde la extensión
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const EXT = path.join(ROOT, "extension");
require(path.join(EXT, "src", "matcher.js"));
require(path.join(EXT, "src", "reputation.js"));
require(path.join(EXT, "src", "alternativas.js"));
require(path.join(EXT, "src", "ai.js"));
const QED = globalThis.QED, AI = globalThis.QEDAI;

const BRANDS = path.join(EXT, "data", "brands.json");
const PEND_DIR = path.join(__dirname, "pendientes");
const STATE = path.join(__dirname, "estado.json");
const REPORTS = path.join(__dirname, "reportes");
const DAY = 86400000;
const env = (k, d) => process.env["GINA_" + k] || process.env["AWARENESS_" + k] || process.env["QED_" + k] || d;

const readJSON = (f, def) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return def; } };
const slug = (s) => QED.norm(s).normalize("NFD").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "grupo";

function config() {
  const provider = env("PROVIDER", "anthropic");
  const p = AI.PROVIDERS[provider];
  if (!p) throw new Error(`Proveedor desconocido: ${provider}. Usa uno de: ${Object.keys(AI.PROVIDERS).join(", ")}`);
  const envKey = { anthropic: "ANTHROPIC_API_KEY", gemini: "GEMINI_API_KEY", groq: "GROQ_API_KEY", xai: "XAI_API_KEY", openai: "OPENAI_API_KEY" }[provider];
  return {
    // Por defecto el modelo económico del proveedor (con búsqueda web y verificación de fuentes basta para datos de propiedad).
    cfg: { provider, model: env("MODEL", p.classifyModel || p.researchModel), key: env("API_KEY", process.env[envKey] || ""), base: env("BASE_URL", ""),
      maxSearches: parseInt(env("MAX_SEARCHES", "3"), 10) },
    everyDays: parseFloat(env("EVERY_DAYS", "14")),
    force: env("FORCE", "") === "1",
    wikidata: env("WIKIDATA", "1") !== "0",
    limit: parseInt(env("LIMIT", "25"), 10),
    revalidate: parseInt(env("REVALIDATE", "3"), 10),
    repLimit: parseInt(env("REP_LIMIT", "5"), 10),
    dry: env("DRY_RUN", "") === "1",
    search: !!p.search
  };
}

// Junta todos los archivos exportados desde la extensión (Opciones → «Exportar pendientes»).
function loadPending() {
  const items = new Map();
  if (!fs.existsSync(PEND_DIR)) return items;
  for (const f of fs.readdirSync(PEND_DIR).filter((x) => x.endsWith(".json"))) {
    const data = readJSON(path.join(PEND_DIR, f), null);
    if (!data || !["gina/pendientes", "awareness/pendientes", "quien-esta-detras/pendientes"].includes(data.tipo) || !Array.isArray(data.items)) { console.warn(`Ignorado (formato no válido): ${f}`); continue; }
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

// ---------------------------------------------------------------- Sugerencias de usuarios (issues de GitHub)
// La extensión abre un issue prellenado con el marcador «gina:sugerencia». Solo se leen nombres de marcas, tiendas y productos.
async function gh(pathname, opts) {
  const repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN;
  if (!repo || !token) return null;
  const res = await fetch(`https://api.github.com/repos/${repo}${pathname}`, Object.assign({ headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "project-gina-job" } }, opts || {}));
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return res.json();
}
function parseSuggestion(body) {
  const m = String(body || "").match(/gina:sugerencia v1 tipo=(\w+)/);
  if (!m) return null;
  const tipo = m[1] === "alternativa" ? "alternativa" : "marca";
  const items = [];
  for (const line of String(body).split(/\r?\n/).slice(0, 60)) {
    const l = line.trim();
    if (!l.startsWith("- ")) continue;
    const f = {};
    for (const part of l.slice(2).split("|")) {
      const i = part.indexOf(":");
      if (i > 0) f[QED.norm(part.slice(0, i)).replace(/\s+/g, "")] = part.slice(i + 1).trim().slice(0, 200).replace(/[<>{}]/g, "");
    }
    if (tipo === "alternativa" && f.alternativa) items.push({ marca: f.alternativa.slice(0, 80), categoria: f.categoria || "", pais: f.pais || "", dueno: f.dueno || "", fuente: f.fuente || "" });
    if (tipo === "marca" && (f.marca || f.producto)) items.push({ brand: (f.marca || "").slice(0, 80), site: (f.tienda || "").slice(0, 60), title: (f.producto || "").slice(0, 160) });
  }
  return { tipo, items };
}
async function loadIssues(report) {
  try {
    const issues = (await gh("/issues?state=open&per_page=100")) || [];
    return issues.filter((i) => !i.pull_request).map((i) => Object.assign({ number: i.number }, parseSuggestion(i.body))).filter((i) => i.tipo && i.items.length);
  } catch (e) { report.errores.push("Sugerencias de GitHub: " + e.message); return []; }
}

// ---------------------------------------------------------------- Wikidata (gratis, sin clave)
// Busca la marca y su dueño (P127 «propiedad de», P749 «organización matriz», P176 «fabricante»).
async function wikidataOwner(brand) {
  const q = `SELECT ?item ?itemLabel ?owner ?ownerLabel WHERE {
    SERVICE wikibase:mwapi { bd:serviceParam wikibase:api "EntitySearch"; wikibase:endpoint "www.wikidata.org"; mwapi:search ${JSON.stringify(String(brand).slice(0, 60))}; mwapi:language "es". ?item wikibase:apiOutputItem mwapi:item. }
    ?item wdt:P127|wdt:P749|wdt:P176 ?owner .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". } } LIMIT 8`;
  const res = await fetch("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(q),
    { headers: { accept: "application/sparql-results+json", "user-agent": `ProjectGina/3.0 (https://github.com/${process.env.GITHUB_REPOSITORY || "project-gina"})` } });
  if (!res.ok) throw new Error("Wikidata " + res.status);
  const data = await res.json();
  const want = QED.norm(brand);
  return ((data.results && data.results.bindings) || [])
    .filter((b) => b.itemLabel && QED.norm(b.itemLabel.value) === want && b.ownerLabel && !/^Q\d+$/.test(b.ownerLabel.value))
    .map((b) => ({ item: b.item.value, owner: b.ownerLabel.value, ownerItem: b.owner.value }));
}
// Relaciona el dueño de Wikidata con un grupo de la base (por nombre de empresa).
function groupForOwner(db, owner) {
  const strip = (x) => QED.norm(x).replace(/\([^)]*\)/g, " ").replace(/\b(inc|s a|sa|sab|de cv|ltd|plc|ag|se|nv|company|corporation|corp|group|grupo|holdings?|co)\b/g, " ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const o = strip(owner);
  if (o.length < 4) return null;
  return Object.keys(db.grupos).find((id) => {
    const e = strip(db.grupos[id].empresa);
    return e.length >= 4 && (e === o || e.startsWith(o + " ") || o.startsWith(e + " "));
  }) || null;
}

async function main() {
  const { cfg, limit, revalidate, repLimit, dry, search, everyDays, force, wikidata } = config();
  if (!cfg.key) { console.error("Falta la clave de API (GINA_API_KEY o la variable del proveedor)."); process.exit(1); }
  const db = readJSON(BRANDS, null);
  if (!db) { console.error("No se pudo leer " + BRANDS); process.exit(1); }
  const state = readJSON(STATE, { marcas: {}, revalidados: {} });
  // Cada cuántos días corre (el cron es semanal; con 14 días, una semana sí y otra no).
  if (!force && state.ultimaEjecucion && Date.now() - Date.parse(state.ultimaEjecucion) < (everyDays - 1) * DAY) {
    console.log(`Omitida: la última ejecución fue ${state.ultimaEjecucion} y el intervalo es de ${everyDays} días (usa GINA_FORCE=1 para forzarla).`);
    return;
  }
  const index = QED.buildIndex(db, [], {}, {});
  const report = { inicio: new Date().toISOString(), proveedor: cfg.provider, modelo: cfg.model, verificadas: [], wikidata: [], sinFuentes: [], noEncontradas: [], revalidadas: [], reputacion: [], alternativas: [], sugerencias: [], cambios: [], errores: [], tokens: { entrada: 0, salida: 0 }, busquedas: 0 };
  if (!search) report.errores.push("El proveedor elegido no tiene búsqueda web: ningún resultado podrá quedar como verificado.");

  // ---- 0) Sugerencias enviadas desde la extensión (issues de GitHub)
  const issues = await loadIssues(report);
  const fromIssues = [];
  for (const is of issues.filter((i) => i.tipo === "marca")) for (const it of is.items) {
    if (!it.brand && !it.title) continue;
    const key = it.brand ? "b:" + QED.cleanBrandField(it.brand) : "t:" + QED.norm(it.title).slice(0, 70);
    fromIssues.push(Object.assign({ key, count: 3, issue: is.number }, it)); // una sugerencia explícita pesa más que una vista
  }

  // ---- 1) Marcas pendientes (las más vistas primero), saltando las que ya están en la base o ya se resolvieron
  const all = loadPending();
  for (const it of fromIssues) { const cur = all.get(it.key); if (cur) cur.count += it.count; else all.set(it.key, it); }
  const pending = Array.from(all.values())
    .filter((p) => {
      const st = state.marcas[p.key];
      if (st && (st.estado === "verificada" || (st.intentos || 0) >= 3)) return false;
      const m = QED.match(index, p.brand ? [{ text: p.brand, source: "pendiente" }] : [], "");
      return !m.found;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  let changed = false;
  for (const p of pending) {
    // 1a) Gratis: Wikidata. Si su dueño ya es un grupo de la base, se agrega sin gastar en IA.
    let hint = p.hint || "";
    if (wikidata && p.brand) {
      try {
        const owners = await wikidataOwner(p.brand);
        const hit = owners.map((o) => Object.assign({ gid: groupForOwner(db, o.owner) }, o)).find((o) => o.gid);
        if (hit) {
          const nombre = QED.displayBrand(p.brand);
          if (!db.marcas.some((m) => QED.norm(m.n) === QED.norm(nombre))) db.marcas.push({ n: nombre, g: hit.gid, s: 1, job: 1, fuente: "Wikidata", url: hit.item.replace("http://", "https://") });
          state.marcas[p.key] = { estado: "verificada", grupo: hit.gid, via: "wikidata", ultimo: new Date().toISOString(), intentos: 0 };
          report.wikidata.push(`${nombre} → ${db.grupos[hit.gid].empresa} (Wikidata: ${hit.owner}) · ${hit.item}`);
          changed = true;
          continue;
        }
        if (owners.length) hint = [hint, `Wikidata indica como dueño: ${owners.map((o) => o.owner).join(", ")}`].filter(Boolean).join(" · ");
      } catch (e) { /* Wikidata no disponible: se sigue con la IA */ }
    }
    try {
      const r = await AI.research(cfg, { brand: p.brand, title: p.title, site: p.site, hint }, db.grupos);
      report.tokens.entrada += r.usage.input; report.tokens.salida += r.usage.output; report.busquedas += r.searches || 0;
      const n = r.normalized;
      const st = state.marcas[p.key] || { intentos: 0 };
      st.intentos = (st.intentos || 0) + 1; st.ultimo = new Date().toISOString(); st.modelo = r.model;
      const nombre = n.marca || p.brand;
      if (n.conocida && n.verificable && nombre) {
        let gid = n.grupo_id;
        if (!gid) {
          // ¿Ya existe un grupo con la misma empresa?
          gid = Object.keys(db.grupos).find((id) => QED.norm(db.grupos[id].empresa) === QED.norm(n.empresa));
          if (!gid) {
            gid = "inv_" + slug(n.empresa);
            let i = 2; while (db.grupos[gid]) gid = "inv_" + slug(n.empresa) + "_" + i++;
            db.grupos[gid] = {
              empresa: n.empresa, controlador: n.controlador, pais: n.pais, tipo: n.tipo, fondos: n.fondos, gobierno: n.gobierno, nota: n.nota,
              confianza: "Verificado (investigación IA con fuentes)", fuente: n.fuentes[0].titulo, url: n.fuentes[0].url, fuentes: n.fuentes,
              fecha_dato: n.fecha_dato, investigado: new Date().toISOString().slice(0, 10), modelo: r.model
            };
          }
        }
        if (!db.marcas.some((m) => QED.norm(m.n) === QED.norm(nombre))) db.marcas.push({ n: nombre, g: gid, s: 1, job: 1 });
        st.estado = "verificada"; st.grupo = gid;
        report.verificadas.push(`${nombre} → ${db.grupos[gid].empresa} (${db.grupos[gid].controlador}) · ${n.fuentes[0].url}`);
        changed = true;
      } else if (n.conocida) {
        st.estado = "sin_fuentes";
        report.sinFuentes.push(`${nombre} → ${n.empresa || n.grupo_id} (sin fuentes confirmadas)`);
      } else {
        st.estado = st.intentos >= 3 ? "no_encontrada" : "reintentar";
        report.noEncontradas.push(p.brand || p.title);
      }
      state.marcas[p.key] = st;
    } catch (e) {
      report.errores.push(`${p.brand || p.title}: ${e.message}`);
      if (e.status === 401 || e.status === 403) break;
    }
  }

  // ---- 2) Revalidar grupos de la base marcados «Verificar» (los que llevan más tiempo sin revisar)
  const stale = Object.entries(db.grupos)
    .filter(([id, g]) => /^verificar/i.test(g.confianza || "") && !(state.revalidados[id] && Date.now() - Date.parse(state.revalidados[id]) < 90 * DAY))
    .slice(0, revalidate);
  for (const [id, g] of stale) {
    try {
      const r = await AI.research(cfg, { kind: "revalidar", group: g }, db.grupos);
      report.tokens.entrada += r.usage.input; report.tokens.salida += r.usage.output; report.busquedas += r.searches || 0;
      const n = r.normalized;
      state.revalidados[id] = new Date().toISOString();
      if (n.verificable && n.controlador) {
        const prev = { controlador: g.controlador, confianza: g.confianza, fecha: g.investigado || null };
        if (QED.norm(n.controlador) !== QED.norm(g.controlador)) report.cambios.push(`${g.empresa}: «${g.controlador}» → «${n.controlador}»`);
        Object.assign(g, {
          controlador: n.controlador, pais: n.pais || g.pais, tipo: n.tipo || g.tipo, fondos: n.fondos || g.fondos,
          nota: [n.cambio, g.nota].filter(Boolean).join(" · "), confianza: "Verificado (revalidado por IA)",
          fuente: n.fuentes[0].titulo, url: n.fuentes[0].url, fuentes: n.fuentes, investigado: new Date().toISOString().slice(0, 10), anterior: prev
        });
        report.revalidadas.push(`${g.empresa} · ${n.fuentes[0].url}`);
        changed = true;
      } else {
        report.revalidadas.push(`${g.empresa} · sin fuentes suficientes (sin cambios)`);
      }
    } catch (e) { report.errores.push(`Revalidar ${g.empresa}: ${e.message}`); }
  }

  // ---- 3) Reputación: empresas con más marcas en la base (más exposición) y fondos, sin historial o con más de 180 días
  if (repLimit > 0 && search) {
    db.reputacion = db.reputacion || {};
    const peso = {};
    for (const m of db.marcas) peso[m.g] = (peso[m.g] || 0) + 1;
    const ids = [];
    for (const [gid] of Object.entries(peso).sort((a, b) => b[1] - a[1])) {
      const g = db.grupos[gid];
      for (const id of [QED.REP.MATRIZ[gid] || gid, ...QED.REP.fundIds(g)]) if (!ids.includes(id)) ids.push(id);
    }
    const queue = ids.filter((id) => QED.REP.needsResearch(db.reputacion, id, 180)).slice(0, repLimit);
    for (const id of queue) {
      const fund = QED.REP.FONDOS.find((f) => f.id === id);
      const g = db.grupos[id] || {};
      const nombre = fund ? fund.nombre : g.empresa;
      try {
        const prev = db.reputacion[id];
        const r = await AI.researchReputation(cfg, { nombre: fund ? nombre + " (gestora de fondos de inversión)" : nombre, pais: g.pais,
          ya: ((prev && prev.eventos) || []).map((e) => `${e.anio} · ${e.titulo} (${e.estado})`) });
        report.tokens.entrada += r.usage.input; report.tokens.salida += r.usage.output; report.busquedas += r.searches || 0;
        if (!r.verificable) { report.reputacion.push(`${nombre}: la búsqueda no devolvió fuentes (sin cambios)`); continue; }
        db.reputacion[id] = QED.REP.merge(prev, r, { nombre, revisado: new Date().toISOString().slice(0, 10), origen: `Investigación semanal con búsqueda web (${r.model})`, parcial: false });
        report.reputacion.push(`${nombre}: ${r.eventos.length} hechos, ${r.lobbying.length} datos de lobbying${r.descartados ? `, ${r.descartados} descartados sin fuente` : ""}`);
        changed = true;
      } catch (e) {
        report.errores.push(`Reputación de ${nombre}: ${e.message}`);
        if (e.status === 401 || e.status === 403) break;
      }
    }
  }

  // ---- 3b) Alternativas locales sugeridas por usuarios: se verifica el dueño con búsqueda; solo entran si es independiente y local
  const alts = issues.filter((i) => i.tipo === "alternativa");
  const prep = QED.ALT.prepare(db, QED.buildIndex(db, [], {}, {}));
  for (const is of alts) for (const it of is.items.slice(0, 5)) {
    try {
      const r = await AI.research(cfg, { brand: it.marca, title: it.categoria, site: it.pais, hint: [it.dueno && "Dueño según quien sugiere: " + it.dueno, it.fuente && "Fuente sugerida: " + it.fuente].filter(Boolean).join(" · ") }, db.grupos);
      report.tokens.entrada += r.usage.input; report.tokens.salida += r.usage.output; report.busquedas += r.searches || 0;
      const n = r.normalized;
      const cat = QED.ALT.category(prep, "", it.categoria);
      const ok = n.conocida && n.verificable && QED.ALT.INDEP[n.tipo] && cat;
      if (!ok) { report.alternativas.push(`${it.marca}: no se pudo confirmar un dueño independiente con fuente${cat ? "" : " o una categoría reconocible"} (issue #${is.number})`); continue; }
      let gid = Object.keys(db.grupos).find((id) => QED.norm(db.grupos[id].empresa) === QED.norm(n.empresa));
      if (!gid) {
        gid = "loc_" + slug(n.empresa); let i = 2; while (db.grupos[gid]) gid = "loc_" + slug(n.empresa) + "_" + i++;
        db.grupos[gid] = { empresa: n.empresa, controlador: n.controlador, pais: n.pais || it.pais, tipo: n.tipo, fondos: n.fondos, gobierno: n.gobierno, nota: n.nota,
          confianza: "Verificado (investigación IA con fuentes)", fuente: n.fuentes[0].titulo, url: n.fuentes[0].url, fuentes: n.fuentes, investigado: new Date().toISOString().slice(0, 10) };
      }
      const nombre = n.marca || it.marca;
      if (!db.marcas.some((m) => QED.norm(m.n) === QED.norm(nombre))) db.marcas.push({ n: nombre, g: gid, s: 1, job: 1 });
      db.categorias[cat].marcas = Array.from(new Set([...(db.categorias[cat].marcas || []), nombre]));
      report.alternativas.push(`${nombre} → ${n.empresa} (${n.tipo}, ${n.pais}) en «${db.categorias[cat].label}» · ${n.fuentes[0].url} (issue #${is.number})`);
      changed = true;
    } catch (e) { report.errores.push(`Alternativa ${it.marca}: ${e.message}`); if (e.status === 401 || e.status === 403) break; }
  }

  // ---- 3c) Responder y cerrar los issues procesados
  if (!dry) for (const is of issues) {
    const keys = is.tipo === "marca" ? is.items.map((it) => it.brand ? "b:" + QED.cleanBrandField(it.brand) : "t:" + QED.norm(it.title).slice(0, 70)) : [];
    const lines = is.tipo === "marca"
      ? is.items.map((it, i) => { const st = state.marcas[keys[i]]; return `- ${it.brand || it.title}: ${st ? { verificada: "✔ agregada a la base", sin_fuentes: "sin fuentes suficientes todavía", reintentar: "se reintentará", no_encontrada: "no se encontró" }[st.estado] || st.estado : "en cola para la próxima ejecución"}`; })
      : report.alternativas.filter((x) => x.includes(`#${is.number})`)).map((x) => "- " + x);
    const done = is.tipo === "alternativa" || is.items.every((it, i) => { const st = state.marcas[keys[i]]; return st && ["verificada", "no_encontrada"].includes(st.estado); });
    try {
      await gh(`/issues/${is.number}/comments`, { method: "POST", body: JSON.stringify({ body: `Gracias. Resultado de la investigación del ${report.inicio.slice(0, 10)}:\n${lines.join("\n")}\n\nLos datos nuevos llegan a todas las extensiones con la próxima descarga de la base.` }) });
      if (done) await gh(`/issues/${is.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) });
      report.sugerencias.push(`#${is.number} (${is.tipo}) ${done ? "cerrado" : "sigue abierto"}`);
    } catch (e) { report.errores.push(`Issue #${is.number}: ${e.message}`); }
  }

  // ---- 4) Publicar
  report.fin = new Date().toISOString();
  if (changed) db.version = new Date().toISOString().slice(0, 16).replace(":", "");
  const md = [
    `# Investigación de Project Gina — ${report.inicio.slice(0, 10)}`, "",
    `Proveedor: ${report.proveedor} · modelo: ${report.modelo} · búsquedas: ${report.busquedas} · tokens: ${report.tokens.entrada.toLocaleString("es-MX")} entrada / ${report.tokens.salida.toLocaleString("es-MX")} salida`,
    `Costo aproximado (Claude Haiku 5.5: US$0,10 / 0,50 por millón de tokens; búsqueda web US$10 por 1.000): ~US$${(report.tokens.entrada / 1e6 * 0.10 + report.tokens.salida / 1e6 * 0.50 + report.busquedas * 0.01).toFixed(2)}`, "",
    `Base publicada: ${changed ? db.version : "sin cambios"}`, "",
    "## Resueltas gratis con Wikidata", ...(report.wikidata.length ? report.wikidata.map((x) => "- " + x) : ["- (ninguna)"]), "",
    "## Verificadas con IA y búsqueda", ...(report.verificadas.length ? report.verificadas.map((x) => "- " + x) : ["- (ninguna)"]), "",
    "## Alternativas locales sugeridas", ...(report.alternativas.length ? report.alternativas.map((x) => "- " + x) : ["- (ninguna)"]), "",
    "## Sugerencias de usuarios (issues)", ...(report.sugerencias.length ? report.sugerencias.map((x) => "- " + x) : ["- (ninguna)"]), "",
    "## Revalidadas", ...(report.revalidadas.length ? report.revalidadas.map((x) => "- " + x) : ["- (ninguna)"]), "",
    "## Reputación", ...(report.reputacion.length ? report.reputacion.map((x) => "- " + x) : ["- (ninguna)"]), "",
    "## Cambios de controlador", ...(report.cambios.length ? report.cambios.map((x) => "- " + x) : ["- (ninguno)"]), "",
    "## Sin fuentes confirmadas", ...(report.sinFuentes.length ? report.sinFuentes.map((x) => "- " + x) : ["- (ninguna)"]), "",
    "## No encontradas", ...(report.noEncontradas.length ? report.noEncontradas.map((x) => "- " + x) : ["- (ninguna)"]), "",
    "## Errores", ...(report.errores.length ? report.errores.map((x) => "- " + x) : ["- (ninguno)"]), ""
  ].join("\n");
  if (!dry) {
    state.ultimaEjecucion = report.inicio;
    if (changed) fs.writeFileSync(BRANDS, JSON.stringify(db, null, 1));
    fs.writeFileSync(STATE, JSON.stringify(state, null, 1));
    fs.mkdirSync(REPORTS, { recursive: true });
    fs.writeFileSync(path.join(REPORTS, `${report.inicio.slice(0, 10)}.md`), md);
  }
  console.log(md);
}

main().catch((e) => { console.error(e); process.exit(1); });
