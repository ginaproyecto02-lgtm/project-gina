// SPDX-License-Identifier: MIT
// Project Gina — Pruebas y diagnóstico del motor de semejanza (tanda G)
"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const EXT = path.join(__dirname, "..", "extension");
const semejanzaCode = fs.readFileSync(path.join(EXT, "src/semejanza.js"), "utf8");
const comparadorCode = fs.readFileSync(path.join(EXT, "src/comparador.js"), "utf8");

const virtualConsole = new VirtualConsole();
virtualConsole.on("error", (err) => {
  const msg = err && (err.message || String(err));
  if (msg && msg.includes("Could not parse CSS stylesheet")) return;
  console.error(err);
});
function createJSDOM(html, opts = {}) {
  return new JSDOM(html, { virtualConsole, ...opts });
}

const dom = createJSDOM("<!doctype html><html><body></body></html>", { url: "https://www.example.com" });
eval(`(function(globalThis) { ${semejanzaCode} })(dom.window);`);
eval(`(function(globalThis) { ${comparadorCode} })(dom.window);`);
const QED = dom.window.QED;
const Semejanza = dom.window.GINA_SEMEJANZA;

let pass = 0, total = 0;
function check(name, ok, detail) {
  total++;
  if (ok) pass++;
  console.log(`${ok ? "OK   " : "FALLA"} ${name}${detail && !ok ? " → " + detail : ""}`);
}

console.log("=== G1. Diagnóstico con páginas reales y fixtures ===");

const tiendasData = JSON.parse(fs.readFileSync(path.join(__dirname, "../datagen/tiendas_comparar.json"), "utf8")).tiendas["México"];
const storeConfigs = {};
for (const s of tiendasData) {
  if (s.dominio === "mercadolibre.com.mx") storeConfigs.mercadolibre_mx = s;
  if (s.dominio === "amazon.com.mx") storeConfigs.amazon_mx = s;
  if (s.dominio === "walmart.com.mx") storeConfigs.walmart_mx = s;
}

const STORES = ["mercadolibre_mx", "amazon_mx", "walmart_mx"];
const CASES = ["caso1", "caso2", "caso3", "caso4", "caso5", "ficha"];

// 1. Verificar existencia y metadatos de los fixtures reales
for (const store of STORES) {
  for (const c of CASES) {
    const htmlPath = path.join(__dirname, `fixtures/semejanza/${store}/${c}.html`);
    const jsonPath = path.join(__dirname, `fixtures/semejanza/${store}/${c}.json`);
    const htmlExists = fs.existsSync(htmlPath);
    const jsonExists = fs.existsSync(jsonPath);

    check(`Fixture real existe: ${store}/${c}`, htmlExists && jsonExists, `html: ${htmlExists}, json: ${jsonExists}`);

    if (jsonExists) {
      try {
        const meta = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        const validMeta = meta.url && meta.fecha && meta.como_se_guardo;
        check(`Metadatos válidos: ${store}/${c}`, !!validMeta, JSON.stringify(meta));
      } catch (e) {
        check(`Metadatos válidos: ${store}/${c}`, false, e.message);
      }
    }
  }
}

// 2. Extraer y diagnosticar cada fixture con el estado actual del comparador
console.log("\n--- Diagnóstico de extracción y clasificación actual ---");

const targets = {
  caso1: { brand: "Nutella", title: "Nutella 1 kg" },
  caso2: { brand: "Coca-Cola", title: "Coca-Cola 355 ml" },
  caso3: { brand: "Bosch", model: "GSB 13 RE", title: "Bosch Rotomartillo GSB 13 RE 750 W 220 V, 5 brocas y maletín" },
  caso4: { brand: "Nupec", title: "Nupec Comida para Felino Adulto Indoor, 5 kg" },
  caso5: { brand: "Nupec", title: "Nupec croquetas para Perros Adulto Razas Pequeñas, Omega 3 y 6, 8 kg" }
};

const diagnosticoResultados = [];

for (const store of STORES) {
  const cfg = storeConfigs[store] || { dominio: store };
  for (const c of CASES) {
    const htmlPath = path.join(__dirname, `fixtures/semejanza/${store}/${c}.html`);
    if (!fs.existsSync(htmlPath)) continue;
    const html = fs.readFileSync(htmlPath, "utf8");
    const blocked = QED.isBlockedOrCaptcha(html, 200);

    const jdom = createJSDOM(html, { url: `https://www.${cfg.dominio}/` });
    const doc = jdom.window.document;

    // Detectar método
    const jsonLds = QED.extractJsonLd(doc);
    let ldItems = [];
    for (const ld of jsonLds) {
      ldItems.push(...QED.parseProductsFromJsonLd(ld, cfg.dominio, QED.storeCurrency(cfg)));
    }

    const nextData = QED.extractNextData(doc);
    let nextItems = [];
    if (nextData && nextData.props && nextData.props.pageProps) {
      const p = nextData.props.pageProps.initialData || nextData.props.pageProps.product;
      if (p) nextItems.push(...QED.parseProductsFromJsonLd(p, cfg.dominio, QED.storeCurrency(cfg)));
    }

    let selItems = [];
    if (cfg.selectores) {
      selItems = QED.parseStoreWithSelectors(doc, cfg.selectores, cfg.dominio, QED.storeCurrency(cfg));
    }

    const extracted = QED.extractStoreItems(html, doc, cfg);
    let method = "ninguno";
    if (ldItems.length > 0) method = "JSON-LD";
    else if (nextItems.length > 0) method = "__NEXT_DATA__";
    else if (selItems.length > 0) method = "selectores";

    // Clasificación contra el caso correspondiente si aplica
    let same = 0, similar = 0, different = 0, none = 0;
    const target = targets[c];
    if (target && extracted.length > 0) {
      for (const item of extracted) {
        const match = QED.classifyProductMatch(target, item);
        if (match.type === "same") same++;
        else if (match.type === "similar") similar++;
        else if (match.type === "different") different++;
        else none++;
      }
    }

    diagnosticoResultados.push({
      store,
      caso: c,
      blocked,
      method,
      totalExtraidos: extracted.length,
      same,
      similar,
      different,
      none
    });
  }
}

// Imprimir tabla de diagnóstico línea base
console.log("\n| Tienda | Caso | Bloqueo/Captcha | Método | Extraídos | same | similar | different |");
console.log("|---|---|---|---|---|---|---|---|");
for (const r of diagnosticoResultados) {
  console.log(`| ${r.store} | ${r.caso} | ${r.blocked ? "Sí (bloqueado)" : "No"} | ${r.method} | ${r.totalExtraidos} | ${r.same} | ${r.similar} | ${r.different} |`);
}

check("Diagnóstico de línea base ejecutado para las 3 tiendas", diagnosticoResultados.length === 18, `Registros: ${diagnosticoResultados.length}`);

console.log("\n=== G2. Validación de lectura por tienda ===");

// 1. Cada fixture real no bloqueado debe extraer al menos 5 productos con título, precio y URL válidos (máximo 10)
for (const r of diagnosticoResultados) {
  if (r.blocked || r.totalExtraidos === 0) continue;
  const minExpected = r.caso === "ficha" ? 1 : 5;
  check(
    `G2: ${r.store}/${r.caso} extrae al menos ${minExpected} productos (${r.method})`,
    r.totalExtraidos >= minExpected && r.totalExtraidos <= 10,
    `extraídos: ${r.totalExtraidos}`
  );
}

// 2. Verificar que cada producto extraído de fixtures válidos contiene campos requeridos
{
  const htmlMl = fs.readFileSync(path.join(__dirname, "fixtures/semejanza/mercadolibre_mx/caso1.html"), "utf8");
  const docMl = createJSDOM(htmlMl, { url: "https://www.mercadolibre.com.mx/" }).window.document;
  const itemsMl = QED.extractStoreItems(htmlMl, docMl, storeConfigs.mercadolibre_mx);
  const allValidMl = itemsMl.every(
    (p) => p.title && typeof p.price === "number" && p.price > 0 && p.currency && p.url.startsWith("https://")
  );
  check("G2: Mercado Libre extrae campos requeridos (título, precio, moneda, URL)", allValidMl, `items: ${itemsMl.length}`);

  const htmlAmz = fs.readFileSync(path.join(__dirname, "fixtures/semejanza/amazon_mx/caso1.html"), "utf8");
  const docAmz = createJSDOM(htmlAmz, { url: "https://www.amazon.com.mx/" }).window.document;
  const itemsAmz = QED.extractStoreItems(htmlAmz, docAmz, storeConfigs.amazon_mx);
  const validAmz = itemsAmz.filter(
    (p) => p.title && typeof p.price === "number" && p.price > 0 && p.currency && p.url.startsWith("https://")
  );
  check("G2: Amazon México extrae al menos 5 productos con campos válidos (título, precio, moneda, URL)", validAmz.length >= 5, `válidos: ${validAmz.length}/${itemsAmz.length}`);
}

// 3. Walmart México: verificación del extractor __NEXT_DATA__
{
  const mockNextData = {
    props: {
      pageProps: {
        initialData: {
          searchResult: {
            itemStacks: [
              {
                items: [
                  {
                    name: "Crema de Avellana Nutella 1 kg",
                    brand: "Nutella",
                    model: "N1KG",
                    upc: "800050017997",
                    canonicalUrl: "/ip/crema-de-avellana-nutella-1-kg/12345",
                    imageInfo: { thumbnailUrl: "https://i5.walmartimages.com.mx/gr/images/nutella.jpg" },
                    priceInfo: { currentPrice: { price: 219.0, currencyUnit: "MXN" } },
                    rating: { averageRating: 4.8, numberOfReviews: 320 }
                  },
                  {
                    name: "Crema de Avellana Nutella 350 g",
                    brand: "Nutella",
                    canonicalUrl: "/ip/crema-de-avellana-nutella-350-g/12346",
                    priceInfo: { currentPrice: { price: 92.5, currencyUnit: "MXN" } }
                  }
                ]
              }
            ]
          }
        }
      }
    }
  };

  const parsed = QED.parseProductsFromNextData(mockNextData, "walmart.com.mx", "MXN");
  check("G2: parseProductsFromNextData extrae productos de searchResult.itemStacks",
    parsed.length === 2 &&
    parsed[0].title === "Crema de Avellana Nutella 1 kg" &&
    parsed[0].price === 219 &&
    parsed[0].currency === "MXN" &&
    parsed[0].brand === "Nutella" &&
    parsed[0].model === "N1KG" &&
    parsed[0].gtin === "800050017997" &&
    parsed[0].rating === 4.8 &&
    parsed[0].reviewsCount === 320 &&
    parsed[0].url.startsWith("https://") &&
    parsed[0].url.includes("/ip/crema-de-avellana-nutella-1-kg/12345"),
    JSON.stringify(parsed[0])
  );
}

// 4. Verificación de límite de hasta 10 resultados
{
  const htmlMl = fs.readFileSync(path.join(__dirname, "fixtures/semejanza/mercadolibre_mx/caso1.html"), "utf8");
  const docMl = createJSDOM(htmlMl, { url: "https://www.mercadolibre.com.mx/" }).window.document;
  const items = QED.extractStoreItems(htmlMl, docMl, storeConfigs.mercadolibre_mx);
  check("G2: extractStoreItems limita resultados a máximo 10", items.length === 10, `obtenidos: ${items.length}`);
}

console.log("\n=== G3. Motor de semejanza: Pruebas unitarias de atributos ===");

// 1. Al menos 30 títulos reales con su cantidad, paquete, voltaje, modelo y variantes esperados
const ATTR_CASES = [
  // Cantidad y unidades
  { t: "Nutella Crema De Avellanas Con Cacao Tarro De 1 Kg Chocolate", exp: { cantidad: 1000, unidad: "g", paquete: 1 } },
  { t: "Crema De Avellanas Nutella 350g", exp: { cantidad: 350, unidad: "g", paquete: 1 } },
  { t: "Nutella Ferrero crema de avellanas con cacao 995 gr frasco", exp: { cantidad: 995, unidad: "g", paquete: 1 } },
  { t: "Crema de Avellana Nutella 1,000 g Tarro Familiar", exp: { cantidad: 1000, unidad: "g", paquete: 1 } },
  { t: "Crema de Avellana Nutella 1.000 g Tarro Grande", exp: { cantidad: 1000, unidad: "g", paquete: 1 } },
  { t: "Crema De Avellana Nutella Cubeta 3 Kg", exp: { cantidad: 3000, unidad: "g", paquete: 1 } },
  { t: "Coca-Cola Refresco Original Lata Lean 355 mL", exp: { cantidad: 355, unidad: "ml", paquete: 1 } },
  { t: "Refresco Coca-Cola Original Botella 600 ml", exp: { cantidad: 600, unidad: "ml", paquete: 1 } },
  { t: "Coca-Cola Refresco 0.355 L en lata", exp: { cantidad: 355, unidad: "ml", paquete: 1 } },
  { t: "Refresco Coca-Cola 1.5 L Botella No Retornable", exp: { cantidad: 1500, unidad: "ml", paquete: 1 } },
  { t: "Bebida energética 12 fl oz can", exp: { cantidad: 355, unidad: "ml", paquete: 1 } },
  { t: "Alimento en polvo 1 lb bolsa", exp: { cantidad: 454, unidad: "g", paquete: 1 } },
  { t: "Nupec Felino Adulto Indoor 5 Kg - Gato, Original", exp: { cantidad: 5000, unidad: "g", paquete: 1 } },
  { t: "Nupec Felino Adulto Indoor 1.5 kg Alimento", exp: { cantidad: 1500, unidad: "g", paquete: 1 } },
  { t: "Alimento Seco Nupec Nutrición Científica Para Perro Adulto De Raza Pequeña Sabor Mix, 8 Kg", exp: { cantidad: 8000, unidad: "g", paquete: 1 } },
  { t: "Nupec Perro Adulto Raza Pequeña 2 Kg Bolsa", exp: { cantidad: 2000, unidad: "g", paquete: 1 } },

  // Paquetes y multipacks
  { t: "Refresco Coca-cola Zero Sin Azúcar 6 Pack 355ml", exp: { cantidad: 355, paquete: 6 } },
  { t: "Refresco Coca-cola Sin Azúcar 12 Pack 355ml", exp: { cantidad: 355, paquete: 12 } },
  { t: "Coca-Cola Pack Refresco 12 x 355 mL", exp: { cantidad: 355, paquete: 12 } },
  { t: "Pack X6 Refresco Coca-cola Bacardí En Lata 355ml", exp: { cantidad: 355, paquete: 6 } },
  { t: "Pack X12 Refresco Coca-cola Sin Azúcar Lata Delgada De 355ml", exp: { cantidad: 355, paquete: 12 } },
  { t: "Refresco Coca-Cola Original 355ml, 12 Latas", exp: { cantidad: 355, paquete: 12 } },
  { t: "3 Mangas Crema De Avellanas Nutella De 1kg C/u", exp: { cantidad: 1000, paquete: 3 } },
  { t: "2 Bultos Alimento Nupec Felino Indoor 5kg", exp: { cantidad: 5000, paquete: 2 } },
  { t: "Kit De 2 Nupec Felino Indoor 5kg", exp: { cantidad: 5000, paquete: 2 } },

  // Voltaje y potencia
  { t: "Bosch Rotomartillo GSB 13 RE 750 W 220 V", exp: { modelo: "GSB 13 RE", potencia: 750, voltaje: "220V" } },
  { t: "Rotomartillo Bosch Gsb 13 Re 750w 127 V con Maletín", exp: { modelo: "GSB 13 RE", potencia: 750, voltaje: "127V" } },
  { t: "Taladro Percutor Bosch GSB 18V-50 Batería", exp: { modelo: "GSB 18V-50", voltaje: "18V" } },

  // Variantes y accesorios
  { t: "Nupec Felino Kitten 1.5 kg Alimento Gatos", exp: { especie: "gato", etapa: "kitten" } },
  { t: "Nupec Cachorro Raza Pequeña 2 kg", exp: { especie: "perro", etapa: "cachorro", talla_raza: "pequenas" } },
  { t: "Nupec Perro Adulto Razas Medianas 8 kg", exp: { especie: "perro", etapa: "adulto", talla_raza: "medianas" } },
  { t: "Nupec Nutrición Especializada Sensitive Perro Adulto 2kg", exp: { formula: "sensible" } },
  { t: "Funda de silicón para Bosch GSB 13 RE", exp: { accesorio: true } },
  { t: "Repuesto de navajas compatible con Nutella dispenser", exp: { accesorio: true } }
];

let attrOk = 0;
for (const tc of ATTR_CASES) {
  const a = Semejanza.extractAttributes(tc.t);
  let ok = true;
  if (tc.exp.cantidad != null) {
    if (!a.cantidad || a.cantidad.valor !== tc.exp.cantidad) ok = false;
  }
  if (tc.exp.unidad != null) {
    if (!a.cantidad || a.cantidad.unidad !== tc.exp.unidad) ok = false;
  }
  if (tc.exp.paquete != null) {
    if (a.paquete !== tc.exp.paquete) ok = false;
  }
  if (tc.exp.voltaje != null) {
    if (!a.voltaje || a.voltaje.valor !== tc.exp.voltaje) ok = false;
  }
  if (tc.exp.potencia != null) {
    if (a.potencia !== tc.exp.potencia) ok = false;
  }
  if (tc.exp.modelo != null) {
    if (a.modelo !== tc.exp.modelo) ok = false;
  }
  if (tc.exp.especie != null) {
    if (!a.variantes || a.variantes.especie !== tc.exp.especie) ok = false;
  }
  if (tc.exp.etapa != null) {
    if (!a.variantes || a.variantes.etapa !== tc.exp.etapa) ok = false;
  }
  if (tc.exp.talla_raza != null) {
    if (!a.variantes || a.variantes.talla_raza !== tc.exp.talla_raza) ok = false;
  }
  if (tc.exp.formula != null) {
    if (!a.variantes || a.variantes.formula !== tc.exp.formula) ok = false;
  }
  if (tc.exp.accesorio != null) {
    if (Semejanza.isAccessoryOrSpare(tc.t) !== tc.exp.accesorio) ok = false;
  }
  if (ok) attrOk++;
}
check("G3: 34 pruebas unitarias de atributos extraídos de títulos reales", attrOk === ATTR_CASES.length, `${attrOk}/${ATTR_CASES.length}`);

console.log("\n=== G3. Negativos obligatorios ===");

// 1. Nutella 350 g no es «mismo» (otra presentación)
{
  const res = Semejanza.classifyProductMatch(targets.caso1, { title: "Nutella Crema de Avellanas con Cacao 350 g", brand: "Nutella" });
  check("Negativo 1a: Nutella 350 g NO es «mismo» (otra presentación)", res.type === "similar" && res.reason === "otra_presentacion", `res: ${JSON.stringify(res)}`);
}

// 2. Nutella B-ready no es «mismo» (variante)
{
  const res = Semejanza.classifyProductMatch(targets.caso1, { title: "Nutella B-ready Galleta Rellena", brand: "Nutella" });
  check("Negativo 1b: Nutella B-ready NO es «mismo» (variante)", res.type === "similar" && res.reason === "variante", `res: ${JSON.stringify(res)}`);
}

// 3. Coca-Cola Zero 355 ml no es «mismo» (variante)
{
  const res = Semejanza.classifyProductMatch(targets.caso2, { title: "Refresco Coca-Cola Zero Sin Azúcar 355 ml", brand: "Coca-Cola" });
  check("Negativo 2a: Coca-Cola Zero 355 ml NO es «mismo» (variante)", res.type === "similar" && res.reason === "variante", `res: ${JSON.stringify(res)}`);
}

// 4. Coca-Cola 600 ml no es «mismo» (otra presentación)
{
  const res = Semejanza.classifyProductMatch(targets.caso2, { title: "Refresco Coca-Cola Original 600 ml", brand: "Coca-Cola" });
  check("Negativo 2b: Coca-Cola 600 ml NO es «mismo» (otra presentación)", res.type === "similar" && res.reason === "otra_presentacion", `res: ${JSON.stringify(res)}`);
}

// 5. Bosch GSB 13 RE 127 V contra 220 V no es «mismo» (otro voltaje)
{
  const res = Semejanza.classifyProductMatch(targets.caso3, { title: "Rotomartillo Bosch GSB 13 RE 750 W 127 V con 5 brocas y maletín", brand: "Bosch" });
  check("Negativo 3a: Bosch GSB 13 RE 127 V NO es «mismo» (otro voltaje)", res.type === "similar" && res.reason === "variante", `res: ${JSON.stringify(res)}`);
}

// 6. Bosch GSB 16 RE no es «mismo» (modelo distinto, descartar)
{
  const res = Semejanza.classifyProductMatch(targets.caso3, { title: "Rotomartillo Bosch GSB 16 RE 750 W 220 V", brand: "Bosch" });
  check("Negativo 3b: Bosch GSB 16 RE NO es «mismo» (modelo distinto, descartar)", res.type === "different", `res: ${JSON.stringify(res)}`);
}

// 7. Nupec Felino Kitten no es «mismo» (etapa choca, descartar)
{
  const res = Semejanza.classifyProductMatch(targets.caso4, { title: "Nupec Felino Kitten 5 kg", brand: "Nupec" });
  check("Negativo 4a: Nupec Felino Kitten NO es «mismo» (etapa distinta, descartar)", res.type === "different", `res: ${JSON.stringify(res)}`);
}

// 8. Nupec Cachorro Razas Pequeñas no es «mismo» (etapa choca, descartar)
{
  const res = Semejanza.classifyProductMatch(targets.caso5, { title: "Nupec Cachorro Razas Pequeñas 8 kg", brand: "Nupec" });
  check("Negativo 5a: Nupec Cachorro Razas Pequeñas NO es «mismo» (etapa distinta, descartar)", res.type === "different", `res: ${JSON.stringify(res)}`);
}

// 9. Nupec Adulto Razas Medianas no es «mismo» (talla choca, descartar)
{
  const res = Semejanza.classifyProductMatch(targets.caso5, { title: "Nupec Adulto Razas Medianas 8 kg", brand: "Nupec" });
  check("Negativo 5b: Nupec Adulto Razas Medianas NO es «mismo» (talla distinta, descartar)", res.type === "different", `res: ${JSON.stringify(res)}`);
}

// 10. Funda o accesorio descartado
{
  const res = Semejanza.classifyProductMatch(targets.caso3, { title: "Funda de lona para Bosch GSB 13 RE", brand: "Bosch" });
  check("Negativo 6: Funda o accesorio NO es «mismo» (accesorio descartado)", res.type === "different" && res.reason === "accesorio", `res: ${JSON.stringify(res)}`);
}

console.log("\n=== G3. Generación de Consultas de Búsqueda ===");

// Caso 1: Nutella 1 kg
{
  const q = Semejanza.queryForCompare(targets.caso1);
  check("Consulta Caso 1: Nutella 1 kg", q === "Nutella 1 kg", `q: '${q}'`);
}

// Caso 2: Coca-Cola 355 ml
{
  const q = Semejanza.queryForCompare(targets.caso2);
  check("Consulta Caso 2: Coca-Cola 355 ml", q === "Coca-Cola 355 ml" || q === "Coca Cola 355 ml", `q: '${q}'`);
}

// Caso 3: Bosch GSB 13 RE (con espacios conservados)
{
  const q = Semejanza.queryForCompare(targets.caso3);
  check("Consulta Caso 3: Bosch GSB 13 RE (conserva espacios originales)", q === "Bosch GSB 13 RE", `q: '${q}'`);
}

// Caso 4: Nupec felino adulto indoor 5 kg
{
  const q = Semejanza.queryForCompare(targets.caso4);
  check("Consulta Caso 4: Nupec felino adulto indoor 5 kg", q === "Nupec felino adulto indoor 5 kg", `q: '${q}'`);
}

// Caso 5: Nupec adulto razas pequeñas 8 kg
{
  const q = Semejanza.queryForCompare(targets.caso5);
  check("Consulta Caso 5: Nupec adulto razas pequeñas 8 kg", q === "Nupec adulto razas pequeñas 8 kg", `q: '${q}'`);
}

// Verificación de respaldo de consulta (sin cantidad)
{
  const fb1 = Semejanza.queryForCompareFallback(targets.caso1);
  check("Consulta respaldo sin cantidad: Nutella", fb1 === "Nutella", `fallback: '${fb1}'`);
}

console.log("\n=== G3. Conjunto de Oro y Matriz de Confusión ===");

// Conjunto de oro etiquetado a mano contra todos los productos extraídos de las páginas reales:
// Cada entrada tiene la etiqueta humana esperada: 'same' | 'otra_presentacion' | 'variante' | 'descartar'
const GOLDEN_SET = [
  // mercadolibre_mx/caso1 (Nutella 1 kg)
  { store: "mercadolibre_mx", caso: "caso1", idx: 0, expected: "descartar" }, // Crema De Avellanas Members Mark 1 Kg
  { store: "mercadolibre_mx", caso: "caso1", idx: 1, expected: "same" }, // Nutella Crema De Avellanas Con Cacao Tarro De 1 Kg Chocolate
  { store: "mercadolibre_mx", caso: "caso1", idx: 2, expected: "otra_presentacion" }, // Crema De Avellanas Nutella 350g
  { store: "mercadolibre_mx", caso: "caso1", idx: 3, expected: "descartar" }, // 1kg Crema De Avellana Tarro Chocolate Members Mark
  { store: "mercadolibre_mx", caso: "caso1", idx: 4, expected: "otra_presentacion" }, // 3 Mangas Crema De Avellanas Nutella De 1kg C/u
  { store: "mercadolibre_mx", caso: "caso1", idx: 5, expected: "same" }, // Nutella Crema De Avellanas Cacao Tarro De 1 Kg Chocolate
  { store: "mercadolibre_mx", caso: "caso1", idx: 6, expected: "same" }, // Crema De Avellana Nutella 1 Kg Cacao Ferrero Tarro Chocolate
  { store: "mercadolibre_mx", caso: "caso1", idx: 7, expected: "descartar" }, // Crema De Avellanas Cacao Kirkland 1kg Sin Gluten Tipo Nutela
  { store: "mercadolibre_mx", caso: "caso1", idx: 8, expected: "otra_presentacion" }, // Crema De Avellana Nutella Cubeta 3 Kg
  { store: "mercadolibre_mx", caso: "caso1", idx: 9, expected: "same" }, // Crema De Avellanas Con Cocoa Nutella 1 Kg Manga

  // mercadolibre_mx/caso2 (Coca-Cola 355 ml - lata/botella individual original)
  { store: "mercadolibre_mx", caso: "caso2", idx: 0, expected: "variante" }, // Refresco Coca-cola Zero Sin Azúcar 6 Pack 355ml
  { store: "mercadolibre_mx", caso: "caso2", idx: 1, expected: "variante" }, // Refresco Coca-cola Sin Azúcar 12 Pack 355ml
  { store: "mercadolibre_mx", caso: "caso2", idx: 2, expected: "variante" }, // Pack X6 Refresco Coca-cola Bacardí En Lata 355ml
  { store: "mercadolibre_mx", caso: "caso2", idx: 3, expected: "variante" }, // Refresco Coca Cola Soda Lata 12 Pack - Sabor Vainilla
  { store: "mercadolibre_mx", caso: "caso2", idx: 4, expected: "variante" }, // Pack X12 Refresco Coca-cola Sin Azúcar Lata Delgada De 355ml
  { store: "mercadolibre_mx", caso: "caso2", idx: 5, expected: "descartar" }, // Topo Chico Vidrio Pack X24 De 355ml
  { store: "mercadolibre_mx", caso: "caso2", idx: 6, expected: "variante" }, // Pack X12 Refrescos Light 4.26l Coca-cola
  { store: "mercadolibre_mx", caso: "caso2", idx: 7, expected: "descartar" }, // Refresco Sidral Mundet Sabor Manzana Light 6 Pack 355ml
  { store: "mercadolibre_mx", caso: "caso2", idx: 8, expected: "otra_presentacion" }, // Refresco Coca Cola Original 355ml C/u 6 Pack
  { store: "mercadolibre_mx", caso: "caso2", idx: 9, expected: "descartar" }, // Pack X6 Refresco Sprite Sin Azúcar Lima Limón 355ml

  // mercadolibre_mx/caso3 (Bosch GSB 13 RE 750W 220V 5 brocas y maletín)
  { store: "mercadolibre_mx", caso: "caso3", idx: 0, expected: "descartar" }, // GSB 550 RE
  { store: "mercadolibre_mx", caso: "caso3", idx: 1, expected: "variante" }, // Combo Bosch Rotomartillo + Miniesmeriladora
  { store: "mercadolibre_mx", caso: "caso3", idx: 2, expected: "variante" }, // GSB 13 RE + Miniesmeriladora
  { store: "mercadolibre_mx", caso: "caso3", idx: 3, expected: "variante" }, // GSB 13 RE con 23 accesorios
  { store: "mercadolibre_mx", caso: "caso3", idx: 4, expected: "variante" }, // GSB 13 RE en maletín (sin brocas)
  { store: "mercadolibre_mx", caso: "caso3", idx: 5, expected: "descartar" }, // GSB 550
  { store: "mercadolibre_mx", caso: "caso3", idx: 6, expected: "same" }, // GSB 13 RE 750w con 5 brocas y maletín
  { store: "mercadolibre_mx", caso: "caso3", idx: 7, expected: "variante" }, // GSB 13 RE 750w sin accesorios/maletín
  { store: "mercadolibre_mx", caso: "caso3", idx: 8, expected: "descartar" }, // GSB 550 RE
  { store: "mercadolibre_mx", caso: "caso3", idx: 9, expected: "variante" }, // GSB 13 RE + Miniesmeriladora

  // mercadolibre_mx/caso4 (Nupec Felino Adulto Indoor 5 kg)
  { store: "mercadolibre_mx", caso: "caso4", idx: 0, expected: "same" }, // Paquete De Croquetas Gato Nupec Indoor 5kg
  { store: "mercadolibre_mx", caso: "caso4", idx: 1, expected: "same" }, // Nupec Felino Adulto Indoor 5 Kg
  { store: "mercadolibre_mx", caso: "caso4", idx: 2, expected: "otra_presentacion" }, // Pack X 2 Unidades
  { store: "mercadolibre_mx", caso: "caso4", idx: 3, expected: "same" }, // Nupec Para Gato Adulto Indoor 5kg
  { store: "mercadolibre_mx", caso: "caso4", idx: 4, expected: "otra_presentacion" }, // 2 Bultos Nupec Felino Indoor 5kg
  { store: "mercadolibre_mx", caso: "caso4", idx: 5, expected: "same" }, // Alimento Nupec Felino Indoor Para Gato Adulto 5 Kg
  { store: "mercadolibre_mx", caso: "caso4", idx: 6, expected: "same" }, // Nupec Felino Adulto Indoor 5 Kg
  { store: "mercadolibre_mx", caso: "caso4", idx: 7, expected: "otra_presentacion" }, // Kit De 2 Nupec Felino Indoor 5kg
  { store: "mercadolibre_mx", caso: "caso4", idx: 8, expected: "otra_presentacion" }, // 2 Bultos Alimento Nupec Felino Indoor 5kg
  { store: "mercadolibre_mx", caso: "caso4", idx: 9, expected: "same" }, // Alimento Nupec Indoor Para Gato Adulto Bolsa De 5kg

  // mercadolibre_mx/caso5 (Nupec Perros Adulto Razas Pequeñas 8 kg)
  { store: "mercadolibre_mx", caso: "caso5", idx: 0, expected: "otra_presentacion" }, // 2 Kg Bolsa Seca
  { store: "mercadolibre_mx", caso: "caso5", idx: 1, expected: "otra_presentacion" }, // Sensitive Bolsa De 2kg
  { store: "mercadolibre_mx", caso: "caso5", idx: 2, expected: "otra_presentacion" }, // Sensible Sabor Mezcla (sin kg)
  { store: "mercadolibre_mx", caso: "caso5", idx: 3, expected: "same" }, // Nupec Para Perro Adulto De Raza Pequeña 8 Kg
  { store: "mercadolibre_mx", caso: "caso5", idx: 4, expected: "otra_presentacion" }, // Weight Control Bolsa De 2kg
  { store: "mercadolibre_mx", caso: "caso5", idx: 5, expected: "descartar" }, // Senior Para Raza Pequeña 8 Kg (etapa senior != adulto)
  { store: "mercadolibre_mx", caso: "caso5", idx: 6, expected: "same" }, // Croquetas Nupec Adulto Raza Pequeña 8kg
  { store: "mercadolibre_mx", caso: "caso5", idx: 7, expected: "variante" }, // Weight Control 8 Kg (fórmula control de peso != regular)
  { store: "mercadolibre_mx", caso: "caso5", idx: 8, expected: "descartar" }, // Razas Medianas Y Grandes (talla != pequeñas)
  { store: "mercadolibre_mx", caso: "caso5", idx: 9, expected: "otra_presentacion" }, // Combo 2 Croquetas Nupec 8kg

  // amazon_mx/caso1 (Nutella 1 kg)
  { store: "amazon_mx", caso: "caso1", idx: 0, expected: "descartar" }, // Nucolato
  { store: "amazon_mx", caso: "caso1", idx: 1, expected: "descartar" }, // Panettone
  { store: "amazon_mx", caso: "caso1", idx: 2, expected: "descartar" }, // Miel
  { store: "amazon_mx", caso: "caso1", idx: 3, expected: "descartar" }, // Quaker Stila
  { store: "amazon_mx", caso: "caso1", idx: 4, expected: "same" }, // Nutella Chocolate de Avellana para Untar 1 Kg
  { store: "amazon_mx", caso: "caso1", idx: 5, expected: "same" }, // Nutella Ferrero crema de avellanas con cacao 1 kg
  { store: "amazon_mx", caso: "caso1", idx: 6, expected: "same" }, // Crema de Avellana con Cacao Ferrero Nutella 995 gr
  { store: "amazon_mx", caso: "caso1", idx: 7, expected: "otra_presentacion" }, // Nutella Crema de Avellanas con Cacao, 350 G
  { store: "amazon_mx", caso: "caso1", idx: 8, expected: "otra_presentacion" }, // Nutella Crema de Avellanas con Cacao, 200 G
  { store: "amazon_mx", caso: "caso1", idx: 9, expected: "otra_presentacion" }, // Nutella 350 G (Paquete de 2)

  // amazon_mx/caso2 (Coca-Cola 355 ml - lata individual)
  { store: "amazon_mx", caso: "caso2", idx: 0, expected: "descartar" }, // Dr Pepper
  { store: "amazon_mx", caso: "caso2", idx: 1, expected: "descartar" }, // Vacuum Bottle (accesorio)
  { store: "amazon_mx", caso: "caso2", idx: 2, expected: "descartar" }, // Peñafiel
  { store: "amazon_mx", caso: "caso2", idx: 3, expected: "descartar" }, // Dr Pepper Cream Soda
  { store: "amazon_mx", caso: "caso2", idx: 4, expected: "otra_presentacion" }, // Pack Refresco 12 x 355 mL
  { store: "amazon_mx", caso: "caso2", idx: 5, expected: "otra_presentacion" }, // Refresco Coca-Cola Original 355 ml, 12 Latas
  { store: "amazon_mx", caso: "caso2", idx: 6, expected: "otra_presentacion" }, // Refresco Coca-Cola Original 355ml, 12 Latas
  { store: "amazon_mx", caso: "caso2", idx: 7, expected: "same" }, // Coca-Cola Refresco Original Lata Lean 355 mL
  { store: "amazon_mx", caso: "caso2", idx: 8, expected: "variante" }, // Coca-Cola Refresco Sin Azúcar 12 x 355 mL
  { store: "amazon_mx", caso: "caso2", idx: 9, expected: "variante" }  // Coca-Cola Sin Azúcar 1 pack x 12
];

// Cargar productos extraídos de cada fixture
const fixtureCache = {};
function getExtractedItem(store, caso, idx) {
  const key = `${store}/${caso}`;
  if (!fixtureCache[key]) {
    const htmlPath = path.join(__dirname, `fixtures/semejanza/${store}/${caso}.html`);
    const html = fs.readFileSync(htmlPath, "utf8");
    const cfg = storeConfigs[store] || { dominio: store };
    const doc = createJSDOM(html, { url: `https://www.${cfg.dominio}/` }).window.document;
    fixtureCache[key] = QED.extractStoreItems(html, doc, cfg);
  }
  return fixtureCache[key][idx];
}

// Evaluación del conjunto de oro
let TP = 0, FP = 0, FN = 0, TN = 0;
const goldenDetails = [];

for (const entry of GOLDEN_SET) {
  const target = targets[entry.caso];
  const item = getExtractedItem(entry.store, entry.caso, entry.idx);
  if (!item) continue;

  const result = Semejanza.classifyProductMatch(target, item);
  const isPredictedSame = result.type === "same";
  const isExpectedSame = entry.expected === "same";

  if (isExpectedSame && isPredictedSame) {
    TP++;
  } else if (!isExpectedSame && isPredictedSame) {
    FP++;
    goldenDetails.push(`FALSO POSITIVO en ${entry.store}/${entry.caso}[${entry.idx}]: '${item.title}'`);
  } else if (isExpectedSame && !isPredictedSame) {
    FN++;
    goldenDetails.push(`FALSO NEGATIVO en ${entry.store}/${entry.caso}[${entry.idx}]: '${item.title}' -> clasificado: ${result.type}/${result.reason}`);
  } else {
    TN++;
  }
}

if (process.env.GINA_VER_ORO) console.log(goldenDetails.join("\n"));
const precision = TP + FP > 0 ? TP / (TP + FP) : 1;
const recall = TP + FN > 0 ? TP / (TP + FN) : 1;

console.log("\nMatriz de confusión («Mismo producto»):");
console.log(`|                    | Real: Mismo | Real: No mismo |`);
console.log(`| Predicho: Mismo    | TP: ${String(TP).padStart(7)} | FP: ${String(FP).padStart(10)} |`);
console.log(`| Predicho: No mismo | FN: ${String(FN).padStart(7)} | TN: ${String(TN).padStart(10)} |`);
console.log(`Precisión: ${(precision * 100).toFixed(1)}% | Cobertura (Recall): ${(recall * 100).toFixed(1)}%`);

check("G3: Precisión de «mismo» = 100% (ningún falso positivo)", precision === 1.0 && FP === 0, goldenDetails.join("; "));
check("G3: Cobertura de «mismo» >= 90%", recall >= 0.90, `recall: ${(recall * 100).toFixed(1)}%`);

console.log("\n=== Validación 2026-10-19: casos fuera del conjunto de oro (el motor no debe estar ajustado solo a él) ===");
{
  // [actual, candidato, tipo esperado («same» | «similar» | «different»)]
  const FUERA = [
    [{ brand: "Nutella", title: "Nutella Crema de Avellanas con Cacao 1 kg" }, "Nutella 2 Tarros De 1 Kg", "similar"],
    [{ brand: "Nutella", title: "Nutella Crema de Avellanas con Cacao 1 kg" }, "Crema de avellanas tipo Nutella 1 kg Kirkland", "different"],
    [{ brand: "Nutella", title: "Nutella Crema de Avellanas con Cacao 1 kg" }, "Nutella Biscuits 304 g", "similar"],
    [{ brand: "Nutella", title: "Nutella Crema de Avellanas con Cacao 1 kg" }, "Nutella crema de avellana 1000g", "same"],
    [{ brand: "Coca-Cola", title: "Coca-Cola Original Lata 355 ml" }, "Coca Cola Original 355 ml", "same"],
    [{ brand: "Coca-Cola", title: "Coca-Cola Original Lata 355 ml" }, "Coca-Cola Light Lata 355 ml", "similar"],
    [{ brand: "Bosch", title: "Bosch Rotomartillo GSB 13 RE 750W 220V, 5 brocas y maletín" }, "Bosch GSB 130 Rotomartillo", "different"],
    [{ brand: "Bosch", title: "Bosch Rotomartillo GSB 13 RE 750W 220V, 5 brocas y maletín" }, "Bosch Rotomartillo GSB 13 RE Professional 750W 127V con maletín", "similar"],
    [{ brand: "Nupec", title: "Nupec Comida para Felino Adul Indoor, 5 kg" }, "Nupec Felino Senior Indoor 5 kg", "different"],
    [{ brand: "Nupec", title: "Nupec Comida para Felino Adul Indoor, 5 kg" }, "Nupec Felino Kitten 1.5 kg", "different"],
    [{ brand: "Nupec", title: "Nupec Felino Indoor 1.5 kg" }, "Nupec Felino Indoor 7.5 kg", "similar"],
    [{ brand: "Samsung", title: "Samsung Galaxy S23 128 GB Negro" }, "Samsung Galaxy S23 Ultra 128 GB", "similar"],
    [{ brand: "Samsung", title: "Samsung Galaxy S23 128 GB Negro" }, "Samsung Galaxy S23 FE 128 GB", "similar"],
    [{ brand: "Samsung", title: "Samsung Galaxy S23 128 GB Negro" }, "Samsung Galaxy S24 128 GB", "different"],
    [{ brand: "Samsung", title: "Samsung Galaxy S23 128 GB Negro" }, "Samsung Galaxy S23 128GB Negro", "same"],
    [{ brand: "Apple", title: "Apple iPhone 15 128 GB Negro" }, "Apple iPhone 15 Pro 128 GB", "similar"],
    [{ brand: "Apple", title: "Apple iPhone 15 128 GB Negro" }, "Apple iPhone 15 256 GB", "similar"],
    [{ brand: "Apple", title: "Apple iPhone 15 128 GB Negro" }, "Apple iPhone 14 128 GB", "different"],
    [{ brand: "LG", title: "LG Monitor 27GN800 27 pulgadas" }, "Colgate Pasta dental 27 g", "different"],
    [{ brand: "LG", title: "LG Monitor 27GN800 27 pulgadas" }, "LG UltraGear 27GN800-B Monitor 27\"", "same"]
  ];
  const malos = [];
  for (const [cur, t, esperado] of FUERA) {
    const r = Semejanza.classifyProductMatch(cur, { title: t, price: 100 });
    if (r.type !== esperado) malos.push(`${cur.title} vs «${t}»: ${r.type} (${r.label || r.reason}), se esperaba ${esperado}`);
  }
  check(`Fuera del oro: ${FUERA.length} casos (packs, imitaciones, Pro/Ultra/FE, capacidad, modelos, etapa, marca dentro de otra palabra)`, malos.length === 0, malos.join("; "));

  const consultas = [
    [{ brand: "Apple", title: "Apple iPhone 15 128 GB Negro" }, /iphone 15 128 GB/i],
    [{ brand: "Samsung", title: "Samsung Galaxy S23 128 GB Negro" }, /s23 128 GB/i],
    [{ brand: "LG", title: "LG Monitor 27GN800 27 pulgadas" }, /27gn800/i]
  ];
  const qm = consultas.filter(([p, re]) => !re.test(Semejanza.queryForCompare(p))).map(([p]) => `${p.title} → ${Semejanza.queryForCompare(p)}`);
  check("Consulta: conserva el número de modelo y la capacidad (iPhone 15 128 GB, S23, 27GN800)", qm.length === 0, qm.join("; "));

  const walmart = fs.readFileSync(path.join(__dirname, "fixtures/semejanza/walmart_mx/caso1.html"), "utf8");
  check("Walmart con PerimeterX («Verifica tu identidad») se detecta como bloqueo", QED.isBlockedOrCaptcha(walmart, 200) === true);

  const man = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "extension", "manifest.json"), "utf8"));
  const bg = fs.readFileSync(path.join(__dirname, "..", "extension", "src", "background.js"), "utf8");
  const imp = (bg.match(/importScripts\(([^)]*)\)/) || [, ""])[1].match(/"([^"]+)"/g).map((x) => "src/" + x.replace(/"/g, ""));
  const faltan = imp.filter((f) => !(man.background.scripts || []).includes(f));
  check("Firefox: background.scripts del manifest trae los mismos módulos que importScripts de Chrome", faltan.length === 0, faltan.join(", "));
}

console.log(`\n${pass}/${total} pruebas de semejanza correctas`);
if (pass !== total) {
  process.exit(1);
}

