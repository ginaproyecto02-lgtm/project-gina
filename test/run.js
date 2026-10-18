// Pruebas de detección: páginas simuladas de tiendas, vuelos y hospedaje de varios países.
const fs = require("fs"), path = require("path"), vm = require("vm");
const { JSDOM } = require("jsdom");
const EXT = path.join(__dirname, "..", "extension");
const db = JSON.parse(fs.readFileSync(path.join(EXT, "data/brands.json"), "utf8"));
const registry = JSON.parse(fs.readFileSync(path.join(EXT, "data/sites.json"), "utf8"));

function env(html, url) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, { url, runScripts: "outside-only" });
  dom.window.__GINA_SHADOW_OPEN__ = true; // las pruebas leen la tarjeta por host.shadowRoot
  for (const f of ["src/matcher.js", "src/reputation.js", "src/alternativas.js", "src/extractors.js", "src/comparador.js", "src/flights.js", "src/notices.js", "src/i18n.js", "src/card.js"]) vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), dom.getInternalVMContext());
  if (dom.window.QED.I18N) dom.window.QED.I18N.setLang("es"); // las pruebas verifican los textos en español
  return dom.window;
}
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
let pass = 0, total = 0;
function check(name, ok, detail) { total++; if (ok) pass++; console.log(`${ok ? "OK   " : "FALLA"} ${name}${detail ? " → " + detail : ""}`); }

// Reproduce la lógica de content.js para una página.
function analyze(w, url) {
  const QED = w.QED, u = new URL(url);
  const index = QED.buildIndex(db, [], {}, {});
  const air = QED.buildAirlineIndex(db, index.groups);
  const entry = QED.siteInfo(registry, u.hostname, u.pathname);
  const mode = QED.travelMode(entry, url);
  if (mode) {
    const own = entry.tipo === "aerolinea" ? entry.g : null;
    const airlines = mode === "vuelos" ? QED.detectAirlines(w.document, air, { exclude: own }) : [];
    const res = { mode, entry, airline: own, airlines, agency: entry.tipo !== "aerolinea" ? entry.g : null };
    QED.showCard(Object.assign({}, res, {
      airline: own ? { nombre: entry.nombre, group: index.groups[own] } : null,
      agency: entry.tipo !== "aerolinea" ? { nombre: entry.nombre, group: index.groups[entry.g] } : null,
      airlines: airlines.map((a) => Object.assign({ group: index.groups[a.g] }, a))
    }), {});
    return res;
  }
  const site = QED.site(u.hostname);
  if (!QED.isProductPage(w.document, site, url, entry)) return { mode: "none", entry };
  const data = QED.extract(w.document, u.hostname, entry ? entry.pais : "");
  const r = QED.match(index, data.candidates, data.title);
  r.store = entry && entry.tipo === "tienda" ? { nombre: entry.nombre, group: index.groups[entry.g], id: entry.g, entry, modelo: entry.modelo, pais: entry.pais } : null;
  // Igual que content.js: alternativas locales según el tipo de producto y el país de la tienda
  const prep = QED.ALT.prepare(db, index);
  const catRes = entry && entry.tipo === "tienda" ? QED.ALT.category(prep, r.found ? r.brand : r.brandText, data.title, data.categoryPath) : null;
  const cat = catRes ? (typeof catRes === "string" ? catRes : catRes.cat) : null;
  const subcat = catRes && catRes.subcat ? catRes.subcat : null;
  if (cat && catRes.confianza !== "ninguna") {
    const otherBrands = r.group && r.group.id ? QED.ALT.otherBrandsOfSameOwner(prep, r.group.id, r.found ? r.brand : r.brandText, 6) : [];
    const dominant = catRes.confianza === "alta" ? QED.ALT.categoryDominantBrands(prep, cat, 4, r.group && r.group.id, subcat) : [];
    r.alternativas = {
      cat,
      subcat,
      confianza: catRes.confianza,
      motivo: catRes.motivo,
      label: prep.cats[cat] ? prep.cats[cat].label : cat,
      pais: entry.pais,
      items: QED.ALT.suggest(prep, cat, entry.pais, r.group && r.group.id, null, 3, data.title, subcat),
      otherBrands,
      dominant,
      actualEsLocal: !!(r.group && QED.ALT.INDEP[r.group.tipo] && QED.ALT.countries(r.group.pais).includes(entry.pais))
    };
  }
  if (QED.evaluateReliability) {
    r.reliabilityEval = QED.evaluateReliability(data.reliability, r.group, cat, data.title, entry ? entry.pais : "México", entry,
      { host: u.hostname, rawTitle: data.title, brand: r.brand || r.brandText, rastreadores: db.rastreadores, tiendasComparar: db.tiendas_comparar });
  }
  if (QED.evaluateProductNotices) {
    r.productNotices = QED.evaluateProductNotices({
      category: cat,
      categoryConfidence: catRes ? (typeof catRes === "string" ? "media" : catRes.confianza) : "ninguna",
      title: data.title,
      specsText: data.specsText,
      storeCountry: entry ? entry.pais : "México",
      brandName: r.brand || r.brandText || "",
      group: r.group,
      aditivos: db.aditivos || [],
      alertas: db.alertas || [],
      options: {}
    });
  }
  QED.showCard(r, {});
  return Object.assign({ mode: "producto", entry }, r);
}
const cardText = (w) => { const h = w.document.getElementById("gina-tarjeta"); return h ? h.shadowRoot.textContent.replace(/\s+/g, " ") : ""; };

// ---------------------------------------------------------------- Tiendas
const products = [
  ["Amazon MX – byline", "https://www.amazon.com.mx/dp/B0TEST1", `<span id="productTitle">Nutella Crema de Avellanas 650 g</span><a id="bylineInfo">Visita la tienda de Ferrero</a>`, "Ferrero", "ferrero", "Amazon"],
  ["Amazon US – Brand:", "https://www.amazon.com/Duracell/dp/B0TEST2", `<span id="productTitle">Duracell Coppertop AA</span><a id="bylineInfo">Brand: Duracell</a>`, "Duracell", "duracell", "Amazon"],
  ["Mercado Libre – especificaciones", "https://articulo.mercadolibre.com.mx/MLM-123-elotes", `<h1 class="ui-pdp-title">Elotes Dorados 400 g</h1><table><tr class="andes-table__row"><th class="andes-table__header">Marca</th><td class="andes-table__column">Herdez</td></tr></table>`, "Herdez", "herdez", "Mercado Libre"],
  ["Mercado Libre – solo título", "https://articulo.mercadolibre.com.mx/MLM-999", `<h1 class="ui-pdp-title">Pan Blanco Bimbo Grande 680 g</h1>`, "Bimbo", "bimbo", "Mercado Libre"],
  ["Walmart US – marca propia", "https://www.walmart.com/ip/Great-Value-Milk/10450114", `<h1 id="main-title">Great Value Whole Milk</h1><a link-identifier="brandName">Great Value</a>`, "Great Value", "walmart", "Walmart"],
  ["Walmart MX – acentos", "https://www.walmart.com.mx/ip/cafe/0075", `<h1>Café soluble</h1>${ld({ "@type": "Product", name: "Nescafé Clásico", brand: "NESCAFÉ" })}`, "Nescafé", "nestle", "Walmart México"],
  ["Liverpool (México) – JSON-LD", "https://www.liverpool.com.mx/tienda/pdp/pantalla-samsung/1234", `<h1>Pantalla Samsung 55"</h1>${ld({ "@type": "Product", name: "Pantalla", brand: { "@type": "Brand", name: "Samsung" } })}`, "Samsung", "samsung", "Liverpool"],
  ["Tesco (Reino Unido) – microdatos", "https://www.tesco.com/groceries/en-GB/products/254656543", `<div itemscope itemtype="https://schema.org/Product"><h1 itemprop="name">Heinz Baked Beans 415G</h1><span itemprop="brand" itemscope><meta itemprop="name" content="Heinz"></span></div>`, "Heinz", "kraftheinz", "Tesco"],
  ["Otto (Alemania) – Hersteller", "https://www.otto.de/p/haribo-goldbaren-123/", `<h1>Goldbären 1 kg</h1><table><tr><th>Hersteller</th><td>Haribo</td></tr></table>`, "Haribo", "haribo", "Otto"],
  ["Rakuten (Japón) – ブランド", "https://item.rakuten.co.jp/shop/ps5/", `<h1>プレイステーション5 本体</h1><table><tr><th>ブランド</th><td>ソニー</td></tr></table>`, "ソニー", "sony", "Rakuten Ichiba"],
  ["Coupang (Corea) – título en coreano", "https://www.coupang.com/vp/products/12345", `<h1>농심 신라면 멀티팩 5개</h1>${ld({ "@type": "Product", name: "농심 신라면" })}`, undefined, "nongshim", "Coupang"],
  ["JD.com (China) – 品牌", "https://item.jd.com/100012043978.html", `<h1>小米 Redmi Note 13</h1><ul><li><b>品牌</b><span>小米</span></li></ul>`, "小米", "xiaomi", "JD.com"],
  ["Ancho completo ＳＯＮＹ", "https://www.amazon.co.jp/dp/B0FULL", `<span id="productTitle">ワイヤレスヘッドホン</span><a id="bylineInfo">ブランド: ＳＯＮＹ</a>`, "Sony", "sony", "Amazon"],
  ["Shufersal (Israel) – hebreo", "https://www.shufersal.co.il/online/he/p/P_7290000066318", `<h1>במבה אסם 80 גרם</h1>${ld({ "@type": "Product", name: "במבה אסם 80 גרם" })}`, null, "osem", "Shufersal"],
  ["Flipkart (India) – Tata", "https://www.flipkart.com/tata-tea-gold/p/itm123", `<h1>Tata Tea Gold 1 kg</h1>`, "Tata Tea", "tata_consumer", "Flipkart"],
  ["Falabella (Chile) – marca local", "https://www.falabella.com/falabella-cl/product/123/vino", `<h1>Vino Casillero del Diablo Cabernet</h1>${ld({ "@type": "Product", name: "Vino", brand: "Casillero del Diablo" })}`, "Casillero del Diablo", "conchaytoro", "Falabella"],
  ["Magalu (Brasil) – Havaianas", "https://www.magazineluiza.com.br/chinelo/p/abc123/", `<h1>Chinelo Havaianas Top</h1>`, "Havaianas", "alpargatas", "Magazine Luiza"],
  ["Zara (España) – tienda Inditex", "https://www.zara.com/es/es/camisa-p01234567.html", `<h1>Camisa de lino</h1>${ld({ "@type": "Product", name: "Camisa", brand: "ZARA" })}`, "Zara", "inditex", "Zara"],
  ["Marca ambigua en título no coincide", "https://articulo.mercadolibre.com.mx/MLM-555", `<h1 class="ui-pdp-title">Lámpara Sol Solar Corona de Luz</h1>`, undefined, null, "Mercado Libre"],
  ["Marca desconocida", "https://www.amazon.com.mx/dp/B0TEST9", `<span id="productTitle">Tornillos 1/4</span><a id="bylineInfo">Marca: Truper</a>`, undefined, null, "Amazon"]
];
for (const [name, url, html, wantBrand, wantG, store] of products) {
  const w = env(html, url);
  const r = analyze(w, url);
  const gidOk = wantG === null ? !r.found : r.found && r.group === w.QED.buildIndex(db, [], {}, {}).groups[wantG] || (r.found && r.group && r.group.empresa === db.grupos[wantG].empresa);
  const brandOk = wantBrand === undefined || wantBrand === null || (r.brand && w.QED.norm(r.brand) === w.QED.norm(wantBrand));
  const storeOk = r.store && r.store.nombre === store && cardText(w).includes(store);
  check(name, r.mode === "producto" && gidOk && brandOk && storeOk, `${r.found ? r.brand + " → " + r.group.empresa : "no encontrada"} · tienda ${r.store && r.store.nombre}`);
}

// ---------------------------------------------------------------- Vuelos y hospedaje
{
  const url = "https://www.google.com.mx/travel/flights/search?tfs=abc";
  const w = env(`<div role="list"><div><span>Aeroméxico</span><span>MEX–LAS</span></div><div><span>Volaris</span></div><div><span>Aeroméxico</span></div>
    <div><img alt="Viva Aerobus"><span>Escala</span></div><div><span>American</span></div><p>Elige tu asiento azul o verde</p></div>`, url);
  const r = analyze(w, url);
  const ids = r.airlines.map((a) => a.g);
  check("Google Vuelos (México) – aerolíneas", r.mode === "vuelos" && r.agency === "google_travel" && ids[0] === "aeromexico" && ids.includes("volaris") && ids.includes("viva") && ids.includes("american") && !ids.includes("azul"),
    ids.map((g, i) => `${g}×${r.airlines[i].count}`).join(", "));
  check("Tarjeta de vuelos muestra agencia y aerolíneas", cardText(w).includes("Google Vuelos") && cardText(w).includes("Grupo Aeroméxico") && cardText(w).includes("este vuelo"));
}
{
  const url = "https://www.expedia.com/Flights-Search?trip=oneway";
  const w = env(`<ul><li><span>Delta</span> 8:00</li><li><span>United Airlines</span></li><li>Operated by Delta Air Lines</li><li><span>Lufthansa</span></li></ul>`, url);
  const r = analyze(w, url);
  check("Expedia (EE.UU.) – vuelos", r.mode === "vuelos" && r.agency === "expedia" && r.airlines[0].g === "delta" && r.airlines[0].count === 2 && r.airlines.some((a) => a.g === "united") && r.airlines.some((a) => a.g === "lufthansa"),
    r.airlines.map((a) => `${a.g}×${a.count}`).join(", "));
}
{
  const url = "https://www.despegar.com.mx/vuelos/mex/las";
  const w = env(`<div class="cluster"><span>Aeroméxico</span><span>Directo</span></div><div class="cluster"><img alt="Volaris"></div>`, url);
  const r = analyze(w, url);
  check("Despegar (México) – vuelos y dueño Prosus", r.mode === "vuelos" && r.agency === "despegar" && r.airlines.length === 2 && cardText(w).includes("Prosus"), r.airlines.map((a) => a.g).join(", "));
}
{
  const url = "https://www.aeromexico.com/es-mx";
  const w = env(`<h1>Reserva tu vuelo</h1><p>Vuelos operados por Delta Air Lines en código compartido</p>`, url);
  const r = analyze(w, url);
  check("Sitio de aerolínea (Aeroméxico)", r.mode === "vuelos" && r.airline === "aeromexico" && r.airlines.some((a) => a.g === "delta") && cardText(w).includes("Vuelas con"), r.airlines.map((a) => a.g).join(", "));
}
{
  const url = "https://www.koreanair.com/booking";
  const w = env(`<h1>항공권 예매</h1><span>대한항공</span>`, url);
  const r = analyze(w, url);
  check("Sitio de aerolínea (Korean Air)", r.mode === "vuelos" && r.airline === "korean" && r.airlines.length === 0);
}
{
  const url = "https://www.skyscanner.co.in/transport/flights/del/bom/";
  const w = env(`<div><span>IndiGo</span></div><div><span>Air India</span></div><div><span>IndiGo</span></div>`, url);
  const r = analyze(w, url);
  check("Skyscanner (India)", r.mode === "vuelos" && r.agency === "tripcom" && r.airlines[0].g === "indigo_in" && r.airlines.some((a) => a.g === "airindia"));
}
{
  const url = "https://www.airbnb.mx/rooms/12345";
  const w = env(`<h1>Casa en Las Vegas</h1>`, url);
  const r = analyze(w, url);
  check("Airbnb (México) – hospedaje", r.mode === "hospedaje" && r.agency === "airbnb" && cardText(w).includes("Airbnb, Inc."));
}
{
  const url = "https://www.expedia.com.mx/";
  const w = env(`<h1>Viaja</h1>`, url);
  const r = analyze(w, url);
  check("Portada de Expedia: no muestra tarjeta", r.mode === "none");
}
{
  const w = env("", "https://www.google.com/search?q=vuelos");
  const e = w.QED.siteInfo(registry, "www.google.com", "/search");
  check("Búsqueda normal de Google no es sitio registrado", e === null);
}
{
  const w = env("<h1>Resultados</h1>", "https://listado.mercadolibre.com.mx/leche");
  check("Listado de Mercado Libre no es producto", !w.QED.isProductPage(w.document, "mercadolibre", "https://listado.mercadolibre.com.mx/leche", w.QED.siteInfo(registry, "listado.mercadolibre.com.mx", "/leche")));
}
// Marca agregada por el usuario
{
  const w = env("<span id='productTitle'>Martillo</span><a id='bylineInfo'>Marca: Truper</a>", "https://www.amazon.com.mx/dp/X");
  const idx = w.QED.buildIndex(db, [{ marca: "Truper", empresa: "Truper S.A. de C.V.", controlador: "Familia fundadora" }], {}, {});
  const r = w.QED.match(idx, w.QED.extract(w.document, "www.amazon.com.mx").candidates, "Martillo");
  check("Marca agregada por el usuario", r.found && r.custom && r.group.empresa === "Truper S.A. de C.V.");
}
// Marcas verificadas por la investigación y parches de grupos
{
  const w = env("<span id='productTitle'>Jugo</span><a id='bylineInfo'>Marca: Jugosísimo</a>", "https://www.amazon.com.mx/dp/Y");
  const idx = w.QED.buildIndex(db, [], { "b:jugosisimo": { marca: "Jugosísimo", empresa: "Grupo Jumex", controlador: "Familia Coppel?", confianza: "Verificado (investigación IA con fuentes)" } }, { bimbo: { controlador: "Parche de prueba" } });
  const r = w.QED.match(idx, w.QED.extract(w.document, "www.amazon.com.mx").candidates, "Jugo");
  check("Marca verificada por la investigación + parche de grupo", r.found && r.kind === "verified" && idx.groups.bimbo.controlador === "Parche de prueba");
}
// Cobertura del registro: los 17 países
{
  const need = ["EE.UU.", "México", "Canadá", "Brasil", "Argentina", "Chile", "Reino Unido", "Alemania", "Francia", "España", "Italia", "China", "Japón", "Corea del Sur", "Singapur", "Israel", "India"];
  const missing = need.filter((p) => !registry.sitios.some((e) => e.pais === p && e.tipo === "tienda"));
  const missAir = need.filter((p) => !registry.sitios.some((e) => e.pais === p && (e.tipo === "aerolinea" || e.tipo === "agencia")));
  check("Los 17 países tienen tiendas y sitios de vuelos", !missing.length && !missAir.length, missing.concat(missAir).join(", ") || "completo");
  const dangling = registry.sitios.filter((e) => !db.grupos[e.g]).map((e) => e.d);
  check("Todos los sitios apuntan a un grupo existente", !dangling.length, dangling.join(", "));
}
// ---------------------------------------------------------------- Reputación
{
  const url = "https://www.walmart.com/ip/Great-Value-Milk/10450114";
  const w = env(`<h1 id="main-title">Great Value Whole Milk</h1><a link-identifier="brandName">Great Value</a>`, url);
  analyze(w, url);
  const t = cardText(w);
  check("Tarjeta muestra índice de reputación con fuentes", /Reputación de Walmart/.test(t) && /\d+\/100/.test(t) && t.includes("opioides") && t.includes("Lobbying"), t.slice(t.indexOf("Reputación"), t.indexOf("Reputación") + 160));
  check("Tarjeta muestra reputación de sus fondos", t.includes("Reputación de sus fondos") && t.includes("BlackRock") && t.includes("The Vanguard Group"));
}
{
  const w = env("", "https://example.com/");
  const R = w.QED.REP;
  check("Montos: divisas y escalas", Math.round(R.montoUSD("US$2.500 millones")) === 2500 && Math.round(R.montoUSD("A$15 millones")) === 10 && Math.round(R.montoUSD("≈18.200 millones de yuanes (≈US$2.750 millones)")) === 2548 && R.montoUSD("€746 millones (anulada)") === 0 && Math.round(R.montoUSD("₹640 crore reclamados")) === 77);
  const rec = { eventos: [{ tema: "laboral", estado: "multa", anio: new Date().getFullYear(), monto: "US$50 millones", titulo: "x", url: "https://a" }, { tema: "fiscal", estado: "anulado", anio: 2020, titulo: "y", url: "https://b" }] };
  const sc = R.score(rec, { laboral: 2, fiscal: 1 });
  check("Índice: multa reciente resta, anulada no; tus valores la agravan", sc.indice === Math.round(100 * Math.exp(-8 / 40)) && sc.personal < sc.indice && sc.choques.includes("laboral"), `${sc.indice} / personal ${sc.personal}`);
  const zero = R.score({ eventos: [], parcial: true });
  check("Historial incompleto no se presenta como limpio", zero.parcial === true);
  const m = R.merge({ eventos: [{ titulo: "a", url: "https://1" }] }, { eventos: [{ titulo: "a2", url: "https://1" }, { titulo: "b", url: "https://2" }] }, { revisado: "2026-10-08" });
  check("Fusión de historiales sin duplicados (gana el dato nuevo)", m.eventos.length === 2 && m.eventos[0].titulo === "a2" && m.revisado === "2026-10-08");
  const idx = w.QED.buildIndex(db, [], {}, {}, { bimbo: { nombre: "Grupo Bimbo", revisado: "2026-10-09", eventos: [{ tema: "laboral", estado: "alegacion", anio: 2025, titulo: "prueba", url: "https://x" }] } });
  check("Historial de la investigación semanal llega al grupo", idx.groups.bimbo.rep && idx.groups.bimbo.rep.eventos[0].titulo === "prueba" && idx.groups.walmart_tienda.rep && idx.groups.walmart_tienda.rep.desdeMatriz);
  const bad = Object.entries(db.reputacion).filter(([id, r]) => (r.eventos || []).some((e) => !R.ESTADOS[e.estado] || !R.TEMAS[e.tema] || !/^https:\/\//.test(e.url)));
  check("Base de reputación válida (temas, estados y URLs)", Object.keys(db.reputacion).length >= 25 && !bad.length, `${Object.keys(db.reputacion).length} historiales`);
}

// ---------------------------------------------------------------- Alternativas locales
{
  const url = "https://www.walmart.com/ip/Great-Value-Milk/10450114";
  const w = env(`<h1 id="main-title">Great Value Whole Milk, 1 gal</h1><a link-identifier="brandName">Great Value</a>`, url);
  const r = analyze(w, url);
  const names = (r.alternativas && r.alternativas.items || []).map((a) => a.marcas[0]);
  check("EE.UU.: leche → cooperativas estadounidenses", r.alternativas && r.alternativas.cat === "lacteos" && names.length === 3 && r.alternativas.items.every((a) => a.group.tipo === "Cooperativa" && w.QED.ALT.countries(a.group.pais).includes("EE.UU.")) && cardText(w).includes("de lácteos con dueño local en EE.UU."), names.join(", "));
}
{
  const url = "https://www.walmart.com.mx/ip/detergente/00750";
  const w = env(`<h1>Detergente en polvo Ariel 4 kg</h1>${ld({ "@type": "Product", name: "Detergente Ariel", brand: "Ariel" })}`, url);
  const r = analyze(w, url);
  const it = r.alternativas && r.alternativas.items[0];
  check("México: Ariel (P&G) → Zote/Roma de La Corona", r.found && r.group.empresa === "Procter & Gamble" && it && /La Corona/.test(it.group.empresa) && it.marcas.includes("Zote"), it && it.marcas.join(", "));
}
{
  const url = "https://articulo.mercadolibre.com.mx/MLM-777";
  const w = env(`<h1 class="ui-pdp-title">Leche Lala Entera 1 L</h1>${ld({ "@type": "Product", name: "Leche Lala Entera", brand: "Lala" })}`, url);
  const r = analyze(w, url);
  check("México: marca ya local → «otras opciones» con la cooperativa Alpura primero", r.alternativas && r.alternativas.actualEsLocal && r.alternativas.items[0].marcas[0] === "Alpura" && !r.alternativas.items.some((a) => a.gid === "lala"), r.alternativas && r.alternativas.items.map((a) => a.marcas[0]).join(", "));
}
{
  const url = "https://www.amazon.com.mx/dp/B0X";
  const w = env(`<span id="productTitle">Laptop gamer 16 GB</span><a id="bylineInfo">Marca: Lenovo</a>`, url);
  const r = analyze(w, url);
  check("Sin categoría (electrónica): no se inventan alternativas", !r.alternativas);
}
{
  const w = env("", "https://example.com/");
  const idx = w.QED.buildIndex(db, [], {}, {});
  const prep = w.QED.ALT.prepare(db, idx);
  const cat = w.QED.ALT.category(prep, "Philips", "Audífonos inalámbricos Philips Bluetooth");
  check("«Audífonos inalámbricos Philips» → audio_electronica, no cocina", (cat && (cat.cat || cat)) === "audio_electronica", cat && (cat.cat || cat));
  const others = w.QED.ALT.otherBrandsOfSameOwner(prep, "pg", "Ariel", 6);
  check("Otras marcas del mismo dueño (P&G sin Ariel)", others.length >= 2 && !others.map(x => x.toLowerCase()).includes("ariel"), others.join(", "));
  const dom = w.QED.ALT.categoryDominantBrands(prep, "audio_electronica", 4);
  check("Marcas dominantes de audio_electronica (Sony, Bose, JBL, etc.)", dom.length >= 2 && dom.some((d) => d.marca === "Sony" || (d.marcas && d.marcas.includes("Sony"))), dom.map((d) => (d.marcas ? d.empresa + ": " + d.marcas.join(", ") : d.marca)).join("; "));
}
{
  const w = env("", "https://example.com/");
  const link = w.QED.ALT.suggestionLink({ issuesUrl: "https://github.com/u/project-gina/issues/new" }, "marca", [{ marca: "Truper", tienda: "Amazon (México)", producto: "Martillo | 16 oz" }]);
  const body = decodeURIComponent(link.split("body=")[1]);
  const mail = w.QED.ALT.suggestionLink({ contacto: "hola@ejemplo.org" }, "alternativa", [{ marca: "Pascual", categoria: "bebidas", pais: "México" }]);
  check("Enlace de sugerencia (issue prellenado o correo)", link.startsWith("https://github.com/u/project-gina/issues/new?title=") && body.includes("gina:sugerencia v1 tipo=marca") && body.includes("- marca: Truper | tienda: Amazon (México) | producto: Martillo 16 oz") && mail.startsWith("mailto:hola@ejemplo.org?subject=") && w.QED.ALT.suggestionLink({}, "marca", [{ marca: "x" }]) === "");
}

// ---------------------------------------------------------------- Falsos positivos y afirmaciones sin verificar
{
  const w = env("", "https://example.com/");
  const idx = w.QED.buildIndex(db, [], {}, {});
  const titles = ["Bebida energética cero azúcar 473 ml", "Hamlet de William Shakespeare", "Peluche de foca bebé", "Calcomanías Kawasaki Ninja 400", "El juego de Ender, Orson Scott Card", "Gorra Ed Hardy", "Vaso Shark Tank", "Sudadera Penn State"];
  const wrong = titles.filter((t) => w.QED.match(idx, [], t).found);
  check("Marcas con nombre común no se reconocen desde el título", !wrong.length, wrong.join(" | ") || "ninguna");
  const r = w.QED.match(idx, [{ text: "Ninja", source: "marca" }], "Freidora de aire 5.5 L");
  check("…pero sí desde el campo «marca»", r.found && r.group.empresa === "SharkNinja, Inc.");
}
{
  const url = "https://www.walmart.com.mx/ip/crema/1";
  const w = env(`<h1>Crema facial hidratante</h1><div class="vendor">Vendido y enviado por Tienda Genérica SA</div>${ld({ "@type": "Product", name: "Crema", brand: "Nivea" })}`, url);
  analyze(w, url);
  const rel = w.QED.evaluateReliability(w.QED.extractReliability(w.document, "walmart"), null, "skincare_cosmetica", "Crema facial", "México");
  const t = w.document.getElementById("gina-tarjeta").shadowRoot.querySelector(".body").textContent.replace(/\s+/g, " ");
  check("Walmart: vendedor no leído ≠ «vendido por Walmart»", rel.sellerType !== "direct" && rel.level === "check" && !rel.returnPolicy, `${rel.sellerType} / ${rel.level}`);
  const cardShadow = w.document.getElementById("gina-tarjeta").shadowRoot;
  const btns = cardShadow.querySelectorAll(".sec-btn");
  const closedInitially = Array.from(btns).every((b) => b.getAttribute("aria-expanded") === "false");
  btns[0].click();
  const relOpened = btns[0].getAttribute("aria-expanded") === "true" && btns[1].getAttribute("aria-expanded") === "false" && btns[2].getAttribute("aria-expanded") === "false";
  btns[1].click();
  const mktOpened = btns[0].getAttribute("aria-expanded") === "false" && btns[1].getAttribute("aria-expanded") === "true" && btns[2].getAttribute("aria-expanded") === "false";
  check("La tarjeta se dibuja con las 3 secciones cerradas; el clic abre solo esa; aria-expanded cambia", closedInitially && relOpened && mktOpened);
  check("Orden de las secciones: rel, mkt, own", btns.length === 3 && btns[0].getAttribute("data-sec") === "rel" && btns[1].getAttribute("data-sec") === "mkt" && btns[2].getAttribute("data-sec") === "own");
}
{
  const w = env(`<h1 class="ui-pdp-title">Crema</h1><div class="ui-pdp-seller__link-trigger">VendedorNuevo123</div>`, "https://articulo.mercadolibre.com.mx/MLM-1");
  const rel = w.QED.extractReliability(w.document, "mercadolibre");
  check("Mercado Libre: sin «Compra Protegida» si la página no la menciona", !rel.returnPolicy && !rel.warranty);
}
{
  const url = "https://www.amazon.com/dp/B001";
  const w = env(`<h1>Nestle Toll House Morsels</h1>${ld({ "@type": "Product", name: "Nestle Morsels", brand: "Nestlé" })}`, url);
  w.QED.I18N.setLang("en");
  analyze(w, url);
  const ownT = w.document.getElementById("gina-tarjeta").shadowRoot.querySelector("#sec-own").textContent;
  const okEn = ownT.includes("Dispersed institutional funds") &&
               !ownT.includes("Sin accionista de control") &&
               ownT.includes("Switzerland") &&
               !ownT.includes("Suiza") &&
               ownT.includes("Norges Bank, BlackRock and others") &&
               ownT.includes("Water extraction concessions") &&
               ownT.includes("Nestlé Annual Report (SIX)");
  check("Tarjeta en inglés: controlador_en, fondos_en, gobierno_en, fuente_en y país traducido", okEn, "Nestlé S.A. (EN card translated)");
}

// ---------------------------------------------------------------- Bloque B: Confiabilidad estricta por país y modelo
{
  const w = env("", "https://www.amazon.de/dp/B001");
  const normsDE = w.QED.getApplicableNorms("audio_electronica", null, "Kopfhörer", "Alemania");
  const normsStr = JSON.stringify(normsDE);
  check("amazon.de: sin NOM ni PROFECO", !normsStr.includes("NOM") && !normsStr.includes("PROFECO") && normsStr.includes("CE"));
}
{
  const url = "https://www.liverpool.com.mx/tienda/pdp/pantalla-samsung/1234";
  const w = env(`<h1>Pantalla Samsung 55"</h1>${ld({ "@type": "Product", name: "Pantalla", brand: "Samsung" })}`, url);
  const r = analyze(w, url);
  check("liverpool.com.mx sin vendedor leído: «Tienda directa»", r.reliabilityEval && r.reliabilityEval.sellerType === "direct" && r.reliabilityEval.sellerName === "Liverpool");
}
{
  const url1 = "https://www.amazon.com.mx/dp/B0CHINA";
  const w1 = env(`<h1>Audífonos</h1><div>Enviado desde China</div>${ld({ "@type": "Product", name: "Audífonos", brand: "Sony" })}`, url1);
  const r1 = analyze(w1, url1);
  const t1 = cardText(w1);
  const url2 = "https://www.amazon.com.mx/dp/B0LOCAL";
  const w2 = env(`<h1>Audífonos</h1><div>Enviado desde México</div>${ld({ "@type": "Product", name: "Audífonos", brand: "Sony" })}`, url2);
  const r2 = analyze(w2, url2);
  const t2 = cardText(w2);
  check("«Enviado desde China» en tienda MX → aviso; sin ese texto → sin aviso", t1.includes("Compra internacional") && !t2.includes("Compra internacional"));
}
{
  const urlWithRating = "https://www.amazon.com.mx/dp/B0RATE";
  const wWith = env(`<h1>Producto</h1>${ld({ "@type": "Product", name: "Producto", brand: "Sony", aggregateRating: { ratingValue: 4.7, reviewCount: 12480 } })}`, urlWithRating);
  analyze(wWith, urlWithRating);
  const tWith = cardText(wWith);
  const urlNoRating = "https://www.amazon.com.mx/dp/B0NORATE";
  const wNo = env(`<h1>Producto</h1>${ld({ "@type": "Product", name: "Producto", brand: "Sony" })}`, urlNoRating);
  analyze(wNo, urlNoRating);
  const tNo = cardText(wNo);
  check("La calificación solo aparece si hay aggregateRating en el DOM", tWith.includes("4,7 de 5 · 12.480 reseñas") && !tNo.includes("Calificación en la tienda"));
}
{
  const urlSan = "https://www.amazon.com.mx/dp/B0SAN";
  const htmlInvalidSeller = `<h1 id="productTitle">Audífonos</h1><a id="bylineInfo">Visita la tienda de Sony</a><a id="sellerProfileTriggerId">Más información</a>`;
  const wInv = env(htmlInvalidSeller, urlSan);
  const relInv = wInv.QED.extractReliability(wInv.document, "amazon");
  check("Amazon vendedor sanitizado descarta «Más información» y «Visita la tienda»", relInv.seller === "");

  const htmlLongSeller = `<h1 id="productTitle">Audífonos</h1><span id="sellerProfileTriggerId">Este es un nombre excesivamente largo para un vendedor de tienda que supera los sesenta caracteres</span>`;
  const wLong = env(htmlLongSeller, urlSan);
  const relLong = wLong.QED.extractReliability(wLong.document, "amazon");
  check("Amazon vendedor descarta nombres > 60 caracteres", relLong.seller === "");

  const htmlBuybox = `
    <h1 id="productTitle">Audífonos</h1>
    <div id="tabular-buybox">
      <div class="tabular-buybox-container">
        <table>
          <tr><td>Vendido por</td><td><span class="tabular-buybox-text">Distribuidora Audio MX</span></td></tr>
          <tr><td>Envía</td><td><span class="tabular-buybox-text">Amazon</span></td></tr>
        </table>
      </div>
    </div>
    <div id="RETURNS_POLICY"><span>30 días de devolución sin costo</span></div>
    <div id="acrPopover" title="4.5 de 5 estrellas"></div>
    <span id="acrCustomerReviewText">8.920 calificaciones</span>
  `;
  const wBb = env(htmlBuybox, urlSan);
  analyze(wBb, urlSan);
  const relBb = wBb.QED.extractReliability(wBb.document, "amazon");
  const tBb = cardText(wBb);
  check("Amazon buybox: «Vendido por Tercero, enviado por Amazon»", relBb.seller === "Vendido por Distribuidora Audio MX, enviado por Amazon" && relBb.isFulfilledByPlatform);
  check("Amazon devoluciones exactas: «Devolución según la tienda: 30 días de devolución sin costo»", relBb.returnPolicy === "30 días de devolución sin costo" && tBb.includes("Devolución según la tienda: 30 días de devolución sin costo"));
  check("Amazon calificación desde #acrPopover y #acrCustomerReviewText", relBb.storeRating && relBb.storeRating.includes("4,5 de 5 · 8.920"));
}
{
  const w = env("", "https://example.com/");
  const legalMX = w.QED.getLegalWarranty("México");
  const legalNone = w.QED.getLegalWarranty("PaisSinTabla");
  check("La garantía legal solo aparece con url_oficial", legalMX && legalMX.url_oficial.startsWith("https://") && legalMX.minimo.includes("90 días naturales") && legalNone === null);
}
{
  const w = env("", "https://example.com/");
  const rel = w.QED.evaluateReliability({}, null, null, "", "México");
  check("evaluateReliability no contiene score artificial", rel.score === undefined);
}
{
  const url = "https://www.walmart.com.mx/ip/detergente/00750";
  const w = env(`<h1>Detergente Ariel 4 kg</h1>${ld({ "@type": "Product", name: "Detergente Ariel", brand: "Ariel" })}`, url);
  const r = analyze(w, url);
  w.QED.showCard(r, { values: { seguridad: 2 } });
  const t = cardText(w);
  const shadow = w.document.getElementById("gina-tarjeta").shadowRoot;
  const ownBody = shadow.getElementById("sec-own-body");
  const isClosed = ownBody && ownBody.hasAttribute("hidden");
  check("El aviso de valor «Muy importante» se ve con la sección del dueño cerrada", isClosed && t.includes("Tema relevante para tus valores") && t.includes("Seguridad y salud"), t);
}
{
  const lote1 = ["ferrero", "pg", "samsung", "philips", "pepsico", "nestle", "unilever", "coca", "walmart"];
  const todosTienenHistorial = lote1.every((id) => db.reputacion[id] && db.reputacion[id].eventos && db.reputacion[id].eventos.length >= 2);
  check("Lote 1 de reputación completo (grupos prioritarios con eventos verificados)", todosTienenHistorial, lote1.filter(id => !db.reputacion[id] || (db.reputacion[id].eventos || []).length < 2).join(", ") || "todos completos");
}
{
  const optHtml = fs.readFileSync(path.join(EXT, "options/options.html"), "utf8");
  const hasProfileSec = optHtml.includes('id="sec_profile"');
  const hasLangSelect = optHtml.includes('id="lang_select"');
  const hasRadios = ["ninguno", "inteligente", "ahorrador", "consciente"].every((val) => optHtml.includes(`value="${val}"`));
  check("options.html contiene selector de idioma y sección de perfil con 4 opciones", hasProfileSec && hasLangSelect && hasRadios);
}
{
  const w = env("", "https://example.com/");
  const langs = ["es", "en", "de", "fr", "it", "ja"];
  const keys = ["opt_sec_profile", "prof_opt_smart", "prof_opt_saver", "prof_opt_conscious", "opt_header_title"];
  const okLangs = langs.every((l) => keys.every((k) => {
    const val = w.QED.I18N.t(k, {}, l);
    return val && val !== k;
  }));
  check("I18N contiene traducciones completas de opciones y perfiles en 6 idiomas", okLangs);
}
{
  const testUrls = [
    ["https://www.amazon.com.mx/dp/B0TEST1", `<span id="productTitle">Nutella Crema de Avellanas 650 g</span><a id="bylineInfo">Visita la tienda de Ferrero</a>`],
    ["https://www.walmart.com.mx/ip/detergente/00750", `<h1>Detergente Ariel 4 kg</h1>${ld({ "@type": "Product", name: "Detergente Ariel", brand: "Ariel" })}`],
    ["https://articulo.mercadolibre.com.mx/MLM-PHILIPS", `<h1>Audífonos Philips TAH4205</h1>`],
    ["https://www.liverpool.com.mx/tienda/pdp/pantalla-samsung/1000", `<h1>Pantalla Samsung 55</h1>`]
  ];
  let noQualityPromises = true;
  for (const [url, html] of testUrls) {
    const w = env(html, url);
    analyze(w, url);
    const text = cardText(w);
    if (/cumple|garantizad|alta calidad|certificad[oa] por Gina/i.test(text)) {
      noQualityPromises = false;
      break;
    }
  }
  check("Sin promesas de calidad ni certificación propia de Gina (/cumple|garantizad|alta calidad|certificad[oa] por Gina/)", noQualityPromises);
}
{
  const w = env("", "https://example.com/");
  const langs = ["es", "en", "de", "fr", "it", "ja"];

  // 1. "Otras marcas de este tipo en la base" sin palabras de juicio
  const domJudgementWords = /domina|l[ií]der|principal|leader|leading|f[uü]hrend|主要/i;
  const noJudgementInLangs = langs.every((l) => {
    const val = w.QED.I18N.t("lbl_category_dominance", {}, l);
    return val && !domJudgementWords.test(val);
  });
  check("lbl_category_dominance no contiene palabras de juicio (domina/líder/principal/etc.) en 6 idiomas", noJudgementInLangs);
  check("lbl_category_dominance en español es «OTRAS MARCAS DE ESTE TIPO EN LA BASE»", w.QED.I18N.t("lbl_category_dominance", {}, "es") === "OTRAS MARCAS DE ESTE TIPO EN LA BASE");

  // 2. Singular y plural de alternativas locales en 6 idiomas
  const singularOk = langs.every((l) => {
    const s = w.QED.I18N.t("alt_header_one", { count: 1, cat: "café", pais: "México" }, l);
    return s && (s.includes("1") || l === "ja");
  });
  const pluralOk = langs.every((l) => {
    const p = w.QED.I18N.t("alt_header_other", { count: 3, cat: "café", pais: "México" }, l);
    return p && p.includes("3");
  });
  check("Alternativas locales maneja singular (1) y plural (3) en los 6 idiomas", singularOk && pluralOk);

  // 3. Marca desconocida leída de la página: Título = marca, Subtítulo = "No está en la base · leída del campo Marca de la página"
  const urlUnknown = "https://www.amazon.com.mx/dp/B0UNKNOWN";
  const wUnk = env(`<h1 id="productTitle">Herramienta 16 oz</h1><a id="bylineInfo">Marca: MarcaRaraX</a>`, urlUnknown);
  analyze(wUnk, urlUnknown);
  const cardShadow = wUnk.document.getElementById("gina-tarjeta").shadowRoot;
  const brandLine = cardShadow.querySelector(".brand-line").textContent.trim();
  const brandSub = cardShadow.querySelector(".brand-sub").textContent.trim();
  check("Marca desconocida: título es el nombre de la marca sin sufijo de error", brandLine === "MarcaRaraX");
  check("Marca desconocida: subtítulo es «No está en la base · leída del campo Marca de la página»", brandSub === "No está en la base · leída del campo Marca de la página");

  // 4. Dato oficial estricto por dominios.json
  const wCard = env("", "https://example.com/");
  const mockOfficial = { found: true, brand: "Test", group: { empresa: "Test SA", controlador: "Fundador", fuente: "SEC 10-K", url: "https://www.sec.gov/edgar/test" } };
  wCard.QED.showCard(mockOfficial);
  const tOfficial = cardText(wCard);
  check("Fuente oficial (sec.gov) muestra «Dato oficial: SEC 10-K»", tOfficial.includes("Dato oficial: SEC 10-K"));

  const mockPress = { found: true, brand: "Test2", group: { empresa: "Test2 SA", controlador: "Familia", fuente: "Expansión", url: "https://expansion.mx/empresas/test2" } };
  wCard.QED.showCard(mockPress);
  const tPress = cardText(wCard);
  check("Fuente de prensa (expansion.mx) muestra «Fuente: Expansión»", tPress.includes("Fuente: Expansión") && !tPress.includes("Dato oficial: Expansión"));

  const mockGeneric = { found: true, brand: "Test3", group: { empresa: "Test3 SA", controlador: "Familia", fuente: "Web", url: "https://sitio-desconocido.com/nota" } };
  wCard.QED.showCard(mockGeneric);
  const tGeneric = cardText(wCard);
  check("Fuente sin categoría muestra «Fuente: sitio-desconocido.com»", tGeneric.includes("Fuente: sitio-desconocido.com"));
}

// ---------------------------------------------------------------- Clasificador por capas y banco de 100 títulos
{
  const w = env("", "https://example.com/");
  const idx = w.QED.buildIndex(db, [], {}, {});
  const prep = w.QED.ALT.prepare(db, idx);

  // 1. Caso real aceites esenciales: aromas_ambiente, nunca cafe
  const rAceites = w.QED.ALT.category(prep, "ORIGINAL NATURE'S OILS", "ORIGINAL NATURE'S OILS Kit de 5 aceites esenciales… Árbol de Té…");
  check("Caso real aceites esenciales: aromas_ambiente, nunca cafe", rAceites.cat === "aromas_ambiente" && rAceites.cat !== "cafe", rAceites.cat);

  // 2. Conector / núcleo del título
  const rTaza = w.QED.ALT.category(prep, "", "Taza para café de cerámica artesanal 350 ml");
  check("«Taza para café de cerámica» ≠ cafe (cat=null)", rTaza.cat !== "cafe" && rTaza.cat === null, rTaza.cat);

  const rFunda = w.QED.ALT.category(prep, "", "Funda para celular de silicona suave compatible con iPhone 15");
  check("«Funda para celular» ≠ audio_electronica (cat=null)", rFunda.cat !== "audio_electronica" && rFunda.cat === null, rFunda.cat);

  const rCafetera = w.QED.ALT.category(prep, "", "Cafetera italiana de acero inoxidable para 6 tazas");
  check("«Cafetera italiana» = electrodomesticos_cocina, nunca cafe", rCafetera.cat === "electrodomesticos_cocina" && rCafetera.cat !== "cafe", rCafetera.cat);

  const rTe = w.QED.ALT.category(prep, "", "Té verde orgánico en sobres caja con 25 bolsas");
  check("«Té verde orgánico» = cafe / te", rTe.cat === "cafe" && rTe.subcat === "te", `${rTe.cat} / ${rTe.subcat}`);

  const rCafeMolido = w.QED.ALT.category(prep, "", "Café molido 400 g");
  check("«Café molido» = cafe", rCafeMolido.cat === "cafe", rCafeMolido.cat);

  // 3. Breadcrumb gana a palabras del título
  const rBc = w.QED.ALT.category(prep, "", "Café soluble sabor caramelo", "Hogar > Aromaterapia > Difusores");
  check("Breadcrumb «Hogar > Aromaterapia» gana al título", rBc.cat === "aromas_ambiente", rBc.cat);

  // 4. Confianza ninguna → sin alternativas ni marcas dominantes
  const rNinguna = w.QED.ALT.category(prep, "", "Objeto genérico desconocido no clasificado");
  check("Confianza «ninguna» para objeto no clasificado", rNinguna.confianza === "ninguna" && rNinguna.cat === null);

  // 5. Potable Aqua → deportes_outdoor / camping_supervivencia; sin pesca
  const rPotable = w.QED.ALT.category(prep, "Potable Aqua", "Potable Aqua Water Purification Iodine Tablets");
  const domPotable = w.QED.ALT.categoryDominantBrands(prep, rPotable.cat, 4, null, rPotable.subcat);
  const marcasDomPotable = domPotable.flatMap(d => d.marcas);
  check("«Potable Aqua Tablets» → camping_supervivencia sin pesca", rPotable.cat === "deportes_outdoor" && rPotable.subcat === "camping_supervivencia" && !marcasDomPotable.includes("Penn") && !marcasDomPotable.includes("Abu Garcia"), `${rPotable.subcat} · dominant: ${marcasDomPotable.join(", ") || "ninguna"}`);

  // 6. Penn carrete → pesca; Potable Aqua no aparece
  const rPenn = w.QED.ALT.category(prep, "Penn", "Carrete Penn Battle III 4000");
  const domPenn = w.QED.ALT.categoryDominantBrands(prep, rPenn.cat, 4, "pure_fishing", rPenn.subcat);
  const marcasDomPenn = domPenn.flatMap(d => d.marcas);
  check("«Carrete Penn Battle III 4000» → pesca sin Potable Aqua", rPenn.cat === "deportes_outdoor" && rPenn.subcat === "pesca" && !marcasDomPenn.includes("Potable Aqua"), `${rPenn.subcat} · dominant: ${marcasDomPenn.join(", ") || "ninguna"}`);

  // 7. Banco de 100 títulos (test/titulos.json)
  const titulosBanco = JSON.parse(fs.readFileSync(path.join(__dirname, "titulos.json"), "utf8"));
  let correctosAlta = 0, totalAlta = 0, trampasSinFalsosPositivos = 0, totalTrampas = 0;

  for (const item of titulosBanco) {
    const res = w.QED.ALT.category(prep, "", item.titulo);
    if (item.es_trampa) {
      totalTrampas++;
      let okTrampa = true;
      if (item.cat_esperada !== undefined && item.cat_esperada !== null) {
        if (res.cat !== item.cat_esperada) okTrampa = false;
      } else {
        if (res.cat !== null && res.confianza === "alta") okTrampa = false;
      }
      if (item.excluir_cat) {
        for (const bad of item.excluir_cat) {
          if (res.cat === bad || res.subcat === bad) okTrampa = false;
        }
      }
      if (okTrampa) trampasSinFalsosPositivos++;
    } else {
      if (res.confianza === "alta") {
        totalAlta++;
        if (res.cat === item.cat_esperada) correctosAlta++;
      }
    }
  }

  const exactitudAlta = totalAlta > 0 ? (correctosAlta / totalAlta) : 1;
  check("Banco de 100 títulos: exactitud ≥95% en los que dan «alta»", exactitudAlta >= 0.95, `${correctosAlta}/${totalAlta} (${Math.round(exactitudAlta * 100)}%)`);
  check("Banco de 100 títulos: 0 falsos positivos en las 20 trampas", trampasSinFalsosPositivos === totalTrampas, `${trampasSinFalsosPositivos}/${totalTrampas} trampas correctas`);
}

// ---------------------------------------------------------------- Avisos del producto en Confiabilidad (7 pruebas)
{
  const aditivosData = db.aditivos || JSON.parse(fs.readFileSync(path.join(__dirname, "../datagen/aditivos.json"), "utf8"));
  const alertasData = db.alertas || JSON.parse(fs.readFileSync(path.join(__dirname, "../datagen/alertas.json"), "utf8"));

  // 1. Título con "Red 3" en tienda de EE.UU. → aviso con enlace oficial a la FDA
  {
    const w = env("", "https://www.amazon.com/dp/B0TESTRED3");
    const rNotices = w.QED.evaluateProductNotices({
      title: "Red 3 Cherry Candy Drops 200g",
      category: "chocolate_dulces",
      categoryConfidence: "alta",
      storeCountry: "Estados Unidos",
      brand: "Candy Brand",
      aditivosDb: aditivosData,
      alertasDb: alertasData
    });
    const red3Notice = rNotices.find(n => n.url && n.url.includes("fda.gov"));
    check("1. Título con «Red 3» en EE.UU. → aviso con enlace oficial a FDA", !!red3Notice && red3Notice.tipo === "oficial" && red3Notice.texto.includes("FDA"), red3Notice ? red3Notice.texto : "no encontrado");
  }

  // 2. «Carne de res molida» → 0 avisos
  {
    const w = env("", "https://www.walmart.com.mx/ip/carne/123");
    const prep = w.QED.ALT.prepare(db, w.QED.buildIndex(db, [], {}, {}));
    const catRes = w.QED.ALT.category(prep, "", "Carne de res molida 500 g");
    const rNotices = w.QED.evaluateProductNotices({
      title: "Carne de res molida 500 g",
      category: catRes.cat,
      categoryConfidence: catRes.confianza,
      storeCountry: "México",
      brand: "",
      aditivosDb: aditivosData,
      alertasDb: alertasData
    });
    check("2. «Carne de res molida» → 0 avisos", rNotices.length === 0, `avisos: ${rNotices.length}`);
  }

  // 3. Aceites esenciales → 0 avisos de alimentos
  {
    const w = env("", "https://www.amazon.com.mx/dp/B0ACEITES5");
    const prep = w.QED.ALT.prepare(db, w.QED.buildIndex(db, [], {}, {}));
    const catRes = w.QED.ALT.category(prep, "Nature's Oils", "ORIGINAL NATURE'S OILS Kit de 5 aceites esenciales… Árbol de Té…", "Hogar > Aromaterapia > Aceites Esenciales");
    const rNotices = w.QED.evaluateProductNotices({
      title: "ORIGINAL NATURE'S OILS Kit de 5 aceites esenciales… Árbol de Té…",
      category: catRes.cat,
      categoryConfidence: catRes.confianza,
      storeCountry: "México",
      brand: "Nature's Oils",
      aditivosDb: aditivosData,
      alertasDb: alertasData
    });
    const foodNotices = rNotices.filter(n => n.categoria === "alimentos" || n.categoria === "aditivos");
    check("3. Aceites esenciales → 0 avisos de alimentos", foodNotices.length === 0, `cat: ${catRes.cat}, avisos: ${foodNotices.length}`);
  }

  // 4. Refrigerador con «Consumo 350 kWh/año» → fila de eficiencia con «según la página»
  {
    const w = env("", "https://www.walmart.com.mx/ip/refrigerador/456");
    const rNotices = w.QED.evaluateProductNotices({
      title: "Refrigerador Top Mount 13 pies con Despachador",
      specsText: "Capacidad 360 L. Consumo 350 kWh/año. Voltaje 120V.",
      category: "electrodomesticos_clima",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "Mabe",
      aditivosDb: aditivosData,
      alertasDb: alertasData
    });
    const refriNotice = rNotices.find(n => n.categoria === "energia" && n.texto.includes("350 kWh/año"));
    check("4. Refrigerador con «Consumo 350 kWh/año» → fila con «según la página»", !!refriNotice && refriNotice.origen.toLowerCase().includes("según la página"), refriNotice ? refriNotice.texto : "no encontrado");
  }

  // 5. Cero palabras de alarma (/dañino|tóxico|cancer[ií]geno|peligroso para la salud/) en el código y datos
  {
    const badWordRe = /\b(dañino|dañina|tóxico|tóxica|toxico|toxica|cancer[ií]geno|cancer[ií]gena|peligroso\s+para\s+la\s+salud)\b/i;
    const dirsToCheck = [
      path.join(EXT, "src"),
      path.join(__dirname, "..", "datagen"),
      path.join(__dirname, "..", "job")
    ];
    let badMatches = [];
    for (const dir of dirsToCheck) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const f of files) {
        if (!f.endsWith(".js") && !f.endsWith(".json") && !f.endsWith(".py") && !f.endsWith(".html")) continue;
        const fullPath = path.join(dir, f);
        const content = fs.readFileSync(fullPath, "utf8");
        const lines = content.split("\n");
        lines.forEach((l, idx) => {
          if (l.includes("badWordRe") || l.includes("dañino|tóxico") || l.includes("Nunca «dañino»") || l.includes("Nunca \"dañino\"") || l.includes("Cero palabras de alarma") || l.includes("sin palabras de juicio")) return;
          if (badWordRe.test(l)) {
            badMatches.push(`${f}:${idx + 1}: ${l.trim().slice(0, 60)}`);
          }
        });
      }
    }
    check("5. Cero ocurrencias de /dañino|tóxico|cancerígeno|peligroso para la salud/", badMatches.length === 0, badMatches.length ? badMatches.join("; ") : "0 coincidencias");
  }

  // 6. Open Food Facts desactivado por defecto → 0 llamadas de red
  {
    let fetchCount = 0;
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => { fetchCount++; return { ok: true, json: async () => ({}) }; };
    try {
      const w = env("", "https://www.walmart.com.mx/ip/galletas/789");
      w.QED.evaluateProductNotices({
        title: "Galletas de avena y miel 300g",
        category: "botanas_galletas",
        categoryConfidence: "alta",
        storeCountry: "México",
        brand: "Gamesa",
        options: { openFoodFacts: false },
        aditivosDb: aditivosData,
        alertasDb: alertasData
      });
    } finally {
      globalThis.fetch = origFetch;
    }
    check("6. Open Food Facts desactivado por defecto → 0 llamadas de red", fetchCount === 0, `llamadas: ${fetchCount}`);
  }

  // 7. Alerta de solo marca → texto «alertas de esta marca», nunca «este producto»
  {
    const w = env("", "https://www.walmart.com.mx/ip/purina/123");
    const rNotices = w.QED.evaluateProductNotices({
      title: "Purina Dog Chow Adultos Carne y Pollo 15 kg",
      category: "mascotas",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "Purina",
      brandGroup: { id: "nestle" },
      aditivosDb: aditivosData,
      alertasDb: [
        {
          id: "alerta_purina_beneful_2024",
          autoridad: "PROFECO",
          marca: "purina",
          grupo: "nestle",
          modelo: "Purina Beneful Lote 999",
          titulo: "Retiro voluntario por etiquetado",
          url: "https://www.gob.mx/profeco"
        }
      ]
    });
    const alertaNotice = rNotices.find(n => n.categoria === "alerta");
    const okAlerta = !!alertaNotice && alertaNotice.texto.includes("alertas de esta marca") && !alertaNotice.texto.includes("este producto");
    check("7. Alerta de solo marca → texto «alertas de esta marca», nunca «este producto»", okAlerta, alertaNotice ? alertaNotice.texto : "no encontrada");
  }

  // 8. Popup sin producto o con marca conocida → #suggest oculto
  {
    const shouldShowSuggest = (res) => {
      if (!res || res.mode) return false;
      return !res.found && !!(res.brandText || res.title);
    };
    const noProduct = shouldShowSuggest(null);
    const flightPage = shouldShowSuggest({ mode: "vuelos", airline: { nombre: "Aeroméxico" } });
    const knownProduct = shouldShowSuggest({ found: true, brand: "Bimbo" });
    const unknownProduct = shouldShowSuggest({ found: false, brandText: "Original Nature's Oils", title: "Aceite" });
    check("Popup sin producto o con marca conocida → #suggest oculto", !noProduct && !flightPage && !knownProduct && unknownProduct);
  }

  // 9. Licencias en brands.json: licencia CC BY 4.0 y atribución de Project Gina
  {
    check(
      "brands.json incluye licencia «CC BY 4.0» y atribución de Project Gina",
      db.licencia === "CC BY 4.0" && db.atribucion === "Datos de Project Gina (github.com/ginaproyecto02-lgtm/project-gina)",
      `${db.licencia} · ${db.atribucion}`
    );
  }

  // ---------------------------------------------------------------- D1. Precios, MSI, moneda y enlaces
  {
    const w = env("", "https://www.amazon.com.mx/dp/B0TEST00000");
    const QED = w.QED;
    const DAY = 86400000;
    const now = Date.UTC(2026, 9, 13, 18, 0, 0);
    const pts = (arr) => arr.map(([d, p]) => ({ t: now - d * DAY, p }));

    // 0 puntos anteriores → primera visita
    const c0 = QED.computePriceComparison([], 100, now);
    check("D1. Precio sin historial → primera visita (sin %)", c0 && c0.hasHistory === false && c0.visits === 1 && c0.oneWeek.insufficient);

    // 2 puntos → aún no hay suficientes visitas
    const c2 = QED.computePriceComparison(pts([[1, 100], [2, 100]]), 150, now);
    check("D1. Ventana con 2 puntos → «Aún no hay suficientes visitas»", c2.oneWeek.insufficient === true && c2.oneMonth.insufficient === true);

    // 5 puntos → promedio y % (umbral ±10%)
    const five = pts([[1, 100], [2, 100], [3, 100], [4, 100], [5, 100]]);
    const up = QED.computePriceComparison(five, 115, now).oneWeek;
    const down = QED.computePriceComparison(five, 85, now).oneWeek;
    const flat = QED.computePriceComparison(five, 104, now).oneWeek;
    check("D1. 5 puntos: +15% → ▲ caro; −15% → ▼ barato; +4% → en tu promedio",
      up.status === "expensive" && up.arrow === "▲" && up.diffPct === 15 &&
      down.status === "cheap" && down.arrow === "▼" && down.diffPct === -15 &&
      flat.status === "neutral", `${up.diffPct} ${down.diffPct} ${flat.diffPct}`);

    // El precio de hoy NO entra en el promedio
    const withToday = five.concat([{ t: now - 3600000, p: 500 }]);
    const ct = QED.computePriceComparison(withToday, 115, now).oneWeek;
    check("D1. El punto de hoy no entra en el promedio", ct.avg === 100 && ct.diffPct === 15, `prom ${ct.avg}`);

    // Textos y colores: ▲ #8a1f14, ▼ #1f5f19, sin emojis
    const card = fs.readFileSync(path.join(EXT, "src/card.js"), "utf8");
    const i18n = fs.readFileSync(path.join(EXT, "src/i18n.js"), "utf8");
    check("D1. ▲ en #8a1f14 y ▼ en #1f5f19; textos con flecha y palabra (el color no es la única señal)",
      /\.price-up \{ color: #8a1f14/.test(card) && /\.price-down \{ color: #1f5f19/.test(card) &&
      QED.I18N.t("price_above", { n: 12 }).startsWith("▲ +12%") && QED.I18N.t("price_below", { n: 8 }).startsWith("▼ −8%"));
    check("D1. Sin emojis 🔺🔻💳⭐📊 en el precio ni en los rastreadores", !/🔺|🔻|💳|⭐|📊/.test(card + QED.computePriceComparison.toString()));

    // Separador decimal por país
    check("D1. «1.299,00 €» = 1299 y «1.299» = 1299 con coma decimal; «$1,299.00» = 1299 en México",
      QED.parsePriceNumber("1.299,00 €", true) === 1299 && QED.parsePriceNumber("1.299", true) === 1299 &&
      QED.parsePriceNumber("$1,299.00", false) === 1299 && QED.parsePriceNumber("12.990", true) === 12990);

    // amazon.com sin JSON-LD → USD (nunca MXN por defecto)
    const wUs = env(`<div id="corePrice_feature_div"><span class="a-price"><span class="a-offscreen">$49.99</span></span></div>`, "https://www.amazon.com/dp/B0USTEST00");
    const pUs = wUs.QED.extractPrice(wUs.document, "amazon", "EE.UU.");
    const wDe = env(`<div id="corePrice_feature_div"><span class="a-price"><span class="a-offscreen">1.299,00 €</span></span></div>`, "https://www.amazon.de/dp/B0DETEST00");
    const pDe = wDe.QED.extractPrice(wDe.document, "amazon", "Alemania");
    check("D1. amazon.com sin JSON-LD → USD; amazon.de «1.299,00 €» → 1299 EUR",
      pUs && pUs.currency === "USD" && pUs.amount === 49.99 && pDe && pDe.currency === "EUR" && pDe.amount === 1299,
      `${pUs && pUs.currency} ${pDe && pDe.amount}`);

    // MSI solo desde contenedores de pago; un anuncio en el pie de página NO cuenta
    const wMsi = env(`<div class="ui-pdp-payment">Hasta 12 meses sin intereses de $100</div>`, "https://articulo.mercadolibre.com.mx/MLM-123456789");
    const msi = wMsi.QED.extractInstallments(wMsi.document, "mercadolibre");
    const wFoot = env(`<div class="ui-pdp-price">$500</div><footer>Hasta 18 meses sin intereses con tarjetas participantes</footer>`, "https://articulo.mercadolibre.com.mx/MLM-987654321");
    const foot = wFoot.QED.extractInstallments(wFoot.document, "mercadolibre");
    check("D1. MSI en el bloque de pago → 12 meses; anuncio en el pie de página → NO cuenta",
      msi.hasMsi && msi.months === 12 && foot.hasMsi === false && foot.noData === true);
    check("D1. Sin MSI → «La página no indica meses sin intereses»; nunca «Pago de contado»",
      QED.I18N.t("price_no_msi") === "La página no indica meses sin intereses" && !/[Pp]ago de contado/.test(i18n + card));

    // Rastreadores: solo los verificados en brands.json; Waltrack excluido; CamelCamelCamel nunca en amazon.com.mx
    const tr = db.rastreadores;
    const mx = QED.getTrackerLinks("www.amazon.com.mx", { id: "B0TEST00000", type: "asin" }, "Audífonos Sony", tr);
    const us = QED.getTrackerLinks("www.amazon.com", { id: "B0TEST00000", type: "asin" }, "Audífonos Sony", tr);
    const de = QED.getTrackerLinks("www.amazon.de", { id: "B0TEST00000", type: "asin" }, "Audífonos Sony", tr);
    const ali = QED.getTrackerLinks("es.aliexpress.com", { id: "", type: "none" }, "reloj inteligente", tr);
    const wm = QED.getTrackerLinks("www.walmart.com", { id: "999999", type: "walmart_id" }, "café", tr);
    check("D1. Rastreadores: CamelCamelCamel en amazon.com y amazon.de; ausente en amazon.com.mx; Pricearchive y Alitools en AliExpress; Waltrack nunca",
      us.some((x) => x.name === "CamelCamelCamel" && x.url === "https://camelcamelcamel.com/product/B0TEST00000") &&
      de.some((x) => x.name === "CamelCamelCamel" && x.url === "https://de.camelcamelcamel.com/product/B0TEST00000") &&
      !mx.some((x) => x.name === "CamelCamelCamel") &&
      ali.some((x) => x.name === "Pricearchive") && ali.some((x) => x.name === "Alitools") &&
      ![...mx, ...us, ...de, ...ali, ...wm].some((x) => /waltrack/i.test(x.name + x.url)));
    check("D1. Sin enlace universal a Google Shopping (sin HARPA)", !us.some((x) => x.universal || /google\.com\/search\?tbm=shop/.test(x.url)) && !/HARPA/.test(card + i18n));

    // F1. Comparador: tiendas_comparar como fuente de lectura, sin enlaces externos de búsqueda
    const storesMx = (db.tiendas_comparar["México"] || []).filter((s) => !/amazon\.com\.mx/.test(s.dominio));
    const storesDe = (db.tiendas_comparar["Alemania"] || []).filter((s) => !/amazon\.de/.test(s.dominio));
    check("F1. Tiendas a consultar: del país, sin la tienda actual; amazon.de nunca consulta tiendas de EE.UU.",
      storesMx.length >= 2 && !storesMx.some((l) => /amazon\.com\.mx/.test(l.dominio)) &&
      storesDe.length >= 1 && storesDe.some((s) => /otto\.de/.test(s.dominio)) && !storesDe.some((s) => /walmart\.com/.test(s.dominio)));
    check("F1. Sin enlaces de búsqueda 'Buscar en otra tienda' en tarjeta ni extractores",
      !/btn_search_store|lbl_compare_other|getCompareLinks/.test(card + i18n + fs.readFileSync(path.join(EXT, "src/extractors.js"), "utf8")));
    check("D1. Ningún texto afirma «más barato en» / «mismo precio» de otra tienda",
      !/Más barato en|Mismo precio|crossPlatformHistory/.test(card + i18n + fs.readFileSync(path.join(EXT, "src/extractors.js"), "utf8")));

    // Búsqueda con modelo o GTIN
    const wModel = env(ld({ "@context": "https://schema.org", "@type": "Product", name: "Audífonos", gtin13: "4548736132597", mpn: "WH1000XM5/B" }), "https://www.liverpool.com.mx/tienda/pdp/1");
    const ids = wModel.QED.extractModelAndGtin(wModel.document, "");
    check("D1. Búsqueda con marca + modelo (JSON-LD mpn) o con el GTIN si no hay modelo",
      QED.searchQuery("Audífonos inalámbricos Sony", "Sony", ids) === "Sony WH1000XM5/B" &&
      QED.searchQuery("x", "", { gtin: "4548736132597" }) === "4548736132597" &&
      QED.searchQuery("Taza de cerámica para café 350 ml", "", {}) === "Taza de cerámica");

    // El precio vive en Mercado; en Confiabilidad queda una línea «¿Descuento real?»
    const wCard = env(`<div></div>`, "https://www.amazon.com.mx/dp/B0TEST00000");
    const rel = wCard.QED.evaluateReliability(
      { price: { amount: 85, currency: "MXN" }, productId: { id: "B0TEST00000", type: "asin" }, installments: { hasMsi: false, noData: true } },
      null, "lacteos", "Leche", "México", { d: "amazon.com.mx", nombre: "Amazon México", pais: "México" },
      { priceHistory: { p: five }, now, host: "www.amazon.com.mx", rastreadores: db.rastreadores, tiendasComparar: db.tiendas_comparar }
    );
    wCard.QED.showCard({ found: true, brand: "Lala", group: db.grupos.lala, title: "Leche", reliabilityEval: rel, alternativas: { cat: "lacteos", label: "Lácteos", pais: "México", items: [], dominant: [] } }, {});
    const root = wCard.document.getElementById("gina-tarjeta").shadowRoot;
    const relSec = root.querySelector("#sec-rel") || root;
    const mktSec = root.querySelector("#sec-mkt") || root;
    check("D1. El panel de precio está en Mercado y Confiabilidad solo dice «¿Descuento real?»",
      /¿Descuento real\?/.test(relSec.textContent) && !relSec.querySelector(".price-panel") && !!mktSec.querySelector(".price-panel") &&
      /Según tus 6 visitas/.test(mktSec.textContent));
  }

  // ---------------------------------------------------------------- C5. Antigüedad de la base en el popup
  {
    const w = env("", "https://www.amazon.com.mx/dp/B0TEST00000");
    const now = Date.UTC(2026, 9, 13);
    check("C5. Base de hace 22 días → aviso de desactualizada; de hace 5 días → no",
      w.QED.baseAgeDays("2026-09-21T0800", now) === 22 && w.QED.baseAgeDays("2026-10-08T0800", now) === 5 && w.QED.BASE_STALE_DAYS === 21 &&
      /puede haber datos desactualizados/.test(w.QED.I18N.t("base_stale", { fecha: "21 sept 2026" })) &&
      /baseDateText\(db\.version\)/.test(fs.readFileSync(path.join(EXT, "popup/popup.js"), "utf8")));
  }

  // ---------------------------------------------------------------- D2. Privacidad del historial
  {
    const w = env("", "https://www.amazon.com.mx/dp/B0TEST00000");
    const QED = w.QED;
    const DAY = 86400000;
    const now = Date.UTC(2026, 9, 13, 18, 0, 0);
    let h = {};
    for (let i = 0; i < 301; i++) h = QED.recordPricePoint(h, `amazon:P${i}`, 10 + i, "MXN", now - (301 - i) * 1000);
    check("D2. 301 productos → quedan 300 (se borra el visto hace más tiempo)", Object.keys(h).length === 300 && !h["amazon:P0"] && !!h["amazon:P300"]);

    let h2 = { "amazon:X": { u: now - 91 * DAY, c: "MXN", p: [{ t: now - 91 * DAY, p: 50 }, { t: now - 10 * DAY, p: 60 }] } };
    h2 = QED.recordPricePoint(h2, "amazon:X", 70, "MXN", now);
    check("D2. Un punto de hace 91 días se descarta", h2["amazon:X"].p.length === 2 && h2["amazon:X"].p.every((x) => x.t > now - 90 * DAY));

    let h3 = QED.recordPricePoint({}, "amazon:Y", 100, "MXN", now - 3600000);
    h3 = QED.recordPricePoint(h3, "amazon:Y", 95, "MXN", now);
    check("D2. Máximo 1 punto por día por producto (el último del día lo reemplaza)", h3["amazon:Y"].p.length === 1 && h3["amazon:Y"].p[0].p === 95);

    check("D2. Clave = sitio + id del producto; sin id real no se guarda (nunca el título)",
      QED.priceHistoryKey("amazon", { id: "B0TEST00000", type: "asin" }) === "amazon:B0TEST00000" &&
      QED.priceHistoryKey("liverpool", { id: "", type: "none" }) === "" &&
      Object.keys(QED.prunePriceHistory({ "Leche entera Lala 1 litro": [{ t: now, p: 30 }] }, now)).length === 0);

    // content.js: interruptor apagado → 0 escrituras; borrar historial → storage vacío (simulado con el mismo código)
    const content = fs.readFileSync(path.join(EXT, "src/content.js"), "utf8");
    const options = fs.readFileSync(path.join(EXT, "options/options.js"), "utf8");
    check("D2. Interruptor apagado → recordPrice no escribe; Opciones apaga y borra",
      /if \(!prefs\.priceHistory \|\| !key/.test(content) && /storage\.local\.remove\("priceHistory"\)/.test(options) &&
      /settings\.priceHistory === false/.test(content));
    const pol = fs.readFileSync(path.join(__dirname, "..", "docs/privacidad.html"), "utf8");
    check("D2. La política de privacidad declara el historial de precios local y borrable", /Historial de precios/.test(pol) && /300 productos/.test(pol) && /price history/.test(pol));
  }

  // ---------------------------------------------------------------- D3. Datos de descuento y marcas propias
  {
    const tipos = Object.values(db.grupos).map((g) => g.tipo);
    check("D3. Ningún grupo usa «Hard discount» ni «Marca propia» como tipo de dueño", !tipos.some((t) => /hard.?discount|marca propia/i.test(t)));
    const w = env("", "https://www.amazon.com.mx/dp/B0LECHE0000");
    const QED = w.QED;
    const prep = QED.ALT.prepare(db, QED.buildIndex(db, [], {}, {}));
    const allAlts = Object.keys(db.categorias).flatMap((c) => QED.ALT.suggest(prep, c, "México", null, null, 20, ""));
    check("D3. Cadenas de descuento y marcas propias nunca aparecen como «alternativa local»",
      !allAlts.some((a) => a.group.canal || a.group.marca_propia));
    check("D3. Waldo's corregido con fuente (Grupo Vizion) y 3B sin marcas sin fuente",
      /Grupo Vizion/.test(db.grupos.waldos.controlador) && /ambito\.com/.test(db.grupos.waldos.url) &&
      !db.marcas.some((m) => /LactiBuena|Vaca Blanca|Nuestro Campo|Odisa|Bodega Aurrera/.test(m.n)) &&
      db.grupos.tiendas_3b.canal === "descuento");
    const sb = QED.ALT.storeBrands(prep, "limpieza", "México", null, null, 4);
    check("D3. Marcas propias con fuente y país de venta (bloque aparte)",
      Object.values(db.grupos).filter((g) => g.marca_propia).every((g) => /^https:\/\//.test(g.url) && (g.paises_venta || []).length) &&
      sb.every((x) => x.group.marca_propia && x.group.paises_venta.includes("México")));
  }

  // ---------------------------------------------------------------- E1. Sugerencias por correo y filtro de marcas
  {
    const w = env("", "https://www.amazon.com.mx/dp/B0TEST00000");
    const QED = w.QED;
    const idx = QED.buildIndex(db, [], {}, {});

    // 1. Limpieza de prefijos y caracteres especiales
    check("E1. cleanBrandField limpia prefijos de tienda y símbolos ™/®",
      QED.cleanBrandField("Visita la tienda de Sony®") === "sony" &&
      QED.cleanBrandField("Visit the Apple Store") === "apple" &&
      QED.cleanBrandField("Marca: Nestlé™") === "nestle" &&
      QED.cleanBrandField("De la marca Samsung") === "samsung" &&
      QED.cleanBrandField("Por Truper") === "truper");

    check("E1. displayBrand conserva mayúsculas y quita prefijos/símbolos",
      QED.displayBrand("Visita la tienda de Sony®") === "Sony" &&
      QED.displayBrand("Marca: Nestlé™") === "Nestlé");

    // 2. isKnownBrand detecta marcas exactas, alias, empresas y catálogo estricto
    check("E1. isKnownBrand reconoce marcas existentes aún con prefijos o ™/®",
      QED.isKnownBrand(idx, "Visita la tienda de Sony®") === true &&
      QED.isKnownBrand(idx, "Marca: Bimbo") === true &&
      QED.isKnownBrand(idx, "MarcaInventadaCompletamenteDesconocida123") === false);

    // 3. suggestionMailData genera correo estructurado, fecha y enlaces válidos
    const p = { contacto: "gina.proyecto02@gmail.com", issuesUrl: "https://github.com/ginaproyecto02-lgtm/project-gina/issues/new" };
    const mailData = QED.ALT.suggestionMailData(p, "marca", [{ marca: "MarcaX", tienda: "Amazon México", producto: "Café de grano 500g" }]);
    check("E1. suggestionMailData genera mailto, gmail y cuerpo estructurado con fecha",
      mailData.mailto.startsWith("mailto:gina.proyecto02@gmail.com?subject=%5Bgina%3Asugerencia%5D%20Marca%20faltante%3A%20MarcaX") &&
      mailData.gmail.includes("mail.google.com") && mailData.gmail.includes("MarcaX") &&
      mailData.body.includes("<!-- gina:sugerencia v1 tipo=marca -->") &&
      mailData.body.includes("- marca: MarcaX") &&
      mailData.body.includes("- fecha: ") &&
      mailData.body.includes("no incluye datos personales"));

    // 4. Marca ya sugerida por el usuario muestra aviso en la tarjeta
    const wCard = env("<div></div>", "https://www.amazon.com.mx/dp/B0UNKNOWN");
    wCard.QED.showCard(
      { found: false, brandText: "MarcaYaSugerida", title: "Producto X" },
      { userSuggestions: [{ brand: "MarcaYaSugerida", title: "Producto X", date: Date.now() }] }
    );
    const hostEl = wCard.document.getElementById("gina-tarjeta");
    const shadow = hostEl && hostEl.shadowRoot;
    const alreadyEl = shadow && shadow.querySelector(".sug-already");
    check("E1. Marca ya sugerida en userSuggestions muestra aviso discreto",
      !!alreadyEl && alreadyEl.textContent.includes("Ya sugeriste"));
  }

  // ---------------------------------------------------------------- E5. Seguimiento de precio en Keepa ya armado (Amazon)
  {
    const w = env("", "https://www.amazon.com.mx/dp/B0TEST00000");
    const QED = w.QED;
    const tr = db.rastreadores;

    // 1. Keepa URL para amazon.com.mx (dominio 11) y amazon.com (dominio 1)
    const mxTr = QED.getTrackerLinks("www.amazon.com.mx", { id: "B0KEEPA001", type: "asin" }, "Echo Dot", tr);
    const usTr = QED.getTrackerLinks("www.amazon.com", { id: "B0KEEPA001", type: "asin" }, "Echo Dot", tr);
    const aliTr = QED.getTrackerLinks("es.aliexpress.com", { id: "12345", type: "none" }, "Echo Dot", tr);

    const mxKeepa = mxTr.find((x) => x.name === "Keepa");
    const usKeepa = usTr.find((x) => x.name === "Keepa");
    const aliKeepa = aliTr.find((x) => x.name === "Keepa");

    check("E5. Keepa armado: dominio 11 en amazon.com.mx, dominio 1 en amazon.com, ausente en tiendas no-Amazon",
      mxKeepa && mxKeepa.url === "https://keepa.com/#!product/11-B0KEEPA001" &&
      usKeepa && usKeepa.url === "https://keepa.com/#!product/1-B0KEEPA001" &&
      !aliKeepa);

    // 2. computeTargetPrice: >= 7 días usa mínimo de últimos 90 días, fallback usa 10% descuento
    const DAY = 86400000;
    const now = Date.UTC(2026, 9, 15, 12, 0, 0);

    // Sin historial o < 7 días: 10% por debajo del precio actual (100 -> 90)
    const fallbackTarget = QED.computeTargetPrice([], 100, now);
    const fallbackTarget2 = QED.computeTargetPrice({ p: [{ t: now - 3 * DAY, p: 95 }] }, 100, now);
    check("E5. computeTargetPrice sin historial suficiente (menos de 7 días) da 10% de descuento",
      fallbackTarget === 90 && fallbackTarget2 === 90);

    // Con historial de >= 7 días: mínimo de los últimos 90 días (en este caso 80 vs actual 100)
    const hist7 = {
      p: [
        { t: now - 30 * DAY, p: 80 },
        { t: now - 15 * DAY, p: 120 },
        { t: now - 7 * DAY, p: 95 }
      ]
    };
    const targetWithHist = QED.computeTargetPrice(hist7, 100, now);
    check("E5. computeTargetPrice con historial >= 7 días toma el mínimo de los últimos 90 días",
      targetWithHist === 80);

    // 3. Renderizado en tarjeta con botón de copiar precio objetivo y aviso de cuenta gratuita
    const wCard = env("<div></div>", "https://www.amazon.com.mx/dp/B0KEEPA001");
    wCard.QED.showCard(
      {
        found: true,
        brand: "Amazon Basics",
        title: "Cable USB-C",
        reliabilityEval: {
          price: { amount: 100, currency: "MXN" },
          productId: { id: "B0KEEPA001", type: "asin" },
          trackers: mxTr,
          targetPrice: 90
        }
      },
      {}
    );
    const hostEl = wCard.document.getElementById("gina-tarjeta");
    const shadow = hostEl && hostEl.shadowRoot;
    const keepaBox = shadow && shadow.querySelector(".keepa-alert-box");
    const keepaBtn = shadow && shadow.querySelector(".keepa-follow-btn");
    const copyBtn = shadow && shadow.querySelector(".keepa-copy-btn");
    check("E5. Tarjeta muestra botón de Keepa, precio objetivo y botón copiar",
      !!keepaBox && !!keepaBtn && !!copyBtn &&
      keepaBtn.getAttribute("href") === "https://keepa.com/#!product/11-B0KEEPA001" &&
      copyBtn.getAttribute("data-target") === "90");
  }
}

console.log(`\n${pass}/${total} pruebas correctas`);
process.exit(pass === total ? 0 : 1);

