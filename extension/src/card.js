// SPDX-License-Identifier: MIT
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

  const PRENSA_NOMBRES = {
    "reuters.com": "Reuters",
    "bloomberg.com": "Bloomberg",
    "ft.com": "Financial Times",
    "wsj.com": "The Wall Street Journal",
    "expansion.mx": "Expansión",
    "elpais.com": "El País",
    "cincodias.elpais.com": "Cinco Días",
    "eleconomista.com.mx": "El Economista",
    "eleconomista.es": "El Economista",
    "valoreconomico.globo.com": "Valor Econômico",
    "nikkei.com": "Nikkei",
    "elceo.com": "EL CEO",
    "businesswire.com": "Business Wire",
    "prnewswire.com": "PR Newswire",
    "stblaw.com": "Simpson Thacher",
    "lw.com": "Latham & Watkins",
    "jonesday.com": "Jones Day",
    "jstories.media": "J-Stories",
    "fashionunited.uk": "FashionUnited",
    "bluewin.ch": "Bluewin",
    "jingdaily.com": "Jing Daily",
    "insideretail.asia": "Inside Retail",
    "tusbuenasnoticias.com": "Tus Buenas Noticias",
    "swissinfo.ch": "SWI swissinfo.ch",
    "independent.co.uk": "The Independent",
    "finance.yahoo.com": "Yahoo Finance",
    "forbes.com": "Forbes",
    "fortune.com": "Fortune",
    "handelsblatt.com": "Handelsblatt",
    "lesechos.fr": "Les Échos",
    "ilsole24ore.com": "Il Sole 24 Ore"
  };

  const DOMINIOS_OFICIALES_DEFECTO = [
    "sec.gov", "data.sec.gov", "bmv.com.mx", "cnmv.es", "hkexnews.hk", "hkex.com.hk",
    "amf-france.org", "bafin.de", "fca.org.uk", "gleif.org", "api.gleif.org", "cvm.gov.br",
    "cmfchile.cl", "sebi.gov.in", "tase.co.il", "gov.uk", "company-information.service.gov.uk",
    "aboutamazon.com", "walmart.com", "stock.walmart.com", "walmex.mx", "inversionistas.walmex.mx",
    "costco.com", "target.com", "bestbuy.com", "homedepot.com", "grupoherdez.com.mx", "kuo.com.mx",
    "nestle.com", "loreal.com", "loreal-finance.com", "philips.com", "pierre-fabre.com",
    "maus.ch", "ferrero.com", "gardnerstandard.com", "truper.com", "jumex.com"
  ];

  function formatSourceLabel(url, fallbackText) {
    let domain = "";
    if (url && typeof url === "string") {
      try {
        domain = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
      } catch (e) {}
    }

    const doms = (QED && QED.DOMINIOS) || {};
    const oficialList = (doms.oficial && doms.oficial.length) ? doms.oficial : DOMINIOS_OFICIALES_DEFECTO;
    const prensaList = (doms.prensa_referencia && doms.prensa_referencia.length) ? doms.prensa_referencia : Object.keys(PRENSA_NOMBRES);

    const isOficial = domain && oficialList.some((d) => domain === d.toLowerCase() || domain.endsWith("." + d.toLowerCase()));
    const isPrensa = domain && prensaList.some((d) => domain === d.toLowerCase() || domain.endsWith("." + d.toLowerCase()));

    if (isOficial) {
      return t("src_official", { source: fallbackText || domain || "Registro oficial" });
    }
    if (isPrensa) {
      let matchedName = "";
      for (const [pDom, pName] of Object.entries(PRENSA_NOMBRES)) {
        if (domain === pDom || domain.endsWith("." + pDom)) {
          matchedName = pName;
          break;
        }
      }
      const medio = matchedName || fallbackText || domain;
      return `Fuente: ${medio}`;
    }
    if (domain) {
      return `Fuente: ${domain}`;
    }
    if (fallbackText && !/registro oficial|sec \/|entidad oficial/i.test(fallbackText)) {
      return `Fuente: ${fallbackText}`;
    }
    return t("src_official", { source: fallbackText || "Registro oficial" });
  }

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
  .badge-rel.official-notice { background: #fdf1e2; color: #5c2e00; border: 1px solid #f4d4a8; }

  /* Avisos del producto */
  .prod-notices { margin-top: 10px; margin-bottom: 6px; }
  .notice-box { border-radius: 7px; padding: 7px 9px; margin-top: 5px; font-size: 11.5px; line-height: 1.35; }
  .notice-box.notice-official { background: #fdf1e2; color: #5c2e00; border: 1px solid #f4d4a8; }
  .notice-box.notice-info { background: #f4f6fa; color: #2d3748; border: 1px solid #e2e8f0; }
  .notice-text { font-weight: 600; }
  .notice-src { font-size: 10.5px; margin-top: 2px; opacity: 0.9; }
  .notice-src a { color: inherit; text-decoration: underline; }
  .notices-footer { font-size: 10px; color: #718096; margin-top: 5px; font-style: italic; line-height: 1.3; }

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

  /* Price & Comparison */
  .price-panel { margin-bottom: 10px; padding: 9px 11px; background: #f8fafd; border: 1px solid #e1e7f0; border-radius: 8px; }
  .price-main { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .price-current { font-size: 16px; font-weight: 750; color: #1c2233; }
  .price-cur-lbl { font-size: 10px; font-weight: 600; color: #5f687a; text-transform: uppercase; letter-spacing: .4px; }
  .price-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e6eaf2; }
  .price-cell { text-align: center; background: #fff; padding: 5px 4px; border-radius: 6px; border: 1px solid #e8ecf3; }
  .price-cell-title { font-size: 10px; color: #6a7386; font-weight: 600; text-transform: uppercase; }
  .price-cell-val { font-size: 11px; font-weight: 700; margin-top: 2px; }
  .price-up { color: #8a1f14; font-weight: 600; }
  .price-down { color: #1f5f19; font-weight: 600; }
  .price-neutral { color: #55627a; font-weight: 600; }
  .price-hist-init { font-size: 11px; color: #64748b; margin-top: 6px; text-align: center; }
  .price-msi { display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; color: #1f4e8c; margin-top: 6px; }

  /* Cross platform options */
  .cross-plat-box { margin-top: 10px; padding: 8px 10px; background: #fff; border: 1px solid #e6e9f0; border-radius: 8px; }
  .cross-plat-item { display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; padding: 5px 0; border-bottom: 1px dashed #edf0f5; }
  .cross-plat-item:last-child { border-bottom: none; }
  .cross-plat-name { font-weight: 600; color: #1c2233; }
  .cross-plat-link { color: #1f6fb2; text-decoration: none; font-weight: 600; font-size: 11px; flex: none; margin-left: 6px; }
  .cross-plat-link:hover { text-decoration: underline; }
  .cross-plat-comp { font-size: 10.5px; margin-top: 1px; color: #535d70; }

  /* Free Trackers */
  .trackers-box { margin-top: 10px; padding: 8px 10px; background: #f2f5fb; border: 1px solid #dce4f2; border-radius: 8px; }
  .trackers-title { font-size: 10.5px; font-weight: 700; color: #143c73; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 4px; }
  .tracker-item { font-size: 11.5px; margin-top: 4px; line-height: 1.35; }
  .tracker-link { font-weight: 600; color: #1f6fb2; text-decoration: none; }
  .tracker-link:hover { text-decoration: underline; }
  .tracker-desc { font-size: 10.5px; color: #5f687a; }

  /* Alternatives Badges & Store Anchoring */
  .alt-badge { display: inline-block; font-size: 9.5px; font-weight: 600; padding: 1px 6px; border-radius: 999px; margin-left: 4px; vertical-align: 1px; }
  .alt-badge.local { background: #e2f0d9; color: #235017; }
  .alt-badge.propia { background: #e0f2fe; color: #0369a1; }
  .alt-badge.discount { background: #fef3c7; color: #92400e; }
  .alt-disp { font-size: 10.5px; color: #475569; margin-top: 3px; }

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
    const originHtml = (origin && origin.includes("<a ")) ? origin : esc(origin);
    return `
      <div class="d-row">
        <div class="d-k">${esc(label)}</div>
        <div class="d-v">${value}</div>
        ${origin ? `<div class="d-src">${originHtml}</div>` : ""}
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

  // ---------------------------------------------------------------- Precio (sección Mercado)
  function priceDiffText(w) {
    if (!w || w.insufficient) return t("price_insufficient");
    if (w.status === "expensive") return t("price_above", { n: w.diffPct });
    if (w.status === "cheap") return t("price_below", { n: Math.abs(w.diffPct) });
    return t("price_around", { n: (w.diffPct > 0 ? "+" : "") + w.diffPct });
  }
  function priceDiffClass(w) {
    if (!w || w.insufficient) return "price-neutral";
    return w.status === "expensive" ? "price-up" : w.status === "cheap" ? "price-down" : "price-neutral";
  }

  function renderPricePanel(rel) {
    if (!rel || !rel.price || !rel.price.amount) return "";
    const priceFmt = esc(QED.formatMoney ? QED.formatMoney(rel.price.amount, rel.price.currency) : rel.price.formatted);
    const comp = rel.priceComparison;
    let histHtml = "";
    if (rel.historyEnabled === false) {
      histHtml = `<div class="price-hist-init">${t("price_history_off")}</div>`;
    } else if (!comp || !comp.hasHistory) {
      histHtml = `<div class="price-hist-init">${t("price_first_visit")}</div>`;
    } else {
      const cell = (title, w) => `<div class="price-cell"><div class="price-cell-title">${esc(title)}</div><div class="price-cell-val ${priceDiffClass(w)}"${w && !w.insufficient ? ` title="${esc(QED.formatMoney ? QED.formatMoney(w.avg, rel.price.currency) : w.avg)}"` : ""}>${esc(priceDiffText(w))}</div></div>`;
      histHtml = `
        <div class="price-grid">${cell(t("price_1w"), comp.oneWeek)}${cell(t("price_1m"), comp.oneMonth)}${cell(t("price_3m"), comp.threeMonths)}</div>
        <div class="d-src" style="margin-top:6px;">${esc(t("price_visits_label", { n: comp.visits }))}</div>`;
    }
    const inst = rel.installments || {};
    const msiText = inst.hasMsi ? (inst.months ? t("price_msi_months", { n: inst.months }) : t("price_msi_generic")) : t("price_no_msi");
    const msiHtml = `<div class="price-msi"${inst.hasMsi ? "" : ' style="color:#535d70;font-weight:normal;"'}>${esc(msiText)}</div>`;
    const rat = rel.structuredRating;
    const ratBox = rat && rat.score != null
      ? `<div style="text-align:right;"><div class="price-cur-lbl">${t("lbl_rating")}</div><div style="font-weight:700;font-size:12px;color:#1c2233;">${esc(String(rat.score))} / ${esc(String(rat.max || 5))}${rat.count ? ` <span style="font-size:10px;color:#535d70;font-weight:normal;">(${esc(String(rat.count))})</span>` : ""}</div></div>`
      : "";
    const primTracker = (rel.trackers && rel.trackers.length)
      ? (rel.trackers.find((t) => t && t.name === "Keepa") || rel.trackers[0])
      : null;
    let followBtnHtml = "";
    if (primTracker && primTracker.url) {
      followBtnHtml = `<a href="${esc(safe(primTracker.url))}" class="btn-follow-price tracker-link" target="_blank" rel="noopener noreferrer" style="margin-left:8px;padding:2px 7px;font-size:11px;font-weight:600;color:#0284c7;background:#f0f9ff;border:1px solid #bae6fd;border-radius:4px;text-decoration:none;vertical-align:middle;display:inline-block;">${t("btn_follow_price")} ↗</a>`;
    }
    return `
      <div class="price-panel">
        <div class="price-main">
          <div>
            <div class="price-cur-lbl">${t("lbl_price")}</div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <span class="price-current">${priceFmt}</span>
              ${followBtnHtml}
            </div>
          </div>
          ${ratBox}
        </div>
        ${msiHtml}
        ${histHtml}
      </div>`;
  }

  function buildCompareResultsHtml(cmpData, currentPriceObj) {
    if (!cmpData) return "";
    const same = cmpData.same || [];
    const similar = cmpData.similar || [];
    const unreadable = cmpData.unreadable || [];
    const now = Date.now();
    const minsAgo = Math.max(1, Math.round((now - (cmpData.timestamp || now)) / 60000));
    const timeText = t("compare_read_mins_ago", { n: minsAgo });

    // Debajo de los resultados: «Ver en <tienda> ↗» con la búsqueda de cada tienda consultada (solo https del dominio de esa tienda).
    const searchLinksHtml = (() => {
      const links = (cmpData.searchLinks || []).map((l) => {
        try {
          const u = new URL(String(l.url || ""));
          const d = String(l.dominio || "").toLowerCase().replace(/^www\./, "");
          const h = u.hostname.toLowerCase().replace(/^www\./, "");
          if (u.protocol !== "https:" || !d.includes(".") || !(h === d || h.endsWith("." + d))) return "";
          return `<a href="${esc(u.toString())}" class="compare-search-link" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#0284c7;text-decoration:none;margin-right:10px;white-space:nowrap;">${t("compare_see_in", { store: esc(l.nombre || d) })} ↗</a>`;
        } catch (_) { return ""; }
      }).filter(Boolean);
      return links.length ? `<div class="compare-search-links" style="margin-top:6px;padding-top:6px;border-top:1px dashed #e2e8f0;line-height:1.8;">${links.join("")}</div>` : "";
    })();

    if (!same.length && !similar.length) {
      let unreadHtml = unreadable.map((u) => `<div style="font-size:10.5px;color:#94a3b8;margin-top:2px;">${t("compare_cant_read", { store: esc(u) })}</div>`).join("");
      return `<div style="font-size:11.5px;color:#64748b;padding:6px 0;">${t("compare_no_matches")}</div>${unreadHtml}${searchLinksHtml}`;
    }

    const renderRow = (item, isSimilar) => {
      const priceFmt = item.price ? (QED.formatMoney ? QED.formatMoney(item.price, item.currency) : `${item.currency || "$"} ${item.price}`) : "";
      // Precio por unidad con la moneda de la tienda (el motor lo arma con «$» fijo)
      const unitTxt = item.unitPrice && typeof item.unitPrice.unitPrice === "number" && item.currency && QED.formatMoney
        ? `${QED.formatMoney(item.unitPrice.unitPrice, item.currency)}${item.unitPrice.unitLabel || ""}`
        : (item.unitPrice && item.unitPrice.text) || "";
      const unitPriceHtml = unitTxt
        ? `<div class="compare-unit-price" style="font-size:10px;color:#64748b;margin-top:1px;">${esc(unitTxt)}</div>`
        : "";
      const cheapestBadge = item.isCheapest
        ? `<span class="alt-badge local" style="background:#dcfce7;color:#166534;font-size:10px;font-weight:700;margin-left:6px;">${t("compare_badge_cheapest")}</span>`
        : "";
      const diffText = item.difference || item.label || "";
      const differenceBadge = isSimilar
        ? `<div style="margin-top:2px;"><span class="alt-badge compare-diff-tag" style="background:#fef3c7;color:#92400e;font-size:10px;">${diffText ? esc(diffText) : t("compare_similar_notice")}</span></div>`
        : "";
      const ratingText = item.rating
        ? ` · ★ ${esc(String(item.rating))}${item.reviewsCount ? ` (${esc(String(item.reviewsCount))})` : ""}`
        : "";

      // Validar URL: estrictamente https, del dominio de la tienda
      let validUrl = "#";
      const rawUrl = String(item.url || "").trim();
      const domain = String(item.storeDomain || item.dominio || item.store || "").trim().toLowerCase();
      if (/^https:\/\//i.test(rawUrl)) {
        try {
          const u = new URL(rawUrl);
          const host = u.hostname.toLowerCase().replace(/^www\./, "");
          const cleanDomain = domain.replace(/^www\./, "");
          // Sin dominio de tienda conocido no hay enlace (validación 2026-10-18: antes cualquier host pasaba).
          const isMatchingDomain = !!cleanDomain && cleanDomain.includes(".") && (host === cleanDomain || host.endsWith("." + cleanDomain));
          if (u.protocol === "https:" && isMatchingDomain) {
            validUrl = u.toString();
          }
        } catch (_) {}
      }

      // Validar Imagen: estrictamente https
      let validImg = "";
      const rawImg = String(item.image || "").trim();
      if (/^https:\/\//i.test(rawImg)) {
        try {
          const u = new URL(rawImg);
          if (u.protocol === "https:") {
            validImg = u.toString();
          }
        } catch (_) {}
      }

      let amazonTrackerBtn = "";
      if (!isSimilar) {
        const storeDom = String(item.storeDomain || item.dominio || item.store || "").toLowerCase();
        const rawItemUrl = String(item.url || "");
        if (storeDom.includes("amazon") || rawItemUrl.includes("amazon.")) {
          const asinMatch = rawItemUrl.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i) || (item.asin ? [null, item.asin] : null);
          if (asinMatch && asinMatch[1]) {
            const asin = asinMatch[1];
            const domainCodeMap = {
              "amazon.com.mx": "11",
              "amazon.com": "1",
              "amazon.co.uk": "2",
              "amazon.de": "3",
              "amazon.fr": "4",
              "amazon.co.jp": "5",
              "amazon.ca": "6",
              "amazon.it": "8",
              "amazon.es": "9"
            };
            // Solo dominios de Amazon con código de Keepa conocido; si no, sin botón (antes caía en amazon.com).
            let code = "";
            try {
              const h = new URL(rawItemUrl).hostname.toLowerCase().replace(/^www\./, "");
              for (const [d, c] of Object.entries(domainCodeMap)) if (h === d) { code = c; break; }
            } catch (_) {}
            if (code) {
            const keepaUrl = `https://keepa.com/#!product/${code}-${asin}`;
            amazonTrackerBtn = `<a href="${esc(safe(keepaUrl))}" class="btn-follow-price-mini tracker-link" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:3px;padding:2px 6px;font-size:10px;font-weight:600;color:#0284c7;background:#f0f9ff;border:1px solid #bae6fd;border-radius:4px;text-decoration:none;">${t("btn_follow_price")} ↗</a>`;
            }
          }
        }
      }

      return `
        <div class="compare-item-row" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
          <a href="${esc(safe(validUrl))}" class="compare-link" ${validUrl !== "#" ? 'target="_blank" rel="noopener noreferrer"' : ""} style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;flex:1;min-width:0;">
            ${validImg ? `<img src="${esc(safe(validImg))}" referrerpolicy="no-referrer" width="44" height="44" alt="" style="object-fit:contain;border-radius:4px;border:1px solid #e2e8f0;background:#fff;flex-shrink:0;" />` : ""}
            <div style="flex:1;min-width:0;">
              <div style="font-size:11.5px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(item.title)}">${esc(item.title)}</div>
              <div style="font-size:10.5px;color:#64748b;margin-top:2px;">
                <b>${esc(item.storeName || "")}</b> · ${timeText}${ratingText}
              </div>
              ${differenceBadge}
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="font-size:12.5px;font-weight:700;color:#0f172a;">${esc(priceFmt)}</div>
              ${unitPriceHtml}
              ${cheapestBadge}
            </div>
          </a>
          ${amazonTrackerBtn ? `<div style="flex-shrink:0;">${amazonTrackerBtn}</div>` : ""}
        </div>
      `;
    };

    let h = "";
    if (same.length) {
      h += `
        <div style="font-size:11px;font-weight:700;color:#334155;margin:6px 0 2px 0;">${t("compare_same_product")}</div>
        ${same.slice(0, 5).map((it) => renderRow(it, false)).join("")}
      `;
    }

    if (similar.length) {
      const limitedSimilar = similar.slice(0, 4);
      const presentaciones = limitedSimilar.filter((it) => it.reason === "otra_presentacion" || it.matchBy === "otra_presentacion");
      const variantes = limitedSimilar.filter((it) => it.reason === "variante" || it.matchBy === "variante");
      const otros = limitedSimilar.filter((it) => !presentaciones.includes(it) && !variantes.includes(it));

      if (presentaciones.length && variantes.length) {
        h += `
          <div style="font-size:11px;font-weight:700;color:#334155;margin:8px 0 2px 0;">${t("compare_other_presentation")}</div>
          ${presentaciones.map((it) => renderRow(it, true)).join("")}
          <div style="font-size:11px;font-weight:700;color:#334155;margin:8px 0 2px 0;">${t("compare_different_variant")}</div>
          ${variantes.map((it) => renderRow(it, true)).join("")}
        `;
      } else if (presentaciones.length && !variantes.length) {
        h += `
          <div style="font-size:11px;font-weight:700;color:#334155;margin:8px 0 2px 0;">${t("compare_other_presentation")}</div>
          ${presentaciones.map((it) => renderRow(it, true)).join("")}
        `;
      } else if (variantes.length && !presentaciones.length) {
        h += `
          <div style="font-size:11px;font-weight:700;color:#334155;margin:8px 0 2px 0;">${t("compare_different_variant")}</div>
          ${variantes.map((it) => renderRow(it, true)).join("")}
        `;
      } else {
        h += `
          <div style="font-size:11px;font-weight:700;color:#334155;margin:8px 0 2px 0;">${t("compare_similar_product")}</div>
          ${limitedSimilar.map((it) => renderRow(it, true)).join("")}
        `;
      }
      if (otros.length && (presentaciones.length || variantes.length)) {
        h += otros.map((it) => renderRow(it, true)).join("");
      }
    }

    if (unreadable.length) {
      h += unreadable.map((u) => `<div style="font-size:10.5px;color:#94a3b8;margin-top:4px;">${t("compare_cant_read", { store: esc(u) })}</div>`).join("");
    }

    return h + searchLinksHtml;
  }
  QED.buildCompareResultsHtml = buildCompareResultsHtml;

  function renderCompareSection(res, opts) {
    opts = opts || {};
    const consent = opts.compareConsent === true;
    const enabled = opts.compareEnabled !== false;
    if (!enabled) return "";

    const rel = res.reliabilityEval || {};
    const price = rel.price;

    let bodyHtml = "";
    if (!consent) {
      bodyHtml = `
        <div style="font-size:11.5px;color:#64748b;margin:6px 0;">${t("compare_consent_desc")}</div>
        <button type="button" class="btn-sug" id="card-compare-consent-btn" style="margin-top:2px;">${t("compare_btn_activate")}</button>
      `;
    } else {
      const cmpData = res.compareData;
      if (!cmpData) {
        bodyHtml = `
          <div id="compare-loading" style="font-size:11px;color:#64748b;padding:6px 0;display:flex;align-items:center;gap:6px;">
            <span>${t("loading")}</span>
          </div>
          <div id="compare-results"></div>
        `;
      } else {
        bodyHtml = buildCompareResultsHtml(cmpData, price);
      }
    }

    return `
      <div class="cross-plat-box" id="card-compare-container" style="margin-top:10px;padding-top:8px;border-top:1px solid #e2e8f0;">
        <div class="d-k" style="margin-bottom:4px;">${t("lbl_in_other_stores")}</div>
        ${bodyHtml}
      </div>
    `;
  }

  function renderTrackers(rel) {
    let h = "";
    if (rel && rel.trackers && rel.trackers.length) {
      h += `<div class="trackers-box"><div class="trackers-title">${t("lbl_price_trackers")}</div>
        ${rel.trackers.map((tr) => `<div class="tracker-item"><a href="${esc(safe(tr.url))}" class="tracker-link" target="_blank" rel="noopener noreferrer">${esc(tr.name)} ↗</a>${tr.desc ? ` <span class="tracker-desc">· ${esc(tr.desc)}</span>` : ""}</div>`).join("")}`;

      // Tarea E5: Seguimiento en Keepa ya armado con precio objetivo sugerido (y CamelCamelCamel en Amazon)
      const keepaTr = rel.trackers.find((tr) => tr && tr.name === "Keepa");
      const camelTr = rel.trackers.find((tr) => tr && tr.name === "CamelCamelCamel");
      if ((keepaTr || camelTr) && rel.price && rel.price.amount) {
        const targetPrice = rel.targetPrice != null ? rel.targetPrice : (QED.computeTargetPrice ? QED.computeTargetPrice(rel.priceHistory, rel.price.amount) : Math.round(rel.price.amount * 0.9 * 100) / 100);
        const formattedTarget = QED.formatMoney ? QED.formatMoney(targetPrice, rel.price.currency) : (rel.price.currency ? `${rel.price.currency} ${targetPrice}` : `$${targetPrice}`);
        const keepaBtnHtml = keepaTr ? `<a href="${esc(safe(keepaTr.url))}" class="btn-sug keepa-follow-btn tracker-link" target="_blank" rel="noopener noreferrer" style="margin-top:0;text-decoration:none;">${t("keepa_btn")} ↗</a>` : "";
        const camelBtnHtml = camelTr ? `<a href="${esc(safe(camelTr.url))}" class="btn-sug camel-follow-btn tracker-link" target="_blank" rel="noopener noreferrer" style="margin-top:0;text-decoration:none;">CamelCamelCamel ↗</a>` : "";
        h += `
          <div class="keepa-alert-box" style="margin-top:8px;padding:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:11.5px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                ${keepaBtnHtml}
                ${camelBtnHtml}
              </div>
              <div style="font-size:11px;color:#1e293b;">
                ${t("keepa_target_label")}: <b>${esc(formattedTarget)}</b>
                <button type="button" class="sug-opt-link keepa-copy-btn" data-target="${esc(String(targetPrice))}" style="margin-left:4px;padding:2px 6px;cursor:pointer;">${t("btn_copy")}</button>
              </div>
            </div>
            <div id="keepa-copy-ok" style="display:none;color:#166534;font-size:10.5px;margin-top:4px;font-weight:600;">${t("sug_copied")}</div>
            <div class="d-src" style="margin-top:4px;font-size:10.5px;color:#64748b;">${t("keepa_account_notice")}</div>
          </div>
        `;
      }

      h += `</div>`;
    }
    return h;
  }

  // ---------------------------------------------------------------- SECCIÓN 1: Confiabilidad
  function renderReliability(res) {
    const rel = res.reliabilityEval || (QED.evaluateReliability ? QED.evaluateReliability(
      {},
      res.group,
      res.alternativas && res.alternativas.cat,
      res.title,
      (res.store && (res.store.pais || (res.store.entry && res.store.entry.pais))) || "México",
      res.store && (res.store.entry || res.store)
    ) : {}) || {};
    const notStated = t("rel_not_stated");
    const srcPage = t("src_page");

    // Una sola línea de precio en Confiabilidad: «¿Descuento real?» (el panel completo está en Mercado).
    let discountLine = "";
    if (rel.price && rel.historyEnabled !== false) {
      const m = rel.priceComparison && rel.priceComparison.oneMonth;
      discountLine = (m && !m.insufficient)
        ? `<div class="d-row"><div class="d-v" style="font-weight:normal;">${t("rel_discount_line", { txt: esc(priceDiffText(m)) })}</div><div class="d-src">${esc(t("price_visits_label", { n: rel.priceComparison.visits }))}</div></div>`
        : `<div class="d-row"><div class="d-v" style="font-weight:normal;color:#535d70;">${t("rel_discount_unknown")}</div></div>`;
    }

    // Vendedor
    const sellerVal = `${esc(rel.sellerName || notStated)}`;
    const sellerRow = dataRow(t("lbl_seller"), sellerVal, srcPage);

    // Calificación de la tienda (solo si existe aggregateRating en la página)
    let ratingRow = "";
    if (rel.storeRating) {
      ratingRow = dataRow(t("rel_seller_label"), esc(rel.storeRating), srcPage);
    }

    // Envío
    const shipText = rel.isFulfilledByPlatform ? t("ship_platform_fulfilled") : (rel.shipper ? rel.shipper : notStated);
    const shipRow = dataRow(t("lbl_shipping"), esc(shipText), srcPage);

    // Aviso de compra internacional
    let intlBox = "";
    if (rel.internationalWarning) {
      intlBox = `<div class="box-warn">${esc(rel.internationalWarning)}</div>`;
    }

    // Garantía legal por país (solo si tiene url_oficial)
    let legalRow = "";
    if (rel.legalWarranty && rel.legalWarranty.url_oficial) {
      const legalVal = `Mínimo legal: ${esc(rel.legalWarranty.minimo)} (${esc(rel.legalWarranty.ley)})`;
      const legalLink = `<a href="${esc(safe(rel.legalWarranty.url_oficial))}" target="_blank" rel="noopener noreferrer">${esc(rel.legalWarranty.ley)}</a>`;
      legalRow = dataRow(`GARANTÍA LEGAL (${esc(rel.legalWarranty.pais)})`, legalVal, `Dato oficial: ${legalLink}`);
    }

    // Garantía y devolución indicada en página
    let returnVal = "";
    if (rel.returnPolicy) {
      returnVal = rel.returnPolicy.startsWith("Devolución según la tienda:")
        ? rel.returnPolicy
        : `Devolución según la tienda: ${rel.returnPolicy}`;
    }
    const policyText = [returnVal, rel.warranty].filter(Boolean).join(" · ");
    const warrantyRow = dataRow(t("lbl_warranty"), policyText ? esc(policyText) : esc(notStated), srcPage);

    // Normas aplicables según país de la tienda
    let normsRow = "";
    if (rel.norms && rel.norms.length) {
      const normsList = rel.norms.map((n) => `<div><b>${esc(n.code)}</b>${n.organismo ? ` (${esc(n.organismo)})` : ""}${n.url ? ` · <a href="${esc(safe(n.url))}" target="_blank" rel="noopener noreferrer">${t("source").toLowerCase()}</a>` : ""}</div>`).join("");
      normsRow = dataRow(t("lbl_norms"), normsList, t("src_unverified"));
    }

    // Certificaciones mencionadas en la página
    let certsRow = "";
    if (rel.certificationsText) {
      certsRow = dataRow("CERTIFICACIONES MENCIONADAS", esc(rel.certificationsText), srcPage);
    }

    // Alertas oficiales
    let alertsRow = "";
    if (res.group && Array.isArray(res.group.alertas) && res.group.alertas.length) {
      const alertsList = res.group.alertas.map((al) => `<div><a href="${esc(safe(al.url))}" target="_blank" rel="noopener noreferrer">${esc(al.titulo)} (${esc(al.autoridad || "")})</a></div>`).join("");
      alertsRow = dataRow(t("lbl_official_alerts"), alertsList, t("src_official", { source: "Entidad oficial" }));
    }

    // Avisos del producto (solo si hay al menos 1 aviso)
    let noticesBlock = "";
    const pNotices = res.productNotices || [];
    if (pNotices.length > 0) {
      const noticesHtml = pNotices.map((n) => {
        const boxClass = n.tipo === "oficial" ? "notice-box notice-official" : "notice-box notice-info";
        return `
          <div class="${boxClass}">
            <div class="notice-text">${esc(n.texto)}</div>
            <div class="notice-src">${n.origen}</div>
          </div>
        `;
      }).join("");

      noticesBlock = `
        <div class="prod-notices">
          <div class="d-k">${t("lbl_product_notices")}</div>
          ${noticesHtml}
          <div class="notices-footer">${t("notices_disclaimer")}</div>
        </div>
      `;
    }

    // Caja de aviso si requiere revisión
    let tipBox = "";
    if (rel.level === "check") {
      tipBox = `<div class="box-warn">${t("rel_tip_check")}</div>`;
    }

    return `
      ${discountLine}
      ${sellerRow}
      ${ratingRow}
      ${shipRow}
      ${intlBox}
      ${noticesBlock}
      ${legalRow}
      ${warrantyRow}
      ${normsRow}
      ${certsRow}
      ${alertsRow}
      ${tipBox}
    `;
  }

  // ---------------------------------------------------------------- SECCIÓN 2: Mercado y alternativas
  function renderMarket(res, opts) {
    const a = res.alternativas;
    const srcOfficial = t("src_official", { source: "Registro público" });

    let localAltHtml = "";
    if (!a || !a.items || !a.items.length) {
      localAltHtml = `
        <div class="alt-empty-box">
          <div>${t("no_local_alternatives")}</div>
          <div class="sug-privacy-notice" style="color:#64748b;font-size:10.5px;margin-top:6px;margin-bottom:6px;">${t("sug_privacy_notice_drive")}</div>
          <button id="card-suggest-btn" class="btn-sug">${t("suggest_btn")}</button>
          <div id="card-suggest-ok" class="sug-ok" style="display:none;margin-top:6px;">${t("suggest_sent_thanks")}</div>
        </div>
      `;
    } else {
      const catLabel = I18N().catLabel ? I18N().catLabel(a.cat, a.label.toLowerCase()) : a.label.toLowerCase();
      const alsoLocal = a.actualEsLocal ? ` <span class="d-src">(${t("alt_also_local")})</span>` : "";
      const countryLbl = I18N().paisLabel ? I18N().paisLabel(a.pais) : a.pais;

      const itemsHtml = a.items.map((it) => {
        const isEn = I18N().getLang && I18N().getLang() !== "es";
        const nota = (isEn && it.group.nota_en) ? it.group.nota_en : it.group.nota;
        const fuente = it.group.url ? `<a href="${esc(safe(it.group.url))}" target="_blank" rel="noopener noreferrer">${t("source").toLowerCase()}</a>` : "";
        const budgetBadge = it.esEconomica ? ` · <span style="color:#1b5e20;font-weight:600;">🏷️ ${t("alt_badge_budget")}${it.group.ahorro_fuente ? ` (<a href="${esc(safe(it.group.ahorro_fuente))}" target="_blank" rel="noopener noreferrer">${t("source").toLowerCase()}</a>)` : ""}</span>` : "";

        const tipoBadge = `<span class="alt-badge local">${t("alt_badge_local_indep")}</span>`;
        const whereToFind = "";

        return `
          <div class="alt-box">
            <div><b>${esc(it.marcas.join(", "))}</b> ${tipoBadge}</div>
            <div style="font-size:11.5px;color:#334155;margin-top:2px;">
              <b>${esc(it.group.empresa)}</b> · ${esc(it.motivo)} · ${esc(it.capital)}${budgetBadge}
              ${nota ? ` · ${esc(nota)}` : ""}
              ${it.rep != null ? ` · ⚖ ${esc(it.rep)}/100` : ""}
              ${fuente ? ` · ${fuente}` : ""}
            </div>
            ${whereToFind}
            <div class="d-src">${formatSourceLabel(it.group.url, it.group.fuente || "Registro oficial")}</div>
          </div>
        `;
      }).join("");

      const cnt = a.items.length;
      const altHeaderKey = cnt === 1 ? "alt_header_one" : "alt_header_other";
      const altHeaderTitle = t(altHeaderKey, { count: cnt, cat: esc(catLabel), pais: esc(countryLbl) });

      localAltHtml = `
        <div class="d-k">${altHeaderTitle}${alsoLocal}</div>
        ${itemsHtml}
      `;
    }

    // Otras marcas de este tipo en la base
    let dominantHtml = "";
    if (a && a.dominant && a.dominant.length) {
      const domLines = a.dominant.map(d => {
        const tipoLbl = I18N().tipoLabel ? I18N().tipoLabel(d.tipo) : d.tipo;
        const countryLbl = I18N().paisLabel ? I18N().paisLabel(d.pais) : d.pais;
        const link = d.url ? `<a href="${esc(safe(d.url))}" target="_blank" rel="noopener noreferrer">${esc(d.fuente || t("source").toLowerCase())}</a>` : esc(d.fuente || "");
        return `<div style="margin-bottom:4px;"><b>${esc(d.marca)}</b> · ${esc(d.empresa)} <span style="color:#5f687a;font-size:11px;">(${esc(tipoLbl)}${countryLbl ? ` · ${esc(countryLbl)}` : ""})</span>${link ? ` · <small>${link}</small>` : ""}</div>`;
      }).join("");
      dominantHtml = `
        <div class="d-row" style="margin-top:10px;">
          <div class="d-k">${t("lbl_category_dominance")}</div>
          <div class="d-v" style="font-weight:normal;line-height:1.45;">${domLines}</div>

        </div>
      `;
    }

    // Otras marcas del mismo dueño
    let otherBrandsHtml = "";
    if (a && a.otherBrands && a.otherBrands.length) {
      const fuente = (res.group && res.group.fuente) || "Registro corporativo";
      const otherSrc = formatSourceLabel(res.group && res.group.url, fuente);
      otherBrandsHtml = `
        <div class="d-row" style="margin-top:10px;">
          <div class="d-k">${t("lbl_other_brands")}</div>
          <div class="d-v">${esc(a.otherBrands.join(", "))}</div>
          <div class="d-src">${otherSrc}</div>
        </div>
      `;
    }

    // Marcas propias de cadenas (bloque aparte; nunca son «alternativa local»)
    let storeBrandsHtml = "";
    if (a && a.storeBrands && a.storeBrands.length) {
      const lines = a.storeBrands.map((sb) => `<div style="margin-bottom:4px;"><b>${esc(sb.marcas.join(", "))}</b> · ${esc(sb.group.empresa)}${sb.group.url ? ` · <small><a href="${esc(safe(sb.group.url))}" target="_blank" rel="noopener noreferrer">${esc(sb.group.fuente || t("source").toLowerCase())}</a></small>` : ""}</div>`).join("");
      storeBrandsHtml = `
        <div class="d-row" style="margin-top:10px;">
          <div class="d-k">${t("lbl_store_brands")}</div>
          <div class="d-v" style="font-weight:normal;line-height:1.45;">${lines}</div>
          <div class="d-src">${t("store_brands_note")}</div>
        </div>`;
    }

    const rel = res.reliabilityEval || {};
    return `
      ${renderPricePanel(rel)}
      ${renderCompareSection(res, opts)}
      ${renderTrackers(rel)}
      ${localAltHtml}
      ${storeBrandsHtml}
      ${dominantHtml}
      ${otherBrandsHtml}
      <div class="tip-box">${t("alt_saver_tip")}</div>
      <div class="method">${t("alt_disclaimer")}</div>
    `;
  }

  // ---------------------------------------------------------------- SECCIÓN 3: ¿A quién le compras?
  function renderOwnership(res, opts) {
    if (!res.found) {
      const brandText = res.brandText || "";
      const isKnown = (opts && opts.index && QED.isKnownBrand && QED.isKnownBrand(opts.index, brandText));
      const userSug = (opts && opts.userSuggestions) || [];
      const alreadySuggested = userSug.some((s) => s && (QED.norm(s.brand) === QED.norm(brandText) || (s.brand && brandText && s.brand.toLowerCase() === brandText.toLowerCase())));

      let sugHtml = "";
      if (!isKnown && brandText) {
        if (alreadySuggested) {
          sugHtml = `<div class="sug-already" style="color:#0284c7;font-size:11px;margin-top:6px;font-weight:500;">${t("suggest_already_submitted")}</div>`;
        } else {
          sugHtml = `
            <div class="sug-container" style="margin-top:8px;">
              <div class="sug-privacy-notice" style="color:#64748b;font-size:10.5px;margin-bottom:6px;">${t("sug_privacy_notice_drive")}</div>
              <button type="button" class="btn-sug" id="card-suggest-btn">${t("suggest_btn")}</button>
              <div id="card-suggest-ok" class="sug-ok" style="display:none;margin-top:6px;">${t("suggest_sent_thanks")}</div>
            </div>
          `;
        }
      }

      return `
        <div class="d-row">
          <div class="d-k">${t("lbl_controller")}</div>
          <div class="d-v">${t("not_found_desc", { brand: esc(res.brandText || "") })}</div>
          <div class="d-src">${t("not_found_pending_hint")}</div>
          ${sugHtml}
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

    const ctrlSrc = formatSourceLabel(g.url, fuenteLbl);
    const ctrlVal = `${esc(ctrl)}${chipsHtml}`;
    const ctrlRow = dataRow(t("lbl_controller"), ctrlVal, ctrlSrc);

    const fondosRow = fondos ? dataRow(t("lbl_funds"), esc(fondos), t("src_official", { source: "SEC / Reporte oficial" })) : "";
    const govRow = gobierno ? dataRow(t("lbl_gov"), esc(gobierno), formatSourceLabel(g.url, fuenteLbl)) : "";
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
    const tipoLbl = I18N().tipoLabel ? I18N().tipoLabel(g.tipo) : g.tipo;
    const chipsHtml = `<div class="chips">${g.pais ? `<span class="chip">🌎 ${esc(countryLbl)}</span>` : ""}${g.tipo ? `<span class="chip">${esc(tipoLbl)}</span>` : ""}${confChip(g.confianza)}</div>`;
    const nota = (isEn && g.nota_en) ? g.nota_en : g.nota;
    const fuenteLbl = (isEn && g.fuente_en) ? g.fuente_en : (g.fuente || "Registro oficial");
    const storeVal = `<b>${esc(store.nombre)}</b>: ${esc(g.empresa)} · ${esc(ctrl)}${chipsHtml}${nota ? `<div style="font-size:11px;color:#5f687a;margin-top:3px;">${esc(nota)}</div>` : ""}`;
    return dataRow(t("lbl_store"), storeVal, formatSourceLabel(g.url, fuenteLbl));
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
      return cnt === 1 ? t("summary_mkt_one") : t("summary_mkt_count", { count: cnt, pais: countryLbl });
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
    if (res.mode && res.mode !== "producto") return renderTravel(res, opts);

    if (res.kind === "loading") {
      return `<div style="padding:16px 14px;"><span class="spin"></span>${t("loading") || "..."}</div>`;
    }

    const rel = res.reliabilityEval || (QED.evaluateReliability ? QED.evaluateReliability({}, res.group, null, res.title) : {}) || {};

    // Evaluación automática de avisos del producto si no vienen evaluados
    if (!res.productNotices && QED.evaluateProductNotices) {
      const altCat = res.alternativas && res.alternativas.cat;
      const altConf = res.alternativas && res.alternativas.confianza;
      if (altCat && altConf === "alta") {
        res.productNotices = QED.evaluateProductNotices({
          title: res.title,
          category: altCat,
          categoryConfidence: altConf,
          storeCountry: (res.store && (res.store.pais || (res.store.entry && res.store.entry.pais))) || "México",
          brand: res.found ? res.brand : res.brandText,
          brandGroup: res.group,
          specsText: res.specsText || "",
          aditivosDb: (QED.DB && QED.DB.aditivos) || [],
          alertasDb: (QED.DB && QED.DB.alertas) || [],
          options: opts || {}
        });
      }
    }

    // Insignia SOLO en Confiabilidad (cambia a "Aviso oficial" si hay avisos oficiales)
    let relBadgeHtml = "";
    if (res.productNotices && res.productNotices.some(n => n.tipo === "oficial")) {
      relBadgeHtml = `<span class="badge-rel official-notice">${t("badge_official_notice")}</span>`;
    } else if (rel.sellerType === "direct") {
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
          ${renderMarket(res, opts)}
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

  // Shadow DOM CERRADO: los scripts de la tienda no pueden leer ni reescribir la tarjeta (host.shadowRoot === null).
  // La referencia vive solo en este mundo aislado. Las pruebas en jsdom piden modo abierto con __GINA_SHADOW_OPEN__.
  let cardHost = null, cardRoot = null;
  function getHost() {
    if (cardHost && cardRoot && cardHost.isConnected) return cardHost;
    // Un elemento con nuestro id que no creamos nosotros (p. ej. puesto por la página) no se reutiliza.
    const impostor = document.getElementById(HOST_ID);
    if (impostor && impostor !== cardHost) impostor.remove();
    cardHost = document.createElement("div");
    cardHost.id = HOST_ID;
    cardRoot = cardHost.attachShadow({ mode: globalThis.__GINA_SHADOW_OPEN__ === true ? "open" : "closed" });
    document.documentElement.appendChild(cardHost);
    return cardHost;
  }
  QED.__cardRoot = () => cardRoot;

  // Persistencia de última sección abierta en storage.local
  function getSavedSection(siteKey, cb) {
    try {
      const api = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
      if (api && api.storage && api.storage.local) {
        api.storage.local.get(["gina_user_profile", "gina_lang", "gina_sec_" + siteKey], (data) => {
          if (!data) return cb(null);
          if (data.gina_lang && QED.I18N && QED.I18N.setLang) QED.I18N.setLang(data.gina_lang);
          if (["smart", "inteligente"].includes(data.gina_user_profile)) return cb("rel");
          if (["saver", "ahorrador"].includes(data.gina_user_profile)) return cb("mkt");
          if (["conscious", "consciente"].includes(data.gina_user_profile)) return cb("own");
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
    getHost();
    const shadow = cardRoot;
    if (opts.minimized) {
      const label = res.mode === "vuelos" ? `✈️ ${(res.airline ? 1 : 0) + (res.airlines || []).length}` : res.mode === "hospedaje" ? "🏨" : `🔎 ${esc(res.found ? res.brand : "Gina")}`;
      shadow.innerHTML = `<style>${CSS}</style><button class="mini" title="Gina">${label} · Gina</button>`;
      shadow.querySelector(".mini").onclick = () => { opts.onToggle && opts.onToggle(false); };
      return;
    }

    // Línea de marca: "<Marca> · <Empresa dueña>" en 16 px negrita, y debajo en 11 px gris de dónde se leyó
    let brandTitle = "";
    let brandOrigin = "";
    if (res.mode && res.mode !== "producto") {
      brandTitle = res.mode === "vuelos" ? t("card_title_flight") : t("card_title_hotel");
      brandOrigin = t("src_page");
    } else if (res.found) {
      brandTitle = `${res.brand} · ${(res.group && res.group.empresa) || ""}`;
      brandOrigin = t("src_read_from", { source: res.source || "página" });
    } else {
      brandTitle = res.brandText || t("not_found_unreadable");
      brandOrigin = t("not_found_page_brand_sub");
    }

    let valueAlertHtml = "";
    if (res.group && res.group.rep && QED.REP && opts.values) {
      const sc = QED.REP.score(res.group.rep, opts.values);
      if (sc && sc.choques && sc.choques.length) {
        const temasTxt = sc.choques.map((ch) => I18N().temaLabel ? I18N().temaLabel(ch) : ch).join(", ");
        valueAlertHtml = `<div class="box-warn brand-warn" style="margin-top:6px;padding:5px 8px;font-size:11px;">⚠ ${esc(t("values_alert_msg", { topics: temasTxt }))}</div>`;
      }
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
          ${valueAlertHtml}
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

    // Handler de sugerencia de marca
    const sugBtn = shadow.querySelector("#card-suggest-btn");
    const sugOk = shadow.querySelector("#card-suggest-ok");
    const sugNotice = shadow.querySelector(".sug-privacy-notice");
    const site = res.store ? `${res.store.nombre}` : (typeof location !== "undefined" ? location.hostname : "");
    const brandName = res.found ? res.brand : (res.brandText || "");
    const pais = (res.store && res.store.pais) || "";
    // El servicio de sugerencias exige un dominio («amazon.com.mx»), no el nombre de la tienda («Amazon México»).
    const siteDomain = (typeof location !== "undefined" && location.hostname) ? location.hostname : ((res.store && res.store.d) || "");

    if (sugBtn) {
      sugBtn.onclick = async () => {
        sugBtn.disabled = true;
        sugBtn.style.opacity = "0.5";
        try {
          const api = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
          let r = null;
          if (api && api.runtime && api.runtime.sendMessage) {
            r = await api.runtime.sendMessage({
              type: "qed:suggest_brand",
              brand: brandName,
              title: res.title || "",
              site: siteDomain,
              pais: pais
            });
          }
          // Mensaje según lo que de verdad pasó (antes decía «Enviada» aunque no saliera nada).
          const st = (r && r.status) || "";
          if (st === "rechazada") {
            sugBtn.disabled = false;
            sugBtn.style.opacity = "1";
            if (sugOk) { sugOk.textContent = t("suggest_rejected"); sugOk.style.display = "block"; sugOk.style.color = "#b91c1c"; }
            return;
          }
          sugBtn.style.display = "none";
          if (sugNotice) sugNotice.style.display = "none";
          if (sugOk) {
            sugOk.textContent = st === "enviada" || st === "github" ? t("suggest_sent_thanks") : t("suggest_queued");
            sugOk.style.display = "block";
          }
        } catch (e) {
          sugBtn.disabled = false;
          sugBtn.style.opacity = "1";
        }
      };
    }
    shadow.querySelectorAll(".keepa-copy-btn").forEach((btn) => {
      btn.onclick = async () => {
        const val = btn.getAttribute("data-target") || "";
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(val);
          }
        } catch (_) {}
        const ok = shadow.querySelector("#keepa-copy-ok");
        if (ok) ok.style.display = "block";
      };
    });

    // Handler de comparación en otras tiendas
    const cmpContainer = shadow.querySelector("#card-compare-container");
    const cmpConsentBtn = shadow.querySelector("#card-compare-consent-btn");

    const doCompare = async () => {
      if (!cmpContainer) return;
      const loadingEl = shadow.querySelector("#compare-loading");
      if (loadingEl) loadingEl.style.display = "flex";
      try {
        const api = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
        if (api && api.runtime && api.runtime.sendMessage) {
          const prodTitle = res.title || (res.reliabilityEval && res.reliabilityEval.rawTitle) || "";
          const prodBrand = res.found ? res.brand : (res.brandText || "");
          const prodGtin = (res.reliabilityEval && res.reliabilityEval.productId && res.reliabilityEval.productId.type === "gtin" ? res.reliabilityEval.productId.id : "") || (res.modelIds && res.modelIds.gtin) || "";
          const prodMpn = (res.modelIds && (res.modelIds.mpn || res.modelIds.model)) || "";
          const prodPrice = (res.reliabilityEval && res.reliabilityEval.price && res.reliabilityEval.price.amount) || null;
          const prodCurrency = (res.reliabilityEval && res.reliabilityEval.price && res.reliabilityEval.price.currency) || "MXN";
          const storeCountry = (res.store && res.store.pais) || "México";
          const curHost = typeof location !== "undefined" ? location.hostname : "";

          const r = await api.runtime.sendMessage({
            type: "qed:compare_prices",
            product: {
              title: prodTitle,
              brand: prodBrand,
              gtin: prodGtin,
              mpn: prodMpn,
              price: prodPrice,
              currency: prodCurrency
            },
            host: curHost,
            country: storeCountry
          });

          if (r && r.ok) {
            res.compareData = r;
            const resBox = shadow.querySelector("#compare-results");
            if (resBox) {
              resBox.innerHTML = buildCompareResultsHtml(r, res.reliabilityEval && res.reliabilityEval.price);
            } else {
              cmpContainer.innerHTML = `
                <div class="d-k" style="margin-bottom:4px;">${t("lbl_in_other_stores")}</div>
                ${buildCompareResultsHtml(r, res.reliabilityEval && res.reliabilityEval.price)}
              `;
            }
          }
        }
      } catch (_) {}
      const lEl = shadow.querySelector("#compare-loading");
      if (lEl) lEl.style.display = "none";
    };

    if (cmpConsentBtn) {
      cmpConsentBtn.onclick = async () => {
        cmpConsentBtn.disabled = true;
        cmpConsentBtn.style.opacity = "0.5";
        const country = (res.store && res.store.pais) || "México";
        // Un script de contenido no tiene chrome.permissions: el permiso se pide en una página de la extensión
        // (options/comparar.html), que guarda compareConsent; content.js redibuja al detectar el cambio.
        try {
          const api = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
          const r = api && api.runtime && api.runtime.sendMessage
            ? await api.runtime.sendMessage({ type: "qed:open_compare_consent", pais: country })
            : null;
          if (r && r.ok) {
            cmpConsentBtn.style.display = "none";
            const note = document.createElement("div");
            note.style.cssText = "font-size:11px;color:#64748b;margin-top:4px;";
            note.textContent = t("compare_consent_opened");
            cmpConsentBtn.insertAdjacentElement("afterend", note);
          } else {
            cmpConsentBtn.disabled = false;
            cmpConsentBtn.style.opacity = "1";
          }
        } catch (_) {
          cmpConsentBtn.disabled = false;
          cmpConsentBtn.style.opacity = "1";
        }
      };
    } else if (opts.compareConsent === true && opts.compareEnabled !== false && !res.compareData) {
      doCompare();
    }

    shadow.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest && e.target.closest(".tracker-link, .btn-follow-price, .btn-follow-price-mini");
      if (btn) {
        const url = btn.getAttribute("href") || (btn.dataset && btn.dataset.trackerUrl);
        const api = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
        if (api && api.runtime && api.runtime.sendMessage && url) {
          // Sin esto se abrían dos pestañas: la del <a target=_blank> y la del fondo.
          e.preventDefault();
          api.runtime.sendMessage({ type: "qed:open_tracker", url }).catch(() => {});
        }
      }
    });
  };

  QED.hideCard = function () {
    if (cardHost) cardHost.remove();
    cardHost = null; cardRoot = null;
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
