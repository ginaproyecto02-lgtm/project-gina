// Página de opciones: claves y modelos (consulta en vivo + investigación semanal), base remota y memoria.
const api = typeof browser !== "undefined" ? browser : chrome;
const AI = globalThis.QEDAI;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (t) => (t ? new Date(t).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "—");

const DEFAULTS = {
  aiEnabled: false,
  classify: { provider: "anthropic", key: "", model: AI.PROVIDERS.anthropic.classifyModel, base: "" },
  research: { provider: "anthropic", key: "", model: AI.PROVIDERS.anthropic.researchModel, base: "", useClassifyKey: false },
  dailyLimit: 100, weeklyLimit: 25, revalidateLimit: 3, repLimit: 3, cacheDays: 90, jobEnabled: false, remoteUrl: "",
  values: {}, showLobbying: true, showAlternatives: true
};
let PROJ = {};
const REP = globalThis.QED && globalThis.QED.REP;
const VALUE_LABELS = ["No me importa", "Normal", "Muy importante"];

// ---------------------------------------------------------------- Tus valores
function buildValues() {
  $("#values").innerHTML = Object.entries(REP.TEMAS).map(([id, t]) => `<label>${t.icon} ${esc(t.label)}
    <select data-value="${esc(id)}">${VALUE_LABELS.map((l, i) => `<option value="${i}">${esc(l)}</option>`).join("")}</select></label>`).join("");
}
const STATUS = {
  por_investigar: "Por investigar", por_verificar: "Clasificada por IA · por verificar", reintentar: "Reintentar",
  sin_fuentes: "Sin fuentes", verificada: "Verificada", no_encontrada: "No encontrada"
};

function msg(id, text, kind) { const el = $("#" + id); el.textContent = text; el.className = "msg " + (kind || ""); }

// ---------------------------------------------------------------- Proveedores y modelos
function fillProviders(sel) {
  sel.innerHTML = Object.entries(AI.PROVIDERS).map(([id, p]) => `<option value="${id}">${esc(p.label)}${p.search ? "" : " — sin búsqueda web"}</option>`).join("");
}
function syncProvider(prefix, which) {
  const prov = $(`#${prefix}_provider`).value;
  const p = AI.PROVIDERS[prov] || {};
  $(`#${prefix}_models`).innerHTML = (p.models || []).map((m) => `<option value="${esc(m)}">`).join("");
  // La URL base solo hace falta para «Otro compatible con OpenAI»; Groq y xAI ya la traen.
  $(`#${prefix}_base`).closest("label").style.display = prov === "openai" ? "" : "none";
  const model = $(`#${prefix}_model`);
  const def = which === "research" ? p.researchModel : p.classifyModel;
  if (!model.value) model.value = def || ""; // al cambiar de proveedor el campo se vacía antes (ver «change»)
  if (which === "research") {
    $("#msg_research").textContent = p.search ? "" : "Este proveedor no tiene búsqueda web: sus resultados quedarán «sin fuentes» (no verificados).";
    $("#msg_research").className = "msg";
  }
}

async function loadSettings() {
  const { settings: st } = await api.storage.local.get("settings");
  const s = Object.assign({}, DEFAULTS, st || {});
  s.classify = Object.assign({}, DEFAULTS.classify, (st && st.classify) || {});
  s.research = Object.assign({}, DEFAULTS.research, (st && st.research) || {});
  return s;
}

function readForm() {
  const num = (id, def, min, max) => { const v = parseInt($("#" + id).value, 10); return isFinite(v) ? Math.min(max, Math.max(min, v)) : def; };
  return {
    aiEnabled: $("#aiEnabled").checked,
    classify: { provider: $("#c_provider").value, model: $("#c_model").value.trim(), key: $("#c_key").value.trim(), base: $("#c_base").value.trim() },
    research: { provider: $("#r_provider").value, model: $("#r_model").value.trim(), key: $("#r_key").value.trim(), base: $("#r_base").value.trim(), useClassifyKey: $("#r_useClassifyKey").checked },
    dailyLimit: num("dailyLimit", 100, 1, 5000), cacheDays: num("cacheDays", 90, 1, 365),
    weeklyLimit: num("weeklyLimit", 25, 1, 500), revalidateLimit: num("revalidateLimit", 3, 0, 100),
    repLimit: num("repLimit", 3, 0, 50),
    jobEnabled: $("#jobEnabled").checked, remoteUrl: $("#remoteUrl").value.trim(),
    values: Object.fromEntries(Array.from(document.querySelectorAll("[data-value]")).map((el) => [el.dataset.value, parseInt(el.value, 10)])),
    showLobbying: $("#showLobbying").checked,
    showAlternatives: $("#showAlternatives").checked
  };
}

function writeForm(s) {
  $("#aiEnabled").checked = !!s.aiEnabled;
  $("#c_provider").value = s.classify.provider; $("#c_model").value = s.classify.model; $("#c_key").value = s.classify.key; $("#c_base").value = s.classify.base || "";
  $("#r_provider").value = s.research.provider; $("#r_model").value = s.research.model; $("#r_key").value = s.research.key; $("#r_base").value = s.research.base || "";
  $("#r_useClassifyKey").checked = !!s.research.useClassifyKey;
  $("#dailyLimit").value = s.dailyLimit; $("#cacheDays").value = s.cacheDays; $("#weeklyLimit").value = s.weeklyLimit; $("#revalidateLimit").value = s.revalidateLimit;
  $("#jobEnabled").checked = !!s.jobEnabled; $("#remoteUrl").value = s.remoteUrl || "";
  $("#repLimit").value = s.repLimit;
  document.querySelectorAll("[data-value]").forEach((el) => { const v = (s.values || {})[el.dataset.value]; el.value = String(v == null ? 1 : v); });
  $("#showLobbying").checked = s.showLobbying !== false;
  $("#showAlternatives").checked = s.showAlternatives !== false;
  // Si ya usa su propia IA, el bloque avanzado aparece abierto
  if (s.aiEnabled || s.jobEnabled || s.classify.key || s.research.key) document.querySelector("details.advanced").open = true;
  syncProvider("c", "classify"); syncProvider("r", "research");
}

const IS_FIREFOX = typeof browser !== "undefined" && !!(browser.runtime && browser.runtime.getBrowserInfo);
// Permisos que se piden dentro del clic: dominios del proveedor y, en Firefox, consentimiento de «contenido de sitios web».
function permissionRequest(origins, needsData) {
  const req = {};
  if (origins.length) req.origins = origins;
  if (IS_FIREFOX && needsData) req.data_collection = ["websiteContent"];
  if (!Object.keys(req).length || !api.permissions) return Promise.resolve(true);
  return api.permissions.request(req).catch((e) => {
    // Firefox anterior a 140 no conoce data_collection: reintenta solo con los dominios.
    if (req.data_collection) { delete req.data_collection; return req.origins ? api.permissions.request(req) : true; }
    throw e;
  });
}

// Orígenes a los que la extensión necesita acceso (se piden al guardar, dentro del clic del usuario).
function originsFor(s) {
  const out = new Set();
  if (s.aiEnabled && s.classify.key) { const o = AI.originOf(s.classify); if (o) out.add(o); }
  if (s.jobEnabled || s.research.key || s.research.useClassifyKey) { const o = AI.originOf(s.research); if (o) out.add(o); }
  if (s.remoteUrl) { try { out.add(new URL(s.remoteUrl).origin + "/*"); } catch (e) {} }
  return Array.from(out);
}

function validate(s) {
  if (s.remoteUrl && !/^https:\/\//i.test(s.remoteUrl)) return "La URL de la base remota debe empezar con https://";
  for (const [label, c] of [["consulta en vivo", s.classify], ["investigación", s.research]]) {
    if (c.provider === "openai" && c.base && !/^https:\/\//i.test(c.base)) return `La URL base de ${label} debe empezar con https://`;
  }
  if (s.aiEnabled && !s.classify.key) return "Para activar la consulta en vivo falta la clave de API.";
  if (s.aiEnabled && !s.classify.model) return "Falta el modelo de la consulta en vivo.";
  if (s.jobEnabled && !s.research.model) return "Falta el modelo de la investigación semanal.";
  return "";
}

$("#save").addEventListener("click", () => {
  const s = readForm();
  const err = validate(s);
  if (err) { msg("msg_save", err, "err"); return; }
  const origins = originsFor(s);
  // permissions.request debe llamarse directamente dentro del clic.
  const usesAI = (s.aiEnabled && !!s.classify.key) || (s.jobEnabled && !!(s.research.key || s.research.useClassifyKey));
  const ask = permissionRequest(origins, usesAI);
  ask.then(async (granted) => {
    await api.storage.local.set({ settings: s });
    msg("msg_save", granted ? "Configuración guardada." : "Guardada, pero no diste permiso de acceso al proveedor: las consultas pueden fallar.", granted ? "ok" : "err");
    refresh();
  }).catch((e) => msg("msg_save", "No se pudo guardar: " + e.message, "err"));
});

document.querySelectorAll("[data-test]").forEach((b) => b.addEventListener("click", () => {
  const which = b.dataset.test;
  const s = readForm();
  const origins = originsFor(Object.assign({}, s, { aiEnabled: true, jobEnabled: true }));
  const out = which === "research" ? "msg_research" : "msg_classify";
  msg(out, "Probando…");
  const ask = permissionRequest(origins, true);
  ask.then(async () => {
    await api.storage.local.set({ settings: s }); // la prueba usa lo que está en el formulario
    const r = await api.runtime.sendMessage({ type: "qed:testKey", which });
    msg(out, r && r.ok ? `✔ Funciona (${r.model})` : `✖ ${r ? r.error : "sin respuesta"}`, r && r.ok ? "ok" : "err");
  }).catch((e) => msg(out, "✖ " + e.message, "err"));
}));

$("#runNow").addEventListener("click", async () => {
  await api.runtime.sendMessage({ type: "qed:runJob" });
  msg("msg_research", "Investigación en curso. Puedes cerrar esta pestaña; el resultado aparecerá en la bitácora.", "ok");
  setTimeout(refresh, 1500);
});

$("#c_provider").addEventListener("change", () => { $("#c_model").value = ""; syncProvider("c", "classify"); });
$("#r_provider").addEventListener("change", () => { $("#r_model").value = ""; syncProvider("r", "research"); });

// ---------------------------------------------------------------- Memoria
async function refresh() {
  const st = await api.storage.local.get(["aiCache", "pending", "verified", "groupPatches", "runLog", "usage", "jobState", "remoteBase", "customBrands", "repPatches"]);
  const pend = st.pending || {}, ver = st.verified || {}, cache = st.aiCache || {}, log = st.runLog || [], gp = st.groupPatches || {};
  const pendVals = Object.values(pend);
  const open = pendVals.filter((p) => ["por_investigar", "por_verificar", "reintentar", "sin_fuentes"].includes(p.status)).length;
  const today = new Date().toISOString().slice(0, 10);
  const u = st.usage && st.usage.day === today ? st.usage : { count: 0, tokensIn: 0, tokensOut: 0 };
  const job = st.jobState || {};
  $("#stats").innerHTML = [
    [Object.keys(cache).length, "en caché de IA"],
    [open, "pendientes de análisis"],
    [Object.keys(ver).length, "verificadas por investigación"],
    [Object.values(gp).filter((g) => g.controlador).length, "grupos revalidados"],
    [`${u.count}`, `consultas hoy (${(u.tokensIn || 0).toLocaleString("es-MX")} / ${(u.tokensOut || 0).toLocaleString("es-MX")} tokens)`],
    [Object.keys(st.repPatches || {}).length, "historiales de reputación investigados"],
    [(st.customBrands || []).length, "marcas agregadas por ti"]
  ].map(([b, s]) => `<div class="stat"><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join("");

  $("#jobStatus").textContent = job.running ? `⏳ Investigación en curso desde ${fmtDate(job.startedAt)}…` : `Última ejecución: ${fmtDate(job.lastRun)}.`;
  const rb = st.remoteBase;
  $("#projStatus").textContent = !PROJ.remoteUrl ? "Esta copia no tiene configurado el repositorio del proyecto: la base se actualiza solo con nuevas versiones de la extensión."
    : rb ? `Base del proyecto descargada: ${fmtDate(rb.fetchedAt)} · versión ${rb.data && rb.data.version}.`
    : (log[0] && (log[0].errors || []).find((e) => /^Base remota/.test(e))) ? `No se pudo descargar la base del proyecto (${(log[0].errors || []).find((e) => /^Base remota/.test(e)).replace(/^Base remota: /, "")}); se reintentará.`
    : "La base del proyecto se descargará en el próximo minuto o al abrir el navegador.";
  $("#sendPending").hidden = !(PROJ.issuesUrl || PROJ.contacto);
  $("#remoteStatus").textContent = rb ? `Última descarga: ${fmtDate(rb.fetchedAt)} · versión ${rb.data && rb.data.version} · ${(rb.data && rb.data.marcas || []).length} marcas` : "Sin base remota descargada.";

  const pt = $("#pendingTable tbody");
  const rows = Object.entries(pend).sort((a, b) => (b[1].count || 0) - (a[1].count || 0));
  pt.innerHTML = rows.length ? rows.map(([k, p]) => `<tr>
      <td><b>${esc(p.brand || "(sin marca)")}</b><div class="small">${esc(p.title)}</div>${p.hint ? `<div class="small">IA: ${esc(p.hint)}</div>` : ""}</td>
      <td>${esc(p.site)}</td><td>${esc(p.count)}</td>
      <td><span class="pill ${esc(p.status)}">${esc(STATUS[p.status] || p.status)}</span>${p.tries ? `<div class="small">${p.tries} intento(s)</div>` : ""}</td>
      <td>${fmtDate(p.lastTry)}</td>
      <td><button data-retry="${esc(k)}" title="Volver a intentar">↻</button><button data-del-pend="${esc(k)}" title="Quitar">✕</button></td></tr>`).join("")
    : `<tr><td colspan="6" class="small">No hay pendientes. Las marcas que no estén en la base aparecerán aquí.</td></tr>`;

  const vt = $("#verifiedTable tbody");
  const vrows = Object.entries(ver).sort((a, b) => (b[1].verifiedAt || 0) - (a[1].verifiedAt || 0));
  vt.innerHTML = vrows.length ? vrows.map(([k, v]) => `<tr>
      <td><b>${esc(v.marca)}</b></td><td>${esc(v.empresa)}</td><td>${esc(v.controlador)}</td>
      <td>${/^https?:\/\//.test(v.url || "") ? `<a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">${esc(v.fuente || "fuente")}</a>` : esc(v.fuente)}${(v.fuentes || []).length > 1 ? `<div class="small">+${v.fuentes.length - 1} fuente(s)</div>` : ""}</td>
      <td>${fmtDate(v.verifiedAt)}<div class="small">${esc(v.model)}</div></td>
      <td><button data-del-ver="${esc(k)}" title="Quitar">✕</button></td></tr>`).join("")
    : `<tr><td colspan="6" class="small">Todavía no hay marcas verificadas por la investigación semanal.</td></tr>`;

  const lt = $("#logTable tbody");
  lt.innerHTML = log.length ? log.map((l) => `<tr>
      <td>${fmtDate(l.start)}</td><td>${esc(l.trigger)}</td><td>${l.researched}</td><td>${l.verified}</td><td>${l.unsourced}</td><td>${l.notFound}</td><td>${l.revalidated}${l.reputacion ? `<div class="small">+${l.reputacion} reputación</div>` : ""}</td>
      <td>${(l.tokensIn || 0).toLocaleString("es-MX")} / ${(l.tokensOut || 0).toLocaleString("es-MX")}${l.searches ? `<div class="small">${l.searches} búsquedas</div>` : ""}</td>
      <td>${[l.remote, ...(l.changed || []), ...(l.errors || []).map((e) => "⚠ " + e)].filter(Boolean).map((x) => `<div class="small">${esc(x)}</div>`).join("") || "—"}</td></tr>`).join("")
    : `<tr><td colspan="9" class="small">Aún no hay ejecuciones.</td></tr>`;
}

document.addEventListener("click", async (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  if (t.dataset.retry || t.dataset.delPend) {
    const { pending = {} } = await api.storage.local.get("pending");
    const k = t.dataset.retry || t.dataset.delPend;
    if (t.dataset.retry && pending[k]) { pending[k].status = "reintentar"; pending[k].tries = 0; }
    else delete pending[k];
    await api.storage.local.set({ pending });
    api.runtime.sendMessage({ type: "qed:badge" }).catch(() => {});
    refresh();
  }
  if (t.dataset.delVer) {
    const { verified = {} } = await api.storage.local.get("verified");
    delete verified[t.dataset.delVer];
    await api.storage.local.set({ verified });
    refresh();
  }
});

function download(name, obj) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

$("#exportBtn").addEventListener("click", async () => {
  const st = await api.storage.local.get(["customBrands", "aiCache", "pending", "verified", "groupPatches", "repPatches", "seenGroups"]);
  download(`gina-memoria-${new Date().toISOString().slice(0, 10)}.json`,
    Object.assign({ tipo: "gina/memoria", version: 3, exportado: new Date().toISOString() }, st));
  msg("msg_mem", "Memoria exportada (no incluye tus claves).", "ok");
});

$("#exportPending").addEventListener("click", async () => {
  const { pending = {} } = await api.storage.local.get("pending");
  const items = Object.entries(pending)
    .filter(([, p]) => ["por_investigar", "por_verificar", "reintentar", "sin_fuentes"].includes(p.status))
    .map(([key, p]) => ({ key, brand: p.brand, title: p.title, site: p.site, count: p.count, hint: p.hint || "" }));
  download(`gina-pendientes-${new Date().toISOString().slice(0, 10)}.json`, { tipo: "gina/pendientes", version: 1, exportado: new Date().toISOString(), items });
  msg("msg_mem", `${items.length} pendientes exportados. Súbelos a la carpeta job/pendientes/ de tu repositorio.`, "ok");
});

$("#importFile").addEventListener("change", async (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!data || !["gina/memoria", "awareness/memoria", "quien-esta-detras/memoria"].includes(data.tipo)) throw new Error("el archivo no es una memoria exportada de esta extensión");
    const cur = await api.storage.local.get(["customBrands", "aiCache", "pending", "verified", "groupPatches", "repPatches"]);
    const stamp = (v) => (v && (v.verifiedAt || v.ts || v.lastSeen || v.checkedAt || Date.parse(v.revisado || "") || 0)) || 0;
    const merge = (a, b) => { const out = Object.assign({}, a || {}); let n = 0; for (const [k, v] of Object.entries(b || {})) if (!out[k] || stamp(v) > stamp(out[k])) { out[k] = v; n++; } return [out, n]; };
    const [aiCache, n1] = merge(cur.aiCache, data.aiCache);
    const [pending, n2] = merge(cur.pending, data.pending);
    const [verified, n3] = merge(cur.verified, data.verified);
    const [groupPatches, n4] = merge(cur.groupPatches, data.groupPatches);
    const [repPatches, n5] = merge(cur.repPatches, data.repPatches);
    const names = new Set((cur.customBrands || []).map((c) => String(c.marca).toLowerCase()));
    const customBrands = (cur.customBrands || []).concat((data.customBrands || []).filter((c) => c && c.marca && !names.has(String(c.marca).toLowerCase())));
    await api.storage.local.set({ aiCache, pending, verified, groupPatches, repPatches, customBrands });
    msg("msg_mem", `Importado: ${n1} en caché, ${n2} pendientes, ${n3} verificadas, ${n4} grupos revalidados, ${n5} historiales de reputación.`, "ok");
    refresh();
  } catch (err) { msg("msg_mem", "No se pudo importar: " + err.message, "err"); }
  e.target.value = "";
});

$("#clearCache").addEventListener("click", async () => {
  await api.storage.local.set({ aiCache: {} });
  msg("msg_mem", "Caché de IA vaciada. Las marcas se volverán a consultar cuando aparezcan.", "ok");
  refresh();
});

// ---------------------------------------------------------------- Inicio
fillProviders($("#c_provider"));
fillProviders($("#r_provider"));
buildValues();
fetch(api.runtime.getURL("data/proyecto.json")).then((r) => r.json()).then((p) => { PROJ = p || {}; if (PROJ.nombre) $("#projName").textContent = PROJ.nombre; refresh(); }).catch(() => {});
$("#sendPending").addEventListener("click", async () => {
  const { pending = {} } = await api.storage.local.get("pending");
  const items = Object.values(pending).filter((p) => ["por_investigar", "por_verificar", "reintentar", "sin_fuentes"].includes(p.status) && (p.brand || p.title))
    .sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 30).map((p) => ({ marca: p.brand, tienda: p.site, producto: p.title }));
  if (!items.length) { msg("msg_proj", "No hay marcas pendientes por sugerir.", ""); return; }
  const textList = items.map((it) => `- Marca: ${it.marca || ""} | Tienda: ${it.tienda || ""} | Producto: ${it.producto || ""}`).join("\n");
  try { await navigator.clipboard.writeText(textList); } catch (e) {}
  const subj = encodeURIComponent(`Sugerencia de ${items.length} marcas para Project Gina`);
  const body = encodeURIComponent(`Hola equipo de Project Gina,\n\nAquí comparto las marcas pendientes encontradas en mis compras:\n\n${textList}\n\nGracias.`);
  const mailtoUrl = `mailto:${PROJ.contacto || "gina.proyecto02@gmail.com"}?subject=${subj}&body=${body}`;
  api.tabs.create({ url: mailtoUrl });
  msg("msg_proj", `Se abrió el correo con ${items.length} marcas para ${PROJ.contacto || "el equipo"} (también se copiaron al portapapeles).`, "ok");
});

// Tus valores se guardan al momento (no necesitan permisos).
document.addEventListener("change", async (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement) || !(t.dataset.value || t.id === "showLobbying" || t.id === "showAlternatives")) return;
  const s = await loadSettings();
  const f = readForm();
  s.values = f.values; s.showLobbying = f.showLobbying; s.showAlternatives = f.showAlternatives;
  await api.storage.local.set({ settings: s });
  msg("msg_values", "Guardado. Las tarjetas ya usan tus valores.", "ok");
});
loadSettings().then(writeForm).then(refresh);
api.storage.onChanged.addListener((ch) => { if (ch.pending || ch.verified || ch.runLog || ch.jobState || ch.aiCache || ch.usage) refresh(); });
