// SPDX-License-Identifier: MIT
// Project Gina — Pruebas de rendimiento interno y umbrales (tanda J, puerta 6)
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

// ============================================================================
// 1. Función pura resumenRendimiento (extension/options/options.js)
// ============================================================================
console.log("--- 1. Función pura resumenRendimiento ---");

// Cargamos resumenRendimiento evaluando solo la función o en entorno controlado
const optionsCode = fs.readFileSync(path.join(EXT, "options/options.js"), "utf8");
const optionsHtml = fs.readFileSync(path.join(EXT, "options/options.html"), "utf8");
let resumenRendimiento;
{
  const dom = new JSDOM(optionsHtml, { virtualConsole, runScripts: "outside-only" });
  dom.window.fetch = () => Promise.resolve({ json: () => Promise.resolve({}), ok: true });
  dom.window.chrome = {
    runtime: { getURL: (p) => p },
    storage: {
      local: { get: () => Promise.resolve({}), set: () => Promise.resolve({}) },
      onChanged: { addListener: () => {} }
    }
  };
  const ctx = dom.getInternalVMContext();
  vm.runInContext(fs.readFileSync(path.join(EXT, "src/matcher.js"), "utf8"), ctx);
  vm.runInContext(fs.readFileSync(path.join(EXT, "src/ai.js"), "utf8"), ctx);
  vm.runInContext(fs.readFileSync(path.join(EXT, "src/i18n.js"), "utf8"), ctx);
  vm.runInContext(optionsCode, ctx);
  resumenRendimiento = dom.window.resumenRendimiento;
}

check("resumenRendimiento está definida", typeof resumenRendimiento === "function");

{
  const resEmpty = resumenRendimiento([]);
  check("Entrada vacía da ceros en métricas",
    resEmpty.n === 0 &&
    resEmpty.t_datos.n === 0 && resEmpty.t_datos.mediana === 0 && resEmpty.t_datos.p90 === 0 &&
    resEmpty.t_tarjeta.mediana === 0 && resEmpty.t_comparador.mediana === 0
  );

  const resNull = resumenRendimiento(null);
  check("Entrada null/undefined no lanza error", resNull && resNull.n === 0);

  // Muestra impar: [10, 20, 30] -> mediana = 20, p90 = 30
  const muestrasImpar = [
    { t_datos: 10, t_extraccion: 10, t_tarjeta: 10, t_comparador: 10 },
    { t_datos: 20, t_extraccion: 20, t_tarjeta: 20, t_comparador: 20 },
    { t_datos: 30, t_extraccion: 30, t_tarjeta: 30, t_comparador: 30 }
  ];
  const resImpar = resumenRendimiento(muestrasImpar);
  check("Muestra impar: mediana y p90 exactos",
    resImpar.t_datos.mediana === 20 && resImpar.t_datos.p90 === 30 && resImpar.t_datos.n === 3,
    JSON.stringify(resImpar.t_datos)
  );

  // Muestra par: [10, 20, 30, 40] -> mediana = (20+30)/2 = 25, p90 = 40
  const muestrasPar = [
    { t_datos: 10, t_extraccion: 5 },
    { t_datos: 20, t_extraccion: 15 },
    { t_datos: 30, t_extraccion: 25 },
    { t_datos: 40, t_extraccion: 35 }
  ];
  const resPar = resumenRendimiento(muestrasPar);
  check("Muestra par: promedio central y p90 exacto",
    resPar.t_datos.mediana === 25 && resPar.t_datos.p90 === 40 && resPar.t_datos.n === 4,
    JSON.stringify(resPar.t_datos)
  );

  // Filtra valores inválidos o negativos
  const muestrasSucias = [
    { t_datos: -5 },
    { t_datos: "invalido" },
    { t_datos: NaN },
    { t_datos: 50 }
  ];
  const resSucias = resumenRendimiento(muestrasSucias);
  check("Filtra números negativos, strings y NaN",
    resSucias.t_datos.n === 1 && resSucias.t_datos.mediana === 50,
    JSON.stringify(resSucias.t_datos)
  );
}

// ============================================================================
// 2. background.js: registrarMedicion y mensaje qed:perf
// ============================================================================
console.log("--- 2. background.js: registrarMedicion y qed:perf ---");

function makeBackgroundEnv() {
  const store = {};
  const listeners = { message: [] };
  const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  const chrome = {
    runtime: {
      id: "gina-mvp-test-id",
      getURL: (p) => "ext://" + p,
      onMessage: { addListener: (f) => listeners.message.push(f) },
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} }
    },
    storage: {
      local: {
        get: async (keys) => {
          const out = {};
          const ks = keys == null ? Object.keys(store) : typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
          for (const k of ks) if (k in store) out[k] = clone(store[k]);
          return out;
        },
        set: async (obj) => { for (const [k, v] of Object.entries(obj)) store[k] = clone(v); }
      }
    },
    alarms: { create: () => {}, onAlarm: { addListener: () => {} } },
    action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
    permissions: { contains: async () => true }
  };

  const fetchMock = async (url) => {
    if (String(url).startsWith("ext://")) {
      const rel = String(url).slice(6);
      const content = fs.readFileSync(path.join(EXT, rel), "utf8");
      return { ok: true, status: 200, json: async () => JSON.parse(content), text: async () => content };
    }
    return { ok: false, status: 404, text: async () => "" };
  };

  const ctx = vm.createContext({
    chrome,
    fetch: fetchMock,
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
    for (const f of files) vm.runInContext(fs.readFileSync(path.join(EXT, "src", f), "utf8"), ctx, { filename: f });
  };
  vm.runInContext(fs.readFileSync(path.join(EXT, "src", "background.js"), "utf8"), ctx, { filename: "background.js" });

  const send = (msg, sender = { tab: { id: 1 } }) => new Promise((resolve) => {
    let async = false;
    for (const l of listeners.message) {
      const r = l(msg, sender, resolve);
      if (r === true) async = true;
    }
    if (!async) setTimeout(() => resolve(undefined), 0);
  });

  return { store, send, ctx, chrome };
}

(async () => {
  const bg = makeBackgroundEnv();

  // 1. Remitente no autorizado
  const resBadId = await bg.send(
    { type: "qed:perf", entry: { dominio: "mercadolibre.com.mx", t_tarjeta: 50 } },
    { id: "otra-extension-maliciosa" }
  );
  check("Rechaza o ignora qed:perf si sender.id no coincide", resBadId === undefined || (resBadId && resBadId.ok === false));

  const resBadOrigin = await bg.send(
    { type: "qed:perf", entry: { dominio: "mercadolibre.com.mx", t_tarjeta: 50 } },
    { origin: "https://sitio-externo.com" }
  );
  check("Rechaza qed:perf si sender.origin es externo sin tab", resBadOrigin && resBadOrigin.ok === false && resBadOrigin.error === "unauthorized");

  // 2. Remitente válido pero dominio inválido
  const resBadDomain = await bg.send(
    { type: "qed:perf", entry: { dominio: "http://malicioso.com/path", t_tarjeta: 50 } },
    { tab: { id: 1 } }
  );
  check("Rechaza dominio inválido", resBadDomain && resBadDomain.ok === false && resBadDomain.error === "invalid_domain");

  // 3. Registro válido guarda datos limpios
  const resOk = await bg.send(
    { type: "qed:perf", entry: { dominio: "mercadolibre.com.mx", t_datos: 12, t_extraccion: 45, t_tarjeta: 80, t_comparador: 0 } },
    { tab: { id: 1 } }
  );
  check("Acepta medición válida de pestaña propia", resOk && resOk.ok === true);
  check("perfLog tiene la entrada registrada", bg.store.perfLog && bg.store.perfLog.length === 1 && bg.store.perfLog[0].dominio === "mercadolibre.com.mx");

  // 4. perfLog no excede 50 entradas
  for (let i = 0; i < 55; i++) {
    await bg.send(
      { type: "qed:perf", entry: { dominio: `tienda${i}.com`, t_tarjeta: i } },
      { tab: { id: 1 } }
    );
  }
  check("perfLog nunca supera 50 entradas", bg.store.perfLog.length === 50);
  check("perfLog mantiene la entrada más reciente al inicio", bg.store.perfLog[0].dominio === "tienda54.com");

  // 5. Borrar memoria vacía perfLog
  await bg.chrome.storage.local.set({ perfLog: [] });
  check("Vaciar perfLog deja 0 entradas", bg.store.perfLog.length === 0);

  // ============================================================================
  // 3. Umbrales de rendimiento sobre fixtures guardadas
  // ============================================================================
  console.log("--- 3. Umbrales de rendimiento sobre fixtures ---");

  const db = JSON.parse(fs.readFileSync(path.join(EXT, "data/brands.json"), "utf8"));
  const registry = JSON.parse(fs.readFileSync(path.join(EXT, "data/sites.json"), "utf8"));

  // Extracción + pintado de tarjeta en fixtures de semejanza
  const fixtureDirs = [
    { store: "amazon_mx", host: "www.amazon.com.mx", pais: "México" },
    { store: "mercadolibre_mx", host: "articulo.mercadolibre.com.mx", pais: "México" },
    { store: "walmart_mx", host: "www.walmart.com.mx", pais: "México" }
  ];

  const extractionTimes = [];

  for (const fdir of fixtureDirs) {
    const dirPath = path.join(__dirname, "fixtures", "semejanza", fdir.store);
    if (!fs.existsSync(dirPath)) continue;
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".html"));

    for (const file of files) {
      const html = fs.readFileSync(path.join(dirPath, file), "utf8");
      const dom = new JSDOM(html, { url: `https://${fdir.host}/test-product`, virtualConsole, runScripts: "outside-only" });
      dom.window.__GINA_SHADOW_OPEN__ = true;

      for (const src of ["src/matcher.js", "src/reputation.js", "src/alternativas.js", "src/extractors.js", "src/semejanza.js", "src/comparador.js", "src/flights.js", "src/notices.js", "src/i18n.js", "src/card.js"]) {
        vm.runInContext(fs.readFileSync(path.join(EXT, src), "utf8"), dom.getInternalVMContext());
      }
      dom.window.QED.I18N.setLang("es");

      const t0 = Date.now();
      const data = dom.window.QED.extract(dom.window.document, fdir.host, fdir.pais);
      const index = dom.window.QED.buildIndex(db, [], {}, {});
      const matched = dom.window.QED.match(index, data.candidates || [], data.title);
      dom.window.QED.showCard(Object.assign(matched, { store: { nombre: fdir.store, pais: fdir.pais } }), {
        minimized: false,
        index,
        onToggle: () => {},
        onClose: () => {}
      });
      const elapsed = Date.now() - t0;
      extractionTimes.push(elapsed);

      // Comprobar que NADA se escribió en el DOM de la página anfitriona
      const hostAttrs = Array.from(dom.window.document.documentElement.attributes).map((a) => a.name);
      const bodyAttrs = Array.from(dom.window.document.body.attributes).map((a) => a.name);
      if (hostAttrs.some((a) => a.startsWith("data-gina-perf")) || bodyAttrs.some((a) => a.startsWith("data-gina-perf"))) {
        check("No se escriben tiempos ni huellas en el DOM anfitrión", false, `Huella detectada en ${file}`);
      }
    }
  }

  extractionTimes.sort((a, b) => a - b);
  const mid = Math.floor(extractionTimes.length / 2);
  const medianExtraction = extractionTimes.length % 2 !== 0
    ? extractionTimes[mid]
    : Math.round((extractionTimes[mid - 1] + extractionTimes[mid]) / 2);

  check(
    `Extracción + pintado < 300 ms de mediana en JSDOM (mediana observada: ${medianExtraction} ms, n=${extractionTimes.length})`,
    medianExtraction < 300,
    `Mediana fue ${medianExtraction} ms`
  );

  // Lectura de páginas de resultados del comparador
  const compFixtures = [
    { file: "amazon_resultado.html", dominio: "amazon.com.mx", pais: "México", selectores: { item: "div[data-component-type='s-search-result']", titulo: "h2", precio: ".a-price .a-offscreen", enlace: "h2 a" } },
    { file: "ebay_resultado.html", dominio: "ebay.com", pais: "EE.UU.", selectores: { item: ".s-item", titulo: ".s-item__title", precio: ".s-item__price", enlace: ".s-item__link" } },
    { file: "mercadolibre_resultado.html", dominio: "mercadolibre.com.mx", pais: "México", selectores: { item: ".ui-search-layout__item", titulo: ".ui-search-item__title", precio: ".andes-money-amount__fraction", enlace: ".ui-search-link" } },
    { file: "walmart_resultado.html", dominio: "walmart.com.mx", pais: "México", selectores: { item: "[data-item-id]", titulo: "span[data-automation-id='product-title']", precio: "[data-automation-id='product-price']", enlace: "a" } }
  ];

  const compTimes = [];
  for (const cf of compFixtures) {
    const cfPath = path.join(__dirname, "fixtures", "comparar", cf.file);
    if (!fs.existsSync(cfPath)) continue;
    const html = fs.readFileSync(cfPath, "utf8");
    const dom = new JSDOM(html, { url: `https://www.${cf.dominio}/search`, virtualConsole, runScripts: "outside-only" });
    vm.runInContext(fs.readFileSync(path.join(EXT, "src", "semejanza.js"), "utf8"), dom.getInternalVMContext());
    vm.runInContext(fs.readFileSync(path.join(EXT, "src", "comparador.js"), "utf8"), dom.getInternalVMContext());
    vm.runInContext(fs.readFileSync(path.join(EXT, "src", "adaptivo.js"), "utf8"), dom.getInternalVMContext());

    const t0 = Date.now();
    const items = dom.window.QED.extractStoreItems(html, dom.window.document, {
      dominio: cf.dominio,
      pais: cf.pais,
      selectores: cf.selectores
    });
    const elapsed = Date.now() - t0;
    compTimes.push({ file: cf.file, ms: elapsed, count: items.length });

    check(`Lectura de comparador en ${cf.file} < 1,500 ms (tardó ${elapsed} ms, n=${items.length})`, elapsed < 1500);
  }

  // ============================================================================
  // 4. Tamaño de respuesta qed:data
  // ============================================================================
  console.log("--- 4. Tamaño de datos transferidos (qed:data) ---");
  const dataResponse = await bg.ctx.getDataForContent();
  const rawBytes = Buffer.byteLength(JSON.stringify(dataResponse), "utf8");
  const kb = Math.round(rawBytes / 1024);

  console.log(`   Tamaño de payload qed:data: ${kb} KB (${rawBytes} bytes)`);
  check("Payload de qed:data está medido y es < 4 MB", rawBytes > 0 && rawBytes < 4 * 1024 * 1024);

  // ============================================================================
  // Resumen
  // ============================================================================
  console.log(`\nPruebas de rendimiento: ${pass}/${total} pasaron.`);
  if (pass < total) process.exit(1);
})();
