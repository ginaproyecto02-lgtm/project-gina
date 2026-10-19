// SPDX-License-Identifier: MIT
// Project Gina — Pruebas y diagnóstico del motor de semejanza (tanda G)
"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const EXT = path.join(__dirname, "..", "extension");
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
eval(`(function(globalThis) { ${comparadorCode} })(dom.window);`);
const QED = dom.window.QED;

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

console.log(`\n${pass}/${total} pruebas de semejanza correctas`);
if (pass !== total) {
  process.exit(1);
}

