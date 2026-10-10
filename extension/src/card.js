// Tarjeta flotante dentro de un Shadow DOM, para que el CSS de la tienda no la afecte.
// Soporta 3 secciones modulares para tres tipos de consumidores:
//   1. Consumidor Inteligente: Confiabilidad de compra, vendedor, logística, garantías y normas de calidad.
//   2. Consumidor Ahorrador: Mercado y alternativas locales trazables.
//   3. Consumidor Consciente: Control corporativo, fondos indexados, historial y cabildeo.
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
  
  /* Tabs superiores */
  .sec-tabs { display: flex; gap: 4px; margin: 10px 0 8px; border-bottom: 1px solid #eef1f7; padding-bottom: 6px; }
  .tab-btn { flex: 1; text-align: center; font-size: 11px; font-weight: 600; padding: 5px 3px; border-radius: 6px; background: #f2f5fb; color: #3c4b6e; border: 1px solid #dce2ee; cursor: pointer; transition: all .15s ease; white-space: nowrap; }
  .tab-btn:hover { background: #e3ebf7; color: #1c2a4d; }
  .tab-btn.active { background: #1f2a44; color: #fff; border-color: #1f2a44; }

  /* Acordeones modulares */
  details.sec-acc { margin-top: 8px; border: 1px solid #e2e6f0; border-radius: 9px; overflow: hidden; background: #fff; transition: all .15s ease; }
  details.sec-acc[open] { border-color: #c4ceea; box-shadow: 0 3px 10px rgba(20,35,65,.05); }
  details.sec-acc summary { cursor: pointer; padding: 8px 10px; display: flex; align-items: center; justify-content: space-between; font-weight: 650; font-size: 12px; background: #f9fafc; list-style: none; user-select: none; }
  details.sec-acc summary::-webkit-details-marker { display: none; }
  details.sec-acc[open] summary { background: #f0f4fa; border-bottom: 1px solid #e2e7f2; }
  .sec-acc-title { display: flex; align-items: center; gap: 5px; flex: 1; text-align: left; }
  .sec-acc-persona { font-size: 9px; text-transform: uppercase; letter-spacing: .3px; padding: 1px 5px; border-radius: 4px; background: #e6ebf5; color: #3e4b68; font-weight: 600; }
  .sec-acc-badge { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 999px; white-space: nowrap; margin-left: 6px; }
  .sec-acc-badge.high { background: #d7f1d4; color: #1f5f19; }
  .sec-acc-badge.standard { background: #fff1c7; color: #7a5800; }
  .sec-acc-badge.check { background: #fde2df; color: #8a1f14; }
  .sec-acc-badge.local { background: #d9eecf; color: #2d5a1b; }
  .sec-acc-badge.corp { background: #e4eaf7; color: #1f3b73; }
  .sec-acc-content { padding: 9px 10px; font-size: 12px; }

  /* Confiabilidad de compra */
  .rel-box { font-size: 12px; }
  .rel-row { display: flex; gap: 8px; margin-top: 8px; align-items: flex-start; }
  .rel-row:first-child { margin-top: 0; }
  .rel-ic { font-size: 14px; flex: none; line-height: 1.3; }
  .rel-info { flex: 1; }
  .rel-val { font-size: 12.5px; font-weight: 600; color: #1c2233; margin-top: 1px; }
  .rel-sub { font-size: 11px; color: #5a6478; margin-top: 2px; line-height: 1.35; }
  .rel-tag { display: inline-block; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 999px; margin-left: 4px; vertical-align: 1px; }
  .rel-tag.official { background: #d7f1d4; color: #1f5f19; }
  .rel-tag.direct { background: #d9e8fb; color: #124386; }
  .rel-tag.verified { background: #e6f3e6; color: #235b1d; }
  .rel-tag.third_party { background: #f0f2f7; color: #434c62; }
  .norm-item { margin-top: 4px; padding: 4px 6px; background: #f6f8fb; border-radius: 6px; border: 1px solid #e3e8f2; }
  .norm-code { font-weight: 600; color: #213555; font-size: 11px; }
  .norm-desc { font-size: 10.5px; color: #5a6478; margin-top: 1px; line-height: 1.3; }
  .rel-tip { margin-top: 10px; padding: 7px 9px; border-radius: 7px; font-size: 11.5px; line-height: 1.35; }
  .rel-tip.high { background: #f2f9f1; border-left: 3px solid #3c8d2f; color: #1e4a17; }
  .rel-tip.standard { background: #fdfaf0; border-left: 3px solid #d4a106; color: #6b5100; }
  .rel-tip.check { background: #fdf2f0; border-left: 3px solid #c0392b; color: #871c12; }

  /* Alternativas & Mercado */
  .alt-content { font-size: 12px; }
  .alt-lead { font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: #3d6b2c; font-weight: 600; margin-bottom: 6px; }
  .alt-filters { display: flex; gap: 4px; margin: 4px 0 8px; }
  .alt-filt { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 999px; background: #eef3ec; color: #2e5922; border: 1px solid #d2e3ce; cursor: pointer; transition: all .15s ease; }
  .alt-filt:hover { background: #dfedd8; }
  .alt-filt.active { background: #2b611e; color: #fff; border-color: #2b611e; }
  .alt-content .it { margin-top: 6px; padding: 6px 8px; background: #f6fbf4; border-radius: 7px; border: 1px solid #e1efe0; line-height: 1.35; transition: all .15s ease; }
  .alt-content .it.is-budget { border-color: #b7e0aa; background: #f0f9ed; }
  .alt-content .it b { font-size: 12.5px; }
  .alt-content .why { display: inline-block; font-size: 10px; padding: 0 6px; border-radius: 999px; background: #d9eecf; color: #2d5a1b; margin-left: 2px; }
  .alt-content .why.budget { background: #cef0c2; color: #1e5c12; font-weight: 600; }
  .alt-budget-empty { display: none; padding: 6px 8px; font-size: 11px; color: #5a6478; background: #fbfbfb; border-radius: 6px; border: 1px dashed #d5d9e0; margin-top: 6px; }
  .alt-tip { margin-top: 8px; padding: 7px 9px; border-radius: 7px; font-size: 11.5px; line-height: 1.35; background: #f2f8ee; border-left: 3px solid #4a8b30; color: #254d16; }
  .alt-empty { padding: 4px 0; }
  .also-loc { color: #2d5a1b; font-weight: normal; font-size: 11px; }

  /* Botones sugerir */
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
    const isEn = I18N().getLang && I18N().getLang() !== "es";
    const ctrl = (isEn && g.controlador_en) ? g.controlador_en : g.controlador;
    const nota = (isEn && g.nota_en) ? g.nota_en : g.nota;
    return `
      <div class="emp">${esc(g.empresa)}</div>
      <div class="row"><div class="k">${t("who_controls")}</div><div class="v">${esc(ctrl)}</div></div>
      <div class="chips">${g.pais ? `<span class="chip">🌎 ${esc(g.pais)}</span>` : ""}${g.tipo ? `<span class="chip">${esc(tipoLbl)}</span>` : ""}${confChip(g.confianza)}${repPill(g)}</div>
      ${!compact && tipoExpl ? `<div class="hint">${esc(tipoExpl)}</div>` : ""}
      ${g.fondos ? `<div class="row"><div class="k">${t("major_funds")}</div><div class="v">${esc(g.fondos)}</div></div>` : ""}
      ${g.gobierno ? `<div class="row"><div class="k">${t("gov_ties")}</div><div class="v">${esc(g.gobierno)}</div></div>` : ""}
      ${nota ? `<div class="note">${esc(nota)}</div>` : ""}
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

  function storeBlock(store) {
    if (!store || !store.group) return "";
    const g = store.group;
    const isEn = I18N().getLang && I18N().getLang() !== "es";
    const ctrl = (isEn && g.controlador_en) ? g.controlador_en : g.controlador;
    const storeLine = t("shopping_at", { store: esc(store.nombre), empresa: esc(g.empresa), controlador: esc(ctrl) });
    return `<div class="store">${storeLine}${g.pais ? ` · ${esc(g.pais)}` : ""} ${confChip(g.confianza)}${repChip(g)}</div>`;
  }

  // ---------------------------------------------------------------- SECCIÓN 1: Confiabilidad de compra (Consumidor Inteligente)
  function reliabilityBlock(res) {
    const rel = res.reliabilityEval || (QED.evaluateReliability ? QED.evaluateReliability({}, res.group, null, res.title) : null);
    if (!rel) return "";

    let sellerBadgeText = "";
    if (rel.sellerType === "official") sellerBadgeText = t("seller_official");
    else if (rel.sellerType === "direct") sellerBadgeText = t("seller_direct", { platform: rel.storeName || "Plataforma" });
    else if (rel.sellerType === "verified") sellerBadgeText = t("seller_verified");
    else sellerBadgeText = t("seller_third_party");

    // Solo lo que la página dice; si no se pudo leer, se dice así.
    const notStated = t("rel_not_stated");
    const shipText = rel.isFulfilledByPlatform ? t("ship_platform_fulfilled") : (rel.shipper ? rel.shipper : notStated);
    const policyText = [rel.returnPolicy, rel.warranty].filter(Boolean).join(" · ");
    const tipKey = rel.level === "high" ? "rel_tip_high" : rel.level === "standard" ? "rel_tip_standard" : "rel_tip_check";

    const normsHtml = (rel.norms || []).map((n) => {
      const desc = n.descKey ? t(n.descKey) : "";
      return `<div class="norm-item"><span class="norm-code">📋 ${esc(n.code)}</span>${desc ? `<div class="norm-desc">${esc(desc)}</div>` : ""}</div>`;
    }).join("");

    return `
      <div class="rel-box">
        <div class="rel-row">
          <div class="rel-ic">🏬</div>
          <div class="rel-info">
            <div class="k">${t("rel_seller_label")}</div>
            <div class="rel-val"><b>${esc(rel.sellerName || notStated)}</b> <span class="rel-tag ${esc(rel.sellerType)}">${esc(sellerBadgeText)}</span></div>
            ${rel.sellerRating ? `<div class="rel-sub">${esc(rel.sellerRating)}</div>` : ""}
          </div>
        </div>

        <div class="rel-row">
          <div class="rel-ic">📦</div>
          <div class="rel-info">
            <div class="k">${t("rel_shipping_label")}</div>
            <div class="rel-val">${esc(shipText)}</div>
          </div>
        </div>

        <div class="rel-row">
          <div class="rel-ic">🔄</div>
          <div class="rel-info">
            <div class="k">${t("rel_warranty_label")}</div>
            <div class="rel-val">${policyText ? esc(policyText) : esc(notStated)}</div>
            <div class="rel-sub">${t("warranty_factory_note")}</div>
          </div>
        </div>

        <div class="rel-row">
          <div class="rel-ic">🛡️</div>
          <div class="rel-info">
            <div class="k">${t("rel_norms_label")}</div>
            <div class="rel-sub">${t("norms_note")}</div>
            ${normsHtml}
          </div>
        </div>

        <div class="rel-tip ${esc(rel.level)}">${t(tipKey)}</div>
      </div>
    `;
  }

  // ---------------------------------------------------------------- SECCIÓN 2: Mercado & Alternativas (Consumidor Ahorrador)
  function alternativesSection(res) {
    const a = res.alternativas;
    if (!a || !a.items || !a.items.length) {
      return `
        <div class="alt-empty">
          <div class="sum">${t("no_local_alternatives")}</div>
          <div class="alt-tip">${t("alt_saver_tip")}</div>
        </div>
      `;
    }

    const catLabel = I18N().catLabel ? I18N().catLabel(a.cat, a.label.toLowerCase()) : a.label.toLowerCase();
    const alsoLocal = a.actualEsLocal ? ` <span class="also-loc">${t("alt_also_local")}</span>` : "";
    const hasBudget = a.items.some((it) => it.esEconomica);

    return `
      <div class="alt-content">
        <div class="alt-lead">${t("alt_header", { cat: esc(catLabel), pais: esc(a.pais) })}${alsoLocal}</div>
        ${hasBudget ? `
          <div class="alt-filters">
            <button class="alt-filt active" data-alt-filter="all">${t("alt_filter_all")}</button>
            <button class="alt-filt" data-alt-filter="budget">${t("alt_filter_budget")}</button>
          </div>
        ` : ""}
        <div class="alt-items-list">
          ${a.items.map((it) => `
            <div class="it ${it.esEconomica ? "is-budget" : ""}">
              <b>${esc(it.marcas.join(", "))}</b> 
              ${it.esEconomica ? `<span class="why budget" title="${esc(t("alt_badge_budget"))}">🏷️ ${esc(t("alt_badge_budget"))}</span>` : ""}
              <span class="why">${esc(it.motivo)}</span> <small>· ${esc(it.capital)}</small>
              <br><small><b>${esc(it.group.empresa)}</b>${((I18N().getLang && I18N().getLang() !== "es" && it.group.nota_en) ? it.group.nota_en : it.group.nota) ? ` · ${esc((I18N().getLang && I18N().getLang() !== "es" && it.group.nota_en) ? it.group.nota_en : it.group.nota)}` : ""}${it.rep != null ? ` · ⚖ ${esc(it.rep)}/100` : ""}${it.group.url ? ` · <a href="${esc(safe(it.group.url))}" target="_blank" rel="noopener noreferrer">${t("source").toLowerCase()}</a>` : ""}</small>
            </div>
          `).join("")}
        </div>
        <div class="alt-budget-empty">${t("alt_no_budget_items")}</div>
        <div class="alt-tip">${t("alt_saver_tip")}</div>
        <div class="method">${t("alt_disclaimer")}</div>
      </div>
    `;
  }

  // ---------------------------------------------------------------- SECCIÓN 3: ¿A quién le compras? (Consumidor Consciente)
  function ownershipSection(res, opts) {
    if (res.found) {
      const g = res.group || {};
      return `
        <div class="own-content">
          ${groupBlock(g)}
          ${res.how === "título" ? `<div class="hint">${t("hint_title_deduced")}</div>` : ""}
          ${res.kind === "ai" ? `<div class="hint">${t("hint_ai_classified", { model: esc(res.model), certeza: esc(res.certeza) })}</div>` : ""}
          ${res.kind === "ai-base" ? `<div class="hint">${t("hint_ai_base", { model: esc(res.model) })}</div>` : ""}
          ${res.kind === "ai" ? "" : repBlock(g, opts)}
          ${storeBlock(res.store)}
        </div>
      `;
    }
    return `
      <div class="own-content">
        <div class="sum">${t("not_found_desc", { brand: esc(res.brandText || "") })}</div>
        <div class="hint">${t("not_found_pending_hint")}</div>
        ${storeBlock(res.store)}
      </div>
    `;
  }

  // ---------------------------------------------------------------- Viajes
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
      const isEn = I18N().getLang && I18N().getLang() !== "es";
      const ctrl = (isEn && g.controlador_en) ? g.controlador_en : g.controlador;
      const agencyLine = t("shopping_at", { store: esc(res.agency.nombre), empresa: esc(g.empresa), controlador: esc(ctrl) });
      h += `<div class="store">${agencyLine}${g.pais ? ` · ${esc(g.pais)}` : ""} ${confChip(g.confianza)}${repChip(g)}</div>`;
    }
    return h;
  }

  // ---------------------------------------------------------------- Render principal modular
  function render(res, opts) {
    if (res.mode) return renderTravel(res, opts);

    if (res.kind === "loading") {
      return `<div class="emp"><span class="spin"></span>...</div>
        <div class="v">${res.brandText ? `<b>${esc(res.brandText)}</b>...` : "..."}</div>`;
    }

    const brandName = res.found ? res.brand : (res.brandText || "");
    const storeName = res.store ? res.store.nombre : "";
    const emailSubject = encodeURIComponent(`Sugerencia de marca: ${brandName}`);
    const emailBody = encodeURIComponent(`Marca: ${brandName}\nTienda: ${storeName}\nProducto: ${res.title || ""}\n`);
    const contact = (QED.PROJECT && QED.PROJECT.contacto) || "";
    const mailtoUrl = contact ? `mailto:${contact}?subject=${emailSubject}&body=${emailBody}` : "";

    // Parámetros de insignia para cada sección
    const rel = res.reliabilityEval || (QED.evaluateReliability ? QED.evaluateReliability({}, res.group, null, res.title) : { level: "standard" });
    const relBadgeText = rel.level === "high" ? t("rel_high") : rel.level === "standard" ? t("rel_standard") : t("rel_check");

    const altCount = (res.alternativas && res.alternativas.items && res.alternativas.items.length) || 0;
    const altBadgeText = altCount > 0 ? `${altCount} ${t("alt_options_count")}` : "";

    const corpBadgeText = res.found && res.group ? esc(res.group.empresa) : "";

    return `
      <div class="brand">
        ${res.found
          ? `${t("brand_detected")} <b>${esc(res.brand)}</b> <span style="color:#9aa2b2">(${esc(res.source)})</span>`
          : `<b>${esc(brandName || t("not_found_unreadable"))}</b> <span style="color:#9aa2b2">(${t("not_found_title")})</span>`
        }
      </div>

      ${!res.found ? `
        <div class="hint">${t("not_found_pending_hint")}</div>
        <button id="card-suggest-btn" class="btn-sug">${t("suggest_btn")}</button>
        <div id="card-suggest-ok" class="sug-ok">${t("suggest_success")}
          ${mailtoUrl ? `<div class="sug-links"><a href="${esc(mailtoUrl)}" target="_blank" rel="noopener noreferrer">${t("suggest_email_opt")}</a></div>` : ""}
        </div>
      ` : ""}

      <div class="sec-tabs">
        <button class="tab-btn active" data-target="sec-own">${t("tab_conscious")}</button>
        <button class="tab-btn" data-target="sec-alt">${t("tab_saver")}</button>
        <button class="tab-btn" data-target="sec-rel">${t("tab_smart")}</button>
      </div>

      <!-- SECCIÓN 3: Consumidor Consciente (¿A qué bicho le compras?) -->
      <details id="sec-own" class="sec-acc" open>
        <summary>
          <span class="sec-acc-title">🏢 ${t("sec_ownership_title")} <span class="sec-acc-persona">${t("persona_conscious")}</span></span>
          ${corpBadgeText ? `<span class="sec-acc-badge corp">${corpBadgeText}</span>` : ""}
        </summary>
        <div class="sec-acc-content">
          ${ownershipSection(res, opts)}
        </div>
      </details>

      <!-- SECCIÓN 2: Consumidor Ahorrador (Mercado y Alternativas) -->
      <details id="sec-alt" class="sec-acc">
        <summary>
          <span class="sec-acc-title">💡 ${t("sec_alternatives_title")} <span class="sec-acc-persona">${t("persona_saver")}</span></span>
          ${altBadgeText ? `<span class="sec-acc-badge local">${esc(altBadgeText)}</span>` : ""}
        </summary>
        <div class="sec-acc-content">
          ${alternativesSection(res)}
        </div>
      </details>

      <!-- SECCIÓN 1: Consumidor Inteligente (Confiabilidad) -->
      <details id="sec-rel" class="sec-acc">
        <summary>
          <span class="sec-acc-title">🛡️ ${t("sec_reliability_title")} <span class="sec-acc-persona">${t("persona_smart")}</span></span>
          <span class="sec-acc-badge ${esc(rel.level)}">${esc(relBadgeText)}</span>
        </summary>
        <div class="sec-acc-content">
          ${reliabilityBlock(res)}
        </div>
      </details>
    `;
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

    // Handler de pestañas interactivas (abre y desplaza la sección seleccionada)
    shadow.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.onclick = () => {
        const targetId = btn.getAttribute("data-target");
        shadow.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const el = shadow.getElementById(targetId);
        if (el) {
          el.open = true;
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      };
    });

    // Handler para sub-filtro de alternativas de ahorro / económicas
    shadow.querySelectorAll(".alt-filt").forEach((btn) => {
      btn.onclick = () => {
        const mode = btn.getAttribute("data-alt-filter");
        shadow.querySelectorAll(".alt-filt").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const items = shadow.querySelectorAll(".alt-items-list .it");
        let visibleCount = 0;
        items.forEach((it) => {
          if (mode === "budget") {
            const isBudget = it.classList.contains("is-budget");
            it.style.display = isBudget ? "block" : "none";
            if (isBudget) visibleCount++;
          } else {
            it.style.display = "block";
            visibleCount++;
          }
        });
        const emptyMsg = shadow.querySelector(".alt-budget-empty");
        if (emptyMsg) emptyMsg.style.display = visibleCount === 0 ? "block" : "none";
      };
    });

    // Sincronización bidireccional al abrir/cerrar acordeones
    shadow.querySelectorAll("details.sec-acc").forEach((det) => {
      det.ontoggle = () => {
        if (det.open) {
          const id = det.id;
          shadow.querySelectorAll(".tab-btn").forEach((b) => {
            if (b.getAttribute("data-target") === id) b.classList.add("active");
            else b.classList.remove("active");
          });
        }
      };
    });

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
