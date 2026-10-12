// Pruebas del service worker con chrome.* y las APIs de IA simuladas (formatos Anthropic y Gemini).
const fs = require("fs"), path = require("path"), vm = require("vm");
const EXT = path.join(__dirname, "..", "extension");
let pass = 0, total = 0;
function check(name, ok, detail) { total++; if (ok) pass++; console.log(`${ok ? "OK   " : "FALLA"} ${name}${detail ? " → " + detail : ""}`); }

function makeEnv(responder) {
  const store = {};
  const listeners = { message: [], alarm: [], installed: [], startup: [] };
  const calls = [];
  const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  const chrome = {
    storage: { local: {
      get: async (keys) => {
        const out = {};
        const ks = keys == null ? Object.keys(store) : typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
        for (const k of ks) if (k in store) out[k] = clone(store[k]);
        return out;
      },
      set: async (obj) => { for (const [k, v] of Object.entries(obj)) store[k] = clone(v); }
    } },
    runtime: {
      getURL: (p) => "ext://" + p,
      onMessage: { addListener: (f) => listeners.message.push(f) },
      onInstalled: { addListener: (f) => listeners.installed.push(f) },
      onStartup: { addListener: (f) => listeners.startup.push(f) }
    },
    tabs: { create: async (opts) => { chrome.tabs.created.push(opts); return { id: 1, ...opts }; }, created: [] },
    alarms: { create: () => {}, onAlarm: { addListener: (f) => listeners.alarm.push(f) } },
    action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} }
  };
  const fetchMock = async (url, opts) => {
    if (String(url).startsWith("ext://")) {
      const body = fs.readFileSync(path.join(EXT, String(url).slice(6)), "utf8");
      return { ok: true, status: 200, json: async () => JSON.parse(body), text: async () => body };
    }
    const req = { url: String(url), headers: (opts && opts.headers) || {}, body: opts && opts.body ? JSON.parse(opts.body) : null };
    calls.push(req);
    const res = await responder(req);
    const txt = JSON.stringify(res.body);
    return { ok: (res.status || 200) < 400, status: res.status || 200, statusText: "", json: async () => res.body, text: async () => txt };
  };
  const ctx = vm.createContext({ chrome, fetch: fetchMock, console, URL, setTimeout, clearTimeout, Date, JSON, Promise, Math, Object, Array, String, Number, Set, Map, RegExp, Error });
  ctx.globalThis = ctx;
  ctx.importScripts = (...files) => { for (const f of files) vm.runInContext(fs.readFileSync(path.join(EXT, "src", f), "utf8"), ctx, { filename: f }); };
  vm.runInContext(fs.readFileSync(path.join(EXT, "src", "background.js"), "utf8"), ctx, { filename: "background.js" });
  const send = (msg) => new Promise((resolve) => {
    let async = false;
    for (const l of listeners.message) { const r = l(msg, {}, resolve); if (r === true) async = true; }
    if (!async) setTimeout(() => resolve(undefined), 0);
  });
  return { store, send, calls, ctx };
}

// ---- Respuestas simuladas
const anthropicText = (text, extra) => ({ body: Object.assign({ content: [{ type: "text", text }], stop_reason: "end_turn", usage: { input_tokens: 1200, output_tokens: 150 } }, extra || {}) });
const classifyAnswer = (o) => anthropicText(JSON.stringify(Object.assign({ conocida: true, marca: "", grupo_id: null, empresa: "", controlador: "", pais: "", tipo: "", fondos: "", gobierno: "", nota: "", certeza: "media" }, o)));

(async () => {
  // ================================================================ Anthropic
  let mode = "classify";
  const env = makeEnv(async (req) => {
    if (req.url.includes("api.anthropic.com")) {
      const user = req.body.messages[0].content;
      if (!req.headers["x-api-key"] || req.headers["anthropic-dangerous-direct-browser-access"] !== "true") return { status: 401, body: { error: { message: "bad headers" } } };
      if (req.body.tools) {
        const sys = (req.body.system && req.body.system[0] && req.body.system[0].text) || "";
        // Investigación de reputación: un hecho con fuente de la búsqueda y otro con URL inventada
        if (/historial público/.test(sys)) {
          return { body: {
            content: [
              { type: "server_tool_use", id: "r1", name: "web_search", input: { query: "Grupo Bimbo multa" } },
              { type: "web_search_tool_result", tool_use_id: "r1", content: [{ type: "web_search_result", url: "https://www.reuters.com/business/bimbo-caso", title: "Reuters: Bimbo" }] },
              { type: "text", text: JSON.stringify({
                eventos: [
                  { tema: "competencia", titulo: "Multa de prueba", pais: "México", anio: 2025, estado: "multa", monto: "MXN 10 millones", resumen: "Resumen neutral.", fuente: "Reuters", url: "https://www.reuters.com/business/bimbo-caso" },
                  { tema: "laboral", titulo: "Hecho inventado", pais: "México", anio: 2025, estado: "condena", monto: "", resumen: "x", fuente: "Blog", url: "https://blog-inventado.example/x" },
                  { tema: "otro_tema", titulo: "Tema inválido", anio: 2025, estado: "multa", url: "https://www.reuters.com/business/bimbo-caso" } ],
                positivos: [], lobbying: [{ pais: "México", anio: 2025, tipo: "otro", dato: "Dato sin fuente", url: "https://inventado.example/l" }] }) }
            ],
            stop_reason: "end_turn", usage: { input_tokens: 8000, output_tokens: 500, server_tool_use: { web_search_requests: 1 } }
          } };
        }
        // Investigación con búsqueda web
        if (/Truper/.test(user)) {
          return { body: {
            content: [
              { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "Truper dueño" } },
              { type: "web_search_tool_result", tool_use_id: "s1", content: [
                { type: "web_search_result", url: "https://www.truper.com/nosotros", title: "Truper — Nosotros" },
                { type: "web_search_result", url: "https://expansion.mx/empresas/truper", title: "Expansión: Truper" } ] },
              { type: "text", text: "Truper es una empresa mexicana privada.", citations: [{ type: "web_search_result_location", url: "https://expansion.mx/empresas/truper", title: "Expansión: Truper", cited_text: "..." }] },
              { type: "text", text: "```json\n" + JSON.stringify({ encontrada: true, marca: "Truper", grupo_id: null, empresa: "Truper S.A. de C.V.", controlador: "Familia Pérez (fundadora)", pais: "México", tipo: "Familia", fondos: "", gobierno: "", nota: "", fecha_dato: "2026-09", cambio: "",
                fuentes: [{ titulo: "Truper", url: "https://www.truper.com/nosotros" }, { titulo: "Inventada", url: "https://fuente-inventada.example/truper" }] }) + "\n```" }
            ],
            stop_reason: "end_turn", usage: { input_tokens: 9000, output_tokens: 600, server_tool_use: { web_search_requests: 1 } }
          } };
        }
        // Sin resultados de búsqueda: el modelo «cita» URLs que no salieron de la búsqueda → no debe quedar verificada
        return anthropicText("```json\n" + JSON.stringify({ encontrada: true, marca: "Sabritones", grupo_id: "pepsico", fuentes: [{ titulo: "x", url: "https://no-buscada.example/a" }] }) + "\n```");
      }
      if (/Sabritones/.test(user)) return classifyAnswer({ marca: "Sabritones", grupo_id: "pepsico", certeza: "alta" });
      if (/Truper/.test(user)) return classifyAnswer({ marca: "Truper", empresa: "Truper S.A. de C.V.", controlador: "Familia fundadora", pais: "México", tipo: "Familia" });
      if (/Devuelve \{"ok": true\}/.test(user)) return anthropicText('{"ok": true}');
      return classifyAnswer({ conocida: false });
    }
    return { status: 404, body: {} };
  });

  let r = await env.send({ type: "qed:resolve", brandText: "Truper", title: "Martillo Truper 16 oz", site: "Amazon (México)" });
  check("IA desactivada: queda pendiente", r.status === "disabled" && env.store.pending["b:truper"] && env.store.pending["b:truper"].status === "por_investigar");

  env.store.settings = { aiEnabled: true, classify: { provider: "anthropic", key: "sk-test", model: "claude-haiku-5-5" }, research: { provider: "anthropic", key: "sk-research", model: "claude-opus-5-5" }, dailyLimit: 3, jobEnabled: true };
  r = await env.send({ type: "qed:resolve", brandText: "Truper", title: "Martillo Truper 16 oz", site: "Amazon (México)" });
  check("Clasificación en vivo (Haiku)", r.status === "ai" && r.result.found && r.result.group.empresa === "Truper S.A. de C.V." && /IA sin verificar/.test(r.result.group.confianza), r.result && r.result.group.fuente);
  check("Pasa a «por verificar» con pista", env.store.pending["b:truper"].status === "por_verificar" && /Truper/.test(env.store.pending["b:truper"].hint));
  const lastCall = env.calls[env.calls.length - 1];
  check("Petición correcta: modelo, encabezados y caché de prompt", lastCall.body.model === "claude-haiku-5-5" && lastCall.headers["anthropic-version"] && lastCall.body.system[0].cache_control && !lastCall.body.tools);
  check("El catálogo de grupos va en el prompt", /pepsico = PepsiCo/.test(lastCall.body.system[0].text) && /aeromexico = Grupo Aeroméxico/.test(lastCall.body.system[0].text));

  const n = env.calls.length;
  r = await env.send({ type: "qed:resolve", brandText: "Truper", title: "Martillo Truper 16 oz", site: "Amazon (México)" });
  check("Segunda vez sale de la caché (sin llamar a la IA)", r.status === "cache" && env.calls.length === n);

  r = await env.send({ type: "qed:resolve", brandText: "Sabritones", title: "Sabritones 150 g", site: "Walmart (México)" });
  check("La IA asigna la marca a un grupo de la base", r.status === "ai" && r.result.kind === "ai-base" && r.result.group.empresa === "PepsiCo");

  r = await env.send({ type: "qed:resolve", brandText: "MarcaRara", title: "Cosa genérica", site: "Amazon (México)" });
  check("Marca desconocida para la IA", r.status === "ai" && r.result.found === false && r.result.kind === "ai-unknown");

  r = await env.send({ type: "qed:resolve", brandText: "OtraMarca", title: "Otra cosa", site: "Amazon (México)" });
  check("Límite diario de consultas", r.status === "limit" && env.store.pending["b:otramarca"]);

  r = await env.send({ type: "qed:testKey", which: "classify" });
  check("Probar clave", r.ok === true, r.model);

  // ---- Investigación semanal
  env.store.seenGroups = { bimbo: 7 };
  await env.send({ type: "qed:runJob" });
  for (let i = 0; i < 50 && !(env.store.jobState && env.store.jobState.lastRun); i++) await new Promise((res) => setTimeout(res, 20));
  const ver = env.store.verified || {};
  check("Job: Truper verificada con fuentes de la búsqueda real", ver["b:truper"] && ver["b:truper"].empresa === "Truper S.A. de C.V." && /Verificado/.test(ver["b:truper"].confianza),
    ver["b:truper"] && ver["b:truper"].fuentes.map((f) => f.url).join(" | "));
  check("Job: descarta la URL inventada por el modelo", ver["b:truper"] && !ver["b:truper"].fuentes.some((f) => /inventada/.test(f.url)));
  check("Job: usa el modelo grande con web_search", env.calls.some((c) => c.body && c.body.model === "claude-opus-5-5" && c.body.tools && c.body.tools[0].type === "web_search_20250305"));
  check("Job: sin búsqueda real → «sin fuentes», no verificada", env.store.pending["b:sabritones"].status === "sin_fuentes" && !ver["b:sabritones"]);
  const log = env.store.runLog && env.store.runLog[0];
  check("Job: bitácora con conteos y tokens", log && log.verified === 1 && log.unsourced >= 1 && log.tokensIn > 0 && log.revalidated >= 1, log && `investigadas ${log.researched}, verificadas ${log.verified}, revalidadas ${log.revalidated}`);

  const rp = (env.store.repPatches || {}).bimbo;
  check("Job: reputación de un grupo que ves, solo con hechos de fuente confirmada", rp && rp.eventos.length === 1 && rp.eventos[0].titulo === "Multa de prueba" && !rp.lobbying.length && rp.revisado && !rp.parcial,
    rp && rp.eventos.map((e) => e.titulo).join(" | "));
  check("Job: bitácora cuenta la reputación y avisa de lo descartado", log && log.reputacion >= 1 && log.errors.some((e) => /descartados/.test(e)));
  check("Job: la reputación usa el modelo grande con búsqueda", env.calls.some((c) => c.body && c.body.tools && /historial público/.test(c.body.system[0].text) && c.body.model === "claude-opus-5-5"));

  // ================================================================ Gemini
  const g = makeEnv(async (req) => {
    if (!req.url.includes("generativelanguage.googleapis.com")) return { status: 404, body: {} };
    if (req.headers["x-goog-api-key"] !== "g-key") return { status: 403, body: { error: { message: "API key not valid" } } };
    const user = req.body.contents[0].parts[0].text;
    if (req.body.tools) {
      return { body: { candidates: [{ content: { parts: [{ text: "Resultado:\n```json\n" + JSON.stringify({ encontrada: true, marca: "Jumex", grupo_id: null, empresa: "Grupo Jumex", controlador: "Familia Fernández", pais: "México", tipo: "Familia",
        fuentes: [{ titulo: "Grupo Jumex", url: "https://www.jumex.com/historia" }, { titulo: "Falsa", url: "https://otro-sitio.example/x" }] }) + "\n```" }] },
        groundingMetadata: { webSearchQueries: ["Jumex dueño"], groundingChunks: [{ web: { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc", title: "jumex.com" } }], groundingSupports: [{ groundingChunkIndices: [0] }] } }],
        usageMetadata: { promptTokenCount: 5000, candidatesTokenCount: 300 } } };
    }
    if (/Jumex/.test(user)) return { body: { candidates: [{ content: { parts: [{ text: JSON.stringify({ conocida: true, marca: "Jumex", grupo_id: null, empresa: "Grupo Jumex", controlador: "Familia Fernández", pais: "México", tipo: "Familia", certeza: "media" }) }] } }], usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 80 } } };
    return { body: { candidates: [{ content: { parts: [{ text: '{"conocida": false}' }] } }] } };
  });
  g.store.settings = { aiEnabled: true, classify: { provider: "gemini", key: "g-key", model: "gemini-3.5-flash-lite" }, research: { provider: "gemini", key: "g-key", model: "gemini-3.1-pro-preview" }, revalidateLimit: 0, jobEnabled: true };
  r = await g.send({ type: "qed:resolve", brandText: "Jumex", title: "Jugo Jumex 1 L", site: "Soriana (México)" });
  const gc = g.calls[0];
  check("Gemini: clasificación con modo JSON", r.status === "ai" && r.result.group.empresa === "Grupo Jumex" && gc.body.generationConfig.responseMimeType === "application/json" && /gemini-3\.5-flash-lite:generateContent/.test(gc.url));
  await g.send({ type: "qed:runJob" });
  for (let i = 0; i < 50 && !(g.store.jobState && g.store.jobState.lastRun); i++) await new Promise((res) => setTimeout(res, 20));
  const gv = (g.store.verified || {})["b:jumex"];
  check("Gemini: investigación con Google Search verifica por dominio", gv && gv.fuentes.some((f) => f.url === "https://www.jumex.com/historia") && !gv.fuentes.some((f) => /otro-sitio/.test(f.url)), gv && gv.fuentes.map((f) => f.url).join(" | "));
  check("Gemini: la petición de investigación lleva google_search", g.calls.some((c) => c.body && c.body.tools && c.body.tools[0].google_search));

  const bad = makeEnv(async () => ({ status: 401, body: { error: { message: "invalid x-api-key" } } }));
  bad.store.settings = { aiEnabled: true, classify: { provider: "anthropic", key: "mala", model: "claude-haiku-5-5" } };
  r = await bad.send({ type: "qed:resolve", brandText: "Algo", title: "Algo", site: "x" });
  check("Clave inválida: error claro y queda pendiente", r.status === "error" && /revisa la clave/.test(r.error) && bad.store.pending["b:algo"], r.error);

  // P1: Clic en Sugerir abre pestaña vía tabs.create con URL de issue con gina:sugerencia y labels=sugerencia
  {
    const sugEnv = makeEnv(async () => ({ status: 200, body: {} }));
    await sugEnv.send({
      type: "qed:suggest_brand",
      brand: "Original Nature's Oils",
      title: "Kit de aceites",
      site: "Amazon México"
    });
    const lastTab = sugEnv.ctx.chrome.tabs.created[0];
    const okSug = lastTab && lastTab.url && lastTab.url.includes("gina%3Asugerencia") && lastTab.url.includes("labels=sugerencia");
    check("El clic en «Sugerir» de la tarjeta llama a tabs.create con gina:sugerencia y labels=sugerencia", okSug, lastTab && lastTab.url);
  }

  // P1: Base remota con versión mayor se reemplaza y pendientes reconocidos desaparecen
  {
    const remoteData = {
      version: "2099-01-01T0000",
      marcas: [{ n: "Truper", g: "truper" }],
      grupos: { truper: { empresa: "Truper" } }
    };
    const updateEnv = makeEnv(async (req) => {
      if (req.url.includes("brands.json")) {
        return { status: 200, body: remoteData };
      }
      return { status: 200, body: {} };
    });
    updateEnv.store.pending = {
      "b:truper": { brand: "Truper", count: 2, status: "por_investigar" },
      "b:desconocida": { brand: "Desconocida XYZ", count: 1, status: "por_investigar" }
    };
    updateEnv.store.remoteBase = { data: { version: "2026-01-01T0000", marcas: [] } };
    await updateEnv.send({ type: "qed:updateBase" });
    const newPending = updateEnv.store.pending || {};
    const truperGone = !newPending["b:truper"];
    const desconocidaKept = !!newPending["b:desconocida"];
    const baseUpdated = updateEnv.store.remoteBase && updateEnv.store.remoteBase.data && updateEnv.store.remoteBase.data.version === "2099-01-01T0000";
    check("Base remota con versión mayor se reemplaza y los pendientes reconocidos desaparecen", truperGone && desconocidaKept && baseUpdated);
  }

  console.log(`\n${pass}/${total} pruebas correctas`);
  process.exit(pass === total ? 0 : 1);
})();
