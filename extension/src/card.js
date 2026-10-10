// Tarjeta flotante dentro de un Shadow DOM, para que el CSS de la tienda no la afecte.
// Soporta internacionalización (i18n: es, en, de, fr, it, ja) y sugerencias directas en 1 clic.
(function (root) {
  const QED = (root.QED = root.QED || {});
  const HOST_ID = "gina-tarjeta";

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safe = (u) => (/^https?:\/\//i.test(String(u || "")) ? String(u) : "#"); // solo enlaces web

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

  const CSS = `
  :host { all: initial; }
  .wrap { position: fixed; right: 16px; bottom: 16px; z-index: 2147483646; width: 340px; max-width: calc(100vw - 32px);
    font: 13px/1.45 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1c2233; }
  .card { background: #fff; border: 1px solid #d9dde6; border-radius: 12px; box-shadow: 0 8px 28px rgba(20,30,60,.18); overflow: hidden; }
  .top { display: flex; align-items: center; gap: 8px; background: #1f2a44; color: #fff; padding: 9px 12px; }
  .top .t { flex: 1; font-weight: 600; font-size: 12.5px; letter-spacing: .2px; }
  .top button { all: unset; cursor: pointer; padding: 2px 6px; border-radius: 6px; color: #cfd6e6; font-size: 14px; }
  .top button:hover { background: rgba(255,255,255,.12); color: #fff; }
  .body { padding: 12px 14px 10px; max-height: 60vh; overflow: auto; }
  .brand { font-size: 12px; color: #5a6478; }
  .brand b { color: #1c2233; font-size: 15px; }
  .emp { font-size: 15px; font-weight: 650; margin: 6px 0 2px; }
  .row { margin-top: 8px; }
  .k { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #7a8396; }
  .v { margin-top: 1px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .chip { font-size: 11.5px; padding: 2px 8px; border-radius: 999px; background: #eef1f7; color: #2b3550; }
  .chip.ia { background: #fde9d7; color: #8a3d00; }
  .spin { display: inline-block; width: 12px; height: 12px; border: 2px solid #c9a227; border-right-color: transparent; border-radius: 50%; animation: s 0.8s linear infinite; vertical-align: -2px; margin-right: 6px; }
  @keyframes s { to { transform: rotate(360deg); } }
  .chip.ok { background: #e2f0d9; color: #2d5a1b; } .chip.alta { background: #e6eefb; color: #1f4e8c; } .chip.ver { background: #fff4c2; color: #6b5300; }
  .hint { font-size: 12px; color: #4a5468; background: #f6f7fa; border-radius: 8px; padding: 7px 9px; margin-top: 8px; }
  .note { font-size: 12px; margin-top: 8px; padding: 7px 9px; border-left: 3px solid #c9a227; background: #fffbea; }
  a { color: #1f6fb2; }
  .store { margin-top: 10px; padding: 8px 10px; border-radius: 8px; background: #f2f5fb; font-size: 12px; }
  .store b { color: #1c2233; }
  .sec { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #7a8396; margin: 12px 0 4px; }
  details.air { border: 1px solid #e6e9f0; border-radius: 8px; padding: 6px 9px; margin-top: 6px; }
  details.air summary { cursor: pointer; font-weight: 600; list-style: none; }
  details.air summary::-webkit-details-marker { display: none; }
  details.air summary small { font-weight: 400; color: #6a7386; }
  .lead { font-size: 13px; margin-bottom: 2px; }
  .foot { font-size: 10.5px; color: #8a92a3; padding: 7px 14px 10px; border-top: 1px solid #eef0f4; }
  .rep { margin-top: 10px; border: 1px solid #e6e9f0; border-radius: 10px; padding: 8px 10px; }
  .score { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
  .num { font-size: 20px; font-weight: 700; min-width: 54px; } .num small { font-size: 11px; font-weight: 400; color: #7a8396; }
  .bar { flex: 1; height: 6px; background: #eef1f7; border-radius: 4px; overflow: hidden; } .bar i { display: block; height: 100%; }
  .c-ok { color: #2f7a24; } .bg-ok { background: #3c8d2f; } .c-ver { color: #8a6500; } .bg-ver { background: #d4a106; } .c-mal { color: #b03024; } .bg-mal { background: #c0392b; }
  .lvl { font-size: 12px; font-weight: 600; }
  .ev { display: flex; gap: 6px; margin-top: 6px; font-size: 12px; line-height: 1.35; }
  .ev .ic { flex: none; } .ev .tx { flex: 1; }
  .st { display: inline-block; font-size: 10.5px; padding: 0 6px; border-radius: 999px; background: #eef1f7; color: #3b4560; margin-left: 2px; white-space: nowrap; }
  .st.condena, .st.multa { background: #fbe1de; color: #8f241a; } .st.acuerdo { background: #fdebd3; color: #7a4300; }
  .st.absuelto, .st.anulado { background: #e2f0d9; color: #2d5a1b; }
  .warn { font-size: 12px; margin-top: 8px; padding: 7px 9px; border-left: 3px solid #c0392b; background: #fdf0ee; }
  .sum { font-size: 11.5px; color: #5a6478; margin-top: 2px; }
  details.more { margin-top: 8px; } details.more summary { cursor: pointer; color: #1f6fb2; font-size: 12px; }
  .method { font-size: 11px; color: #6a7386; margin-top: 8px; }
  .alt { margin-top: 10px; border-radius: 10px; padding: 8px 10px; background: #eef7ea; border: 1px solid #d3e8c9; }
  .alt .k { color: #3d6b2c; }
  .alt .it { margin-top: 6px; font-size: 12.5px; line-height: 1.35; }
  .alt .it b { font-size: 13px; } .alt .it small { color: #5a6478; }
  .alt .why { display: inline-block; font-size: 10.5px; padding: 0 6px; border-radius: 999px; background: #d9eecf; color: #2d5a1b; margin-left: 2px; }
  .btn-sug { display: block; width: 100%; box-sizing: border-box; text-align: center; margin-top: 8px; padding: 7px 10px; border-radius: 8px; background: #1f2a44; color: #fff; border: none; cursor: pointer; font-size: 12px; font-weight: 600; }
  .btn-sug:hover { background: #2d3d63; }
  .sug-ok { display: none; margin-top: 8px; padding: 8px 10px; border-radius: 8px; background: #e2f0d9; color: #235017; font-size: 11.5px; font-weight: 500; }
  .sug-links { margin-top: 4px; font-size: 11px; }
  .mini { all: unset; cursor: pointer; position: fixed; right: 16px; bottom: 16px; z-index: 2147483646; background: #1f2a44; color: #fff;
    font: 600 12px -apple-system, "Segoe UI", Roboto, Arial, sans-serif; padding: 8px 12px; border-radius: 999px; box-shadow: 0 6px 18px rgba(20,30,60,.25); }
  `;

  function confChip(c) {
    const s = String(c || "");
    const i18n = I18N();
    const l = i18n.getLang();
    if (/investigación IA|revalidado/i.test(s)) {
      const lbl = { es: "✔ Verificado por investigación", en: "✔ Verified by research", de: "✔ Durch Recherche verifiziert", fr: "✔ Vérifié par recherche", it: "✔ Verificato dalla ricerca", ja: "✔ 調査により検証済み" }[l] || "✔ Verified by research";
      return `<span class="chip ok">${lbl}</span>`;
    }
    if (/^IA sin verificar/i.test(s)) {
      const lbl = { es: "🤖 IA · sin verificar", en: "🤖 AI · unverified", de: "🤖 KI · ungeprüft", fr: "🤖 IA · non vérifié", it: "🤖 IA · non verificato", ja: "🤖 AI · 未検証" }[l] || "🤖 AI · unverified";
      return `<span class="chip ia">${lbl}</span>`;
    }
    if (/^verificado/i.test(s)) {
      const lbl = { es: "✔ Verificado", en: "✔ Verified", de: "✔ Verifiziert", fr: "✔ Vérifié", it: "✔ Verificato", ja: "✔ 検証済み" }[l] || "✔ Verified";
      return `<span class="chip ok">${lbl}</span>`;
    }
    if (/^alta/i.test(s)) {
      const lbl = { es: "Confianza alta", en: "High confidence", de: "Hohe Zuverlässigkeit", fr: "Confiance élevée", it: "Fiducia elevata", ja: "高信頼度" }[l] || "High confidence";
      return `<span class="chip alta">${lbl}</span>`;
    }
    if (/^verificar/i.test(s)) {
      const lbl = { es: "⚠ Verificar", en: "⚠ Verify", de: "⚠ Zu prüfen", fr: "⚠ À vérifier", it: "⚠ Da verificare", ja: "⚠ 要確認" }[l] || "⚠ Verify";
      return `<span class="chip ver">${lbl}</span>`;
    }
    return `<span class="chip">${esc(s)}</span>`;
  }

  // Bloque con los datos de un grupo dueño (empresa, controlador, país, tipo, fondos, gobierno, nota, fuente).
  function groupBlock(g, compact) {
    g = g || {};
    const fuente = g.url
      ? `<a href="${esc(safe(g.url))}" target="_blank" rel="noopener noreferrer">${esc(g.fuente || t("view_source"))}</a>`
      : esc(g.fuente || t("no_source"));
    const more = Array.isArray(g.fuentes) && g.fuentes.length > 1
      ? g.fuentes.slice(1, 4).map((f) => `<br><a href="${esc(safe(f.url))}" target="_blank" rel="noopener noreferrer">${esc(f.titulo || f.url)}</a>`).join("") : "";
    const tipoExpl = I18N().tipoInfo(g.tipo);
    const tipoLbl = I18N().tipoLabel(g.tipo);
    return `
      <div class="emp">${esc(g.empresa)}</div>
      <div class="row"><div class="k">${t("who_controls")}</div><div class="v">${esc(g.controlador)}</div></div>
      <div class="chips">${g.pais ? `<span class="chip">🌎 ${esc(g.pais)}</span>` : ""}${g.tipo ? `<span class="chip">${esc(tipoLbl)}</span>` : ""}${confChip(g.confianza)}${repPill(g)}</div>
      ${!compact && tipoExpl ? `<div class="hint">${esc(tipoExpl)}</div>` : ""}
      ${g.fondos ? `<div class="row"><div class="k">${t("major_funds")}</div><div class="v">${esc(g.fondos)}</div></div>` : ""}
      ${g.gobierno ? `<div class="row"><div class="k">${t("gov_ties")}</div><div class="v">${esc(g.gobierno)}</div></div>` : ""}
      ${g.nota ? `<div class="note">${esc(g.nota)}</div>` : ""}
      <div class="row"><div class="k">${t("source")}</div><div class="v">${fuente}${more}</div></div>`;
  }

  // ---------------------------------------------------------------- Reputación
  const REP = () => QED.REP;
  function evRow(e, full) {
    const rawTema = (REP().TEMAS[e.tema] || { icon: "•", label: e.tema });
    const tLabel = I18N().temaLabel(e.tema) || rawTema.label;
    const stLabel = I18N().estadoLabel(e.estado) || ((REP().ESTADOS[e.estado] || {}).label || e.estado);
    return `<div class="ev"><span class="ic" title="${esc(tLabel)}">${rawTema.icon}</span><span class="tx">${esc(e.titulo)}
      <span class="st ${esc(e.estado)}">${esc(stLabel)}</span> <small>${esc(e.anio || "")}${e.pais ? " · " + esc(e.pais) : ""}${e.monto ? " · " + esc(e.monto) : ""}</small>
      ${full && e.resumen ? `<div class="sum">${esc(e.resumen)}</div>` : ""}
      <a href="${esc(safe(e.url))}" target="_blank" rel="noopener noreferrer"><small>${esc(e.fuente || t("source").toLowerCase())}</small></a></span></div>`;
  }

  function meter(sc) {
    const factWord = sc.n === 1 ? t("fact_singular") : t("fact_plural");
    const factsText = t("rep_facts_with_source", { n: sc.n, facts: factWord });
    const lvlText = I18N().repLevel(sc.indice);
    return `<div class="score"><span class="num c-${sc.color}">${sc.indice}<small>/100</small></span>
      <span class="bar"><i class="bg-${sc.color}" style="width:${sc.indice}%"></i></span></div>
      <div class="lvl c-${sc.color}">${esc(lvlText)} <small style="color:#7a8396;font-weight:400">${factsText}</small></div>`;
  }

  function details(rec, sc, opts) {
    const evs = sc.eventos;
    const lob = opts.showLobbying !== false ? (rec.lobbying || []) : [];
    const pos = rec.positivos || [];
    const allFactsLabel = evs.length ? t("all_facts_label") : t("details_label");
    const lobbyingPart = lob.length ? `, ${t("lobbying_donations").toLowerCase()}` : "";
    const summaryText = t("rep_view_all", { all_facts: allFactsLabel, lobbying: lobbyingPart });

    return `<details class="more"><summary>${summaryText}</summary>
      ${evs.map((e) => evRow(e, true)).join("")}
      ${pos.length ? `<div class="sec">${t("positive_facts")}</div>${pos.map((e) => `<div class="ev"><span class="ic">✅</span><span class="tx">${esc(e.titulo)} <small>${esc(e.anio || "")}</small> <a href="${esc(safe(e.url))}" target="_blank" rel="noopener noreferrer"><small>${esc(e.fuente || t("source").toLowerCase())}</small></a></span></div>`).join("")}` : ""}
      ${lob.length ? `<div class="sec">${t("lobbying_donations")}</div>${lob.map((l) => `<div class="ev"><span class="ic">🏛️</span><span class="tx"><b>${esc(l.dato)}</b> <small>${esc(l.pais)} · ${esc(l.anio || "")}</small>${l.detalle ? `<div class="sum">${esc(l.detalle)}</div>` : ""}<a href="${esc(safe(l.url))}" target="_blank" rel="noopener noreferrer"><small>${esc(l.fuente || t("source").toLowerCase())}</small></a></span></div>`).join("")}` : ""}
      <div class="method">${t("method_disclaimer")}
      ${rec.desdeMatriz ? " " : ""} ${rec.revisado ? " · " + esc(rec.revisado) : ""}${rec.origen ? " · " + esc(rec.origen) : ""}.</div>
    </details>`;
  }

  function repBlock(g, opts, compact) {
    opts = opts || {};
    if (!g || !QED.REP) return "";
    let h = "";
    if (g.rep) {
      const vals = opts.values || {};
      const custom = Object.values(vals).some((v) => v !== 1 && v != null);
      const sc = QED.REP.score(g.rep, custom ? vals : null);
      h += `<div class="rep"><div class="k">${t("rep_title", { name: esc(g.rep.nombre || g.empresa) })}</div>`;
      if (sc.parcial && !sc.n) h += `<div class="sum">${t("rep_investigating")}</div>`;
      else {
        h += sc.parcial ? `<div class="sum">${t("rep_investigating")}</div>` : meter(sc);
        if (custom && !sc.parcial) h += `<div class="sum"><b class="c-${sc.personal >= 75 ? "ok" : sc.personal >= 50 ? "ver" : "mal"}">${sc.personal}/100</b></div>`;
        if (sc.choques && sc.choques.length) h += `<div class="warn">⚠ ${sc.choques.map((ch) => esc(I18N().temaLabel(ch))).join(", ")}</div>`;
        if (!compact) h += sc.eventos.slice(0, 3).map((e) => evRow(e, false)).join("");
      }
      h += details(g.rep, sc, opts) + `</div>`;
    } else if (!compact) {
      h += `<div class="rep"><div class="k">${t("rep_general")}</div><div class="sum">${t("rep_unresearched")}</div></div>`;
    }
    const funds = g.fondosRep || [];
    if (funds.length && !compact) {
      h += `<div class="sec">${t("funds_reputation")}</div>` + funds.map((f) => {
        const sc = QED.REP.score(f);
        return `<details class="air"><summary>${esc(f.nombre)} <small>· ${sc.parcial ? "..." : `${sc.indice}/100 · ${esc(I18N().repLevel(sc.indice))}`}</small></summary>
          ${sc.eventos.slice(0, 3).map((e) => evRow(e, false)).join("")}${details(f, sc, opts)}</details>`;
      }).join("");
    }
    return h;
  }

  function repPill(g) {
    if (!g || !g.rep || !QED.REP) return "";
    const sc = QED.REP.score(g.rep);
    if (sc.parcial) return "";
    return `<span class="chip" style="font-weight:600" title="${esc(I18N().repLevel(sc.indice))}">⚖ <span class="c-${sc.color}">${sc.indice}/100</span></span>`;
  }
  const repChip = (g) => {
    if (!g || !g.rep || !QED.REP) return "";
    const sc = QED.REP.score(g.rep);
    return sc.parcial ? "" : ` <span class="st">${sc.indice}/100</span>`;
  };

  // ---------------------------------------------------------------- Alternativas locales
  function altBlock(res) {
    const a = res.alternativas;
    if (!a) return "";
    const alsoLocal = a.actualEsLocal ? ` <small style="text-transform:none;letter-spacing:0">${t("alt_also_local")}</small>` : "";
    const head = t("alt_header", { cat: esc(a.label.toLowerCase()), pais: esc(a.pais) }) + alsoLocal;
    if (!a.items.length) {
      return `<div class="alt"><div class="k">${head}</div><div class="sum">${t("alt_none_yet", { pais: esc(a.pais) })}</div></div>`;
    }
    return `<div class="alt"><div class="k">${head}</div>
      ${a.items.map((it) => `<div class="it"><b>${esc(it.marcas.join(", "))}</b> <span class="why">${esc(it.motivo)}</span> <small>· ${esc(it.capital)}</small>
        <br><small>${esc(it.group.empresa)}${it.rep != null ? ` · ⚖ ${esc(it.rep)}/100` : ""}${it.group.url ? ` · <a href="${esc(safe(it.group.url))}" target="_blank" rel="noopener noreferrer">${t("source").toLowerCase()}</a>` : ""}</small></div>`).join("")}
      <div class="method">${t("alt_disclaimer")}</div></div>`;
  }

  function storeBlock(store) {
    if (!store || !store.group) return "";
    const g = store.group;
    const storeLine = t("shopping_at", { store: esc(store.nombre), empresa: esc(g.empresa), controlador: esc(g.controlador) });
    return `<div class="store">${storeLine}${g.pais ? ` · ${esc(g.pais)}` : ""} ${confChip(g.confianza)}${repChip(g)}</div>`;
  }

  function renderTravel(res, opts) {
    if (res.mode === "hospedaje") {
      return `<div class="lead">${t("booking_with", { agency: esc(res.agency && res.agency.nombre) })}</div>${groupBlock(res.agency && res.agency.group)}${repBlock(res.agency && res.agency.group, opts)}`;
    }
    let h = "";
    if (res.airline) h += `<div class="lead">${t("flying_with", { airline: esc(res.airline.nombre) })}</div>${groupBlock(res.airline.group)}${repBlock(res.airline.group, opts)}`;
    const list = res.airlines || [];
    if (list.length) {
      h += `<div class="sec">${res.airline ? t("other_airlines") : t("airlines_on_page")}</div>`;
      h += list.map((a, i) => {
        const timeWord = a.count === 1 ? t("time_singular") : t("time_plural");
        const seenText = t("times_seen", { count: a.count, times: timeWord });
        return `<details class="air"${i === 0 && !res.airline ? " open" : ""}><summary>${esc(a.n)} <small>· ${esc((a.group || {}).empresa)} · ${esc((a.group || {}).pais)} · ${seenText}</small></summary>${groupBlock(a.group, true)}${repBlock(a.group, opts, true)}</details>`;
      }).join("");
    }
    if (res.agency && res.agency.group) {
      const g = res.agency.group;
      const agencyLine = t("shopping_at", { store: esc(res.agency.nombre), empresa: esc(g.empresa), controlador: esc(g.controlador) });
      h += `<div class="store">${agencyLine}${g.pais ? ` · ${esc(g.pais)}` : ""} ${confChip(g.confianza)}${repChip(g)}</div>`;
    }
    return h;
  }

  function render(res, opts) {
    if (res.mode) return renderTravel(res, opts);
    if (res.found) {
      const g = res.group || {};
      return `
        <div class="brand">${t("brand_detected")} <b>${esc(res.brand)}</b> <span style="color:#9aa2b2">(${esc(res.source)})</span></div>
        ${groupBlock(g)}
        ${res.how === "título" ? `<div class="hint">${t("hint_title_deduced")}</div>` : ""}
        ${res.kind === "ai" ? `<div class="hint">${t("hint_ai_classified", { model: esc(res.model), certeza: esc(res.certeza) })}</div>` : ""}
        ${res.kind === "ai-base" ? `<div class="hint">${t("hint_ai_base", { model: esc(res.model) })}</div>` : ""}
        ${altBlock(res)}
        ${res.kind === "ai" ? "" : repBlock(g, opts)}
        ${storeBlock(res.store)}`;
    }
    if (res.kind === "loading") {
      return `<div class="emp"><span class="spin"></span>...</div>
        <div class="v">${res.brandText ? `<b>${esc(res.brandText)}</b>...` : "..."}</div>`;
    }
    const brandName = res.brandText || "";
    const storeName = res.store ? res.store.nombre : "";
    const emailSubject = encodeURIComponent(`Sugerencia de marca: ${brandName}`);
    const emailBody = encodeURIComponent(`Marca: ${brandName}\nTienda: ${storeName}\nProducto: ${res.title || ""}\n`);
    const mailtoUrl = `mailto:gina.proyecto02@gmail.com?subject=${emailSubject}&body=${emailBody}`;

    return `
      <div class="emp">${t("not_found_title")}</div>
      <div class="v">${brandName ? t("not_found_desc", { brand: esc(brandName) }) : t("not_found_unreadable")}</div>
      <div class="hint">${t("not_found_pending_hint")}</div>
      <button id="card-suggest-btn" class="btn-sug">${t("suggest_btn")}</button>
      <div id="card-suggest-ok" class="sug-ok">${t("suggest_success")}
        <div class="sug-links"><a href="${mailtoUrl}" target="_blank">${t("suggest_email_opt")}</a></div>
      </div>
      ${altBlock(res)}
      ${storeBlock(res.store)}`;
  }

  function getHost() {
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.attachShadow({ mode: "open" });
      document.documentElement.appendChild(host);
    }
    return host;
  }

  QED.showCard = function (res, opts) {
    opts = opts || {};
    const shadow = getHost().shadowRoot;
    if (opts.minimized) {
      const label = res.mode === "vuelos" ? `✈️ ${(res.airline ? 1 : 0) + (res.airlines || []).length}` : res.mode === "hospedaje" ? "🏨" : `🔎 ${esc(res.found ? res.brand : "Gina")}`;
      shadow.innerHTML = `<style>${CSS}</style><button class="mini" title="Gina">${label} · Gina</button>`;
      shadow.querySelector(".mini").onclick = () => { opts.onToggle && opts.onToggle(false); };
      return;
    }
    const cardTitle = res.mode === "vuelos" ? t("card_title_flight") : res.mode === "hospedaje" ? t("card_title_hotel") : t("card_title_brand");
    shadow.innerHTML = `<style>${CSS}</style>
      <div class="wrap"><div class="card">
        <div class="top"><span class="t"><b>Gina</b> · ${cardTitle}</span>
          <button class="min" title="${t("btn_minimize")}">–</button><button class="x" title="${t("btn_close")}">✕</button></div>
        <div class="body">${render(res, opts)}</div>
        <div class="foot">${t("foot_disclaimer")}</div>
      </div></div>`;
    shadow.querySelector(".min").onclick = () => { opts.onToggle && opts.onToggle(true); };
    shadow.querySelector(".x").onclick = () => { QED.hideCard(); opts.onClose && opts.onClose(); };

    // Handler para sugerir la marca en 1 clic directamente desde la tarjeta
    const sugBtn = shadow.querySelector("#card-suggest-btn");
    const sugOk = shadow.querySelector("#card-suggest-ok");
    if (sugBtn) {
      sugBtn.onclick = async () => {
        sugBtn.disabled = true;
        sugBtn.style.opacity = "0.5";
        try {
          const api = typeof browser !== "undefined" ? browser : chrome;
          const site = res.store ? `${res.store.nombre}` : location.hostname;
          await api.runtime.sendMessage({
            type: "qed:suggest_brand",
            brand: res.brandText || "",
            title: res.title || "",
            site: site
          });
          sugBtn.style.display = "none";
          if (sugOk) sugOk.style.display = "block";
        } catch (e) {
          sugBtn.disabled = false;
          sugBtn.style.opacity = "1";
        }
      };
    }
  };

  QED.hideCard = function () {
    const h = document.getElementById(HOST_ID);
    if (h) h.remove();
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
