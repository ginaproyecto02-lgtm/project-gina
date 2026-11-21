// SPDX-License-Identifier: MIT
// Project Gina — Pruebas unitarias de Onboarding (bienvenida) y Seguimiento local de precio objetivo (Opción B)
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const virtualConsole = new VirtualConsole();
virtualConsole.on("error", () => {});
virtualConsole.on("warn", () => {});

async function runTests() {
  console.log("Iniciando pruebas de Onboarding y Seguimiento de precio objetivo (test/onboarding_seguimiento.test.js)...\n");

  // ============================================================================
  // BLOQUE 1: Onboarding al instalar (30 segundos)
  // ============================================================================
  console.log("--- 1. Onboarding al instalar ---");

  // 1.1 Verificación de trigger en background.js
  {
    const bgCode = fs.readFileSync(path.join(EXT, "src/background.js"), "utf8");
    const hasOnInstalledCheck = bgCode.includes('details.reason === "install"') && bgCode.includes("options/bienvenida.html");
    check("1.1 background.js abre bienvenida.html al instalar (details.reason === 'install')", hasOnInstalledCheck);
  }

  // 1.2 Estructura y semántica de bienvenida.html
  {
    const bienvenidaHtmlPath = path.join(EXT, "options/bienvenida.html");
    check("1.2a bienvenida.html existe", fs.existsSync(bienvenidaHtmlPath));

    const bienvenidaHtml = fs.readFileSync(bienvenidaHtmlPath, "utf8");
    const dom = new JSDOM(bienvenidaHtml, { virtualConsole });
    const doc = dom.window.document;

    const hasDoctype = bienvenidaHtml.trim().toLowerCase().startsWith("<!doctype html>");
    const hasLang = doc.documentElement.getAttribute("lang") === "es";
    const h1Count = doc.querySelectorAll("h1").length;
    const step1 = doc.querySelector("#step1");
    const step2 = doc.querySelector("#step2");
    const step3 = doc.querySelector("#step3");
    const countrySelect = doc.querySelector("#country_select");
    const finishBtn = doc.querySelector("#btnFinish");

    check("1.2b bienvenida.html tiene DOCTYPE, lang='es' y exactamente un <h1>", hasDoctype && hasLang && h1Count === 1);
    check("1.2c bienvenida.html contiene los 3 pasos claramente estructurados", !!step1 && !!step2 && !!step3);
    check("1.2d Campos clave presentes (country_select, botón finalizar, etc.)", !!countrySelect && !!finishBtn);

    const inputs = doc.querySelectorAll("input, select, textarea");
    let allLabeled = true;
    for (const input of inputs) {
      const parentLabel = input.closest("label");
      const hasAria = input.getAttribute("aria-label") || input.getAttribute("aria-labelledby");
      const id = input.id;
      const forLabel = id ? doc.querySelector(`label[for="${id}"]`) : null;
      if (!parentLabel && !hasAria && !forLabel) {
        allLabeled = false;
        break;
      }
    }
    check("1.2e Todos los inputs y selects tienen etiqueta accesible asociada", allLabeled);
  }

  // 1.3 Comportamiento de guardado en bienvenida.js
  {
    const mockStorage = {};
    const mockChrome = {
      storage: {
        local: {
          get: (keys, cb) => {
            const res = {};
            const arr = Array.isArray(keys) ? keys : [keys];
            for (const k of arr) if (mockStorage[k] !== undefined) res[k] = mockStorage[k];
            if (cb) cb(res);
            return Promise.resolve(res);
          },
          set: (obj, cb) => {
            Object.assign(mockStorage, obj);
            if (cb) cb();
            return Promise.resolve();
          }
        }
      }
    };

    const html = fs.readFileSync(path.join(EXT, "options/bienvenida.html"), "utf8");
    const dom = new JSDOM(html, { virtualConsole, runScripts: "outside-only" });
    dom.window.chrome = mockChrome;
    dom.window.browser = mockChrome;

    const vmCtx = dom.getInternalVMContext();
    vmCtx.chrome = mockChrome;
    vmCtx.browser = mockChrome;

    for (const s of ["src/reputation.js", "src/i18n.js", "options/bienvenida.js"]) {
      vm.runInContext(fs.readFileSync(path.join(EXT, s), "utf8"), vmCtx);
    }

    await sleep(20);

    const doc = dom.window.document;
    const countrySel = doc.querySelector("#country_select");
    if (countrySel) countrySel.value = "México";
    const finishBtn = doc.querySelector("#btnFinish");
    if (finishBtn) finishBtn.click();

    await sleep(40);

    check("1.3a Guardado en storage.local registra 'onboarding' con completed: true",
      mockStorage.onboarding && mockStorage.onboarding.completed === true);
    check("1.3b Guardado registra 'gina_user_profile' y 'settings'",
      mockStorage.gina_user_profile === "consciente" &&
      mockStorage.settings && mockStorage.settings.country === "México");
  }

  // ============================================================================
  // BLOQUE 2: Precio por unidad de medida destacado
  // ============================================================================
  console.log("\n--- 2. Precio por unidad de medida ---");

  {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", { virtualConsole, runScripts: "outside-only" });
    for (const s of ["src/semejanza.js", "src/i18n.js"]) {
      vm.runInContext(fs.readFileSync(path.join(EXT, s), "utf8"), dom.getInternalVMContext());
    }
    const calc = dom.window.QED.calculateUnitPrice;

    const u1 = calc(100, { valor: 1000, unidad: "g" }, 1);
    check("2.1a 1000g a $100 da $100.00/kg", u1 && u1.unitPrice === 100 && u1.unitLabel === "/kg");

    const u2 = calc(25, { valor: 100, unidad: "g" }, 1);
    check("2.1b 100g a $25 da $25.00/100 g", u2 && u2.unitPrice === 25 && u2.unitLabel === "/100 g");

    const u3 = calc(50, { valor: 1000, unidad: "ml" }, 1);
    check("2.1c 1000ml a $50 da $50.00/L", u3 && u3.unitPrice === 50 && u3.unitLabel === "/L");

    const u4 = calc(120, null, 6);
    check("2.1d Multipack 6 piezas a $120 da $20.00/pza", u4 && u4.unitPrice === 20 && u4.unitLabel === "/pza");
  }

  // 2.2 Renderizado visible en card.js
  {
    const cardDom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://www.walmart.com.mx/ip/test/123", runScripts: "outside-only" });
    cardDom.window.__GINA_SHADOW_OPEN__ = true;
    for (const s of ["src/matcher.js", "src/reputation.js", "src/alternativas.js", "src/semejanza.js", "src/i18n.js", "src/card.js"]) {
      vm.runInContext(fs.readFileSync(path.join(EXT, s), "utf8"), cardDom.getInternalVMContext());
    }

    cardDom.window.QED.showCard({
      found: true,
      brand: "Nutella",
      title: "Nutella Crema de Avellana 1 kg Frasco",
      reliabilityEval: {
        price: { amount: 160, currency: "MXN", formatted: "$160.00" },
        productId: { id: "NUT1000", type: "asin" }
      }
    }, {});

    const host = cardDom.window.document.getElementById("gina-tarjeta");
    const shadow = host && host.shadowRoot;
    const unitBadge = shadow && shadow.querySelector(".price-unit-badge");

    check("2.2a Tarjeta renderiza insignia destacada de precio por unidad (.price-unit-badge)",
      !!unitBadge && unitBadge.textContent.includes("/kg"));
  }

  // ============================================================================
  // BLOQUE 3: Botón y Seguimiento local de precio objetivo
  // ============================================================================
  console.log("\n--- 3. Seguimiento local de precio objetivo ---");

  {
    const mockStorage = {
      followedProducts: []
    };

    const mockChrome = {
      storage: {
        local: {
          get: (keys, cb) => {
            const res = {};
            const arr = Array.isArray(keys) ? keys : [keys];
            for (const k of arr) if (mockStorage[k] !== undefined) res[k] = mockStorage[k];
            if (cb) cb(res);
            return Promise.resolve(res);
          },
          set: (obj, cb) => {
            Object.assign(mockStorage, obj);
            if (cb) cb();
            return Promise.resolve();
          }
        }
      }
    };

    const cardDom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://www.amazon.com.mx/dp/B00TEST01", runScripts: "outside-only" });
    cardDom.window.__GINA_SHADOW_OPEN__ = true;
    cardDom.window.chrome = mockChrome;
    cardDom.window.browser = mockChrome;

    const vmCtx = cardDom.getInternalVMContext();
    vmCtx.chrome = mockChrome;
    vmCtx.browser = mockChrome;

    for (const s of ["src/matcher.js", "src/reputation.js", "src/alternativas.js", "src/semejanza.js", "src/i18n.js", "src/card.js"]) {
      vm.runInContext(fs.readFileSync(path.join(EXT, s), "utf8"), vmCtx);
    }

    cardDom.window.QED.showCard({
      found: true,
      brand: "Sony",
      title: "Audífonos Inalámbricos Sony WH-1000XM5",
      store: { nombre: "Amazon México", dominio: "amazon.com.mx" },
      reliabilityEval: {
        price: { amount: 6500, currency: "MXN", formatted: "$6,500.00" },
        productId: { id: "B00TEST01", type: "asin" },
        targetPrice: 5850
      }
    }, {});

    const host = cardDom.window.document.getElementById("gina-tarjeta");
    const shadow = host && host.shadowRoot;
    const followBtn = shadow && shadow.querySelector(".btn-follow-target");

    check("3.1a Botón 'Seguir precio objetivo' (.btn-follow-target) está presente en la tarjeta", !!followBtn);

    if (followBtn) followBtn.click();
    await sleep(40);

    check("3.1b Clic en botón guarda producto en followedProducts de storage.local",
      mockStorage.followedProducts && mockStorage.followedProducts.length === 1 &&
      mockStorage.followedProducts[0].id === "B00TEST01" &&
      mockStorage.followedProducts[0].targetPrice === 5850);

    // Simular límite de 50 productos
    const fake55 = [];
    for (let i = 0; i < 55; i++) {
      fake55.push({ site: "amazon.com.mx", id: "P" + i, title: "Prod " + i, currentPrice: 100, targetPrice: 90, currency: "MXN", date: Date.now() });
    }
    mockStorage.followedProducts = fake55;

    if (followBtn) followBtn.click(); // unfollow
    await sleep(40);
    if (followBtn) followBtn.click(); // re-follow
    await sleep(40);

    check("3.1c Lista acotada a máximo 50 productos",
      mockStorage.followedProducts.length <= 50);

    // Revisita de producto con cambio de precio (Bug funcional 2)
    mockStorage.followedProducts = [{
      site: "amazon.com.mx",
      id: "B00TEST02",
      title: "Sony WH-1000XM5",
      currentPrice: 6500,
      targetPrice: 5850,
      currency: "MXN",
      date: Date.now() - 50000
    }];

    cardDom.window.QED.showCard({
      found: true,
      brand: "Sony",
      title: "Audífonos Inalámbricos Sony WH-1000XM5",
      store: { nombre: "Amazon México", dominio: "amazon.com.mx" },
      reliabilityEval: {
        price: { amount: 5400, currency: "MXN", formatted: "$5,400.00" },
        productId: { id: "B00TEST02", type: "asin" },
        targetPrice: 5850
      }
    }, {});
    await sleep(40);

    const revisitedItem = mockStorage.followedProducts.find((it) => it.id === "B00TEST02");
    const revisitShadow = cardDom.window.document.getElementById("gina-tarjeta").shadowRoot;
    const revisitBtn = revisitShadow && revisitShadow.querySelector(".btn-follow-target");

    check("3.1d Revisitando producto seguido actualiza currentPrice y fecha al bajar de precio",
      revisitedItem && revisitedItem.currentPrice === 5400 && revisitedItem.date >= Date.now() - 5000);
    check("3.1e Botón en producto ya seguido muestra estado activo",
      revisitBtn && revisitBtn.getAttribute("data-followed") === "true");
  }

  // ============================================================================
  // BLOQUE 4: Sección de productos seguidos en Popup y borrado en Opciones
  // ============================================================================
  console.log("\n--- 4. Integración en Popup y Opciones ---");

  {
    const popupHtml = fs.readFileSync(path.join(EXT, "popup/popup.html"), "utf8");
    const popDom = new JSDOM(popupHtml, { virtualConsole });
    const doc = popDom.window.document;

    const followedTabBtn = doc.querySelector('nav button[data-tab="followed"]');
    const followedSection = doc.querySelector('section#followed');
    const clearFollowedBtn = doc.querySelector('#btnClearFollowedPopup');

    check("4.1a Popup cuenta con pestaña 'Seguidos' y sección #followed",
      !!followedTabBtn && !!followedSection);
    check("4.1b Popup cuenta con botón para vaciar productos seguidos",
      !!clearFollowedBtn);
  }

  {
    const optionsHtml = fs.readFileSync(path.join(EXT, "options/options.html"), "utf8");
    const optDom = new JSDOM(optionsHtml, { virtualConsole });
    const doc = optDom.window.document;

    const clearOptBtn = doc.querySelector('#clearFollowedProducts');
    const statsEl = doc.querySelector('#followedStats');

    check("4.2a Opciones incluye botón #clearFollowedProducts y contenedor de estado #followedStats",
      !!clearOptBtn && !!statsEl);
  }

  console.log(`\nResultado: ${pass}/${total} pruebas pasaron.`);
  process.exit(pass === total ? 0 : 1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
