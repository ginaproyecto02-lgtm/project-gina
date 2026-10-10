const api = typeof browser !== "undefined" ? browser : chrome;
const QED = globalThis.QED;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let proj = {}, pageRes = null;
let db, index, custom = [], extra = { verified: {}, patches: {} }, registry = { sitios: [] }, corpus = [];

const I18N = () => QED.I18N || {
  t: (k, p) => k,
  tipoLabel: (t) => t,
  tipoInfo: () => "",
  estadoLabel: (s) => s,
  temaLabel: (t) => t,
  repLevel: (i) => i >= 75 ? "Pocas controversias registradas" : i >= 50 ? "Controversias moderadas" : i >= 25 ? "Controversias relevantes" : "Historial de sanciones serio",
  getLang: () => "es"
};
const t = (k, p) => I18N().t(k, p);

function card(brand, g, extraLabel) {
  const src = /^https?:\/\//i.test(g.url || "") ? `<a href="${esc(g.url)}" target="_blank" rel="noopener noreferrer">${esc(g.fuente || t("view_source"))}</a>` : esc(g.fuente || "");
  const tipoLbl = g.tipo ? I18N().tipoLabel(g.tipo) : "";
  return `<div class="res">
    <div class="k">${t("brand_detected")}</div><div><b>${esc(brand)}</b>${extraLabel ? ` <span class="small">${esc(extraLabel)}</span>` : ""}</div>
    <div class="emp">${esc(g.empresa)}</div>
    <div class="k">${t("who_controls")}</div><div>${esc(g.controlador || "—")}</div>
    ${g.pais ? `<span class="chip">🌎 ${esc(g.pais)}</span>` : ""}${tipoLbl ? `<span class="chip">${esc(tipoLbl)}</span>` : ""}${g.confianza ? `<span class="chip">${esc(g.confianza)}</span>` : ""}
    ${g.fondos ? `<div class="k">${t("major_funds")}</div><div>${esc(g.fondos)}</div>` : ""}
    ${g.gobierno ? `<div class="k">${t("gov_ties")}</div><div>${esc(g.gobierno)}</div>` : ""}
    ${g.nota ? `<div class="note">${esc(g.nota)}</div>` : ""}
    ${src ? `<div class="k">${t("source")}</div><div>${src}</div>` : ""}
    ${repLine(g.rep)}
  </div>`;
}

// Resumen de reputación (el detalle completo está en la tarjeta de la página).
function repLine(rec, title) {
  if (!rec || !QED.REP) return "";
  const sc = QED.REP.score(rec);
  const factWord = sc.n === 1 ? t("fact_singular") : t("fact_plural");
  const factsText = t("rep_facts_with_source", { n: sc.n, facts: factWord });
  const top = sc.eventos.slice(0, 2).map((e) => {
    const rawTema = (QED.REP.TEMAS[e.tema] || { icon: "•", label: e.tema });
    const stLbl = I18N().estadoLabel(e.estado) || e.estado;
    return `<div class="small">${esc(rawTema.icon)} ${esc(e.titulo)} · ${esc(stLbl)} ${esc(e.anio || "")} · <a href="${/^https?:\/\//i.test(e.url || "") ? esc(e.url) : "#"}" target="_blank" rel="noopener noreferrer">${t("source").toLowerCase()}</a></div>`;
  }).join("");
  const lvlText = I18N().repLevel(sc.indice);
  return `<div class="k">${esc(title || t("rep_general"))}</div><div>${sc.parcial ? t("rep_investigating") : `<b>${sc.indice}/100</b> · ${esc(lvlText)} (${factsText})`}</div>${top}`;
}

function fundCard(id) {
  const rec = index.rep && index.rep[id];
  const f = QED.REP.FONDOS.find((x) => x.id === id);
  return `<div class="res"><div class="k">${t("funds_reputation")}</div><div class="emp">${esc(f ? f.nombre : id)}</div>${rec ? repLine(rec) : "<div class='small'>Aún sin historial.</div>"}</div>`;
}

function applyI18nLabels() {
  const bPage = $('[data-tab="page"]'); if (bPage) bPage.textContent = t("tab_page");
  const bSearch = $('[data-tab="search"]'); if (bSearch) bSearch.textContent = t("tab_search");
  const bAdd = $('[data-tab="add"]'); if (bAdd) bAdd.textContent = t("tab_add");
  const q = $("#q"); if (q) q.placeholder = t("search_placeholder");
  const showCard = $("#showCard"); if (showCard) showCard.textContent = t("show_card_btn");
  const sug = $("#suggest"); if (sug) sug.textContent = t("suggest_btn");
  const opt = $("#openOptions"); if (opt) opt.textContent = t("btn_options");
  const foot = $("footer"); if (foot) foot.textContent = t("foot_disclaimer");
}

async function init() {
  applyI18nLabels();
  db = await (await fetch(api.runtime.getURL("data/brands.json"))).json();
  const st = await api.storage.local.get(["customBrands", "enabled", "remoteBase", "verified", "groupPatches", "pending", "repPatches"]);
  custom = st.customBrands || [];
  const remote = st.remoteBase && st.remoteBase.data;
  if (remote && String(remote.version) > String(db.version)) { if (!remote.reputacion) remote.reputacion = db.reputacion; db = remote; }
  extra = { verified: st.verified || {}, patches: st.groupPatches || {}, rep: st.repPatches || {} };
  index = QED.buildIndex(db, custom, extra.verified, extra.patches, extra.rep || {});
  try { registry = await (await fetch(api.runtime.getURL("data/sites.json"))).json(); } catch (e) {}
  try { proj = await (await fetch(api.runtime.getURL("data/proyecto.json"))).json(); } catch (e) {}
  $("#altSuggest").hidden = !(proj.issuesUrl || proj.contacto);
  buildCorpus();
  const pend = Object.values(st.pending || {}).filter((x) => ["por_investigar", "por_verificar", "reintentar", "sin_fuentes"].includes(x.status)).length;
  $("#aiInfo").textContent = `${Object.keys(extra.verified).length} marcas verificadas · ${pend} pendientes`;
  $("#count").textContent = `${db.marcas.length + custom.length} marcas · ${Object.keys(db.grupos).length} grupos · base ${db.version}`;
  $("#enabled").checked = st.enabled !== false;
  renderCustom();
  loadPage();
}

// Todo lo que se puede buscar: marcas, aerolíneas y tiendas/agencias.
function buildCorpus() {
  corpus = [];
  const seen = new Set();
  const push = (name, gid, label) => {
    const key = QED.norm(name);
    const k = key + "|" + gid;
    if (!key || seen.has(k) || !index.groups[gid]) return;
    seen.add(k);
    corpus.push({ key, name, gid, label });
  };
  for (const it of index.list) push(it.e.n, it.e.g, "Marca");
  for (const a of db.aerolineas || []) push(a.n, a.g, "Aerolínea");
  for (const f of QED.REP ? QED.REP.FONDOS : []) if (index.rep[f.id]) corpus.push({ key: QED.norm(f.nombre), name: f.nombre, gid: f.id, label: "Fondo de inversión", fund: true });
  for (const e of registry.sitios || []) push(e.nombre, e.g, e.tipo === "tienda" ? "Tienda" : e.tipo === "aerolinea" ? "Aerolínea" : e.tipo === "hospedaje" ? "Hospedaje" : "Agencia de viajes");
}

async function activeTab() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function travelHtml(res) {
  let h = "";
  if (res.mode === "hospedaje" && res.agency) return card(res.agency.nombre, res.agency.group, "Hospedaje");
  if (res.airline) h += card(res.airline.nombre, res.airline.group, "Aerolínea");
  if (res.agency) h += card(res.agency.nombre, res.agency.group, "Agencia");
  for (const a of res.airlines || []) {
    const timeWord = a.count === 1 ? t("time_singular") : t("time_plural");
    const seenText = t("times_seen", { count: a.count, times: timeWord });
    h += card(a.n, a.group, `Aerolínea · ${seenText}`);
  }
  return h || "Aún no se detectan aerolíneas en esta página.";
}

function altHtml(a) {
  if (!a || !a.items || !a.items.length) return "";
  const head = t("alt_header", { cat: esc(a.label.toLowerCase()), pais: esc(a.pais) });
  return `<div class="res"><div class="k">${head}</div>${a.items.map((it) =>
    `<div><b>${esc(it.marcas.join(", "))}</b> <span class="small">· ${esc(it.motivo)} · ${esc(it.group.empresa)}</span></div>`).join("")}</div>`;
}

async function loadPage() {
  const tab = await activeTab();
  if (!tab || !tab.id) return;
  try {
    const r = await api.tabs.sendMessage(tab.id, { type: "qed:get" });
    if (!r || !r.result) { $("#pageOut").textContent = "Esta página no es de un producto, vuelo u hospedaje, o aún se está leyendo."; return; }
    const res = r.result;
    pageRes = Object.assign({ site: r.site }, res);
    if (res.mode) { $("#pageOut").innerHTML = travelHtml(res); return; }
    $("#suggest").hidden = !(!res.found && (res.brandText || res.title));
    const storeLine = res.store && res.store.group ? `<div class="note">${t("shopping_at", { store: esc(res.store.nombre), empresa: esc(res.store.group.empresa), controlador: esc(res.store.group.controlador) })}</div>` : "";
    $("#pageOut").innerHTML = (res.found
      ? card(res.brand, res.group, `(${res.source})`)
      : `<div class="emp">${t("not_found_title")}</div><div>${res.brandText ? t("not_found_desc", { brand: esc(res.brandText) }) : t("not_found_unreadable")}</div>`) + altHtml(res.alternativas) + storeLine;
    if (!res.found && res.brandText) $("#addForm").marca.value = res.brandText;
  } catch (e) {
    $("#pageOut").textContent = "Abre un producto en una tienda, o una búsqueda de vuelos u hospedaje (si ya está abierta, recarga la página).";
  }
}

function search(text) {
  const k = QED.norm(text);
  if (!k) { $("#searchOut").innerHTML = ""; return; }
  const hits = corpus.filter((c) => c.key.includes(k) || (k.includes(c.key) && c.key.length >= 3));
  hits.sort((a, b) => (a.key.startsWith(k) ? 0 : 1) - (b.key.startsWith(k) ? 0 : 1) || a.key.length - b.key.length);
  const seenG = new Set();
  const top = hits.filter((h) => { const kk = h.gid + h.label; if (seenG.has(kk)) return false; seenG.add(kk); return true; }).slice(0, 6);
  $("#searchOut").innerHTML = top.length
    ? top.map((h) => (h.fund ? fundCard(h.gid) : card(h.name, index.groups[h.gid], h.label))).join("")
    : `<div class="small">No está en la base. Puedes agregar una marca en «Agregar una marca».</div>`;
}

function renderCustom() {
  const ul = $("#customList");
  ul.innerHTML = custom.length ? "" : `<li class="small">Aún no agregas marcas.</li>`;
  custom.forEach((c, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span><b>${esc(c.marca)}</b> → ${esc(c.empresa)}</span><button title="Eliminar">Eliminar</button>`;
    li.querySelector("button").onclick = async () => { custom.splice(i, 1); await api.storage.local.set({ customBrands: custom }); index = QED.buildIndex(db, custom, extra.verified, extra.patches, extra.rep || {}); renderCustom(); };
    ul.appendChild(li);
  });
}

document.querySelectorAll("nav button").forEach((b) => b.onclick = () => {
  document.querySelectorAll("nav button, .tab").forEach((x) => x.classList.remove("on"));
  b.classList.add("on"); $("#" + b.dataset.tab).classList.add("on");
  if (b.dataset.tab === "search") $("#q").focus();
});
$("#q").addEventListener("input", (e) => search(e.target.value));
$("#enabled").addEventListener("change", (e) => api.storage.local.set({ enabled: e.target.checked }));
$("#showCard").onclick = async () => { const t = await activeTab(); try { await api.tabs.sendMessage(t.id, { type: "qed:show" }); window.close(); } catch (e) {} };

$("#addForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const item = { confianza: "Agregada por ti" };
  for (const [k, v] of f.entries()) if (String(v).trim()) item[k] = String(v).trim();
  if (item.url && !/^https?:\/\//i.test(item.url)) delete item.url;
  custom = custom.filter((c) => QED.norm(c.marca) !== QED.norm(item.marca)).concat([item]);
  await api.storage.local.set({ customBrands: custom });
  index = QED.buildIndex(db, custom, extra.verified, extra.patches, extra.rep || {});
  e.target.reset(); renderCustom();
});

// Sugerencia de marca: 1 clic sin forzar inicio de sesión en GitHub
$("#suggest").onclick = async () => {
  if (!pageRes) return;
  const brand = pageRes.brandText || "";
  const title = pageRes.title || "";
  const site = pageRes.site ? `${pageRes.site.nombre} (${pageRes.site.pais})` : "";
  
  await api.runtime.sendMessage({
    type: "qed:suggest_brand",
    brand: brand,
    title: title,
    site: site
  });
  
  $("#suggest").hidden = true;
  const fb = $("#suggestFeedback");
  fb.hidden = false;
  
  const subj = encodeURIComponent(`Sugerencia de marca: ${brand}`);
  const body = encodeURIComponent(`Marca: ${brand}\nTienda: ${site}\nProducto: ${title}\n`);
  const mailto = `mailto:${proj.contacto || ""}?subject=${subj}&body=${body}`;
  const ghUrl = proj.issuesUrl ? QED.ALT.suggestionLink(proj, "marca", [{ marca: brand, tienda: site, producto: title }]) : "";
  
  fb.innerHTML = `
    <div><b>${t("suggest_success")}</b></div>
    <div style="margin-top:6px;font-size:11px;color:#5a6478;">
      <a href="${mailto}" target="_blank">✉ ${t("suggest_email_opt")}</a>
      ${ghUrl ? ` · <a href="${ghUrl}" target="_blank">GitHub</a>` : ""}
    </div>`;
};

// Sugerencia de alternativa local: 1 clic sin forzar GitHub
$("#altForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target).entries());
  await api.runtime.sendMessage({
    type: "qed:suggest_alternative",
    alternative: f
  });
  e.target.reset();
  const fb = $("#altFeedback");
  fb.hidden = false;
  const subj = encodeURIComponent(`Alternativa local sugerida: ${f.marca}`);
  const body = encodeURIComponent(`Alternativa: ${f.marca}\nCategoría: ${f.categoria || ""}\nPaís: ${f.pais || ""}\nDueño: ${f.dueno || ""}\nFuente: ${f.fuente || ""}\n`);
  const mailto = `mailto:${proj.contacto || ""}?subject=${subj}&body=${body}`;
  const ghUrl = proj.issuesUrl ? QED.ALT.suggestionLink(proj, "alternativa", [f]) : "";
  
  fb.innerHTML = `
    <div><b>✔ ¡Gracias! Alternativa registrada para verificarla e incluirla en la base.</b></div>
    <div style="margin-top:6px;font-size:11px;color:#5a6478;">
      <a href="${mailto}" target="_blank">✉ Enviar por correo al equipo</a>
      ${ghUrl ? ` · <a href="${ghUrl}" target="_blank">GitHub</a>` : ""}
    </div>`;
});

$("#openOptions").onclick = () => api.runtime.openOptionsPage();
init();
