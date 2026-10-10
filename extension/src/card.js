// Tarjeta compacta dentro de un Shadow DOM, para que el CSS de la tienda no la afecte.
// Rediseño modular de 3 secciones plegables:
//   1. Confiabilidad de compra (vendedor, logística, garantías y normas de calidad con origen estricto)
//   2. Mercado y alternativas (alternativas locales, marcas dominantes, sin puntajes)
//   3. ¿A quién le compras? (controlador, fondos, país del capital, reputación y cabildeo con fuentes)
// Todas empiezan cerradas. Gina recuerda la última abierta por sitio o según perfil del usuario.
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

  // SVGs de 18 px de trazo para las 3 secciones (sin emojis)
  const SVG_SHIELD = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
  const SVG_CHART = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`;
  const SVG_BUILDING = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="22"/><line x1="8" y1="6" x2="8.01" y2="6"/><line x1="16" y1="6" x2="16.01" y2="6"/><line x1="8" y1="10" x2="8.01" y2="10"/><line x1="16" y1="10" x2="16.01" y2="10"/><line x1="8" y1="14" x2="8.01" y2="14"/><line x1="16" y1="14" x2="16.01" y2="14"/><line x1="8" y1="18" x2="8.01" y2="18"/><line x1="16" y1="18" x2="16.01" y2="18"/></svg>`;
  const SVG_CHEVRON = `<svg class="sec-arr" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;

  const CSS = `
  :host { all: initial; }
  .wrap { position: fixed; right: 16px; bottom: 16px; z-index: 2147483646; width: 340px; max-width: calc(100vw - 32px);
    font: 13px/1.45 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1c2233; }
  .card { background: #fff; border: 1px solid #d9dde6; border-radius: 12px; box-shadow: 0 8px 28px rgba(20,30,60,.18); overflow: hidden; }
  
  /* Top bar 1f2a44 */
  .top { display: flex; align-items: center; justify-content: space-between; background: #1f2a44; color: #fff; padding: 8px 12px; min-height: 36px; box-sizing: border-box; }
  .top .t { font-weight: 700; font-size: 13px; letter-spacing: .3px; }
  .top-actions { display: flex; align-items: center; gap: 4px; }
  .top-btn { all: unset; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; color: #cfd6e6; }
  .top-btn:hover { background: rgba(255,255,255,.14); color: #fff; }
  .top-btn:focus-visible, .sec-btn:focus-visible, a:focus-visible, button:focus-visible { outline: 2px solid #1f6fb2; outline-offset: -2px; }

  /* Brand Line: 16px bold, 11px gray origin */
  .brand-bar { padding: 10px 14px 8px; border-bottom: 1px solid #e6e9f0; background: #fff; }
  .brand-line { font-size: 16px; font-weight: 700; color: #1c2233; line-height: 1.25; }
  .brand-sub { font-size: 11px; color: #535d70; margin-top: 3px; line-height: 1.3; }

  .body { max-height: 62vh; overflow-y: auto; overflow-x: hidden; }

  /* 3 Collapsible Rows */
  .sec-row { border-bottom: 1px solid #e6e9f0; background: #fff; }
  .sec-btn { all: unset; box-sizing: border-box; width: 100%; min-height: 54px; padding: 9px 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; transition: background .12s ease; }
  .sec-btn:hover { background: #f8fafd; }
  .sec-ic-wrap { flex: none; width: 20px; display: flex; align-items: center; justify-content: center; color: #23355a; }
  .sec-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; text-align: left; }
  .sec-title-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
  .sec-title { font-size: 13px; font-weight: 650; color: #1c2233; line-height: 1.25; }
  .sec-summary { font-size: 11.5px; color: #535d70; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3; }
  .sec-arr-wrap { flex: none; width: 16px; display: flex; align-items: center; justify-content: center; }
  .sec-arr { transition: transform .2s ease; color: #7a8396; }
  .sec-btn[aria-expanded="true"] .sec-arr { transform: rotate(180deg); }

  /* Badges: ONLY in Confiabilidad */
  .badge-rel { font-size: 10.5px; font-weight: 600; padding: 2px 7px; border-radius: 999px; white-space: nowrap; }
  .badge-rel.direct { background: #e1ebfa; color: #143c73; }
  .badge-rel.official { background: #e1ebfa; color: #143c73; }
  .badge-rel.verified { background: #e1ebfa; color: #143c73; }
  .badge-rel.check { background: #fbe3c4; color: #6e3500; }

  /* Open Content: 42px indentation */
  .sec-content { padding: 10px 14px 14px 42px; background: #fafbfc; border-top: 1px solid #f0f2f7; }

  /* 3-Line Data format: UPPERCASE LABEL (10.5px), value (12px, 600), origin (11px, gray) */
  .d-row { margin-top: 8px; }
  .d-row:first-child { margin-top: 0; }
  .d-k { font-size: 10.5px; text-transform: uppercase; letter-spacing: .45px; color: #5f687a; font-weight: 600; line-height: 1.25; }
  .d-v { font-size: 12px; font-weight: 600; color: #1c2233; margin-top: 1px; line-height: 1.35; }
  .d-src { font-size: 11px; color: #7a8396; margin-top: 1px; line-height: 1.3; }

  /* Chips */
  .chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
  .chip { font-size: 11px; padding: 1px 7px; border-radius: 999px; background: #eef1f7; color: #2b3550; font-weight: normal; }
  .chip.ok { background: #e2f0d9; color: #2d5a1b; }
  .chip.alta { background: #e6eefb; color: #1f4e8c; }
  .chip.ver { background: #fff4c2; color: #6b5300; }
  .chip.ia { background: #fde9d7; color: #8a3d00; }

  /* Boxes */
  .box-warn { font-size: 11.5px; margin-top: 8px; padding: 7px 9px; border-radius: 7px; background: #fdf1e2; color: #5c2e00; line-height: 1.35; }
  .alt-box { background: #f1f7ee; border-radius: 8px; padding: 7px 9px; margin-top: 6px; font-size: 12px; line-height: 1.35; }
  .alt-box b { font-size: 12.5px; color: #1c2233; }
  .alt-empty-box { border: 1px dashed #c0c6d4; background: #fafbfc; border-radius: 8px; padding: 10px 12px; margin-top: 6px; text-align: center; font-size: 11.5px; color: #535d70; }
  .note { font-size: 11.5px; margin-top: 8px; padding: 7px 9px; border-left: 3px solid #c9a227; background: #fffbea; line-height: 1.35; }
  .store-box { margin-top: 8px; padding: 7px 9px; border-radius: 7px; background: #f2f5fb; font-size: 11.5px; }
  .tip-box { font-size: 11.5px; color: #4a5468; background: #f2f5f9; border-radius: 7px; padding: 7px 9px; margin-top: 8px; line-height: 1.35; }
  .method { font-size: 10.5px; color: #7a8396; margin-top: 6px; line-height: 1.3; }

  /* Reputación */
  .rep { margin-top: 8px; border: 1px solid #e6e9f0; border-radius: 8px; padding: 8px 9px; background: #fff; }
  .score { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
  .num { font-size: 18px; font-weight: 700; min-width: 50px; } .num small { font-size: 11px; font-weight: 400; color: #7a8396; }
  .bar { flex: 1; height: 5px; background: #eef1f7; border-radius: 4px; overflow: hidden; } .bar i { display: block; height: 100%; }
  .c-ok { color: #2f7a24; } .bg-ok { background: #3c8d2f; } .c-ver { color: #8a6500; } .bg-ver { background: #d4a106; } .c-mal { color: #b03024; } .bg-mal { background: #c0392b; }
  .lvl { font-size: 11.5px; font-weight: 600; }
  .ev { display: flex; gap: 6px; margin-top: 5px; font-size: 11.5px; line-height: 1.35; }
  .ev .ic { flex: none; } .ev .tx { flex: 1; }
  .st { display: inline-block; font-size: 10px; padding: 0 5px; border-radius: 999px; background: #eef1f7; color: #3b4560; margin-left: 2px; white-space: nowrap; }
  .st.condena, .st.multa { background: #fbe1de; color: #8f241a; } .st.acuerdo { background: #fdebd3; color: #7a4300; }
  .st.absuelto, .st.anulado { background: #e2f0d9; color: #2d5a1b; }
  details.more { margin-top: 6px; } details.more summary { cursor: pointer; color: #1f6fb2; font-size: 11.5px; }

  /* Travel details */
  details.air { border: 1px solid #e6e9f0; border-radius: 7px; padding: 6px 8px; margin-top: 6px; background: #fff; }
  details.air summary { cursor: pointer; font-weight: 600; list-style: none; font-size: 12px; }
  details.air summary::-webkit-details-marker { display: none; }
  details.air summary small { font-weight: 400; color: #6a7386; }

  /* Botones sugerir */
  .btn-sug { display: inline-block; text-align: center; margin-top: 6px; padding: 6px 12px; border-radius: 6px; background: #1f2a44; color: #fff; border: none; cursor: pointer; font-size: 11.5px; font-weight: 600; text-decoration: none; }
  .btn-sug:hover { background: #2d3d63; }
  .sug-ok { display: none; margin-top: 6px; padding: 6px 8px; border-radius: 6px; background: #e2f0d9; color: #235017; font-size: 11px; }

  /* Footer: 10.5px, #535d70 */
  .foot { font-size: 10.5px; color: #535d70; padding: 8px 14px 10px; border-top: 1px solid #e6e9f0; text-align: center; background: #fff; }

  /* Mini bubble */
  .mini { all: unset; cursor: pointer; position: fixed; right: 16px; bottom: 16px; z-index: 2147483646; background: #1f2a44; color: #fff;
    font: 600 12px -apple-system, "Segoe UI", Roboto, Arial, sans-serif; padding: 8px 12px; border-radius: 999px; box-shadow: 0 6px 18px rgba(20,30,60,.25); }
  .spin { display: inline-block; width: 12px; height: 12px; border: 2px solid #c9a227; border-right-color: transparent; border-radius: 50%; animation: s 0.8s linear infinite; vertical-align: -2px; margin-right: 6px; }
  @keyframes s { to { transform: rotate(360deg); } }
  a { color: #1f6fb2; text-decoration: underline; }
  `;

  function confChip(c) {
    const s = String(c || "");
    const i18n = I18N();
    const l = i18n.getLang ? i18n.getLang() : "es";
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
    return s ? `<span class="chip">${esc(s)}</span>` : "";
  }

  function dataRow(label, value, origin) {
    if (!value) return "";
    return `
      <div class="d-row">
        <div class="d-k">${esc(label)}</div>
        <div class="d-v">${value}</div>
        ${origin ? `<div class="d-src">${esc(origin)}</div>` : ""}
      </div>
    `;
  }

  // ---------------------------------------------------------------- Reputación
  const REP = () => QED.REP;
  function evRow(e, full) {
    const rawTema = (REP().TEMAS && REP().TEMAS[e.tema]) || { icon: "•", label: e.tema };
    const tLabel = I18N().temaLabel(e.tema) || rawTema.label;
    const stLabel = I18N().estadoLabel(e.estado) || ((REP().ESTADOS && REP().ESTADOS[e.estado]) || {}).label || e.estado;
    return `<div class="ev"><span class="ic" title="${esc(tLabel)}">${rawTema.icon || "•"}</span><span class="tx">${esc(e.titulo)}
      <span class="st ${esc(e.estado)}">${esc(stLabel)}</span> <small>${esc(e.anio || "")}${e.pais ? " · " + esc(I18N().paisLabel ? I18N().paisLabel(e.pais) : e.pais) : ""}${e.monto ? " · " + esc(e.monto) : ""}</small>
      ${full && e.resumen ? `<div class="d-src">${esc(e.resumen)}</div>` : ""}
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

  function repDetails(rec, sc, opts) {
    const evs = sc.eventos || [];
    const lob = opts.showLobbying !== false ? (rec.lobbying || []) : [];
    const pos = rec.positivos || [];
    const allFactsLabel = evs.length ? t("all_facts_label") : t("details_label");
    const lobbyingPart = lob.length ? `, ${t("lobbying_donations").toLowerCase()}` : "";
    const summaryText = t("rep_view_all", { all_facts: allFactsLabel, lobbying: lobbyingPart });

    return `<details class="more"><summary>${summaryText}</summary>
      ${evs.map((e) => evRow(e, true)).join("")}
      ${pos.length ? `<div class="d-k" style="margin-top:6px;">${t("positive_facts")}</div>${pos.map((e) => `<div class="ev"><span class="ic">✅</span><span class="tx">${esc(e.titulo)} <small>${esc(e.anio || "")}</small> <a href="${esc(safe(e.url))}" target="_blank" rel="noopener noreferrer"><small>${esc(e.fuente || t("source").toLowerCase())}</small></a></span></div>`).join("")}` : ""}
      ${lob.length ? `<div class="d-k" style="margin-top:6px;">${t("lobbying_donations")}</div>${lob.map((l) => `<div class="ev"><span class="ic">🏛️</span><span class="tx"><b>${esc(l.dato)}</b> <small>${esc(I18N().paisLabel ? I18N().paisLabel(l.pais) : l.pais)} · ${esc(l.anio || "")}</small>${l.detalle ? `<div class="d-src">${esc(l.detalle)}</div>` : ""}<a href="${esc(safe(l.url))}" target="_blank" rel="noopener noreferrer"><small>${esc(l.fuente || t("source").toLowerCase())}</small></a></span></div>`).join("")}` : ""}
      <div class="method">${t("method_disclaimer")}
      ${rec.desdeMatriz ? " " : ""} ${rec.revisado ? " · " + esc(rec.revisado) : ""}${rec.origen ? " · " + esc(rec.origen) : ""}.</div>
    </details>`;
  }

  function repBlock(g, opts) {
    opts = opts || {};
    if (!g || !QED.REP) return "";
    let h = "";
    if (g.rep) {
      const vals = opts.values || {};
      const custom = Object.values(vals).some((v) => v !== 1 && v != null);
      const sc = QED.REP.score(g.rep, custom ? vals : null);
      h += `<div class="rep"><div class="d-k">${t("rep_title", { name: esc(g.rep.nombre || g.empresa) })}</div>`;
      if (sc.parcial && !sc.n) h += `<div class="d-src">${t("rep_investigating")}</div>`;
      else {
        h += sc.parcial ? `<div class="d-src">${t("rep_investigating")}</div>` : meter(sc);
        if (custom && !sc.parcial) h += `<div class="d-src"><b class="c-${sc.personal >= 75 ? "ok" : sc.personal >= 50 ? "ver" : "mal"}">${sc.personal}/100</b></div>`;
        if (sc.choques && sc.choques.length) h += `<div class="box-warn">⚠ ${sc.choques.map((ch) => esc(I18N().temaLabel(ch))).join(", ")}</div>`;
        h += sc.eventos.slice(0, 3).map((e) => evRow(e, false)).join("");
      }
      h += repDetails(g.rep, sc, opts) + `</div>`;
    } else {
      h += `<div class="rep"><div class="d-k">${t("rep_general")}</div><div class="d-src">${t("rep_unresearched")}</div></div>`;
    }
    const funds = g.fondosRep || [];
    if (funds.length) {
      h += `<div class="d-k" style="margin-top:8px;">${t("funds_reputation")}</div>` + funds.map((f) => {
        const sc = QED.REP.score(f);
        return `<details class="air"><summary>${esc(f.nombre)} <small>· ${sc.parcial ? "..." : `${sc.indice}/100 · ${esc(I18N().repLevel(sc.indice))}`}</small></summary>
          ${sc.eventos.slice(0, 3).map((e) => evRow(e, false)).join("")}${repDetails(f, sc, opts)}</details>`;
      }).join("");
    }
    return h;
  }

  // ---------------------------------------------------------------- SECCIÓN 1: Confiabilidad
  function renderReliability(res) {
    const rel = res.reliabilityEval || (QED.evaluateReliability ? QED.evaluateReliability({}, res.group, null, res.title) : null) || {};
    const notStated = t("rel_not_stated");
    const srcPage = t("src_page");

    // Vendedor
    const sellerVal = `${esc(rel.sellerName || notStated)}`;
    const sellerRow = dataRow(t("lbl_seller"), sellerVal, srcPage);

    // Calificación
    let ratingRow = "";
    if (rel.sellerRating) {
      ratingRow = dataRow(t("rel_seller_label"), esc(rel.sellerRating), srcPage);
    }

    // Envío
    const shipText = rel.isFulfilledByPlatform ? t("ship_platform_fulfilled") : (rel.shipper ? rel.shipper : notStated);
    const shipRow = dataRow(t("lbl_shipping"), esc(shipText), srcPage);

    // Garantía y devolución
    const policyText = [rel.returnPolicy, rel.warranty].filter(Boolean).join(" · ");
    const warrantyRow = dataRow(t("lbl_warranty"), policyText ? esc(policyText) : esc(notStated), srcPage);

    // Normas aplicables
    let normsRow = "";
    if (rel.norms && rel.norms.length) {
      const normsList = rel.norms.map((n) => `<div><b>${esc(n.code)}</b>${n.descKey ? ` · ${esc(t(n.descKey))}` : ""}</div>`).join("");
      normsRow = dataRow(t("lbl_norms"), normsList, t("src_unverified"));
    }

    // Alertas oficiales
    let alertsRow = "";
    if (res.group && Array.isArray(res.group.alertas) && res.group.alertas.length) {
      const alertsList = res.group.alertas.map((al) => `<div><a href="${esc(safe(al.url))}" target="_blank" rel="noopener noreferrer">${esc(al.titulo)} (${esc(al.autoridad || "")})</a></div>`).join("");
      alertsRow = dataRow(t("lbl_official_alerts"), alertsList, t("src_official", { source: "Entidad oficial" }));
    }

    // Caja de aviso
    let tipBox = "";
    if (rel.level === "check") {
      tipBox = `<div class="box-warn">${t("rel_tip_check")}</div>`;
    }

    return `
      ${sellerRow}
      ${ratingRow}
      ${shipRow}
      ${warrantyRow}
      ${normsRow}
      ${alertsRow}
      ${tipBox}
    `;
  }

  // ---------------------------------------------------------------- SECCIÓN 2: Mercado y alternativas
  function renderMarket(res) {
    const a = res.alternativas;
    const srcOfficial = t("src_official", { source: "Registro público" });

    if (!a || !a.items || !a.items.length) {
      const brandName = res.found ? res.brand : (res.brandText || "");
      const storeName = res.store ? res.store.nombre : "";
      const emailSubject = encodeURIComponent(`Sugerencia de marca o alternativa: ${brandName}`);
      const emailBody = encodeURIComponent(`Marca: ${brandName}\nTienda: ${storeName}\nProducto: ${res.title || ""}\n`);
      const contact = (QED.PROJECT && QED.PROJECT.contacto) || "";
      const mailtoUrl = contact ? `mailto:${contact}?subject=${emailSubject}&body=${emailBody}` : "";

      return `
        <div class="alt-empty-box">
          <div>${t("no_local_alternatives")}</div>
          <button id="card-suggest-btn" class="btn-sug">${t("suggest_btn")}</button>
          <div id="card-suggest-ok" class="sug-ok">${t("suggest_success")}
            ${mailtoUrl ? `<br><a href="${esc(mailtoUrl)}" target="_blank" rel="noopener noreferrer">${t("suggest_email_opt")}</a>` : ""}
          </div>
        </div>
        <div class="tip-box">${t("alt_saver_tip")}</div>
        <div class="method">${t("alt_disclaimer")}</div>
      `;
    }

    const catLabel = I18N().catLabel ? I18N().catLabel(a.cat, a.label.toLowerCase()) : a.label.toLowerCase();
    const alsoLocal = a.actualEsLocal ? ` <span class="d-src">(${t("alt_also_local")})</span>` : "";
    const countryLbl = I18N().paisLabel ? I18N().paisLabel(a.pais) : a.pais;

    const itemsHtml = a.items.map((it) => {
      const isEn = I18N().getLang && I18N().getLang() !== "es";
      const nota = (isEn && it.group.nota_en) ? it.group.nota_en : it.group.nota;
      const fuente = it.group.url ? `<a href="${esc(safe(it.group.url))}" target="_blank" rel="noopener noreferrer">${t("source").toLowerCase()}</a>` : "";
      return `
        <div class="alt-box">
          <b>${esc(it.marcas.join(", "))}</b>
          <div style="font-size:11.5px;color:#334155;margin-top:2px;">
            <b>${esc(it.group.empresa)}</b> · ${esc(it.motivo)} · ${esc(it.capital)}
            ${nota ? ` · ${esc(nota)}` : ""}
            ${it.rep != null ? ` · ⚖ ${esc(it.rep)}/100` : ""}
            ${fuente ? ` · ${fuente}` : ""}
          </div>
          <div class="d-src">${srcOfficial}</div>
        </div>
      `;
    }).join("");

    return `
      <div class="d-k">${t("alt_header", { cat: esc(catLabel), pais: esc(countryLbl) })}${alsoLocal}</div>
      ${itemsHtml}
      <div class="tip-box">${t("alt_saver_tip")}</div>
      <div class="method">${t("alt_disclaimer")}</div>
    `;
  }

  // ---------------------------------------------------------------- SECCIÓN 3: ¿A quién le compras?
  function renderOwnership(res, opts) {
    if (!res.found) {
      return `
        <div class="d-row">
          <div class="d-k">${t("lbl_controller")}</div>
          <div class="d-v">${t("not_found_desc", { brand: esc(res.brandText || "") })}</div>
          <div class="d-src">${t("not_found_pending_hint")}</div>
        </div>
        ${storeBlock(res.store)}
      `;
    }

    const g = res.group || {};
    const isEn = I18N().getLang && I18N().getLang() !== "es";
    const ctrl = (isEn && g.controlador_en) ? g.controlador_en : g.controlador;
    const nota = (isEn && g.nota_en) ? g.nota_en : g.nota;
    const fondos = (isEn && g.fondos_en) ? g.fondos_en : g.fondos;
    const gobierno = (isEn && g.gobierno_en) ? g.gobierno_en : g.gobierno;
    const fuenteLbl = (isEn && g.fuente_en) ? g.fuente_en : (g.fuente || t("view_source"));
    const fuente = g.url
      ? `<a href="${esc(safe(g.url))}" target="_blank" rel="noopener noreferrer">${esc(fuenteLbl)}</a>`
      : esc(fuenteLbl || t("no_source"));

    const countryLbl = I18N().paisLabel ? I18N().paisLabel(g.pais) : g.pais;
    const tipoLbl = I18N().tipoLabel ? I18N().tipoLabel(g.tipo) : g.tipo;
    const chipsHtml = `<div class="chips">${g.pais ? `<span class="chip">🌎 ${esc(countryLbl)}</span>` : ""}${g.tipo ? `<span class="chip">${esc(tipoLbl)}</span>` : ""}${confChip(g.confianza)}</div>`;

    const ctrlVal = `${esc(ctrl)}${chipsHtml}`;
    const ctrlRow = dataRow(t("lbl_controller"), ctrlVal, t("src_official", { source: fuenteLbl }));

    const fondosRow = fondos ? dataRow(t("lbl_funds"), esc(fondos), t("src_official", { source: "SEC / Reporte oficial" })) : "";
    const govRow = gobierno ? dataRow(t("lbl_gov"), esc(gobierno), t("src_official", { source: fuenteLbl })) : "";
    const notaBox = nota ? `<div class="note">${esc(nota)}</div>` : "";

    const repHtml = repBlock(g, opts);
    const storeHtml = storeBlock(res.store);

    return `
      ${ctrlRow}
      ${fondosRow}
      ${govRow}
      ${notaBox}
      ${repHtml}
      ${storeHtml}
    `;
  }

  function storeBlock(store) {
    if (!store || !store.group) return "";
    const g = store.group;
    const isEn = I18N().getLang && I18N().getLang() !== "es";
    const ctrl = (isEn && g.controlador_en) ? g.controlador_en : g.controlador;
    const countryLbl = I18N().paisLabel ? I18N().paisLabel(g.pais) : g.pais;
    const storeText = `<b>${esc(store.nombre)}</b> → ${esc(g.empresa)} · ${esc(ctrl)}${g.pais ? " · " + esc(countryLbl) : ""}`;
    return dataRow(t("lbl_store"), storeText, t("src_official", { source: "Registro público" }));
  }

  // ---------------------------------------------------------------- Viajes
  function renderTravel(res, opts) {
    if (res.mode === "hospedaje") {
      return `
        <div class="sec-content" style="display:block;padding-left:14px;">
          <div class="d-k">${t("booking_with", { agency: esc(res.agency && res.agency.nombre) })}</div>
          ${renderOwnership({ found: true, group: res.agency && res.agency.group, store: null }, opts)}
        </div>
      `;
    }
    let h = "";
    if (res.airline) {
      h += `<div class="d-k" style="margin-top:4px;">${t("flying_with", { airline: esc(res.airline.nombre) })}</div>
        ${renderOwnership({ found: true, group: res.airline.group, store: null }, opts)}`;
    }
    const list = res.airlines || [];
    if (list.length) {
      h += `<div class="d-k" style="margin-top:10px;">${res.airline ? t("other_airlines") : t("airlines_on_page")}</div>`;
      h += list.map((a, i) => {
        const timeWord = a.count === 1 ? t("time_singular") : t("time_plural");
        const seenText = t("times_seen", { count: a.count, times: timeWord });
        const airCountryLbl = I18N().paisLabel ? I18N().paisLabel((a.group || {}).pais) : ((a.group || {}).pais);
        return `<details class="air"${i === 0 && !res.airline ? " open" : ""}><summary>${esc(a.n)} <small>· ${esc((a.group || {}).empresa)} · ${esc(airCountryLbl)} · ${seenText}</small></summary>
          <div style="padding:6px 0;">${renderOwnership({ found: true, group: a.group, store: null }, opts)}</div></details>`;
      }).join("");
    }
    if (res.agency && res.agency.group) {
      const g = res.agency.group;
      const isEn = I18N().getLang && I18N().getLang() !== "es";
      const ctrl = (isEn && g.controlador_en) ? g.controlador_en : g.controlador;
      const agencyCountryLbl = I18N().paisLabel ? I18N().paisLabel(g.pais) : g.pais;
      const agencyText = `<b>${esc(res.agency.nombre)}</b> → ${esc(g.empresa)} · ${esc(ctrl)}${g.pais ? " · " + esc(agencyCountryLbl) : ""}`;
      h += `<div style="margin-top:10px;">${dataRow(t("lbl_store"), agencyText, t("src_official", { source: "Registro público" }))}</div>`;
    }
    return `<div class="sec-content" style="display:block;padding-left:14px;">${h}</div>`;
  }

  // ---------------------------------------------------------------- Resúmenes de 1 línea
  function getRelSummary(res, rel) {
    if (rel.sellerType === "direct") {
      const stName = (res.store && res.store.nombre) || rel.storeName;
      return stName ? t("summary_rel_fulfilled", { store: stName }) : t("summary_rel_direct");
    }
    if (rel.sellerType === "official") {
      return t("badge_official_store");
    }
    if (rel.shipper && /china|ee\.uu\.|usa|intl|exterior/i.test(rel.shipper)) {
      return t("summary_rel_ext_intl", { country: rel.shipper });
    }
    if (rel.sellerName) {
      return `Vendido por ${rel.sellerName}`;
    }
    return t("summary_rel_ext");
  }

  function getMktSummary(res) {
    const a = res.alternativas;
    if (a && a.items && a.items.length) {
      const cnt = a.items.length;
      const countryLbl = I18N().paisLabel ? I18N().paisLabel(a.pais) : a.pais;
      return t("summary_mkt_count", { count: cnt, pais: countryLbl });
    }
    return t("summary_mkt_none");
  }

  function getOwnSummary(res) {
    if (res.found && res.group) {
      const g = res.group;
      const isEn = I18N().getLang && I18N().getLang() !== "es";
      const ctrl = (isEn && g.controlador_en) ? g.controlador_en : (g.controlador || g.empresa);
      const countryLbl = I18N().paisLabel ? I18N().paisLabel(g.pais) : g.pais;
      // Resumen corto: "<controlador corto> · <país>"
      const shortCtrl = ctrl.split(",")[0].split("(")[0].trim();
      return `${shortCtrl}${countryLbl ? " · " + countryLbl : ""}`;
    }
    return t("summary_own_unregistered");
  }

  // ---------------------------------------------------------------- Render principal
  function render(res, opts) {
    if (res.mode) return renderTravel(res, opts);

    if (res.kind === "loading") {
      return `<div style="padding:16px 14px;"><span class="spin"></span>${t("loading") || "..."}</div>`;
    }

    const rel = res.reliabilityEval || (QED.evaluateReliability ? QED.evaluateReliability({}, res.group, null, res.title) : {}) || {};

    // Insignia SOLO en Confiabilidad
    let relBadgeHtml = "";
    if (rel.sellerType === "direct") {
      relBadgeHtml = `<span class="badge-rel direct">${t("badge_direct_store")}</span>`;
    } else if (rel.sellerType === "official") {
      relBadgeHtml = `<span class="badge-rel official">${t("badge_official_store")}</span>`;
    } else if (rel.sellerType === "verified") {
      relBadgeHtml = `<span class="badge-rel verified">${t("badge_verified")}</span>`;
    } else if (rel.level === "check") {
      relBadgeHtml = `<span class="badge-rel check">${t("badge_check")}</span>`;
    }

    const relSummary = getRelSummary(res, rel);
    const mktSummary = getMktSummary(res);
    const ownSummary = getOwnSummary(res);

    return `
      <!-- SECCIÓN 1: Confiabilidad de compra -->
      <div class="sec-row" id="sec-rel">
        <button type="button" class="sec-btn" data-sec="rel" aria-expanded="false" aria-controls="sec-rel-body">
          <span class="sec-ic-wrap">${SVG_SHIELD}</span>
          <span class="sec-meta">
            <span class="sec-title-row">
              <span class="sec-title">${t("sec_reliability_title")}</span>
              ${relBadgeHtml}
            </span>
            <span class="sec-summary">${esc(relSummary)}</span>
          </span>
          <span class="sec-arr-wrap">${SVG_CHEVRON}</span>
        </button>
        <div class="sec-content" id="sec-rel-body" hidden>
          ${renderReliability(res)}
        </div>
      </div>

      <!-- SECCIÓN 2: Mercado y alternativas -->
      <div class="sec-row" id="sec-mkt">
        <button type="button" class="sec-btn" data-sec="mkt" aria-expanded="false" aria-controls="sec-mkt-body">
          <span class="sec-ic-wrap">${SVG_CHART}</span>
          <span class="sec-meta">
            <span class="sec-title-row">
              <span class="sec-title">${t("sec_market_title")}</span>
            </span>
            <span class="sec-summary">${esc(mktSummary)}</span>
          </span>
          <span class="sec-arr-wrap">${SVG_CHEVRON}</span>
        </button>
        <div class="sec-content" id="sec-mkt-body" hidden>
          ${renderMarket(res)}
        </div>
      </div>

      <!-- SECCIÓN 3: ¿A quién le compras? -->
      <div class="sec-row" id="sec-own">
        <button type="button" class="sec-btn" data-sec="own" aria-expanded="false" aria-controls="sec-own-body">
          <span class="sec-ic-wrap">${SVG_BUILDING}</span>
          <span class="sec-meta">
            <span class="sec-title-row">
              <span class="sec-title">${t("sec_ownership_title")}</span>
            </span>
            <span class="sec-summary">${esc(ownSummary)}</span>
          </span>
          <span class="sec-arr-wrap">${SVG_CHEVRON}</span>
        </button>
        <div class="sec-content" id="sec-own-body" hidden>
          ${renderOwnership(res, opts)}
        </div>
      </div>
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

  // Persistencia de última sección abierta en storage.local
  function getSavedSection(siteKey, cb) {
    try {
      const api = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
      if (api && api.storage && api.storage.local) {
        api.storage.local.get(["gina_user_profile", "gina_sec_" + siteKey], (data) => {
          if (!data) return cb(null);
          if (data.gina_user_profile === "smart") return cb("rel");
          if (data.gina_user_profile === "saver") return cb("mkt");
          if (data.gina_user_profile === "conscious") return cb("own");
          cb(data["gina_sec_" + siteKey] || null);
        });
        return;
      }
    } catch (e) {}
    cb(null);
  }

  function saveSection(siteKey, secId) {
    try {
      const api = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
      if (api && api.storage && api.storage.local) {
        const obj = {};
        obj["gina_sec_" + siteKey] = secId;
        api.storage.local.set(obj);
      }
    } catch (e) {}
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

    // Línea de marca: "<Marca> · <Empresa dueña>" en 16 px negrita, y debajo en 11 px gris de dónde se leyó
    let brandTitle = "";
    let brandOrigin = "";
    if (res.mode) {
      brandTitle = res.mode === "vuelos" ? t("card_title_flight") : t("card_title_hotel");
      brandOrigin = t("src_page");
    } else if (res.found) {
      brandTitle = `${res.brand} · ${(res.group && res.group.empresa) || ""}`;
      brandOrigin = t("src_read_from", { source: res.source || "página" });
    } else {
      brandTitle = `${res.brandText || t("not_found_unreadable")} · ${t("not_found_title")}`;
      brandOrigin = t("src_read_from", { source: t("not_found_title") });
    }

    shadow.innerHTML = `<style>${CSS}</style>
      <div class="wrap"><div class="card">
        <div class="top">
          <span class="t">Gina</span>
          <div class="top-actions">
            <button type="button" class="top-btn btn-min" aria-label="${t("btn_minimize")}" title="${t("btn_minimize")}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button type="button" class="top-btn btn-close" aria-label="${t("btn_close")}" title="${t("btn_close")}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div class="brand-bar">
          <div class="brand-line">${esc(brandTitle)}</div>
          <div class="brand-sub">${esc(brandOrigin)}</div>
        </div>
        <div class="body">${render(res, opts)}</div>
        <div class="foot">${t("foot_disclaimer")}</div>
      </div></div>`;

    shadow.querySelector(".btn-min").onclick = () => { opts.onToggle && opts.onToggle(true); };
    shadow.querySelector(".btn-close").onclick = () => { QED.hideCard(); opts.onClose && opts.onClose(); };

    const siteKey = (res.store && (res.store.id || res.store.nombre)) || (typeof location !== "undefined" && location.hostname) || "default";

    function toggleSection(secId, persist = true) {
      const allBtns = shadow.querySelectorAll(".sec-btn");
      const targetBtn = shadow.querySelector(`.sec-btn[data-sec="${secId}"]`);
      const targetBody = shadow.getElementById(`sec-${secId}-body`);
      const isCurrentlyOpen = targetBtn && targetBtn.getAttribute("aria-expanded") === "true";

      allBtns.forEach((b) => {
        b.setAttribute("aria-expanded", "false");
        const sId = b.getAttribute("data-sec");
        const bodyEl = shadow.getElementById(`sec-${sId}-body`);
        if (bodyEl) bodyEl.hidden = true;
      });

      if (!isCurrentlyOpen && targetBtn && targetBody) {
        targetBtn.setAttribute("aria-expanded", "true");
        targetBody.hidden = false;
        if (persist) saveSection(siteKey, secId);
      } else {
        if (persist) saveSection(siteKey, null);
      }
    }

    shadow.querySelectorAll(".sec-btn").forEach((btn) => {
      btn.onclick = () => {
        const secId = btn.getAttribute("data-sec");
        toggleSection(secId, true);
      };
    });

    // Restaurar sección recordada si existe
    getSavedSection(siteKey, (savedSec) => {
      if (savedSec) toggleSection(savedSec, false);
    });

    // Handler de sugerencia de marca en 1 clic
    const sugBtn = shadow.querySelector("#card-suggest-btn");
    const sugOk = shadow.querySelector("#card-suggest-ok");
    if (sugBtn) {
      sugBtn.onclick = async () => {
        sugBtn.disabled = true;
        sugBtn.style.opacity = "0.5";
        try {
          const api = typeof browser !== "undefined" ? browser : chrome;
          const site = res.store ? `${res.store.nombre}` : (typeof location !== "undefined" ? location.hostname : "");
          if (api && api.runtime && api.runtime.sendMessage) {
            await api.runtime.sendMessage({
              type: "qed:suggest_brand",
              brand: res.brandText || "",
              title: res.title || "",
              site: site
            });
          }
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
