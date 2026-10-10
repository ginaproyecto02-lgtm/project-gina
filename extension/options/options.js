// Página de opciones: perfil, valores, claves y modelos, base remota y memoria.
const api = typeof browser !== "undefined" ? browser : chrome;
const AI = globalThis.QEDAI;
const QED = globalThis.QED || {};
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const I18N = () => QED.I18N || {
  t: (k, p) => k,
  tipoLabel: (t) => t,
  tipoInfo: () => "",
  estadoLabel: (s) => s,
  temaLabel: (t) => t,
  repLevel: (i) => i >= 75 ? "Pocas controversias registradas" : i >= 50 ? "Controversias moderadas" : i >= 25 ? "Controversias relevantes" : "Historial de sanciones serio",
  getLang: () => "es",
  setLang: () => {}
};
const t = (k, p) => I18N().t(k, p);

const fmtDate = (time) => {
  if (!time) return "—";
  const l = I18N().getLang();
  const locale = l === "es" ? "es-MX" : l;
  return new Date(time).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
};

const DEFAULTS = {
  aiEnabled: false,
  classify: { provider: "anthropic", key: "", model: AI.PROVIDERS.anthropic.classifyModel, base: "" },
  research: { provider: "anthropic", key: "", model: AI.PROVIDERS.anthropic.researchModel, base: "", useClassifyKey: false },
  dailyLimit: 100, weeklyLimit: 25, revalidateLimit: 3, repLimit: 3, cacheDays: 90, jobEnabled: false, remoteUrl: "",
  values: {}, showLobbying: true, showAlternatives: true, userProfile: "ninguno"
};
let PROJ = {};
const REP = QED.REP;

// ---------------------------------------------------------------- Tus valores
function buildValues() {
  const curValues = {};
  document.querySelectorAll("#values [data-value]").forEach((el) => { curValues[el.dataset.value] = el.value; });
  const labels = [t("opt_val_0"), t("opt_val_1"), t("opt_val_2")];
  const grid = $("#values");
  if (!grid || !REP || !REP.TEMAS) return;
  grid.innerHTML = Object.entries(REP.TEMAS).map(([id, tObj]) => {
    const rawLabel = I18N().temaLabel ? I18N().temaLabel(id) : tObj.label;
    const curVal = curValues[id] !== undefined ? curValues[id] : "1";
    return `<label>${tObj.icon} ${esc(rawLabel)}
      <select data-value="${esc(id)}">${labels.map((l, i) => `<option value="${i}"${String(i) === String(curVal) ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
  }).join("");
}

function getStatusLabel(s) {
  const map = {
    por_investigar: t("status_por_investigar"),
    por_verificar: t("status_por_verificar"),
    reintentar: t("status_reintentar"),
    sin_fuentes: t("status_sin_fuentes"),
    verificada: t("status_verificada"),
    no_encontrada: t("status_no_encontrada")
  };
  return map[s] || s;
}

function msg(id, text, kind) {
  const el = $("#" + id);
  if (!el) return;
  el.textContent = text;
  el.className = "msg " + (kind || "");
}

// ---------------------------------------------------------------- Proveedores y modelos
function fillProviders(sel) {
  if (!sel || !AI || !AI.PROVIDERS) return;
  sel.innerHTML = Object.entries(AI.PROVIDERS).map(([id, p]) => `<option value="${id}">${esc(p.label)}${p.search ? "" : " — sin búsqueda web"}</option>`).join("");
}

function syncProvider(prefix, which) {
  const provEl = $(`#${prefix}_provider`);
  if (!provEl) return;
  const prov = provEl.value;
  const p = (AI && AI.PROVIDERS && AI.PROVIDERS[prov]) || {};
  const mList = $(`#${prefix}_models`);
  if (mList) mList.innerHTML = (p.models || []).map((m) => `<option value="${esc(m)}">`).join("");
  const baseEl = $(`#${prefix}_base`);
  if (baseEl) baseEl.closest("label").style.display = prov === "openai" ? "" : "none";
  const model = $(`#${prefix}_model`);
  const def = which === "research" ? p.researchModel : p.classifyModel;
  if (model && !model.value) model.value = def || "";
  if (which === "research") {
    const rMsg = $("#msg_research");
    if (rMsg) {
      rMsg.textContent = p.search ? "" : t("msg_provider_no_search");
      rMsg.className = "msg";
    }
  }
}

async function loadSettings() {
  const { settings: st, gina_user_profile, gina_lang } = await api.storage.local.get(["settings", "gina_user_profile", "gina_lang"]);
  const s = Object.assign({}, DEFAULTS, st || {});
  s.classify = Object.assign({}, DEFAULTS.classify, (st && st.classify) || {});
  s.research = Object.assign({}, DEFAULTS.research, (st && st.research) || {});
  if (gina_user_profile) s.userProfile = gina_user_profile;
  if (gina_lang && I18N().setLang) I18N().setLang(gina_lang);
  return s;
}

function readForm() {
  const num = (id, def, min, max) => {
    const el = $("#" + id);
    if (!el) return def;
    const v = parseInt(el.value, 10);
    return isFinite(v) ? Math.min(max, Math.max(min, v)) : def;
  };
  const profRadio = document.querySelector('input[name="userProfile"]:checked');
  return {
    userProfile: profRadio ? profRadio.value : "ninguno",
    aiEnabled: !!($("#aiEnabled") && $("#aiEnabled").checked),
    classify: {
      provider: $("#c_provider") ? $("#c_provider").value : "anthropic",
      model: $("#c_model") ? $("#c_model").value.trim() : "",
      key: $("#c_key") ? $("#c_key").value.trim() : "",
      base: $("#c_base") ? $("#c_base").value.trim() : ""
    },
    research: {
      provider: $("#r_provider") ? $("#r_provider").value : "anthropic",
      model: $("#r_model") ? $("#r_model").value.trim() : "",
      key: $("#r_key") ? $("#r_key").value.trim() : "",
      base: $("#r_base") ? $("#r_base").value.trim() : "",
      useClassifyKey: !!($("#r_useClassifyKey") && $("#r_useClassifyKey").checked)
    },
    dailyLimit: num("dailyLimit", 100, 1, 5000),
    cacheDays: num("cacheDays", 90, 1, 365),
    weeklyLimit: num("weeklyLimit", 25, 1, 500),
    revalidateLimit: num("revalidateLimit", 3, 0, 100),
    repLimit: num("repLimit", 3, 0, 50),
    jobEnabled: !!($("#jobEnabled") && $("#jobEnabled").checked),
    remoteUrl: $("#remoteUrl") ? $("#remoteUrl").value.trim() : "",
    values: Object.fromEntries(Array.from(document.querySelectorAll("#values [data-value]")).map((el) => [el.dataset.value, parseInt(el.value, 10)])),
    showLobbying: $("#showLobbying") ? $("#showLobbying").checked : true,
    showAlternatives: $("#showAlternatives") ? $("#showAlternatives").checked : true
  };
}

function writeForm(s) {
  // Tu perfil
  const profMap = { smart: "inteligente", saver: "ahorrador", conscious: "consciente", none: "ninguno" };
  const prof = profMap[s.userProfile] || s.userProfile || "ninguno";
  const rEl = document.querySelector(`input[name="userProfile"][value="${prof}"]`);
  if (rEl) rEl.checked = true;
  else {
    const defR = document.querySelector('input[name="userProfile"][value="ninguno"]');
    if (defR) defR.checked = true;
  }

  if ($("#aiEnabled")) $("#aiEnabled").checked = !!s.aiEnabled;
  if ($("#c_provider")) $("#c_provider").value = s.classify.provider;
  if ($("#c_model")) $("#c_model").value = s.classify.model;
  if ($("#c_key")) $("#c_key").value = s.classify.key;
  if ($("#c_base")) $("#c_base").value = s.classify.base || "";
  if ($("#r_provider")) $("#r_provider").value = s.research.provider;
  if ($("#r_model")) $("#r_model").value = s.research.model;
  if ($("#r_key")) $("#r_key").value = s.research.key;
  if ($("#r_base")) $("#r_base").value = s.research.base || "";
  if ($("#r_useClassifyKey")) $("#r_useClassifyKey").checked = !!s.research.useClassifyKey;
  if ($("#dailyLimit")) $("#dailyLimit").value = s.dailyLimit;
  if ($("#cacheDays")) $("#cacheDays").value = s.cacheDays;
  if ($("#weeklyLimit")) $("#weeklyLimit").value = s.weeklyLimit;
  if ($("#revalidateLimit")) $("#revalidateLimit").value = s.revalidateLimit;
  if ($("#jobEnabled")) $("#jobEnabled").checked = !!s.jobEnabled;
  if ($("#remoteUrl")) $("#remoteUrl").value = s.remoteUrl || "";
  if ($("#repLimit")) $("#repLimit").value = s.repLimit;

  document.querySelectorAll("#values [data-value]").forEach((el) => {
    const v = (s.values || {})[el.dataset.value];
    el.value = String(v == null ? 1 : v);
  });
  if ($("#showLobbying")) $("#showLobbying").checked = s.showLobbying !== false;
  if ($("#showAlternatives")) $("#showAlternatives").checked = s.showAlternatives !== false;

  if (s.aiEnabled || s.jobEnabled || (s.classify && s.classify.key) || (s.research && s.research.key)) {
    const adv = document.querySelector("details.advanced");
    if (adv) adv.open = true;
  }
  syncProvider("c", "classify");
  syncProvider("r", "research");
}

const IS_FIREFOX = typeof browser !== "undefined" && !!(browser.runtime && browser.runtime.getBrowserInfo);

function permissionRequest(origins, needsData) {
  const req = {};
  if (origins.length) req.origins = origins;
  if (IS_FIREFOX && needsData) req.data_collection = ["websiteContent"];
  if (!Object.keys(req).length || !api.permissions) return Promise.resolve(true);
  return api.permissions.request(req).catch((e) => {
    if (req.data_collection) { delete req.data_collection; return req.origins ? api.permissions.request(req) : true; }
    throw e;
  });
}

function originsFor(s) {
  const out = new Set();
  if (s.aiEnabled && s.classify.key && AI) { const o = AI.originOf(s.classify); if (o) out.add(o); }
  if ((s.jobEnabled || s.research.key || s.research.useClassifyKey) && AI) { const o = AI.originOf(s.research); if (o) out.add(o); }
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

// ---------------------------------------------------------------- Traducción completa
function applyI18n() {
  const lang = I18N().getLang();
  document.documentElement.lang = lang;
  document.title = t("opt_page_title");

  // Traducir todos los elementos con data-i18n
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) return;
    const txt = t(key);
    if (!txt) return;
    if (txt.includes("<b") || txt.includes("<code") || txt.includes("<a") || txt.includes("<span")) {
      el.innerHTML = txt;
    } else {
      el.textContent = txt;
    }
  });

  // Traducir placeholders
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    const key = el.dataset.i18nPh;
    if (key) el.placeholder = t(key);
  });

  // Sincronizar el selector de idioma en el encabezado
  const lSel = $("#lang_select");
  if (lSel) lSel.value = lang;

  // Pie de página con enlace de correo
  const foot = $("#optFootText");
  if (foot) {
    foot.innerHTML = t("opt_footer", {
      contacto: `<span id="contacto"><a href="mailto:${esc(PROJ.contacto || "gina.proyecto02@gmail.com")}">${esc(PROJ.contacto || "gina.proyecto02@gmail.com")}</a></span>`
    });
  }

  // Regenerar valores con etiquetas en el idioma activo
  buildValues();

  // Refrescar tablas y estadísticas
  refresh();
}

$("#save").addEventListener("click", () => {
  const s = readForm();
  const err = validate(s);
  if (err) { msg("msg_save", err, "err"); return; }
  const origins = originsFor(s);
  const usesAI = (s.aiEnabled && !!s.classify.key) || (s.jobEnabled && !!(s.research.key || s.research.useClassifyKey));
  const ask = permissionRequest(origins, usesAI);
  ask.then(async (granted) => {
    await api.storage.local.set({ settings: s, gina_user_profile: s.userProfile });
    msg("msg_save", granted ? t("msg_save_ok") : t("msg_save_no_perms"), granted ? "ok" : "err");
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
    await api.storage.local.set({ settings: s });
    const r = await api.runtime.sendMessage({ type: "qed:testKey", which });
    msg(out, r && r.ok ? `✔ Funciona (${r.model})` : `✖ ${r ? r.error : "sin respuesta"}`, r && r.ok ? "ok" : "err");
  }).catch((e) => msg(out, "✖ " + e.message, "err"));
}));

$("#runNow").addEventListener("click", async () => {
  await api.runtime.sendMessage({ type: "qed:runJob" });
  msg("msg_research", t("msg_research_running"), "ok");
  setTimeout(refresh, 1500);
});

if ($("#c_provider")) $("#c_provider").addEventListener("change", () => { $("#c_model").value = ""; syncProvider("c", "classify"); });
if ($("#r_provider")) $("#r_provider").addEventListener("change", () => { $("#r_model").value = ""; syncProvider("r", "research"); });

// ---------------------------------------------------------------- Memoria
async function refresh() {
  const st = await api.storage.local.get(["aiCache", "pending", "verified", "groupPatches", "runLog", "usage", "jobState", "remoteBase", "customBrands", "repPatches"]);
  const pend = st.pending || {}, ver = st.verified || {}, cache = st.aiCache || {}, log = st.runLog || [], gp = st.groupPatches || {};
  const pendVals = Object.values(pend);
  const open = pendVals.filter((p) => ["por_investigar", "por_verificar", "reintentar", "sin_fuentes"].includes(p.status)).length;
  const today = new Date().toISOString().slice(0, 10);
  const u = st.usage && st.usage.day === today ? st.usage : { count: 0, tokensIn: 0, tokensOut: 0 };
  const job = st.jobState || {};
  const l = I18N().getLang();
  const numLoc = l === "es" ? "es-MX" : l;

  $("#stats").innerHTML = [
    [Object.keys(cache).length, t("stat_ai_cache")],
    [open, t("stat_pending")],
    [Object.keys(ver).length, t("stat_verified")],
    [Object.values(gp).filter((g) => g.controlador).length, t("stat_revalidated")],
    [`${u.count}`, t("stat_queries_today", { in: (u.tokensIn || 0).toLocaleString(numLoc), out: (u.tokensOut || 0).toLocaleString(numLoc) })],
    [Object.keys(st.repPatches || {}).length, t("stat_rep_researched")],
    [(st.customBrands || []).length, t("stat_custom_brands")]
  ].map(([b, s]) => `<div class="stat"><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join("");

  $("#jobStatus").textContent = job.running ? `⏳ Investigación en curso desde ${fmtDate(job.startedAt)}…` : `Última ejecución: ${fmtDate(job.lastRun)}.`;
  const rb = st.remoteBase;
  $("#projStatus").textContent = !PROJ.remoteUrl ? t("proj_status_no_repo")
    : rb ? t("proj_status_fetched", { date: fmtDate(rb.fetchedAt), version: (rb.data && rb.data.version) || "—" })
    : (log[0] && (log[0].errors || []).find((e) => /^Base remota/.test(e))) ? t("proj_status_err", { err: (log[0].errors || []).find((e) => /^Base remota/.test(e)).replace(/^Base remota: /, "") })
    : t("proj_status_queued");

  $("#sendPending").hidden = !(PROJ.issuesUrl || PROJ.contacto);
  $("#remoteStatus").textContent = rb ? t("remote_status_fetched", { date: fmtDate(rb.fetchedAt), version: (rb.data && rb.data.version) || "—", count: (rb.data && rb.data.marcas || []).length }) : t("remote_status_none");

  const pt = $("#pendingTable tbody");
  const rows = Object.entries(pend).sort((a, b) => (b[1].count || 0) - (a[1].count || 0));
  pt.innerHTML = rows.length ? rows.map(([k, p]) => `<tr>
      <td><b>${esc(p.brand || "(sin marca)")}</b><div class="small">${esc(p.title)}</div>${p.hint ? `<div class="small">IA: ${esc(p.hint)}</div>` : ""}</td>
      <td>${esc(p.site)}</td><td>${esc(p.count)}</td>
      <td><span class="pill ${esc(p.status)}">${esc(getStatusLabel(p.status))}</span>${p.tries ? `<div class="small">${p.tries} intento(s)</div>` : ""}</td>
      <td>${fmtDate(p.lastTry)}</td>
      <td><button data-retry="${esc(k)}" title="${t("btn_retry_title")}">↻</button><button data-del-pend="${esc(k)}" title="${t("btn_remove_title")}">✕</button></td></tr>`).join("")
    : `<tr><td colspan="6" class="small">${t("msg_no_pending")}</td></tr>`;

  const vt = $("#verifiedTable tbody");
  const vrows = Object.entries(ver).sort((a, b) => (b[1].verifiedAt || 0) - (a[1].verifiedAt || 0));
  vt.innerHTML = vrows.length ? vrows.map(([k, v]) => `<tr>
      <td><b>${esc(v.marca)}</b></td><td>${esc(v.empresa)}</td><td>${esc(v.controlador)}</td>
      <td>${/^https?:\/\//.test(v.url || "") ? `<a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">${esc(v.fuente || t("source"))}</a>` : esc(v.fuente)}${(v.fuentes || []).length > 1 ? `<div class="small">+${v.fuentes.length - 1} fuente(s)</div>` : ""}</td>
      <td>${fmtDate(v.verifiedAt)}<div class="small">${esc(v.model)}</div></td>
      <td><button data-del-ver="${esc(k)}" title="${t("btn_remove_title")}">✕</button></td></tr>`).join("")
    : `<tr><td colspan="6" class="small">${t("msg_no_verified")}</td></tr>`;

  const lt = $("#logTable tbody");
  lt.innerHTML = log.length ? log.map((l) => `<tr>
      <td>${fmtDate(l.start)}</td><td>${esc(l.trigger)}</td><td>${l.researched}</td><td>${l.verified}</td><td>${l.unsourced}</td><td>${l.notFound}</td><td>${l.revalidated}${l.reputacion ? `<div class="small">+${l.reputacion} reputación</div>` : ""}</td>
      <td>${(l.tokensIn || 0).toLocaleString(numLoc)} / ${(l.tokensOut || 0).toLocaleString(numLoc)}${l.searches ? `<div class="small">${l.searches} búsquedas</div>` : ""}</td>
      <td>${[l.remote, ...(l.changed || []), ...(l.errors || []).map((e) => "⚠ " + e)].filter(Boolean).map((x) => `<div class="small">${esc(x)}</div>`).join("") || "—"}</td></tr>`).join("")
    : `<tr><td colspan="9" class="small">${t("msg_no_logs")}</td></tr>`;
}

document.addEventListener("click", async (e) => {
  const trg = e.target;
  if (!(trg instanceof HTMLElement)) return;
  if (trg.dataset.retry || trg.dataset.delPend) {
    const { pending = {} } = await api.storage.local.get("pending");
    const k = trg.dataset.retry || trg.dataset.delPend;
    if (trg.dataset.retry && pending[k]) { pending[k].status = "reintentar"; pending[k].tries = 0; }
    else delete pending[k];
    await api.storage.local.set({ pending });
    api.runtime.sendMessage({ type: "qed:badge" }).catch(() => {});
    refresh();
  }
  if (trg.dataset.delVer) {
    const { verified = {} } = await api.storage.local.get("verified");
    delete verified[trg.dataset.delVer];
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
  msg("msg_mem", t("msg_mem_exported"), "ok");
});

$("#exportPending").addEventListener("click", async () => {
  const { pending = {} } = await api.storage.local.get("pending");
  const items = Object.entries(pending)
    .filter(([, p]) => ["por_investigar", "por_verificar", "reintentar", "sin_fuentes"].includes(p.status))
    .map(([key, p]) => ({ key, brand: p.brand, title: p.title, site: p.site, count: p.count, hint: p.hint || "" }));
  download(`gina-pendientes-${new Date().toISOString().slice(0, 10)}.json`, { tipo: "gina/pendientes", version: 1, exportado: new Date().toISOString(), items });
  msg("msg_mem", t("msg_pending_exported", { count: items.length }), "ok");
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
    msg("msg_mem", t("msg_mem_imported", { n1, n2, n3, n4, n5 }), "ok");
    refresh();
  } catch (err) { msg("msg_mem", "No se pudo importar: " + err.message, "err"); }
  e.target.value = "";
});

$("#clearCache").addEventListener("click", async () => {
  await api.storage.local.set({ aiCache: {} });
  msg("msg_mem", t("msg_cache_cleared"), "ok");
  refresh();
});

// Selector de idioma dinámico
if ($("#lang_select")) {
  $("#lang_select").addEventListener("change", async (e) => {
    const newLang = e.target.value;
    if (I18N().setLang) I18N().setLang(newLang);
    await api.storage.local.set({ gina_lang: newLang });
    applyI18n();
  });
}

// Selector de perfil de usuario (se guarda al momento)
document.querySelectorAll('input[name="userProfile"]').forEach((el) => {
  el.addEventListener("change", async (e) => {
    const val = e.target.value;
    const s = await loadSettings();
    s.userProfile = val;
    await api.storage.local.set({ settings: s, gina_user_profile: val });
    msg("msg_profile", t("msg_profile_saved"), "ok");
  });
});

// ---------------------------------------------------------------- Inicio
fillProviders($("#c_provider"));
fillProviders($("#r_provider"));
buildValues();
fetch(api.runtime.getURL("data/proyecto.json")).then((r) => r.json()).then((p) => {
  PROJ = p || {};
  if (PROJ.nombre && $("#projName")) $("#projName").textContent = PROJ.nombre;
  const foot = $("#optFootText");
  if (foot) {
    foot.innerHTML = t("opt_footer", {
      contacto: `<span id="contacto"><a href="mailto:${esc(PROJ.contacto || "gina.proyecto02@gmail.com")}">${esc(PROJ.contacto || "gina.proyecto02@gmail.com")}</a></span>`
    });
  }
  refresh();
}).catch(() => {});

$("#sendPending").addEventListener("click", async () => {
  const { pending = {} } = await api.storage.local.get("pending");
  const items = Object.values(pending).filter((p) => ["por_investigar", "por_verificar", "reintentar", "sin_fuentes"].includes(p.status) && (p.brand || p.title))
    .sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 30).map((p) => ({ marca: p.brand, tienda: p.site, producto: p.title }));
  if (!items.length) { msg("msg_proj", t("msg_proj_none"), ""); return; }
  const textList = items.map((it) => `- Marca: ${it.marca || ""} | Tienda: ${it.tienda || ""} | Producto: ${it.producto || ""}`).join("\n");
  try { await navigator.clipboard.writeText(textList); } catch (e) {}
  const subj = encodeURIComponent(`Sugerencia de ${items.length} marcas para Project Gina`);
  const body = encodeURIComponent(`Hola equipo de Project Gina,\n\nAquí comparto las marcas pendientes encontradas en mis compras:\n\n${textList}\n\nGracias.`);
  const mailtoUrl = `mailto:${PROJ.contacto || ""}?subject=${subj}&body=${body}`;
  api.tabs.create({ url: mailtoUrl });
  msg("msg_proj", t("msg_proj_sent", { n: items.length, to: PROJ.contacto || "el equipo" }), "ok");
});

// Tus valores se guardan al momento (no necesitan permisos).
document.addEventListener("change", async (e) => {
  const trg = e.target;
  if (!(trg instanceof HTMLElement) || !(trg.dataset.value || trg.id === "showLobbying" || trg.id === "showAlternatives")) return;
  const s = await loadSettings();
  const f = readForm();
  s.values = f.values; s.showLobbying = f.showLobbying; s.showAlternatives = f.showAlternatives;
  await api.storage.local.set({ settings: s });
  msg("msg_values", t("msg_values_saved"), "ok");
});

loadSettings().then((s) => {
  writeForm(s);
  applyI18n();
});

api.storage.onChanged.addListener((ch) => {
  if (ch.pending || ch.verified || ch.runLog || ch.jobState || ch.aiCache || ch.usage) refresh();
});
