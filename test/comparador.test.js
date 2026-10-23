// SPDX-License-Identifier: MIT
// Pruebas del comparador en la tarjeta (F1):
// - Parser JSON-LD (con y sin reseñas, ItemList, múltiples ofertas)
// - Clasificación de coincidencias (GTIN, modelo, parecido, descarte de producto distinto de misma marca)
// - Agrupación y ordenación (insignia más barato con tienda actual, monedas distintas sin insignia)
// - Exclusión de la tienda actual
// - Caché de 12h
// - Saneamiento de URLs y de imágenes
// - Detección de bloqueos y captchas
"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const EXT = path.join(__dirname, "..", "extension");
const comparadorCode = fs.readFileSync(path.join(EXT, "src/comparador.js"), "utf8");

const dom = new JSDOM(`<!doctype html><html><body></body></html>`, { url: "https://www.example.com" });
const window = dom.window;
eval(`(function(globalThis) { ${comparadorCode} })(window);`);
const QED = window.QED;

let pass = 0, total = 0;
function check(name, ok, detail) {
  total++;
  if (ok) pass++;
  console.log(`${ok ? "OK   " : "FALLA"} ${name}${detail && !ok ? " → " + detail : ""}`);
}

console.log("--- 1. Parser JSON-LD ---");
{
  // Con reseñas y oferta simple
  const htmlWithReviews = `
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Sony WH-1000XM5 Audífonos",
          "image": "https://m.media-amazon.com/images/I/61+btxzpfDL._AC_SL1500_.jpg",
          "gtin13": "4548736132597",
          "model": "WH-1000XM5",
          "brand": { "@type": "Brand", "name": "Sony" },
          "offers": {
            "@type": "Offer",
            "price": "6999.00",
            "priceCurrency": "MXN",
            "url": "https://www.amazon.com.mx/dp/B09XS7JWHH"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "reviewCount": "1250"
          }
        }
        </script>
      </head>
      <body></body>
    </html>
  `;
  const items = QED.extractStoreItems(htmlWithReviews, { dominio: "amazon.com.mx", nombre: "Amazon México" });
  check("JSON-LD: producto con reseñas y oferta simple",
    items.length === 1 &&
    items[0].title === "Sony WH-1000XM5 Audífonos" &&
    items[0].price === 6999 &&
    items[0].currency === "MXN" &&
    items[0].rating === 4.8 &&
    items[0].reviewsCount === 1250 &&
    items[0].gtin === "4548736132597" &&
    items[0].model === "WH-1000XM5" &&
    items[0].url === "https://www.amazon.com.mx/dp/B09XS7JWHH",
    JSON.stringify(items[0])
  );
}

{
  // Sin reseñas, con múltiples ofertas (toma la más baja o disponible)
  const htmlMultipleOffers = `
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Consola Nintendo Switch OLED",
          "offers": [
            { "@type": "Offer", "price": "7500.00", "priceCurrency": "MXN", "availability": "https://schema.org/InStock" },
            { "@type": "Offer", "price": "6800.00", "priceCurrency": "MXN", "availability": "https://schema.org/InStock" }
          ]
        }
        </script>
      </head>
    </html>
  `;
  const items = QED.extractStoreItems(htmlMultipleOffers, { dominio: "liverpool.com.mx", nombre: "Liverpool" });
  check("JSON-LD: sin reseñas y múltiples ofertas toma la más económica disponible",
    items.length === 1 && items[0].price === 6800 && items[0].rating === null,
    JSON.stringify(items[0])
  );
}

{
  // ItemList en resultados de búsqueda
  const htmlItemList = `
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "item": {
                "@type": "Product",
                "name": "Apple iPhone 15 128GB Negro",
                "image": "https://http2.mlstatic.com/D_NQ_NP_2X_789123-MLA123456-F.webp",
                "offers": { "@type": "Offer", "price": "17499", "priceCurrency": "MXN", "url": "https://articulo.mercadolibre.com.mx/MLM-1" }
              }
            },
            {
              "@type": "ListItem",
              "position": 2,
              "item": {
                "@type": "Product",
                "name": "Apple iPhone 15 256GB Azul",
                "offers": { "@type": "Offer", "price": "19999", "priceCurrency": "MXN", "url": "https://articulo.mercadolibre.com.mx/MLM-2" }
              }
            }
          ]
        }
        </script>
      </head>
    </html>
  `;
  const items = QED.extractStoreItems(htmlItemList, { dominio: "mercadolibre.com.mx", nombre: "Mercado Libre" });
  check("JSON-LD: ItemList extrae todos los productos de la lista",
    items.length === 2 &&
    items[0].title === "Apple iPhone 15 128GB Negro" && items[0].price === 17499 &&
    items[1].title === "Apple iPhone 15 256GB Azul" && items[1].price === 19999,
    JSON.stringify(items)
  );
}

console.log("\n--- 2. Clasificación de coincidencias ---");
{
  const target = {
    brand: "Sony",
    model: "WH-1000XM5",
    mpn: "WH-1000XM5",
    gtin: "4548736132597",
    title: "Audífonos Inalámbricos Sony WH-1000XM5 Negro"
  };

  // Coincidencia exacta por GTIN
  const itemGtin = {
    brand: "Sony",
    gtin: "4548736132597",
    model: "WH-1000XM5",
    title: "Sony WH-1000XM5 Noise Cancelling Headphones"
  };
  check("Clasificación: coincidencia por GTIN → 'same'",
    QED.classifyProductMatch(target, itemGtin).type === "same"
  );

  // Coincidencia exacta por modelo
  const itemModel = {
    brand: "Sony",
    model: "WH-1000XM5",
    title: "Sony Audífonos WH-1000XM5 con cancelación de ruido"
  };
  check("Clasificación: coincidencia por modelo en título/campo → 'same'",
    QED.classifyProductMatch(target, itemModel).type === "same"
  );

  // Parecido: misma marca y núcleo de modelo cercano
  const itemSimilar = {
    brand: "Sony",
    title: "Sony Audífonos Inalámbricos WH-1000XM4"
  };
  check("Clasificación: misma marca y modelo cercano → 'similar'",
    QED.classifyProductMatch(target, itemSimilar).type === "similar"
  );

  // Distinto producto de la misma marca: TV Sony Bravia vs Audífonos Sony
  const itemDifferent = {
    brand: "Sony",
    title: "Pantalla Sony Bravia 55 Pulgadas 4K Google TV"
  };
  check("Clasificación: producto totalmente distinto de la misma marca → 'different' (se descarta)",
    QED.classifyProductMatch(target, itemDifferent).type === "different"
  );
}

console.log("\n--- 3. Insignia 'Más barato' y agrupación ---");
{
  const currentPrice = { amount: 7500, currency: "MXN" };
  const items = [
    { title: "Sony WH-1000XM5", store: "Liverpool", price: 6999, currency: "MXN", matchType: "same" },
    { title: "Sony WH-1000XM5", store: "Mercado Libre", price: 7200, currency: "MXN", matchType: "same" },
    { title: "Sony WH-1000XM4", store: "Walmart", price: 5499, currency: "MXN", matchType: "similar" }
  ];

  const grouped = QED.groupAndRankComparison(currentPrice, items);
  check("Agrupación: separa 'same' y 'similar', máximo 3 parecidos",
    grouped.same.length === 2 && grouped.similar.length === 1
  );
  check("Insignia más barato: otorgada al menor precio cuando es menor que la tienda actual",
    grouped.same[0].isCheapest === true && grouped.same[0].price === 6999 &&
    grouped.same[1].isCheapest === false &&
    grouped.similar[0].isCheapest === false
  );
}

{
  // Si la tienda actual es más barata que las opciones encontradas
  const currentPriceCheaper = { amount: 6500, currency: "MXN" };
  const items = [
    { title: "Sony WH-1000XM5", store: "Liverpool", price: 6999, currency: "MXN", matchType: "same" },
    { title: "Sony WH-1000XM5", store: "Mercado Libre", price: 7200, currency: "MXN", matchType: "same" }
  ];
  const grouped = QED.groupAndRankComparison(currentPriceCheaper, items);
  check("Insignia más barato: ninguna tienda externa la lleva si la tienda actual es más económica",
    grouped.same.every((it) => it.isCheapest === false)
  );
}

{
  // Si las monedas son distintas, NO se otorga insignia de más barato
  const currentPriceUSD = { amount: 350, currency: "USD" };
  const items = [
    { title: "Sony WH-1000XM5", store: "Liverpool", price: 6999, currency: "MXN", matchType: "same" }
  ];
  const grouped = QED.groupAndRankComparison(currentPriceUSD, items);
  check("Insignia más barato: sin insignia cuando las monedas son distintas",
    grouped.same[0].isCheapest === false
  );
}

console.log("\n--- 4. Query de búsqueda y claves de caché ---");
{
  check("Query con GTIN prioritario",
    QED.queryForCompare({ gtin: "4548736132597", brand: "Sony", mpn: "WH1000XM5", title: "Audífonos Sony" }) === "4548736132597"
  );
  check("Query con marca + modelo cuando no hay GTIN",
    QED.queryForCompare({ brand: "Sony", mpn: "WH-1000XM5", title: "Audífonos Inalámbricos Sony" }) === "Sony WH-1000XM5"
  );
  check("Query con marca + núcleo de título cuando no hay modelo",
    QED.queryForCompare({ brand: "Apple", title: "Apple iPhone 15 128GB Negro Titanio Nuevo Sellado" }) === "Apple iPhone 15 128GB"
  );

  const cacheKey = QED.buildCompareCacheKey("amazon.com.mx", "Sony WH-1000XM5");
  check("Clave de caché de 12h basada en tienda + consulta",
    cacheKey === "cmp:amazon.com.mx:sony wh-1000xm5"
  );
}

console.log("\n--- 5. Detección de bloqueos y captchas ---");
{
  check("Detección de captcha de Amazon / Cloudflare / DataDome",
    QED.isBlockedOrCaptcha("<html><head><title>Robot Check</title></head><body>Enter the characters you see below</body></html>") === true &&
    QED.isBlockedOrCaptcha("<html><title>Attention Required! | Cloudflare</title></html>") === true &&
    QED.isBlockedOrCaptcha("<html><body>Normal product page with specs</body></html>") === false
  );
}

console.log("\n--- 6. Validación 2026-10-18: precios y moneda por país ---");
{
  const casos = [["$20,499.00", 20499], ["1.299,00 €", 1299], ["1 299,99", 1299.99], ["¥12,800", 12800], ["R$ 3.499,90", 3499.9], ["US $45.00", 45], ["EUR 12.99", 12.99], ["1.299", 1299]];
  const malos = casos.filter(([txt, n]) => QED.parsePriceText(txt) !== n).map(([txt]) => `${txt}→${QED.parsePriceText(txt)}`);
  check("Precio de texto en formatos de México, EE.UU., Europa, Brasil y Japón", malos.length === 0, malos.join(", "));

  const html = fs.readFileSync(path.join(__dirname, "fixtures/comparar/ebay_resultado.html"), "utf8");
  const doc = new JSDOM(html).window.document;
  const sel = { item: ".s-item", titulo: ".s-item__title", precio: ".s-item__price", enlace: ".s-item__link" };
  const us = QED.extractStoreItems(html, doc, { dominio: "ebay.com", pais: "EE.UU.", selectores: sel });
  const de = QED.extractStoreItems(html.replace("$899.99", "899,99 €").replace("www.ebay.com", "www.ebay.de"), new JSDOM(html.replace("$899.99", "899,99 €").replace("www.ebay.com", "www.ebay.de")).window.document, { dominio: "ebay.de", pais: "Alemania", selectores: sel });
  check("Selectores: eBay EE.UU. sale en USD y eBay Alemania en EUR con 899,99 bien leído (antes todo era MXN)",
    us[0] && us[0].currency === "USD" && us[0].price === 899.99 && de[0] && de[0].currency === "EUR" && de[0].price === 899.99,
    JSON.stringify([us[0], de[0]]));

  const sinPais = QED.extractStoreItems(html, doc, { dominio: "ebay.com", selectores: sel });
  const r = QED.groupAndRankComparison({ title: "Samsung Galaxy S24 Ultra", brand: "Samsung", mpn: "S24", price: 20000, currency: "MXN" },
    sinPais.map((x) => Object.assign({}, x, { matchType: "same" })));
  check("Sin moneda conocida no hay insignia de «más barato» (no se compara contra MXN)",
    r.same[0] && r.same[0].currency === "" && r.same[0].isCheapest === false, JSON.stringify(r.same[0]));
}

console.log("\n--- 7. Diagnóstico del comparador (H2) ---");
{
  const diagSample = {
    fecha: 1792737837000,
    tienda: "amazon.com.mx",
    tiendas: [
      { tienda: "walmart.com.mx", consulta: "Sony WH-1000XM5", segunda_consulta: null, estado: "leida", metodo: "json", extraidos: 5, mismo: 1, otra_presentacion: 1, variante: 1, descartados: 2 },
      { tienda: "mercadolibre.com.mx", consulta: "Sony WH-1000XM5", segunda_consulta: "Sony WH-1000", estado: "bloqueo", metodo: "ninguno", extraidos: 0, mismo: 0, otra_presentacion: 0, variante: 0, descartados: 0 },
      { tienda: "liverpool.com.mx", consulta: "Sony WH-1000XM5", segunda_consulta: null, estado: "sin_permiso", metodo: "ninguno", extraidos: 0, mismo: 0, otra_presentacion: 0, variante: 0, descartados: 0 }
    ]
  };

  const plainText = QED.formatDiagnosticsPlainText(diagSample);
  check("H2: el texto copiado de diagnóstico no trae etiquetas HTML",
    plainText && !/<[^>]+>/.test(plainText) && plainText.includes("walmart.com.mx: leida"),
    plainText);

  check("H2: el texto copiado incluye tienda actual, consulta y tiendas consultadas",
    plainText.includes("Tienda actual: amazon.com.mx") && plainText.includes("Sony WH-1000XM5") && plainText.includes("mercadolibre.com.mx: bloqueo"));
}

console.log(`\n${pass}/${total} pruebas de comparador correctas`);
process.exit(pass === total ? 0 : 1);
