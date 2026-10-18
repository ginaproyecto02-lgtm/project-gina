// SPDX-License-Identifier: MIT
// Gina — service worker (Chrome/Edge) o página de eventos (Firefox):
// memoria (caché, pendientes, verificados), clasificación con IA y job semanal de investigación.
// En Chrome se cargan las dependencias con importScripts; en Firefox ya vienen en background.scripts del manifiesto.
if (typeof importScripts === "function" && !globalThis.QED) importScripts("matcher.js", "reputation.js", "alternativas.js", "i18n.js", "comparador.js", "ai.js");
const QED = globalThis.QED, AI = globalThis.QEDAI;
const api = chrome;
const IS_FIREFOX = typeof browser !== "undefined" && !!(browser.runtime && browser.runtime.getBrowserInfo);

// Firefox (140+) exige consentimiento explícito antes de transmitir contenido de páginas (marca y título) a terceros.
async function dataConsent() {
  if (!IS_FIREFOX) return true;
  try { return await browser.permissions.contains({ data_collection: ["websiteContent"] }); }
  catch (e) { return true; } // versiones sin el sistema de consentimiento
}
const DAY = 24 * 60 * 60 * 1000;

const DEFAULTS = {
  aiEnabled: false,
  classify: { provider: "anthropic", key: "", model: AI.PROVIDERS.anthropic.classifyModel, base: "" },
  research: { provider: "anthropic", key: "", model: AI.PROVIDERS.anthropic.researchModel, base: "", useClassifyKey: false },
  dailyLimit: 100,      // clasificaciones por día (control de gasto)
  weeklyLimit: 25,      // marcas pendientes investigadas por semana
  revalidateLimit: 3,   // grupos de la base revalidados por semana
  repLimit: 3,          // historiales de reputación investigados por semana (empresas y fondos que más ves)
  values: {},           // tus valores: tema → 0 (no me importa), 1 (normal), 2 (muy importante)
  showLobbying: true,
  cacheDays: 90,
  jobEnabled: false,
  remoteUrl: ""         // brands.json publicado por el job de servidor (opcional)
};

// ---------- Proyecto: base compartida y gratuita ----------
// La base actualizada la publica el job del proyecto (GitHub Actions) y todos la descargan; no hace falta clave.
let projectCache = null;
async function project() {
  if (!projectCache) {
    try { projectCache = await (await fetch(api.runtime.getURL("data/proyecto.json"))).json(); } catch (e) { projectCache = {}; }
  }
  return projectCache;
}
async function remoteUrlOf(s) { return s.remoteUrl || (await project()).remoteUrl || ""; }

// ---------- Utilidades de almacenamiento ----------
let chain = Promise.resolve();
function locked(fn) { const p = chain.then(fn, fn); chain = p.catch(() => {}); return p; } // evita escrituras cruzadas
const get = (keys) => api.storage.local.get(keys);
const set = (obj) => api.storage.local.set(obj);

async function settings() {
  const { settings: s } = await get("settings");
  const out = Object.assign({}, DEFAULTS, s || {});
  out.classify = Object.assign({}, DEFAULTS.classify, (s && s.classify) || {});
  out.research = Object.assign({}, DEFAULTS.research, (s && s.research) || {});
  return out;
}
function researchCfg(s) {
  const r = Object.assign({}, s.research);
  if (r.useClassifyKey && s.classify.provider === r.provider) r.key = s.classify.key;
  return r;
}
const keyFor = (brand, title) => {
  const b = QED.cleanBrandField(brand || "");
  return b ? "b:" + b : "t:" + QED.norm(title || "").slice(0, 70);
};

// Base efectiva = base empaquetada o remota (la más reciente) + parches del job.
let baseCache = null;
async function effectiveBase() {
  if (!baseCache) baseCache = await (await fetch(api.runtime.getURL("data/brands.json"))).json();
  const { remoteBase, groupPatches } = await get(["remoteBase", "groupPatches"]);
  const db = remoteBase && remoteBase.data && String(remoteBase.data.version) > String(baseCache.version) ? remoteBase.data : baseCache;
  const groups = {};
  for (const [id, g] of Object.entries(db.grupos)) groups[id] = Object.assign({}, g, (groupPatches || {})[id] || {});
  return { db, groups };
}

async function bumpUsage(s) {
  const today = new Date().toISOString().slice(0, 10);
  const { usage } = await get("usage");
  const u = usage && usage.day === today ? usage : { day: today, count: 0, tokensIn: 0, tokensOut: 0 };
  if (u.count >= s.dailyLimit) return null;
  u.count++;
  await set({ usage: u });
  return u;
}
async function addTokens(usage) {
  const { usage: u } = await get("usage");
  if (u && usage) { u.tokensIn += usage.input || 0; u.tokensOut += usage.output || 0; await set({ usage: u }); }
}

async function updateBadge() {
  const { pending } = await get("pending");
  const n = Object.values(pending || {}).filter((p) => ["por_investigar", "por_verificar", "reintentar"].includes(p.status)).length;
  await api.action.setBadgeBackgroundColor({ color: "#c9a227" });
  await api.action.setBadgeText({ text: n ? String(n > 99 ? "99+" : n) : "" });
}

// Registra la marca desconocida para la investigación semanal.
function registerPending(key, item, status, hint) {
  return locked(async () => {
    const { pending = {}, verified = {} } = await get(["pending", "verified"]);
    if (verified[key]) return;
    const p = pending[key] || { brand: item.brandText || "", title: item.title || "", site: item.site || "", firstSeen: Date.now(), count: 0, tries: 0, status: "por_investigar" };
    p.count++; p.lastSeen = Date.now();
    if (!p.title && item.title) p.title = item.title;
    if (status && !["verificada", "no_encontrada"].includes(p.status)) p.status = status;
    if (hint) p.hint = hint;
    pending[key] = p;
    await set({ pending });
  }).then(updateBadge);
}

// ---------- Clasificación en vivo ----------
async function resolve(item) {
  const s = await settings();
  const key = keyFor(item.brandText, item.title);
  if (!item.brandText && !item.title) return { status: "empty" };
  const { aiCache = {} } = await get("aiCache");
  const hit = aiCache[key];
  if (hit && Date.now() - hit.ts < s.cacheDays * DAY) {
    await registerPending(key, item);
    return { status: "cache", result: await toCard(hit, item) };
  }
  if (!s.aiEnabled || !s.classify.key) { await registerPending(key, item); return { status: "disabled" }; }
  if (!(await dataConsent())) { await registerPending(key, item); return { status: "consent" }; }
  if (!(await bumpUsage(s))) { await registerPending(key, item); return { status: "limit", limit: s.dailyLimit }; }
  try {
    const { groups } = await effectiveBase();
    const r = await AI.classify(s.classify, { brand: item.brandText, title: item.title, site: item.site }, groups);
    await addTokens(r.usage);
    const entry = { ts: Date.now(), model: r.model, provider: s.classify.provider, answer: r.normalized };
    await locked(async () => { const { aiCache: c = {} } = await get("aiCache"); c[key] = entry; await set({ aiCache: c }); });
    const hint = r.normalized.conocida ? `${r.normalized.marca || item.brandText} → ${r.normalized.grupo_id || r.normalized.empresa} (${r.normalized.certeza})` : "";
    await registerPending(key, item, r.normalized.conocida ? "por_verificar" : "por_investigar", hint);
    return { status: "ai", result: await toCard(entry, item) };
  } catch (e) {
    await registerPending(key, item);
    return { status: "error", error: String(e.message || e) };
  }
}

async function toCard(entry, item) {
  const a = entry.answer;
  if (!a.conocida) return { found: false, kind: "ai-unknown", brandText: item.brandText || "", model: entry.model };
  const { groups } = await effectiveBase();
  const base = a.grupo_id && groups[a.grupo_id];
  const group = base ? Object.assign({}, base, { confianza: base.confianza })
    : { empresa: a.empresa, controlador: a.controlador, pais: a.pais, tipo: a.tipo, fondos: a.fondos, gobierno: a.gobierno, nota: a.nota,
        confianza: "IA sin verificar", fuente: `Clasificación automática (${entry.model}, ${new Date(entry.ts).toLocaleDateString("es-MX")})` };
  return {
    found: true, kind: base ? "ai-base" : "ai", gid: base ? a.grupo_id : null, brand: a.marca || item.brandText || "", group,
    source: base ? "IA asignó la marca a un grupo de la base" : "Clasificación IA", how: "ia", certeza: a.certeza, model: entry.model
  };
}

// ---------- Job semanal de investigación ----------
// Una base remota (aunque venga del repositorio del proyecto) se valida antes de reemplazar la local:
// formato, versión con fecha real (una versión «9999» bloquearía para siempre las actualizaciones),
// que no borre de golpe la base y que cada marca apunte a un grupo existente.
function validateRemoteBase(data, packaged) {
  if (!data || typeof data !== "object" || !data.grupos || typeof data.grupos !== "object" || !Array.isArray(data.marcas)) throw new Error("El archivo no tiene el formato de brands.json");
  const v = String(data.version || "");
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})$/);
  if (!m) throw new Error(`Versión remota inválida: ${v.slice(0, 40)}`);
  const ts = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  if (!(ts > 0) || ts > Date.now() + 2 * 86400000) throw new Error(`Versión remota con fecha futura: ${v}`);
  const minMarcas = Math.floor(((packaged && packaged.marcas && packaged.marcas.length) || 0) * 0.8);
  if (data.marcas.length < minMarcas) throw new Error(`La base remota trae ${data.marcas.length} marcas; la local tiene ${packaged.marcas.length}`);
  for (const mk of data.marcas) {
    if (!mk || typeof mk.n !== "string" || !mk.n || mk.n.length > 120 || !data.grupos[mk.g]) throw new Error(`Marca remota inválida: ${String(mk && mk.n).slice(0, 40)}`);
  }
  for (const [gid, g] of Object.entries(data.grupos)) {
    if (!g || typeof g.empresa !== "string" || !g.empresa) throw new Error(`Grupo remoto inválido: ${gid.slice(0, 40)}`);
  }
}

async function refreshRemote(s, log) {
  const url = await remoteUrlOf(s);
  if (!url) return;
  try {
    if (!/^https:\/\//i.test(url)) throw new Error("La base remota debe servirse por https");
    const res = await fetch(url, { cache: "no-store", credentials: "omit" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const txt = await res.text();
    if (txt.length > 25 * 1024 * 1024) throw new Error("La base remota es demasiado grande");
    const data = JSON.parse(txt);
    if (!baseCache) baseCache = await (await fetch(api.runtime.getURL("data/brands.json"))).json();
    validateRemoteBase(data, baseCache);
    const { remoteBase, pending = {} } = await get(["remoteBase", "pending"]);
    const currentVersion = (remoteBase && remoteBase.data && remoteBase.data.version) || (baseCache && baseCache.version) || "";

    // Solo reemplaza la base si la versión remota es mayor (P1.13)
    if (String(data.version) <= String(currentVersion)) {
      log.remote = `Base remota ${data.version} no es mayor que la actual ${currentVersion}; se conserva la actual.`;
      return;
    }

    // Borra de pendientes las marcas que ahora reconoce la nueva base (P1.13)
    const knownBrands = new Set(data.marcas.map((m) => QED.norm(m.n)));
    let cleanedCount = 0;
    const newPending = {};
    for (const [key, p] of Object.entries(pending)) {
      const normBrand = QED.norm(p.brand || "");
      if (normBrand && knownBrands.has(normBrand)) {
        cleanedCount++;
      } else {
        newPending[key] = p;
      }
    }

    await set({
      remoteBase: { fetchedAt: Date.now(), url, data },
      pending: newPending
    });
    baseCache = data;
    await updateBadge();
    log.remote = `Base remota ${data.version} (${data.marcas.length} marcas; ${cleanedCount} pendientes resueltos)`;
  } catch (e) { log.errors.push("Base remota: " + e.message); }
}

async function runJob(trigger) {
  const { jobState = {} } = await get("jobState");
  if (jobState.running && Date.now() - jobState.startedAt < 30 * 60 * 1000) return { started: false, reason: "Ya hay un job en curso" };
  await set({ jobState: Object.assign({}, jobState, { running: true, startedAt: Date.now() }) });
  const s = await settings();
  const log = { start: Date.now(), trigger, researched: 0, verified: 0, unsourced: 0, notFound: 0, revalidated: 0, changed: [], errors: [], tokensIn: 0, tokensOut: 0, searches: 0 };
  try {
    await refreshRemote(s, log);
    if (trigger === "semanal" && !s.jobEnabled) return { started: true }; // solo descargar la base del proyecto
    const cfg = researchCfg(s);
    if (cfg.key && !(await dataConsent())) { log.errors.push("Falta tu consentimiento de datos (Firefox): actívalo al guardar la configuración."); return { started: true }; }
    if (!cfg.key) { if (!log.remote && !(await remoteUrlOf(s))) log.errors.push("Sin clave de investigación ni base del proyecto: no hubo nada que actualizar."); return { started: true }; }
    if (!AI.PROVIDERS[cfg.provider].search) log.errors.push("Este proveedor no tiene búsqueda web: los resultados quedan «sin fuentes», no como verificados.");
    const { groups } = await effectiveBase();

    // 1) Marcas pendientes (las más vistas primero)
    const { pending = {} } = await get("pending");
    const queue = Object.entries(pending)
      .filter(([, p]) => ["por_investigar", "por_verificar", "reintentar", "sin_fuentes"].includes(p.status) && (p.tries || 0) < 3)
      .sort((a, b) => b[1].count - a[1].count || b[1].lastSeen - a[1].lastSeen)
      .slice(0, s.weeklyLimit);
    for (const [key, p] of queue) {
      try {
        const r = await AI.research(cfg, { brand: p.brand, title: p.title, site: p.site, hint: p.hint }, groups);
        log.researched++; log.tokensIn += r.usage.input; log.tokensOut += r.usage.output; log.searches += r.searches || 0;
        const n = r.normalized;
        await locked(async () => {
          const st = await get(["pending", "verified", "aiCache"]);
          const pend = st.pending || {}, ver = st.verified || {}, cache = st.aiCache || {};
          const cur = pend[key] || p;
          cur.tries = (cur.tries || 0) + 1; cur.lastTry = Date.now(); cur.model = r.model;
          if (n.conocida && n.verificable) {
            const base = n.grupo_id && groups[n.grupo_id];
            ver[key] = Object.assign({}, base || {}, base ? {} : { empresa: n.empresa, controlador: n.controlador, pais: n.pais, tipo: n.tipo, fondos: n.fondos, gobierno: n.gobierno, nota: n.nota }, {
              marca: n.marca || p.brand, grupo_id: n.grupo_id || null, confianza: "Verificado",
              fuente: n.fuentes[0].titulo, url: n.fuentes[0].url, fuentes: n.fuentes, fecha_dato: n.fecha_dato, verifiedAt: Date.now(), model: r.model
            });
            cur.status = "verificada"; delete cache[key]; log.verified++;
          } else if (n.conocida) {
            cache[key] = { ts: Date.now(), model: r.model, provider: cfg.provider, answer: n };
            cur.status = "sin_fuentes"; log.unsourced++;
          } else {
            cur.status = cur.tries >= 3 ? "no_encontrada" : "reintentar"; log.notFound++;
          }
          pend[key] = cur;
          await set({ pending: pend, verified: ver, aiCache: cache });
        });
      } catch (e) {
        log.errors.push(`${p.brand || p.title}: ${e.message}`);
        if (e.status === 401 || e.status === 403) break; // clave inválida: no tiene caso seguir
      }
    }

    // 2) Revalidar datos de la base marcados como «Verificar»
    const { groupPatches = {} } = await get("groupPatches");
    const stale = Object.entries(groups)
      .filter(([id, g]) => /^verificar/i.test(g.confianza || "") && !(groupPatches[id] && Date.now() - groupPatches[id].checkedAt < 90 * DAY))
      .slice(0, s.revalidateLimit);
    for (const [id, g] of stale) {
      try {
        const r = await AI.research(cfg, { kind: "revalidar", group: g }, groups);
        log.revalidated++; log.tokensIn += r.usage.input; log.tokensOut += r.usage.output;
        const n = r.normalized;
        await locked(async () => {
          const { groupPatches: gp = {} } = await get("groupPatches");
          const patch = { checkedAt: Date.now() };
          if (n.verificable && n.controlador) {
            Object.assign(patch, { controlador: n.controlador, pais: n.pais || g.pais, tipo: n.tipo || g.tipo, fondos: n.fondos || g.fondos,
              nota: [n.cambio, g.nota].filter(Boolean).join(" · "), confianza: "Verificado (revalidado por IA)",
              fuente: n.fuentes[0].titulo, url: n.fuentes[0].url, fuentes: n.fuentes, prev: { controlador: g.controlador, confianza: g.confianza } });
            if (QED.norm(n.controlador) !== QED.norm(g.controlador)) log.changed.push(`${g.empresa}: «${g.controlador}» → «${n.controlador}»`);
          }
          gp[id] = Object.assign({}, gp[id] || {}, patch);
          await set({ groupPatches: gp });
        });
      } catch (e) { log.errors.push(`Revalidar ${g.empresa}: ${e.message}`); }
    }

    // 3) Reputación: empresas y fondos que más ves, sin historial o con historial de más de 180 días
    await researchReputation(s, cfg, log);
    return { started: true };
  } finally {
    log.end = Date.now();
    const { runLog = [] } = await get("runLog");
    runLog.unshift(log);
    await set({ runLog: runLog.slice(0, 30), jobState: { running: false, lastRun: log.end, startedAt: log.start } });
    await updateBadge();
  }
}

async function researchReputation(s, cfg, log) {
  if (!s.repLimit) return;
  if (!AI.PROVIDERS[cfg.provider].search) { log.errors.push("Reputación: se necesita un proveedor con búsqueda web (Claude o Gemini)."); return; }
  const { db, groups } = await effectiveBase();
  const { seenGroups = {}, repPatches = {} } = await get(["seenGroups", "repPatches"]);
  const table = QED.REP.repTable(db, repPatches);
  const ids = [];
  for (const [gid] of Object.entries(seenGroups).sort((a, b) => b[1] - a[1])) {
    const g = groups[gid];
    if (!g) continue;
    for (const id of [QED.REP.MATRIZ[gid] || gid, ...QED.REP.fundIds(g)]) if (!ids.includes(id)) ids.push(id);
  }
  const queue = ids.filter((id) => QED.REP.needsResearch(table, id, 180)).slice(0, s.repLimit);
  for (const id of queue) {
    const fund = QED.REP.FONDOS.find((f) => f.id === id);
    const g = groups[id] || {};
    const nombre = fund ? fund.nombre + " (gestora de fondos de inversión)" : g.empresa;
    if (!nombre) continue;
    try {
      const prev = table[id];
      const r = await AI.researchReputation(cfg, { nombre, pais: g.pais, ya: ((prev && prev.eventos) || []).map((e) => `${e.anio} · ${e.titulo} (${e.estado})`) });
      log.tokensIn += r.usage.input; log.tokensOut += r.usage.output; log.searches += r.searches || 0;
      if (!r.verificable) { log.errors.push(`Reputación de ${nombre}: la búsqueda no devolvió fuentes; no se guardó nada.`); continue; }
      await locked(async () => {
        const { repPatches: rp = {} } = await get("repPatches");
        rp[id] = QED.REP.merge(prev, r, { nombre: fund ? fund.nombre : g.empresa, revisado: new Date().toISOString().slice(0, 10),
          origen: `Investigación semanal con búsqueda web (${r.model})`, parcial: false });
        await set({ repPatches: rp });
      });
      log.reputacion = (log.reputacion || 0) + 1;
      if (r.descartados) log.errors.push(`Reputación de ${nombre}: ${r.descartados} dato(s) descartados por no tener una fuente confirmada.`);
    } catch (e) {
      log.errors.push(`Reputación de ${nombre}: ${e.message}`);
      if (e.status === 401 || e.status === 403) break;
    }
  }
}

// ---------- Programación ----------
api.runtime.onInstalled.addListener(() => { api.alarms.create("qed-tick", { periodInMinutes: 24 * 60, delayInMinutes: 1 }); updateBadge(); });
api.runtime.onStartup.addListener(() => { api.alarms.create("qed-tick", { periodInMinutes: 24 * 60, delayInMinutes: 1 }); });
// Revisión diaria: vacía cola de sugerencias y si pasaron 7 días ejecuta job semanal.
api.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== "qed-tick") return;
  await flushSuggestionsQueue().catch(() => {});
  const s = await settings();
  const { jobState = {} } = await get("jobState");
  if ((s.jobEnabled || (await remoteUrlOf(s))) && Date.now() - (jobState.lastRun || 0) >= 7 * DAY) runJob("semanal");
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
async function getInstallationId() {
  const { inst } = await get("inst");
  if (inst && UUID_RE.test(inst)) return inst;
  const newInst = generateUUID();
  await set({ inst: newInst });
  return newInst;
}

function extractDomain(s) {
  if (!s) return "";
  try {
    const raw = String(s).trim();
    const u = raw.startsWith("http://") || raw.startsWith("https://") ? new URL(raw) : new URL("https://" + raw);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch (_) {
    return String(s).split("/")[0].replace(/^www\./, "").toLowerCase().slice(0, 120);
  }
}

async function postSuggestion(payload, endpoint) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    credentials: "omit",
    referrerPolicy: "no-referrer"
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  if (!data || data.ok !== true) throw new Error((data && data.e) || "error");
  return data;
}

// Rechazos definitivos del servicio: reintentar no sirve, la sugerencia se descarta.
// Los demás (red, «bloqueo», «servidor», «config», límites) se reintentan al día siguiente.
const SUG_PERMANENT = new Set(["esquema", "version", "tipo", "marca", "marca_invalida", "tienda_invalida", "producto", "pais", "ext", "inst_invalido", "json_invalido", "tamano_excedido", "sin_datos"]);
const isPermanentSugError = (err) => SUG_PERMANENT.has(String((err && err.message) || ""));

async function enqueueSuggestion(item) {
  await locked(async () => {
    const { suggestionsQueue = [] } = await get("suggestionsQueue");
    suggestionsQueue.push(item);
    await set({ suggestionsQueue: suggestionsQueue.slice(-20) });
  });
}

async function flushSuggestionsQueue() {
  const proj = await project();
  const endpoint = proj.sugerencias_url;
  if (!endpoint || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint)) return;
  const { suggestionsQueue = [] } = await get("suggestionsQueue");
  if (!suggestionsQueue.length) return;

  const remaining = [];
  for (const item of suggestionsQueue) {
    try {
      await postSuggestion(item, endpoint);
    } catch (err) {
      if (!isPermanentSugError(err)) remaining.push(item);
    }
  }
  await set({ suggestionsQueue: remaining.slice(-20) });
}

async function recordBrandSuggestion(brand, title, site, url, pais) {
  const key = keyFor(brand, title);
  await locked(async () => {
    const { pending = {}, userSuggestions = [] } = await get(["pending", "userSuggestions"]);
    const p = pending[key] || { brand: brand || "", title: title || "", site: site || "", firstSeen: Date.now(), count: 0, tries: 0 };
    p.count = (p.count || 0) + 1;
    p.lastSeen = Date.now();
    p.userSuggested = true;
    p.status = "enviada";
    if (site) p.site = site;
    if (title && !p.title) p.title = title;
    pending[key] = p;

    const entry = { brand: brand || "", title: title || "", site: site || "", date: Date.now(), status: "enviada" };
    const filtered = userSuggestions.filter((x) => x.brand !== brand || x.title !== title);
    filtered.unshift(entry);

    await set({ pending, userSuggestions: filtered.slice(0, 100) });
  });

  const s = await settings();
  if (s && s.useGitHubIssues) {
    if (!url) {
      const proj = Object.assign({}, await project());
      if (typeof QED !== "undefined" && QED.ALT && QED.ALT.suggestionLink) {
        url = QED.ALT.suggestionLink(proj, "marca", [{ marca: brand, tienda: site, producto: title }]);
      }
    }
    if (url && SAFE_OPEN.test(url)) {
      try {
        if (api.tabs && api.tabs.create) {
          await api.tabs.create({ url });
        }
      } catch (_) {}
    }
  } else {
    const proj = await project();
    const endpoint = proj.sugerencias_url;
    const inst = await getInstallationId();
    const manifestVer = (api.runtime && api.runtime.getManifest) ? api.runtime.getManifest().version : "3.2.0";
    const payload = {
      v: 1,
      tipo: "marca",
      marca: clip(brand, 80),
      tienda: extractDomain(site),
      producto: clip(title, 200),
      pais: clip(pais || "MX", 20),
      ext: manifestVer,
      inst: inst
    };

    if (endpoint && /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint)) {
      try {
        await postSuggestion(payload, endpoint);
      } catch (err) {
        if (!isPermanentSugError(err)) await enqueueSuggestion(payload);
      }
    } else {
      await enqueueSuggestion(payload);
    }
  }

  await updateBadge();
  return { ok: true };
}

async function recordAlternativeSuggestion(alt) {
  await locked(async () => {
    const { suggestedAlternatives = [] } = await get("suggestedAlternatives");
    const entry = Object.assign({ date: Date.now() }, alt || {});
    suggestedAlternatives.unshift(entry);
    await set({ suggestedAlternatives: suggestedAlternatives.slice(0, 100) });
  });
  return { ok: true };
}

let offscreenCreating = null;
async function ensureOffscreenDocument() {
  if (typeof chrome === "undefined" || !chrome.offscreen) return;
  const offscreenUrl = chrome.runtime.getURL("src/offscreen.html");
  if (chrome.runtime.getContexts) {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [offscreenUrl]
    });
    if (existingContexts && existingContexts.length > 0) return;
  }
  if (offscreenCreating) {
    await offscreenCreating;
    return;
  }
  offscreenCreating = chrome.offscreen.createDocument({
    url: offscreenUrl,
    reasons: ["DOM_PARSER"],
    justification: "Parse HTML for product comparison"
  }).catch(() => {});
  await offscreenCreating;
  offscreenCreating = null;
}

async function parseStoreHtml(htmlText, storeConfig) {
  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(htmlText, "text/html");
      return QED.extractStoreItems(htmlText, doc, storeConfig);
    } catch (_) {}
  }
  if (typeof chrome !== "undefined" && chrome.offscreen && chrome.runtime && chrome.runtime.sendMessage) {
    try {
      await ensureOffscreenDocument();
      const r = await chrome.runtime.sendMessage({
        type: "qed:offscreen_parse",
        html: htmlText,
        storeConfig
      });
      if (r && r.ok && Array.isArray(r.items)) return r.items;
    } catch (_) {}
  }
  return QED.extractStoreItems(htmlText, null, storeConfig);
}

async function safeFetchCompare(url, expectedDomain) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    let curUrl = url;
    for (let hops = 0; hops < 2; hops++) {
      const res = await fetch(curUrl, {
        method: "GET",
        headers: { "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
        credentials: "omit",
        referrerPolicy: "no-referrer",
        redirect: "manual",
        signal: controller.signal
      });

      if (res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308) {
        const loc = res.headers.get("Location");
        if (!loc) return { ok: false, error: "redirect_no_location" };
        const nextUrl = new URL(loc, curUrl);
        if (nextUrl.protocol !== "https:") return { ok: false, error: "redirect_not_https" };
        const nextHost = nextUrl.hostname.replace(/^www\./, "").toLowerCase();
        const expHost = expectedDomain.replace(/^www\./, "").toLowerCase();
        if (nextHost !== expHost && !nextHost.endsWith("." + expHost)) {
          return { ok: false, error: "redirect_different_domain" };
        }
        curUrl = nextUrl.toString();
        continue;
      }

      if (!res.ok) {
        return { ok: false, status: res.status };
      }

      const cl = res.headers.get("Content-Length");
      if (cl && parseInt(cl, 10) > 2 * 1024 * 1024) {
        return { ok: false, error: "response_too_large" };
      }

      const text = await res.text();
      const clippedText = text.slice(0, 2 * 1024 * 1024);
      return { ok: true, text: clippedText, status: res.status };
    }
    return { ok: false, error: "too_many_redirects" };
  } catch (e) {
    return { ok: false, error: e.name === "AbortError" ? "timeout" : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

async function comparePricesForProduct(product, host, country) {
  const s = await settings();
  if (s.compareEnabled === false) return { ok: false, reason: "disabled" };
  const { compareConsent } = await get("compareConsent");
  if (!compareConsent) return { ok: false, reason: "no_consent" };

  const { db } = await effectiveBase();
  const storesTable = (db && db.tiendas_comparar) || {};
  const countryStores = (storesTable[String(country || "").trim()] || []).filter(
    (st) => st && st.dominio && !QED.hostMatches(host, st.dominio)
  );

  const targetStores = countryStores.slice(0, 4);
  const query = QED.queryForCompare(product);
  if (!query) return { ok: true, same: [], similar: [], unreadable: [] };

  const allCandidates = [];
  const unreadable = [];

  for (const st of targetStores) {
    const cacheKey = QED.buildCompareCacheKey(st.dominio, query);
    const cachedData = await get(cacheKey);
    const cachedEntry = cachedData && cachedData[cacheKey];

    if (cachedEntry && cachedEntry.timestamp && Date.now() - cachedEntry.timestamp < 12 * 60 * 60 * 1000) {
      if (cachedEntry.unreadable) {
        unreadable.push(st.nombre);
      } else {
        allCandidates.push(...(cachedEntry.items || []));
      }
      continue;
    }

    const searchUrl = st.url_busqueda.replace("{q}", encodeURIComponent(query));
    const res = await safeFetchCompare(searchUrl, st.dominio);

    if (!res.ok || QED.isBlockedOrCaptcha(res.text, res.status)) {
      await set({ [cacheKey]: { timestamp: Date.now(), items: [], unreadable: true } });
      unreadable.push(st.nombre);
      continue;
    }

    let items = await parseStoreHtml(res.text, st);

    if (product.gtin && items.length > 0 && !items.some((it) => it.gtin)) {
      const fichas = items.slice(0, 2);
      for (const f of fichas) {
        if (!f.url) continue;
        const fRes = await safeFetchCompare(f.url, st.dominio);
        if (fRes.ok && fRes.text) {
          const detailProducts = await parseStoreHtml(fRes.text, st);
          if (detailProducts && detailProducts.length > 0) {
            const dp = detailProducts[0];
            if (dp.gtin) f.gtin = dp.gtin;
            if (dp.mpn && !f.mpn) f.mpn = dp.mpn;
            if (dp.price && !f.price) f.price = dp.price;
          }
        }
      }
    }

    items.forEach((it) => { it.storeName = st.nombre; });
    await set({ [cacheKey]: { timestamp: Date.now(), items } });
    allCandidates.push(...items);
  }

  const ranked = QED.groupAndRankComparison(product, allCandidates);
  return {
    ok: true,
    same: ranked.same,
    similar: ranked.similar,
    unreadable,
    query,
    timestamp: Date.now()
  };
}

// Comunicación (auditoría 2026-10-16): solo mensajes de esta extensión; las órdenes que gastan clave o cambian la base
// solo desde páginas propias (popup/opciones), nunca desde un script que corre dentro de una tienda.
const PRIVILEGED = new Set(["qed:updateBase", "qed:runJob", "qed:testKey"]);
const clip = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]+/g, " ").slice(0, n);
// Lo único que el fondo abre por encargo: redacción en Gmail o un issue nuevo del repositorio.
const SAFE_OPEN = /^(mailto:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\?|https:\/\/mail\.google\.com\/mail\/\?view=cm&|https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/new\?)/;

api.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (!msg || !msg.type) return false;
  if (_sender && _sender.id && api.runtime && api.runtime.id && _sender.id !== api.runtime.id) return false;
  if (PRIVILEGED.has(msg.type) && _sender && _sender.tab) { reply({ ok: false, error: "No permitido desde una página" }); return false; }
  if (msg.type === "qed:suggest_brand") {
    msg = Object.assign({}, msg, { brand: clip(msg.brand, 120), title: clip(msg.title, 300), site: clip(msg.site, 120), pais: clip(msg.pais, 20),
      url: SAFE_OPEN.test(String(msg.url || "")) ? String(msg.url).slice(0, 8000) : "" });
  }
  if (msg.type === "qed:resolve") { resolve(msg).then(reply, (e) => reply({ status: "error", error: String(e) })); return true; }
  if (msg.type === "qed:suggest_brand") {
    recordBrandSuggestion(msg.brand, msg.title, msg.site, msg.url, msg.pais).then(reply, (e) => reply({ ok: false, error: String(e) }));
    return true;
  }
  if (msg.type === "qed:suggest_alternative") {
    recordAlternativeSuggestion(msg.alternative).then(reply, (e) => reply({ ok: false, error: String(e) }));
    return true;
  }
  if (msg.type === "qed:compare_prices") {
    comparePricesForProduct(msg.product, msg.host, msg.country).then(reply, (e) => reply({ ok: false, error: String(e) }));
    return true;
  }
  if (msg.type === "qed:updateBase") {
    (async () => {
      const s = await settings();
      const log = { start: Date.now(), trigger: "manual", researched: 0, verified: 0, unsourced: 0, notFound: 0, revalidated: 0, changed: [], errors: [], tokensIn: 0, tokensOut: 0, searches: 0 };
      await refreshRemote(s, log);
      return { ok: true, log };
    })().then(reply, (e) => reply({ ok: false, error: String(e) }));
    return true;
  }
  if (msg.type === "qed:runJob") { runJob("manual").catch(() => {}); reply({ started: true }); return false; }
  if (msg.type === "qed:testKey") {
    settings().then(async (s) => {
      const cfg = msg.which === "research" ? researchCfg(s) : s.classify;
      try {
        const r = await AI.call(cfg, { system: "Responde solo con JSON.", user: 'Devuelve {"ok": true}', maxTokens: 30, search: false });
        reply({ ok: true, model: r.model, text: r.text.slice(0, 80) });
      } catch (e) { reply({ ok: false, error: e.message }); }
    });
    return true;
  }
  if (msg.type === "qed:badge") { updateBadge().then(() => reply({ ok: true })); return true; }
  return false;
});

