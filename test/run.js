// Pruebas de detección: páginas simuladas de tiendas, vuelos y hospedaje de varios países.
const fs = require("fs"), path = require("path"), vm = require("vm");
const { JSDOM } = require("jsdom");
const EXT = path.join(__dirname, "..", "extension");
const db = JSON.parse(fs.readFileSync(path.join(EXT, "data/brands.json"), "utf8"));
const registry = JSON.parse(fs.readFileSync(path.join(EXT, "data/sites.json"), "utf8"));

function env(html, url) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, { url, runScripts: "outside-only" });
  for (const f of ["src/matcher.js", "src/reputation.js", "src/alternativas.js", "src/extractors.js", "src/flights.js", "src/i18n.js", "src/card.js"]) vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), dom.getInternalVMContext());
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
  const data = QED.extract(w.document, u.hostname);
  const r = QED.match(index, data.candidates, data.title);
  r.store = entry && entry.tipo === "tienda" ? { nombre: entry.nombre, group: index.groups[entry.g], id: entry.g, entry, modelo: entry.modelo, pais: entry.pais } : null;
  // Igual que content.js: alternativas locales según el tipo de producto y el país de la tienda
  const prep = QED.ALT.prepare(db, index);
  const cat = entry && entry.tipo === "tienda" ? QED.ALT.category(prep, r.found ? r.brand : r.brandText, data.title) : null;
  if (cat) {
    const otherBrands = r.group && r.group.id ? QED.ALT.otherBrandsOfSameOwner(prep, r.group.id, r.found ? r.brand : r.brandText, 6) : [];
    const dominant = QED.ALT.categoryDominantBrands(prep, cat, 4);
    r.alternativas = {
      cat,
      label: prep.cats[cat].label,
      pais: entry.pais,
      items: QED.ALT.suggest(prep, cat, entry.pais, r.group && r.group.id, null, 3),
      otherBrands,
      dominant,
      actualEsLocal: !!(r.group && QED.ALT.INDEP[r.group.tipo] && QED.ALT.countries(r.group.pais).includes(entry.pais))
    };
  }
  if (QED.evaluateReliability) {
    r.reliabilityEval = QED.evaluateReliability(data.reliability, r.group, cat, data.title, entry ? entry.pais : "México", entry);
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
  check("«Audífonos inalámbricos Philips» → audio_electronica, no cocina", cat === "audio_electronica", cat);
  const others = w.QED.ALT.otherBrandsOfSameOwner(prep, "pg", "Ariel", 6);
  check("Otras marcas del mismo dueño (P&G sin Ariel)", others.length >= 2 && !others.map(x => x.toLowerCase()).includes("ariel"), others.join(", "));
  const dom = w.QED.ALT.categoryDominantBrands(prep, "audio_electronica", 4);
  check("Marcas dominantes de audio_electronica (Sony, Bose, JBL, etc.)", dom.length >= 2 && dom.some((d) => d.marca === "Sony"), dom.map((d) => d.marca).join(", "));
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

console.log(`\n${pass}/${total} pruebas correctas`);
process.exit(pass === total ? 0 : 1);

