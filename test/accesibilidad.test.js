/**
 * @file test/accesibilidad.test.js
 * Puerta 8: Accesibilidad (a11y) y WCAG en Gina.
 *
 * 1. axe-core sobre la tarjeta (con __GINA_SHADOW_OPEN__), el popup, las opciones
 *    y comparar.html (0 violaciones serias o críticas).
 * 2. Contraste propio WCAG: contraste(hex1, hex2) verificado con negro/blanco=21,
 *    blanco/blanco=1, y cada par de color de texto/fondo de la tarjeta y popup >= 4.5:1.
 * 3. Todo botón y enlace tiene nombre accesible.
 * 4. Orden de tabulación en la tarjeta sigue el orden visual/DOM.
 * 5. La tarjeta se cierra con Escape.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { JSDOM, VirtualConsole } = require("./node_modules/jsdom");
const axe = require("./node_modules/axe-core");

const EXT = path.resolve(__dirname, "../extension");
const virtualConsole = new VirtualConsole();
virtualConsole.on("error", () => {});
virtualConsole.on("warn", () => {});

let pass = 0;
let total = 0;

function check(desc, ok, extra = "") {
  total++;
  if (ok) {
    pass++;
    console.log(`OK    ${desc}`);
  } else {
    console.error(`FALLA ${desc}${extra ? " → " + extra : ""}`);
  }
}

// ----------------------------------------------------------------------------
// Funciones de ayuda para cargar componentes en JSDOM
// ----------------------------------------------------------------------------
function loadEnvironment(htmlFile) {
  const html = fs.readFileSync(path.join(EXT, htmlFile), "utf8");
  const dom = new JSDOM(html, { virtualConsole, runScripts: "outside-only" });
  dom.window.__GINA_SHADOW_OPEN__ = true;
  dom.window.chrome = {
    runtime: { getURL: (p) => p },
    storage: {
      local: { get: () => Promise.resolve({}), set: () => Promise.resolve({}), remove: () => Promise.resolve({}) },
      onChanged: { addListener: () => {} }
    },
    tabs: { query: () => Promise.resolve([{ url: "https://example.com" }]) }
  };
  dom.window.fetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ grupos: {}, marcas: [], aliases: {} })
  });

  const scripts = [
    "src/matcher.js",
    "src/ai.js",
    "src/reputation.js",
    "src/alternativas.js",
    "src/extractors.js",
    "src/semejanza.js",
    "src/comparador.js",
    "src/adaptivo.js",
    "src/flights.js",
    "src/notices.js",
    "src/i18n.js",
    "src/card.js"
  ];
  for (const s of scripts) {
    const f = path.join(EXT, s);
    if (fs.existsSync(f)) {
      vm.runInContext(fs.readFileSync(f, "utf8"), dom.getInternalVMContext());
    }
  }

  // Inyectar axe en la ventana JSDOM
  dom.window.eval(axe.source);
  return dom;
}

// ----------------------------------------------------------------------------
// 2. Contraste propio WCAG (fórmula matemática estándar)
// ----------------------------------------------------------------------------
function luminancia(hex) {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const tr = [r, g, b].map((val) =>
    val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * tr[0] + 0.7152 * tr[1] + 0.0722 * tr[2];
}

function contraste(hex1, hex2) {
  const l1 = luminancia(hex1);
  const l2 = luminancia(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ----------------------------------------------------------------------------
// Ejecución asíncrona de pruebas
// ----------------------------------------------------------------------------
async function runAccessibilityTests() {
  console.log("--- 2. WCAG Color Contrast Formula y pares CSS ---");
  const cBlackWhite = contraste("#000000", "#ffffff");
  check("Contraste negro / blanco = 21 (±0.05)", Math.abs(cBlackWhite - 21) < 0.05, `Obtenido: ${cBlackWhite}`);

  const cWhiteWhite = contraste("#ffffff", "#ffffff");
  check("Contraste blanco / blanco = 1", Math.abs(cWhiteWhite - 1) < 0.01, `Obtenido: ${cWhiteWhite}`);

  // Pares de color en Card y Popup CSS
  const cssPairs = [
    { fg: "#1c2233", bg: "#ffffff", label: "Card texto base sobre blanco" },
    { fg: "#ffffff", bg: "#1f2a44", label: "Card cabecera texto blanco sobre azul marino" },
    { fg: "#535d70", bg: "#ffffff", label: "Card subtítulo marca sobre blanco" },
    { fg: "#143c73", bg: "#e1ebfa", label: "Badge directo/oficial sobre azul claro" },
    { fg: "#6e3500", bg: "#fbe3c4", label: "Badge verificar sobre naranja claro" },
    { fg: "#5c2e00", bg: "#fdf1e2", label: "Badge/Notice oficial sobre crema" },
    { fg: "#166534", bg: "#f0fdf4", label: "Notice calidad éxito sobre verde claro" },
    { fg: "#991b1b", bg: "#fef2f2", label: "Notice calidad advertencia sobre rojo claro" },
    { fg: "#2d3748", bg: "#f4f6fa", label: "Notice info sobre gris claro" },
    { fg: "#1c2233", bg: "#fafbfc", label: "Card contenido de sección sobre fondo suave" },
    { fg: "#2b3550", bg: "#eef1f7", label: "Chip etiqueta sobre fondo grisáceo" },
    { fg: "#5a6478", bg: "#ffffff", label: "Popup botón de navegación inactivo sobre blanco" },
    { fg: "#1f2a44", bg: "#eef1f7", label: "Popup botón ghost sobre gris suave" },
    { fg: "#235017", bg: "#e2f0d9", label: "Popup mensaje de éxito sobre verde suave" },
    { fg: "#1f2a44", bg: "#ffffff", label: "Bienvenida título y texto principal sobre blanco" },
    { fg: "#ffffff", bg: "#1f2a44", label: "Bienvenida botón primario texto blanco sobre azul marino" },
    { fg: "#3e4a60", bg: "#f8fafd", label: "Bienvenida preview descripción sobre gris suave" },
    { fg: "#1f2a44", bg: "#f8fafd", label: "Bienvenida preview título sobre gris suave" }
  ];

  let allPairsPass = true;
  const failingPairs = [];
  for (const pair of cssPairs) {
    const ratio = contraste(pair.fg, pair.bg);
    if (ratio < 4.5) {
      allPairsPass = false;
      failingPairs.push(`${pair.label} (${ratio.toFixed(2)}:1)`);
    }
  }
  check(
    "Todos los pares de color de tarjeta y popup cumplen >= 4.5:1 (WCAG AA)",
    allPairsPass,
    failingPairs.join("; ")
  );

  console.log("\n--- 1. Pruebas de axe-core (0 violaciones serias o críticas) ---");
  const axeOpts = {
    rules: {
      "color-contrast": { enabled: false } // JSDOM no calcula estilos calculados de contraste
    }
  };

  // 1A. Tarjeta renderizada
  const cardDom = loadEnvironment("options/comparar.html");
  const productData = {
    found: true,
    brand: "TestBrand",
    title: "Test Product 500g",
    group: { id: "test-grp", empresa: "Test Parent Corp", pais: "México", tipo: "Corporación" },
    store: { nombre: "TestStore", pais: "México" },
    reliabilityEval: { sellerType: "direct", level: "official" },
    alternativas: {
      cat: "abarrotes",
      confianza: "alta",
      items: [{ marcas: ["Marca Local"], group: { empresa: "Coop Local" } }]
    },
    compareData: {
      same: [{ title: "Test Product 500g", storeName: "Otra Tienda", price: 150, currency: "MXN", matchType: "same" }],
      similar: []
    },
    productNotices: [
      { tipo: "info", categoria: "alimentos", titulo: "Aviso", texto: "Exceso de azúcares" }
    ]
  };

  cardDom.window.QED.showCard(productData, {
    minimized: false,
    compareConsent: true
  });

  const cardHost = cardDom.window.document.getElementById("gina-tarjeta");
  const shadowRoot = cardHost ? cardHost.shadowRoot : (cardDom.window.QED.__cardRoot ? cardDom.window.QED.__cardRoot() : null);

  // Analizar shadow DOM de la tarjeta clonado en un contenedor accesible o directamente
  if (shadowRoot) {
    // Para axe, creamos un documento contenedor con el HTML de la tarjeta
    const cardContainerDom = new JSDOM(
      `<!DOCTYPE html><html lang="es"><head><title>Card</title></head><body><main id="root">${shadowRoot.innerHTML}</main></body></html>`,
      { virtualConsole, runScripts: "outside-only" }
    );
    cardContainerDom.window.eval(axe.source);
    const cardAxe = await cardContainerDom.window.axe.run(cardContainerDom.window.document, axeOpts);
    const cardViolations = (cardAxe.violations || []).filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    check(
      "Tarjeta: 0 violaciones serias o críticas en axe-core",
      cardViolations.length === 0,
      cardViolations.map((v) => `${v.id} (${v.impact}): ${v.description}`).join("; ")
    );
  } else {
    check("Tarjeta montada con shadowRoot", false, "No se encontró cardHost con shadowRoot");
  }

  // 1B. Popup
  const popupDom = loadEnvironment("popup/popup.html");
  const popupCode = fs.readFileSync(path.join(EXT, "popup/popup.js"), "utf8");
  vm.runInContext(popupCode, popupDom.getInternalVMContext());
  if (typeof popupDom.window.applyI18nLabels === "function") {
    popupDom.window.applyI18nLabels();
  }
  const popupAxe = await popupDom.window.axe.run(popupDom.window.document, axeOpts);
  const popupViolations = (popupAxe.violations || []).filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  );
  check(
    "Popup: 0 violaciones serias o críticas en axe-core",
    popupViolations.length === 0,
    popupViolations.map((v) => `${v.id} (${v.impact}): ${v.description}`).join("; ")
  );

  // 1C. Opciones
  const optDom = loadEnvironment("options/options.html");
  const optCode = fs.readFileSync(path.join(EXT, "options/options.js"), "utf8");
  vm.runInContext(optCode, optDom.getInternalVMContext());
  vm.runInContext("applyI18n();", optDom.getInternalVMContext());
  const optAxe = await optDom.window.axe.run(optDom.window.document, axeOpts);
  const optViolations = (optAxe.violations || []).filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  );
  check(
    "Opciones: 0 violaciones serias o críticas en axe-core",
    optViolations.length === 0,
    optViolations.map((v) => `${v.id} (${v.impact}): ${v.description}`).join("; ")
  );

  // 1D. Comparar (página de consentimiento)
  const compDom = loadEnvironment("options/comparar.html");
  const compAxe = await compDom.window.axe.run(compDom.window.document, axeOpts);
  const compViolations = (compAxe.violations || []).filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  );
  check(
    "Página comparar.html: 0 violaciones serias o críticas en axe-core",
    compViolations.length === 0,
    compViolations.map((v) => `${v.id} (${v.impact}): ${v.description}`).join("; ")
  );

  // 1E. Bienvenida (options/bienvenida.html - Onboarding)
  const bienDom = loadEnvironment("options/bienvenida.html");
  const bienCode = fs.readFileSync(path.join(EXT, "options/bienvenida.js"), "utf8");
  vm.runInContext(bienCode, bienDom.getInternalVMContext());
  const bienAxe = await bienDom.window.axe.run(bienDom.window.document, axeOpts);
  const bienViolations = (bienAxe.violations || []).filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  );
  check(
    "Bienvenida (onboarding): 0 violaciones serias o críticas en axe-core",
    bienViolations.length === 0,
    bienViolations.map((v) => `${v.id} (${v.impact}): ${v.description}`).join("; ")
  );

  console.log("\n--- 3. Nombres accesibles en botones y enlaces ---");
  function checkAccessibleNames(root, namePrefix) {
    const interactive = root.querySelectorAll("button, a, input[type='button'], input[type='submit']");
    const missing = [];
    interactive.forEach((el) => {
      const text = el.textContent ? el.textContent.trim() : "";
      const ariaLabel = el.getAttribute("aria-label");
      const title = el.getAttribute("title");
      const value = el.getAttribute("value");
      const hasImgAlt = !!el.querySelector("img[alt]");
      const hasSvgTitle = !!el.querySelector("svg title");

      const hasAccName = Boolean(text || ariaLabel || title || value || hasImgAlt || hasSvgTitle);
      if (!hasAccName) {
        missing.push(el.outerHTML.slice(0, 80));
      }
    });
    return missing;
  }

  const cardMissing = shadowRoot ? checkAccessibleNames(shadowRoot, "Tarjeta") : [];
  check(
    "Tarjeta: todos los botones y enlaces tienen nombre accesible",
    cardMissing.length === 0,
    `Faltan en: ${cardMissing.join("; ")}`
  );

  const popupMissing = checkAccessibleNames(popupDom.window.document, "Popup");
  check(
    "Popup: todos los botones y enlaces tienen nombre accesible",
    popupMissing.length === 0,
    `Faltan en: ${popupMissing.join("; ")}`
  );

  const optMissing = checkAccessibleNames(optDom.window.document, "Opciones");
  check(
    "Opciones: todos los botones y enlaces tienen nombre accesible",
    optMissing.length === 0,
    `Faltan en: ${optMissing.join("; ")}`
  );

  const compMissing = checkAccessibleNames(compDom.window.document, "Comparar");
  check(
    "Comparar.html: todos los botones y enlaces tienen nombre accesible",
    compMissing.length === 0,
    `Faltan en: ${compMissing.join("; ")}`
  );

  const bienMissing = checkAccessibleNames(bienDom.window.document, "Bienvenida");
  check(
    "Bienvenida: todos los botones y enlaces tienen nombre accesible",
    bienMissing.length === 0,
    `Faltan en: ${bienMissing.join("; ")}`
  );

  console.log("\n--- 4. Orden de tabulación en la tarjeta y en bienvenida ---");
  // Ningún elemento interactivo debe tener tabindex > 0 (tabindex positivo altera orden DOM)
  if (shadowRoot) {
    const focusable = shadowRoot.querySelectorAll("[tabindex]");
    const badTabIndices = [];
    focusable.forEach((el) => {
      const ti = parseInt(el.getAttribute("tabindex"), 10);
      if (!isNaN(ti) && ti > 0) {
        badTabIndices.push(`${el.tagName} con tabindex=${ti}`);
      }
    });
    check(
      "Tarjeta: orden de tabulación respeta el orden del DOM (sin tabindex > 0)",
      badTabIndices.length === 0,
      `Encontrados: ${badTabIndices.join(", ")}`
    );
  }

  // Verificación de landmarks, labels/ARIA y soporte de teclado en Bienvenida
  const bienDoc = bienDom.window.document;
  const bienMain = bienDoc.querySelector("main");
  const bienHeader = bienDoc.querySelector("header");
  const bienH1 = bienDoc.querySelectorAll("h1");
  const hasLandmarks = Boolean(bienMain && bienHeader && bienH1.length === 1);
  check(
    "Bienvenida: landmarks semánticos (<header>, <main>, único <h1>)",
    hasLandmarks,
    `header=${!!bienHeader}, main=${!!bienMain}, h1Count=${bienH1.length}`
  );

  const bienInputs = bienDoc.querySelectorAll("input, select, textarea");
  let bienAllLabeled = true;
  const unlabeledList = [];
  bienInputs.forEach((inp) => {
    const parentLabel = inp.closest("label");
    const ariaLabel = inp.getAttribute("aria-label");
    const ariaLabelledBy = inp.getAttribute("aria-labelledby");
    const id = inp.id;
    const forLabel = id ? bienDoc.querySelector(`label[for="${id}"]`) : null;
    if (!parentLabel && !ariaLabel && !ariaLabelledBy && !forLabel) {
      bienAllLabeled = false;
      unlabeledList.push(inp.outerHTML.slice(0, 60));
    }
  });
  check(
    "Bienvenida: todos los controles de formulario tienen label o atributo ARIA",
    bienAllLabeled,
    `Faltan: ${unlabeledList.join("; ")}`
  );

  const bienFocusable = bienDoc.querySelectorAll("[tabindex]");
  const bienBadTabs = [];
  bienFocusable.forEach((el) => {
    const ti = parseInt(el.getAttribute("tabindex"), 10);
    if (!isNaN(ti) && ti > 0) {
      bienBadTabs.push(`${el.tagName} con tabindex=${ti}`);
    }
  });
  check(
    "Bienvenida: orden de tabulación respeta el orden del DOM (sin tabindex > 0)",
    bienBadTabs.length === 0,
    `Encontrados: ${bienBadTabs.join(", ")}`
  );

  console.log("\n--- 5. Cierre de la tarjeta con Escape ---");
  // Montar tarjeta y disparar tecla Escape
  let closed = false;
  const escDom = loadEnvironment("options/comparar.html");
  escDom.window.QED.showCard(productData, {
    onClose: () => { closed = true; }
  });

  const escHost = escDom.window.document.getElementById("gina-tarjeta");
  const hostExistsBefore = Boolean(escHost);

  // Disparar evento Escape
  const escEvent = new escDom.window.KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    keyCode: 27,
    bubbles: true,
    cancelable: true
  });
  escDom.window.document.dispatchEvent(escEvent);

  const hostRemoved = !escDom.window.document.getElementById("gina-tarjeta");
  check(
    "La tarjeta se cierra y se retira al presionar Escape",
    hostExistsBefore && (closed || hostRemoved),
    `hostExistsBefore=${hostExistsBefore}, closed=${closed}, hostRemoved=${hostRemoved}`
  );

  // ----------------------------------------------------------------------------
  // Resumen
  // ----------------------------------------------------------------------------
  console.log(`\nPruebas de accesibilidad: ${pass}/${total} pasaron.`);
  if (pass < total) process.exit(1);
}

runAccessibilityTests().catch((err) => {
  console.error("Error fatal en pruebas de accesibilidad:", err);
  process.exit(1);
});
