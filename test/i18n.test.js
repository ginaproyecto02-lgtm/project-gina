// SPDX-License-Identifier: MIT
// Project Gina — Pruebas de cobertura completa de internacionalización (i18n) (puerta 8)
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { JSDOM, VirtualConsole } = require("jsdom");

const EXT = path.join(__dirname, "..", "extension");
let pass = 0, total = 0;
function check(name, ok, detail) {
  total++;
  if (ok) pass++;
  console.log(`${ok ? "OK   " : "FALLA"} ${name}${detail && !ok ? " → " + detail : ""}`);
}

const virtualConsole = new VirtualConsole();
virtualConsole.on("error", (err) => {
  const msg = err && (err.message || String(err));
  if (msg && msg.includes("Could not parse CSS stylesheet")) return;
  console.error(err);
});

// Cargar i18n
const i18nCode = fs.readFileSync(path.join(EXT, "src/i18n.js"), "utf8");
const i18nDom = new JSDOM("<!doctype html><html><body></body></html>", { virtualConsole, runScripts: "outside-only" });
vm.runInContext(i18nCode, i18nDom.getInternalVMContext());
const QED = i18nDom.window.QED;
const I18N = QED.I18N;
const STRINGS = I18N.STRINGS;
const LANGS = I18N.SUPPORTED; // ["es", "en", "de", "fr", "it", "ja"]

// ============================================================================
// 1. Cada clave de i18n.js tiene los 6 idiomas y ninguno vacío
// ============================================================================
console.log("--- 1. Integridad de claves e idiomas en i18n.js ---");

check("STRINGS está expuesto en QED.I18N", typeof STRINGS === "object" && Object.keys(STRINGS).length > 0);

const keys = Object.keys(STRINGS);
let allLangsPresent = true;
const missingLangKeys = [];

for (const k of keys) {
  const entry = STRINGS[k];
  for (const l of LANGS) {
    if (!entry[l] || typeof entry[l] !== "string" || entry[l].trim().length === 0) {
      allLangsPresent = false;
      missingLangKeys.push(`${k}.${l}`);
    }
  }
}

check(
  `Cada una de las ${keys.length} claves de i18n.js tiene los 6 idiomas y ninguno vacío`,
  allLangsPresent,
  `Faltan o están vacías: ${missingLangKeys.slice(0, 5).join(", ")}`
);

// ============================================================================
// 2. Las variables {x} son las mismas en los 6 idiomas
// ============================================================================
console.log("--- 2. Coherencia de variables {x} entre idiomas ---");

function extractVars(str) {
  const matches = str.match(/\{([a-zA-Z0-9_]+)\}/g) || [];
  return matches.map((m) => m.replace(/[{}]/g, "")).sort();
}

let allVarsMatch = true;
const mismatchedVarKeys = [];

for (const k of keys) {
  const entry = STRINGS[k];
  const esVars = extractVars(entry.es || "");
  const esVarsKey = esVars.join(",");

  for (const l of LANGS) {
    if (l === "es") continue;
    const lVars = extractVars(entry[l] || "");
    const lVarsKey = lVars.join(",");
    if (esVarsKey !== lVarsKey) {
      allVarsMatch = false;
      mismatchedVarKeys.push(`${k} (es:[${esVarsKey}] vs ${l}:[${lVarsKey}])`);
    }
  }
}

check(
  "Las variables interpoladas {x} coinciden en los 6 idiomas",
  allVarsMatch,
  `Discrepancias en: ${mismatchedVarKeys.slice(0, 5).join("; ")}`
);

// ============================================================================
// 3. Renderizado en inglés: sin palabras de control en español
// ============================================================================
console.log("--- 3. Renderizado en inglés: sin palabras en español ---");

function loadPage(htmlFile, lang = "en") {
  const html = fs.readFileSync(path.join(EXT, htmlFile), "utf8");
  const dom = new JSDOM(html, { virtualConsole, runScripts: "outside-only" });
  dom.window.__GINA_SHADOW_OPEN__ = true;
  dom.window.chrome = {
    runtime: { getURL: (p) => p },
    storage: {
      local: { get: () => Promise.resolve({}), set: () => Promise.resolve({}) },
      onChanged: { addListener: () => {} }
    },
    tabs: { query: () => Promise.resolve([{ url: "https://example.com" }]) }
  };
  dom.window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ grupos: {}, marcas: [], aliases: {} }) });

  for (const src of ["src/matcher.js", "src/ai.js", "src/reputation.js", "src/alternativas.js", "src/extractors.js", "src/semejanza.js", "src/comparador.js", "src/adaptivo.js", "src/flights.js", "src/notices.js", "src/i18n.js", "src/card.js"]) {
    const fPath = path.join(EXT, src);
    if (fs.existsSync(fPath)) {
      vm.runInContext(fs.readFileSync(fPath, "utf8"), dom.getInternalVMContext());
    }
  }
  dom.window.QED.I18N.setLang(lang);
  return dom;
}

// Lista de palabras de control en español que jamás deben aparecer en UI en inglés
const CONTROL_WORDS_ES = [
  /\bContiene\b/i,
  /\bsegún la página\b/i,
  /\btienda\b/i,
  /\bmarca\b/i,
  /\bdueño\b/i,
  /\bEnviada\b/i,
  /\bGuardada\b/i,
  /\bprecio\b/i,
  /\bdescuento\b/i,
  /\bmeses sin intereses\b/i,
  /\bEn otras tiendas\b/i,
  /\b¿A quién le compras\?/i,
  /\b¿Descuento real\?/i
];

{
  // A. Tarjeta con producto conocido, avisos y comparador en inglés
  const cardDom = loadPage("options/comparar.html", "en");
  cardDom.window.QED.I18N.setLang("en");

  const productData = {
    found: true,
    brand: "TestBrand",
    title: "Test Product 500g",
    group: { id: "test-grp", empresa: "Test Parent Corp", controlador_en: "Founder", pais: "Estados Unidos", tipo: "Corporación" },
    store: { nombre: "TestStore", pais: "Estados Unidos" },
    reliabilityEval: { sellerType: "direct", level: "official" },
    alternativas: {
      cat: "abarrotes",
      confianza: "alta",
      items: [{ marcas: ["Local Brand"], group: { empresa: "Local Co-op" } }]
    },
    compareData: {
      same: [{ title: "Test Product 500g", storeName: "Other Store", price: 10, currency: "USD", matchType: "same" }],
      similar: []
    },
    productNotices: [
      { tipo: "info", categoria: "alimentos", titulo: cardDom.window.QED.I18N.t("lbl_nom051_title"), texto: cardDom.window.QED.I18N.t("msg_nom051_found", { stamps: "Excess sugars" }) }
    ]
  };

  cardDom.window.QED.showCard(productData, {
    minimized: false,
    compareConsent: true
  });

  const cardHost = cardDom.window.document.getElementById("gina-host");
  const shadowRoot = cardHost ? cardHost.shadowRoot : null;
  const cardText = shadowRoot ? shadowRoot.textContent : "";

  // Comprobar que no hay frases en español
  const foundControlWords = [];
  for (const re of CONTROL_WORDS_ES) {
    if (re.test(cardText)) {
      foundControlWords.push(re.toString());
    }
  }

  check(
    "Tarjeta en inglés: libre de palabras de control en español",
    foundControlWords.length === 0,
    `Encontradas: ${foundControlWords.join(", ")}`
  );

  // B. Tarjeta con marca desconocida
  cardDom.window.QED.showCard({ found: false, brandText: "UnknownBrand", title: "Some Title" }, {});
  const unkCardText = cardHost ? cardHost.shadowRoot.textContent : "";
  const foundUnkWords = CONTROL_WORDS_ES.filter((re) => re.test(unkCardText));
  check(
    "Tarjeta sin marca en inglés: libre de palabras en español",
    foundUnkWords.length === 0,
    `Encontradas: ${foundUnkWords.join(", ")}`
  );

  // C. Popup en inglés
  const popupDom = loadPage("popup/popup.html", "en");
  const popupCode = fs.readFileSync(path.join(EXT, "popup/popup.js"), "utf8");
  vm.runInContext(popupCode, popupDom.getInternalVMContext());
  // Ejecutamos applyI18nLabels
  if (typeof popupDom.window.applyI18nLabels === "function") {
    popupDom.window.applyI18nLabels();
  }
  const popupBodyText = popupDom.window.document.body.textContent;
  const foundPopupWords = [
    /\bEsta página\b/,
    /\bAgregar una marca\b/,
    /\bAbre un producto\b/,
    /\bMostrar la tarjeta\b/
  ].filter((re) => re.test(popupBodyText));

  check(
    "Popup en inglés: no contiene textos fijos en español",
    foundPopupWords.length === 0,
    `Encontradas: ${foundPopupWords.join(", ")}`
  );

  // D. Opciones en inglés
  const optDom = loadPage("options/options.html", "en");
  const optCode = fs.readFileSync(path.join(EXT, "options/options.js"), "utf8");
  vm.runInContext(optCode, optDom.getInternalVMContext());
  vm.runInContext("applyI18n();", optDom.getInternalVMContext());
  const optBodyText = optDom.window.document.body.textContent;
  const foundOptWords = [
    /\bTus valores\b/,
    /\bMemoria local\b/,
    /\bPendientes de análisis\b/,
    /\bBorrar memoria\b/
  ].filter((re) => re.test(optBodyText));

  check(
    "Opciones en inglés: no contiene encabezados fijos en español",
    foundOptWords.length === 0,
    `Encontradas: ${foundOptWords.join(", ")}`
  );
}

// ============================================================================
// 4. Renderizado en japonés: sin frases completas en español
// ============================================================================
console.log("--- 4. Renderizado en japonés: sin frases en español ---");

{
  const jaDom = loadPage("options/comparar.html", "ja");
  jaDom.window.QED.I18N.setLang("ja");

  const productDataJa = {
    found: true,
    brand: "Sony",
    title: "WH-1000XM5",
    group: { id: "sony-grp", empresa: "Sony Group", pais: "Japón", tipo: "Corporación" },
    store: { nombre: "Rakuten", pais: "Japón" },
    reliabilityEval: { sellerType: "direct" },
    alternativas: { cat: "audio_electronica", confianza: "alta", items: [] }
  };

  jaDom.window.QED.showCard(productDataJa, {});
  const cardHost = jaDom.window.document.getElementById("gina-host");
  const jaText = cardHost ? cardHost.shadowRoot.textContent : "";

  const SPANISH_PHRASES = [
    /según la página/i,
    /en otras tiendas/i,
    /a quién le compras/i,
    /descuento real/i,
    /meses sin intereses/i,
    /historial de precios/i
  ];

  const foundJaPhrases = SPANISH_PHRASES.filter((re) => re.test(jaText));
  check(
    "Tarjeta en japonés: no contiene frases completas en español",
    foundJaPhrases.length === 0,
    `Encontradas: ${foundJaPhrases.join(", ")}`
  );
}

// ============================================================================
// Resumen
// ============================================================================
console.log(`\nPruebas de i18n: ${pass}/${total} pasaron.`);
if (pass < total) process.exit(1);
