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
    permissions: { granted: new Set(), contains: async ({ origins }) => (origins || []).every((o) => chrome.permissions.granted.has(o)) },
    alarms: { create: () => {}, onAlarm: { addListener: (f) => listeners.alarm.push(f) } },
    action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} }
  };
  const fetchMock = async (url, opts) => {
    if (String(url).startsWith("ext://")) {
      let body = fs.readFileSync(path.join(EXT, String(url).slice(6)), "utf8");
      // El repositorio trae «sugerencias_url» vacío (la URL real llega en el paquete desde la variable GINA_SUGERENCIAS_URL).
      if (String(url) === "ext://data/proyecto.json" && !chrome.__sinUrlSugerencias) {
        const pj = JSON.parse(body); pj.sugerencias_url = pj.sugerencias_url || "https://script.google.com/macros/s/AKfycbxPRUEBApruebaPRUEBA1234567890/exec"; body = JSON.stringify(pj);
      }
      return { ok: true, status: 200, json: async () => JSON.parse(body), text: async () => body };
    }
    const req = { url: String(url), headers: (opts && opts.headers) || {}, body: opts && opts.body ? (typeof opts.body === "string" && opts.body.startsWith("{") ? JSON.parse(opts.body) : opts.body) : null, credentials: opts && opts.credentials, referrerPolicy: opts && opts.referrerPolicy, redirect: opts && opts.redirect };
    calls.push(req);
    const res = await responder(req);
    const txt = typeof res.body === "string" ? res.body : JSON.stringify(res.body);
    return { ok: (res.status || 200) < 400, status: res.status || 200, statusText: "", headers: new Map([["content-type", typeof res.body === "string" ? "text/html" : "application/json"]]), json: async () => res.body, text: async () => txt };
  };
  const ctx = vm.createContext({ chrome, fetch: fetchMock, console, URL, AbortController, setTimeout, clearTimeout, Date, JSON, Promise, Math, Object, Array, String, Number, Set, Map, RegExp, Error });
  ctx.globalThis = ctx;
  ctx.importScripts = (...files) => { for (const f of files) vm.runInContext(fs.readFileSync(path.join(EXT, "src", f), "utf8"), ctx, { filename: f }); };
  vm.runInContext(fs.readFileSync(path.join(EXT, "src", "background.js"), "utf8"), ctx, { filename: "background.js" });
  const send = (msg) => new Promise((resolve) => {
    let async = false;
    for (const l of listeners.message) { const r = l(msg, {}, resolve); if (r === true) async = true; }
    if (!async) setTimeout(() => resolve(undefined), 0);
  });
  return { store, send, calls, ctx, listeners, chrome };
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

  // P1 (F3): «Sugerir» envía directo a Google Apps Script sin correo; GitHub solo si se activó en Opciones.
  {
    let postedReq = null;
    const sugEnv = makeEnv(async (req) => {
      if (req.url.includes("script.google.com")) {
        postedReq = req;
        return { status: 200, body: { ok: true } };
      }
      return { status: 200, body: {} };
    });
    await sugEnv.send({ type: "qed:suggest_brand", brand: "Original Nature's Oils", title: "Kit de aceites", site: "https://www.amazon.com.mx/dp/B01234?ref=xyz", pais: "MX" });
    const tabCount = sugEnv.ctx.chrome.tabs.created.length;
    const p = postedReq && postedReq.body;
    const okPayload = p && p.v === 1 && p.tipo === "marca" && p.marca === "Original Nature's Oils" &&
      p.tienda === "amazon.com.mx" && p.producto === "Kit de aceites" && p.pais === "MX" &&
      typeof p.inst === "string" && p.inst.length === 36 &&
      !JSON.stringify(p).includes("@") && !JSON.stringify(p).includes("ref=xyz");
    check("El clic en «Sugerir» envía directo a Apps Script sin abrir pestañas ni correo", tabCount === 0 && okPayload, JSON.stringify(p));

    // Sin red → se guarda en cola local y nunca abre correo
    const failEnv = makeEnv(async (req) => {
      if (req.url.includes("script.google.com")) return { status: 500, body: { ok: false, e: "error" } };
      return { status: 200, body: {} };
    });
    await failEnv.send({ type: "qed:suggest_brand", brand: "Marca Offline", title: "Producto", site: "tienda.com", pais: "MX" });
    const queue = (await failEnv.ctx.chrome.storage.local.get("suggestionsQueue")).suggestionsQueue || [];
    check("Fallo de red en sugerencia: se encola en suggestionsQueue sin abrir correo", failEnv.ctx.chrome.tabs.created.length === 0 && queue.length === 1 && queue[0].marca === "Marca Offline");

    // Rechazo definitivo del servicio (dato inválido) → no se encola para reintentar cada día
    const rejEnv = makeEnv(async (req) => {
      if (req.url.includes("script.google.com")) return { status: 200, body: { ok: false, e: "tienda_invalida" } };
      return { status: 200, body: {} };
    });
    await rejEnv.send({ type: "qed:suggest_brand", brand: "Marca Rechazada", title: "Producto", site: "www.amazon.com.mx", pais: "México" });
    const rejQueue = (await rejEnv.ctx.chrome.storage.local.get("suggestionsQueue")).suggestionsQueue || [];
    check("Rechazo definitivo del servicio (tienda_invalida): no se encola para reintentos infinitos", rejQueue.length === 0, JSON.stringify(rejQueue));

    // La tarjeta manda el hostname: «www.amazon.com.mx» llega como «amazon.com.mx» y el país completo
    let hostReq = null;
    const hostEnv = makeEnv(async (req) => { if (req.url.includes("script.google.com")) { hostReq = req; return { status: 200, body: { ok: true } }; } return { status: 200, body: {} }; });
    await hostEnv.send({ type: "qed:suggest_brand", brand: "Marca Host", title: "P", site: "www.amazon.com.mx", pais: "Reino Unido" });
    check("Sugerencia: hostname con www → dominio limpio y país sin recortar", hostReq && hostReq.body.tienda === "amazon.com.mx" && hostReq.body.pais === "Reino Unido", JSON.stringify(hostReq && hostReq.body));

    // Sin URL configurada (repositorio sin la variable): no hay red, la sugerencia queda en cola
    const noUrlEnv = makeEnv(async () => ({ status: 200, body: { ok: true } }));
    noUrlEnv.chrome.__sinUrlSugerencias = true;
    await noUrlEnv.send({ type: "qed:suggest_brand", brand: "Marca Sin URL", title: "P", site: "www.amazon.com.mx", pais: "México" });
    const nuQueue = (await noUrlEnv.chrome.storage.local.get("suggestionsQueue")).suggestionsQueue || [];
    check("Sugerencia sin URL de servicio configurada: 0 peticiones y queda en cola local",
      noUrlEnv.calls.filter((c) => !c.url.startsWith("ext://")).length === 0 && nuQueue.length === 1);

    // Alarma diaria vacía la cola si hay red
    let flushedCount = 0;
    const flushEnv = makeEnv(async (req) => {
      if (req.url.includes("script.google.com")) {
        flushedCount++;
        return { status: 200, body: { ok: true } };
      }
      return { status: 200, body: {} };
    });
    await flushEnv.ctx.chrome.storage.local.set({ suggestionsQueue: [{ v: 1, tipo: "marca", marca: "Encolada", tienda: "tienda.com", producto: "P", pais: "MX", inst: "12345678-1234-4234-8234-123456789abc" }] });
    for (const l of flushEnv.listeners.alarm) await l({ name: "qed-tick" });
    const queueAfter = (await flushEnv.ctx.chrome.storage.local.get("suggestionsQueue")).suggestionsQueue || [];
    check("Alarma qed-tick procesa y vacía la cola de sugerencias pendientes", flushedCount === 1 && queueAfter.length === 0);

    const ghEnv = makeEnv(async () => ({ status: 200, body: {} }));
    ghEnv.store.settings = { useGitHubIssues: true };
    await ghEnv.send({ type: "qed:suggest_brand", brand: "Original Nature's Oils", title: "Kit de aceites", site: "Amazon México" });
    const ghTab = ghEnv.ctx.chrome.tabs.created[0];
    check("Con «Usar issues de GitHub» activado, «Sugerir» abre el issue prellenado con labels=sugerencia", ghTab && /^https:\/\/github\.com\/.+\/issues\/new\?/.test(ghTab.url) && ghTab.url.includes("labels=sugerencia"), ghTab && ghTab.url);
  }

  // P1: Base remota con versión mayor se reemplaza y pendientes reconocidos desaparecen
  {
    // Base remota realista: la empaquetada más «Truper», con versión de hoy (no del futuro).
    const packagedDb = JSON.parse(fs.readFileSync(path.join(EXT, "data/brands.json"), "utf8"));
    const d = new Date(Date.now() - 60000), pad = (x) => String(x).padStart(2, "0");
    const remoteData = Object.assign({}, packagedDb, {
      version: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`,
      marcas: packagedDb.marcas.filter((x) => x.n.toLowerCase() !== "truper").concat([{ n: "Truper", g: "truper_remoto" }]),
      grupos: Object.assign({}, packagedDb.grupos, { truper_remoto: { empresa: "Truper" } })
    });
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
    const baseUpdated = updateEnv.store.remoteBase && updateEnv.store.remoteBase.data && updateEnv.store.remoteBase.data.version === remoteData.version;
    check("Base remota con versión mayor se reemplaza y los pendientes reconocidos desaparecen", truperGone && desconocidaKept && baseUpdated);
  }

  // Seguridad: bases remotas peligrosas no reemplazan la local; mensajes de páginas no ejecutan órdenes privilegiadas.
  {
    const packagedDb = JSON.parse(fs.readFileSync(path.join(EXT, "data/brands.json"), "utf8"));
    const bad = {
      "versión 9999 (bloquearía las actualizaciones)": Object.assign({}, packagedDb, { version: "9999-12-31T2359" }),
      "base casi vacía (borraría marcas)": { version: "2026-10-16T0000", marcas: [{ n: "X", g: "x" }], grupos: { x: { empresa: "X" } } },
      "marca apuntando a grupo inexistente": Object.assign({}, packagedDb, { version: "2026-10-16T0000", marcas: packagedDb.marcas.concat([{ n: "Fantasma", g: "no_existe" }]) })
    };
    for (const [name, data] of Object.entries(bad)) {
      const e = makeEnv(async (req) => (req.url.includes("brands.json") ? { status: 200, body: data } : { status: 200, body: {} }));
      e.store.settings = { remoteUrl: "https://raw.githubusercontent.com/o/r/main/extension/data/brands.json" };
      const r = await e.send({ type: "qed:updateBase" });
      check(`Base remota rechazada: ${name}`, !e.store.remoteBase && r && r.log && r.log.errors.length > 0, JSON.stringify(r && r.log && r.log.errors));
    }
    {
      const e = makeEnv(async () => ({ status: 200, body: packagedDb }));
      e.store.settings = { remoteUrl: "http://inseguro.example/brands.json" };
      const r = await e.send({ type: "qed:updateBase" });
      check("Base remota por http (no https) rechazada", !e.store.remoteBase && /https/.test(JSON.stringify(r.log.errors)));
    }
    {
      const e = makeEnv(async () => ({ status: 200, body: {} }));
      const fromTab = (msg) => new Promise((resolve) => {
        for (const f of e.listeners.message) { const keep = f(msg, { tab: { id: 9 } }, resolve); if (keep !== true) setTimeout(() => resolve(undefined), 0); }
      });
      const r1 = await fromTab({ type: "qed:runJob" });
      const r2 = await fromTab({ type: "qed:testKey", which: "research" });
      const r3 = await fromTab({ type: "qed:flush_suggestions" });
      check("Órdenes privilegiadas (runJob, testKey, flush_suggestions) rechazadas si vienen de una pestaña", r1 && r1.ok === false && r2 && r2.ok === false && r3 && r3.ok === false, JSON.stringify([r1, r2, r3]));
      e.chrome.tabs.created.length = 0;
      await new Promise((resolve) => { for (const f of e.listeners.message) f({ type: "qed:suggest_brand", brand: "X", title: "Y", site: "Z", url: "javascript:alert(1)" }, { tab: { id: 9 } }, resolve); });
      const opened = e.chrome.tabs.created.map((o) => o.url);
      check("Sugerencia con url javascript: no abre pestañas en modo directo", opened.length === 0, JSON.stringify(opened));

      e.store.settings = { useGitHubIssues: true };
      await new Promise((resolve) => { for (const f of e.listeners.message) f({ type: "qed:suggest_brand", brand: "X", title: "Y", site: "Z", url: "javascript:alert(1)" }, { tab: { id: 9 } }, resolve); });
      const openedGh = e.chrome.tabs.created.map((o) => o.url);
      check("Sugerencia en modo GitHub con url javascript: neutralizada por SAFE_OPEN (solo abre GitHub)", openedGh.length === 1 && /^https:\/\/github\.com\//.test(openedGh[0]) && !openedGh.some((u) => /^javascript:/i.test(u)), JSON.stringify(openedGh));

      // F2: apertura segura de rastreadores vía qed:open_tracker
      e.chrome.tabs.created.length = 0;
      const rTrackOk = await new Promise((resolve) => {
        for (const f of e.listeners.message) f({ type: "qed:open_tracker", url: "https://keepa.com/#!product/11-B0ABCDEF12" }, { tab: { id: 9 } }, resolve);
      });
      const openedTrack = e.chrome.tabs.created.map((o) => o.url);

      // H3a: qed:data entrega base efectiva y sitios a la extensión
      const rData = await e.send({ type: "qed:data" });
      check("H3a: qed:data responde con base de marcas, sitios y proyecto",
        rData && rData.ok === true && rData.brands && rData.sites && rData.project,
        JSON.stringify({ ok: rData && rData.ok, hasBrands: !!(rData && rData.brands), hasSites: !!(rData && rData.sites) }));

      // qed:data desde remitente externo (id distinto) es ignorado
      let extAnswered = false;
      for (const f of e.listeners.message) {
        const ret = f({ type: "qed:data" }, { id: "otro-addon-id" }, () => { extAnswered = true; });
        if (ret === false) { /* rechazado/ignorado */ }
      }
      check("H3a: qed:data ignora remitentes con ID externo", !extAnswered);
      check("F2. qed:open_tracker abre enlace permitido de Keepa", rTrackOk && rTrackOk.ok === true && openedTrack.length === 1 && openedTrack[0] === "https://keepa.com/#!product/11-B0ABCDEF12");

      e.chrome.tabs.created.length = 0;
      const rTrackBad = await new Promise((resolve) => {
        for (const f of e.listeners.message) f({ type: "qed:open_tracker", url: "javascript:alert(1)" }, { tab: { id: 9 } }, resolve);
      });
      const openedTrackBad = e.chrome.tabs.created.map((o) => o.url);
      check("F2. qed:open_tracker rechaza URL hostil y no abre pestaña", rTrackBad && rTrackBad.ok === false && rTrackBad.error === "url_no_permitida" && openedTrackBad.length === 0);
    }
  }

  // ---------------------------------------------------------------- Comparador en background (F1)
  {
    // 1) Sin consentimiento: no hace peticiones y devuelve error claro
    const noConsentEnv = makeEnv(async () => ({ status: 200, body: "" }));
    const rNoConsent = await noConsentEnv.send({
      type: "qed:compare_prices",
      product: { title: "Sony WH-1000XM5", brand: "Sony" },
      host: "www.amazon.com.mx",
      country: "México"
    });
    const externalCalls = noConsentEnv.calls.filter((c) => !c.url.startsWith("ext://"));
    check("Comparador: sin consentimiento → error y 0 peticiones de red",
      rNoConsent && rNoConsent.ok === false && (rNoConsent.error || rNoConsent.reason) && externalCalls.length === 0,
      JSON.stringify({ rNoConsent, externalCalls }));

    // 2) Con consentimiento: consulta tiendas (excluye la tienda actual), con credentials: 'omit', referrerPolicy: 'no-referrer' y caché 12h
    const sampleHtml = `
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Sony WH-1000XM5 Audífonos",
        "offers": { "@type": "Offer", "price": "6800", "priceCurrency": "MXN", "url": "https://www.liverpool.com.mx/tienda/pdp/123" }
      }
      </script>
    `;
    const consentEnv = makeEnv(async (req) => {
      if (req.url.includes("walmart.com.mx")) {
        return { status: 200, body: sampleHtml.replace("https://www.liverpool.com.mx/tienda/pdp/123", "https://www.walmart.com.mx/ip/sony-wh-1000xm5/123") };
      }
      return { status: 403, body: "Blocked" };
    });
    consentEnv.store.compareConsent = true;
    for (const d of ["mercadolibre.com.mx", "amazon.com.mx", "walmart.com.mx"]) consentEnv.chrome.permissions.granted.add(`https://*.${d}/*`);

    const rConsent = await consentEnv.send({
      type: "qed:compare_prices",
      product: { title: "Sony WH-1000XM5", brand: "Sony", mpn: "WH-1000XM5", price: 7500, currency: "MXN" },
      host: "www.amazon.com.mx",
      country: "México"
    });

    const cmpCalls = consentEnv.calls.filter((c) => !c.url.startsWith("ext://"));
    const noSelfCall = !cmpCalls.some((c) => c.url.includes("amazon.com.mx"));
    const allOmitCredentials = cmpCalls.every((c) => c.credentials === "omit");
    const allNoReferrer = cmpCalls.every((c) => c.referrerPolicy === "no-referrer");

    const sameW = (rConsent && rConsent.same || [])[0];
    check("Comparador: consulta tiendas excluyendo la actual, con credentials: 'omit' y referrerPolicy: 'no-referrer'",
      rConsent && rConsent.ok === true && cmpCalls.length > 0 && noSelfCall && allOmitCredentials && allNoReferrer,
      JSON.stringify({ rConsent, cmpCallsCount: cmpCalls.length, noSelfCall, allOmitCredentials, allNoReferrer }));

    check("Comparador: el resultado de Walmart llega como «mismo producto», con su dominio, MXN e insignia de más barato",
      sameW && sameW.storeDomain === "walmart.com.mx" && sameW.currency === "MXN" && sameW.price === 6800 && sameW.isCheapest === true,
      JSON.stringify(rConsent && rConsent.same));

    const sl = (rConsent && rConsent.searchLinks) || [];
    check("Comparador: devuelve el enlace de búsqueda de cada tienda consultada (sin la tienda actual) para ponerlo debajo",
      sl.length === 2 && sl.every((l) => /^https:\/\//.test(l.url) && l.url.includes("Sony%20WH-1000XM5")) && !sl.some((l) => /amazon/.test(l.dominio)), JSON.stringify(sl));

    // 3) Caché 12h: una segunda consulta idéntica no genera peticiones adicionales
    const callsBefore = consentEnv.calls.length;
    const rCache = await consentEnv.send({
      type: "qed:compare_prices",
      product: { title: "Sony WH-1000XM5", brand: "Sony", mpn: "WH-1000XM5", price: 7500, currency: "MXN" },
      host: "www.amazon.com.mx",
      country: "México"
    });
    const callsAfter = consentEnv.calls.length;
    check("Comparador: segunda consulta sale de caché de 12h sin llamadas de red",
      rCache && rCache.ok === true && callsAfter === callsBefore);
  }

  // ---------------------------------------------------------------- Validación 2026-10-18: permisos y URLs del comparador
  {
    // Consentimiento guardado pero sin permiso de host concedido → ninguna petición a tiendas
    const npEnv = makeEnv(async () => ({ status: 200, body: "<html></html>" }));
    npEnv.store.compareConsent = true;
    const rNp = await npEnv.send({ type: "qed:compare_prices", product: { title: "Sony WH-1000XM5", brand: "Sony", mpn: "WH-1000XM5" }, host: "www.amazon.com.mx", country: "México" });
    const npCalls = npEnv.calls.filter((c) => !c.url.startsWith("ext://"));
    check("Comparador: sin permiso de host concedido no hay ninguna petición (la tienda sale como no leída)",
      npCalls.length === 0 && rNp && rNp.ok === true && (rNp.unreadable || []).length > 0, JSON.stringify(npCalls.map((c) => c.url)));

    // Base remota con una URL de búsqueda fuera del dominio declarado → esa tienda no se consulta
    const hostileEnv = makeEnv(async () => ({ status: 200, body: "<html></html>" }));
    hostileEnv.store.compareConsent = true;
    const base = JSON.parse(fs.readFileSync(path.join(EXT, "data", "brands.json"), "utf8"));
    base.tiendas_comparar = { "México": [
      { nombre: "Fuga", dominio: "walmart.com.mx", url_busqueda: "https://169.254.169.254/latest?q={q}" },
      { nombre: "HTTP", dominio: "walmart.com.mx", url_busqueda: "http://www.walmart.com.mx/search?q={q}" },
      { nombre: "Otro", dominio: "walmart.com.mx", url_busqueda: "https://walmart.com.mx.evil.example/s?q={q}" }
    ] };
    base.version = String(base.version) + "z"; // más nueva que la empaquetada, para que se use
    hostileEnv.store.remoteBase = { data: base, version: base.version };
    hostileEnv.chrome.permissions.granted.add("https://*.walmart.com.mx/*");
    await hostileEnv.send({ type: "qed:compare_prices", product: { title: "Sony WH-1000XM5", brand: "Sony", mpn: "WH-1000XM5" }, host: "www.amazon.com.mx", country: "México" });
    const hCalls = hostileEnv.calls.filter((c) => !c.url.startsWith("ext://"));
    check("Comparador: URL de búsqueda de la base fuera del dominio, http o IP interna → no se consulta",
      hCalls.length === 0, JSON.stringify(hCalls.map((c) => c.url)));

    // La tarjeta pide abrir la página de permiso: se abre comparar.html del país; un país desconocido no abre nada
    const pgEnv = makeEnv(async () => ({ status: 200, body: {} }));
    const rPg = await pgEnv.send({ type: "qed:open_compare_consent", pais: "México" });
    const rBad = await pgEnv.send({ type: "qed:open_compare_consent", pais: "Atlántida" });
    const tabs = pgEnv.chrome.tabs.created.map((o) => o.url);
    check("Comparador: el permiso se pide en options/comparar.html del país (y nada para un país sin tiendas)",
      rPg && rPg.ok === true && rBad && rBad.ok === false && tabs.length === 1 && tabs[0] === "ext://options/comparar.html?pais=M%C3%A9xico", JSON.stringify(tabs));
  }

  // ---------------------------------------------------------------- H2: Diagnóstico del comparador
  {
    const baseWith3 = JSON.parse(fs.readFileSync(path.join(EXT, "data", "brands.json"), "utf8"));
    baseWith3.tiendas_comparar = {
      "México": [
        { nombre: "Walmart México", dominio: "walmart.com.mx", url_busqueda: "https://www.walmart.com.mx/search?q={q}" },
        { nombre: "Mercado Libre", dominio: "mercadolibre.com.mx", url_busqueda: "https://listado.mercadolibre.com.mx/{q}" },
        { nombre: "Liverpool", dominio: "liverpool.com.mx", url_busqueda: "https://www.liverpool.com.mx/tienda?s={q}" }
      ]
    };
    baseWith3.version = String(baseWith3.version) + "h2";
    const sampleHtml = `
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Sony WH-1000XM5 Audífonos",
        "offers": { "@type": "Offer", "price": "6800", "priceCurrency": "MXN", "url": "https://www.walmart.com.mx/ip/sony-wh-1000xm5/123" }
      }
      </script>
    `;
    const diagEnv = makeEnv(async (req) => {
      if (req.url.includes("walmart.com.mx")) {
        return { status: 200, body: sampleHtml };
      }
      if (req.url.includes("mercadolibre.com.mx")) {
        return { status: 403, body: "Blocked by PerimeterX" };
      }
      return { status: 200, body: "" };
    });
    diagEnv.store.compareConsent = true;
    diagEnv.store.remoteBase = { data: baseWith3, version: baseWith3.version };
    diagEnv.chrome.permissions.granted.add("https://*.walmart.com.mx/*");
    diagEnv.chrome.permissions.granted.add("https://*.mercadolibre.com.mx/*");

    const userProductTitle = "Sony WH-1000XM5 Audífonos Inalámbricos Ruido Premium 2026";
    await diagEnv.send({
      type: "qed:compare_prices",
      product: { title: userProductTitle, brand: "Sony", mpn: "WH-1000XM5", price: 7500, currency: "MXN" },
      host: "www.amazon.com.mx",
      country: "México"
    });

    const diags = (await diagEnv.chrome.storage.local.get("compareDiagnostics")).compareDiagnostics || [];
    const lastDiag = diags[0];

    // 1. Estados: leida, bloqueo, sin_permiso
    const stWalmart = lastDiag && (lastDiag.tiendas || []).find((t) => t.tienda === "walmart.com.mx");
    const stML = lastDiag && (lastDiag.tiendas || []).find((t) => t.tienda === "mercadolibre.com.mx");
    const stLiverpool = lastDiag && (lastDiag.tiendas || []).find((t) => t.tienda === "liverpool.com.mx");

    check("H2: el registro se llena con un caso leído, uno bloqueado y uno sin permiso",
      stWalmart && stWalmart.estado === "leida" && stWalmart.metodo === "jsonld" &&
      stML && stML.estado === "bloqueo" &&
      stLiverpool && stLiverpool.estado === "sin_permiso",
      JSON.stringify(lastDiag && lastDiag.tiendas));

    // 2. Sin URLs completas de usuario ni títulos de productos
    const diagJson = JSON.stringify(lastDiag);
    const hasFullUrls = /https?:\/\//i.test(diagJson);
    const hasProductTitle = diagJson.includes(userProductTitle);
    check("H2: no guarda URLs completas de la página ni títulos de productos",
      !hasFullUrls && !hasProductTitle && lastDiag.tienda === "amazon.com.mx",
      JSON.stringify({ hasFullUrls, hasProductTitle, tienda: lastDiag && lastDiag.tienda }));

    // 3. Guarda máximo 10
    for (let i = 0; i < 15; i++) {
      await diagEnv.send({
        type: "qed:compare_prices",
        product: { title: "P " + i, brand: "Sony", mpn: "WH-1000XM5" },
        host: "www.amazon.com.mx",
        country: "México"
      });
    }
    const diags15 = (await diagEnv.chrome.storage.local.get("compareDiagnostics")).compareDiagnostics || [];
    check("H2: compareDiagnostics guarda máximo 10 comparaciones",
      diags15.length === 10,
      `longitud = ${diags15.length}`);

    // 4. «Borrar memoria» lo vacía
    await diagEnv.chrome.storage.local.set({ aiCache: {}, compareDiagnostics: [] });
    const diagsCleared = (await diagEnv.chrome.storage.local.get("compareDiagnostics")).compareDiagnostics || [];
    check("H2: «Borrar memoria» vacía compareDiagnostics",
      diagsCleared.length === 0,
      `longitud = ${diagsCleared.length}`);
  }

  // ---------------------------------------------------------------- Sugerencias de punta a punta: extensión → Code.gs real (validación 2026-10-18)
  // Antes las pruebas mandaban datos «bonitos» a mano; en el navegador la tarjeta y el popup mandaban el nombre de la tienda,
  // el servicio lo rechazaba y la tarjeta decía «Enviada». Aquí el fondo habla con el Code.gs real (con Sheets simulado).
  {
    const sheet = [["id", "fecha", "tipo", "marca", "tienda", "producto", "pais", "ext", "veces", "estado"]];
    const cache = {}, props = { ROBOT_TOKEN: "tok" };
    global.ContentService = { MimeType: { JSON: "json" }, createTextOutput: (txt) => ({ txt, setMimeType: () => {} }) };
    global.CacheService = { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = String(v); } }) };
    global.PropertiesService = { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = String(v); } }) };
    global.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
    global.Utilities = { getUuid: () => "u" + sheet.length };
    global.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheets: () => [{
      getLastRow: () => sheet.length,
      getRange: (r, c, nr, nc) => ({ getValues: () => sheet.slice(r - 1, r - 1 + (nr || 1)).map((row) => row.slice(c - 1, c - 1 + (nc || 1))), setValue: (v) => { sheet[r - 1][c - 1] = v; } }),
      appendRow: (row) => sheet.push(row.slice()), deleteRow: (n) => sheet.splice(n - 1, 1) }] }) };
    delete require.cache[require.resolve("../servicios/sugerencias/Code.gs")];
    const GS = require("../servicios/sugerencias/Code.gs");
    const viaGs = async (req) => {
      if (!req.url.includes("script.google.com")) return { status: 200, body: {} };
      const out = GS.doPost({ postData: { contents: JSON.stringify(req.body) } });
      return { status: 200, body: JSON.parse(out.txt) };
    };

    const e1 = makeEnv(viaGs);
    // Como el popup antes: nombre de la tienda en vez de dominio
    const r1 = await e1.send({ type: "qed:suggest_brand", brand: "Marca Popup", title: "Producto X", site: "Amazon México", pais: "México" });
    // Como la tarjeta: hostname
    const r2 = await e1.send({ type: "qed:suggest_brand", brand: "Marca Tarjeta", title: "Producto Y", site: "www.walmart.com.mx", pais: "México" });
    // Como la lista de pendientes: «Tienda (País)» desconocida → sin dominio, pero se guarda
    const r3 = await e1.send({ type: "qed:suggest_brand", brand: "Marca Pendiente", title: "", site: "Tiendita Desconocida (México)", pais: "" });
    // Alternativa desde el popup
    const r4 = await e1.send({ type: "qed:suggest_alternative", alternative: { marca: "Café Local", categoria: "café", pais: "México", dueno: "Familia X", fuente: "https://ejemplo.mx/nota" } });
    const filas = sheet.slice(1).map((r) => [r[2], r[3], r[4], r[9]].join("|"));
    check("Sugerencias de punta a punta: popup, tarjeta, pendientes y alternativa llegan a la hoja con estado «enviada»",
      [r1, r2, r3, r4].every((r) => r && r.status === "enviada") &&
      filas.includes("marca|Marca Popup|amazon.com.mx|pendiente") && filas.includes("marca|Marca Tarjeta|walmart.com.mx|pendiente") &&
      filas.includes("marca|Marca Pendiente||pendiente") && filas.some((f) => f.startsWith("alternativa|Café Local||")),
      JSON.stringify({ estados: [r1, r2, r3, r4].map((r) => r && r.status), filas }));

    // Marca inválida → «rechazada» (la tarjeta lo dice) y no se encola
    const r5 = await e1.send({ type: "qed:suggest_brand", brand: "<script>x</script>", title: "", site: "www.walmart.com.mx", pais: "México" });
    const q5 = (await e1.chrome.storage.local.get("suggestionsQueue")).suggestionsQueue || [];
    check("Sugerencia con marca inválida: estado «rechazada» y sin cola", r5 && r5.status === "rechazada" && q5.length === 0, JSON.stringify(r5));

    // Sin URL configurada → «en_cola»; al configurarse, la cola sale sola al arrancar el navegador
    const e2 = makeEnv(viaGs);
    e2.chrome.__sinUrlSugerencias = true;
    const r6 = await e2.send({ type: "qed:suggest_brand", brand: "Marca En Cola", title: "", site: "www.amazon.com.mx", pais: "México" });
    e2.chrome.__sinUrlSugerencias = false;
    const e3 = makeEnv(viaGs);
    await e3.chrome.storage.local.set({ suggestionsQueue: (await e2.chrome.storage.local.get("suggestionsQueue")).suggestionsQueue });
    for (const l of e3.listeners.startup) l();
    await new Promise((r) => setTimeout(r, 30));
    const q6 = (await e3.chrome.storage.local.get("suggestionsQueue")).suggestionsQueue || [];
    check("Sugerencia sin URL: estado «en_cola» y se envía sola al arrancar cuando ya hay URL",
      r6 && r6.status === "en_cola" && q6.length === 0 && sheet.some((r) => r[3] === "Marca En Cola"), JSON.stringify({ r6, q6 }));

    // H1: qed:flush_suggestions desde Opciones vacía la cola y guarda suggestionsLastResult
    const e4 = makeEnv(viaGs);
    await e4.chrome.storage.local.set({
      suggestionsQueue: [{ v: 1, tipo: "marca", marca: "Marca Flush Manual", tienda: "liverpool.com.mx", producto: "Articulo F", pais: "MX", ext: "3.2.0", inst: "11111111-2222-4333-8444-555555555555" }]
    });
    const rFlush = await e4.send({ type: "qed:flush_suggestions" });
    const qAfterFlush = (await e4.chrome.storage.local.get("suggestionsQueue")).suggestionsQueue || [];
    const lrAfterFlush = (await e4.chrome.storage.local.get("suggestionsLastResult")).suggestionsLastResult || null;
    check("H1: qed:flush_suggestions desde Opciones vacía la cola contra Code.gs y actualiza suggestionsLastResult",
      rFlush && rFlush.ok === true && rFlush.queued === 0 && qAfterFlush.length === 0 &&
      lrAfterFlush && lrAfterFlush.status === "enviada" && sheet.some((r) => r[3] === "Marca Flush Manual"),
      JSON.stringify({ rFlush, qAfterFlush, lrAfterFlush }));
  }

  console.log(`\n${pass}/${total} pruebas correctas`);
  process.exit(pass === total ? 0 : 1);
})();
