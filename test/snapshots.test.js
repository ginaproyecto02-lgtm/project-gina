// Instantáneas de páginas reales de las tiendas (test/fixtures/paginas/<tienda>-<AAAA-MM>.html + .json).
// Las tiendas cambian su HTML sin avisar; estas pruebas detectan cuándo un selector dejó de leer
// marca, vendedor, precio, moneda, calificación o meses sin intereses. Cómo guardarlas: test/capturar_pagina.md.
// Una instantánea de más de 60 días genera un aviso en CI (no falla): toca capturarla de nuevo.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const { JSDOM } = require("jsdom");

const EXT = path.join(__dirname, "..", "extension");
const DIR = path.join(__dirname, "fixtures", "paginas");
const db = JSON.parse(fs.readFileSync(path.join(EXT, "data/brands.json"), "utf8"));
const registry = JSON.parse(fs.readFileSync(path.join(EXT, "data/sites.json"), "utf8"));
const MAX_DAYS = 60;

let pass = 0, total = 0;
function check(name, ok, detail) { total++; if (ok) pass++; console.log(`${ok ? "OK   " : "FALLA"} ${name}${detail ? " → " + detail : ""}`); }

function load(html, url) {
  const dom = new JSDOM(html, { url, runScripts: "outside-only" });
  for (const f of ["src/matcher.js", "src/reputation.js", "src/alternativas.js", "src/extractors.js", "src/comparador.js", "src/i18n.js"]) {
    vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), dom.getInternalVMContext());
  }
  dom.window.QED.I18N.setLang("es");
  return dom.window;
}

const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /^[a-z0-9_]+-\d{4}-\d{2}\.html$/.test(f)).sort() : [];
if (!files.length) {
  console.log("0 instantáneas en test/fixtures/paginas/. Guarda la primera siguiendo test/capturar_pagina.md.");
  console.log("::warning::Sin instantáneas de páginas reales: los selectores de las tiendas no se están probando contra HTML real.");
}

for (const f of files) {
  const base = f.replace(/\.html$/, "");
  const expPath = path.join(DIR, base + ".json");
  if (!fs.existsSync(expPath)) { check(`${base}: falta ${base}.json con los valores esperados`, false); continue; }
  const exp = JSON.parse(fs.readFileSync(expPath, "utf8"));
  const [, yy, mm] = base.match(/-(\d{4})-(\d{2})$/);
  const ageDays = Math.floor((Date.now() - Date.UTC(+yy, +mm - 1, 1)) / 86400000);
  if (ageDays > MAX_DAYS) console.log(`::warning::La instantánea ${f} tiene más de ${MAX_DAYS} días: vuelve a capturarla.`);

  const w = load(fs.readFileSync(path.join(DIR, f), "utf8"), exp.url);
  const QED = w.QED, u = new URL(exp.url);
  const entry = QED.siteInfo(registry, u.hostname, u.pathname);
  const pais = (entry && entry.pais) || exp.pais || "";
  const data = QED.extract(w.document, u.hostname, pais);
  const index = QED.buildIndex(db, [], {}, {});
  const m = QED.match(index, data.candidates, data.title);
  const rel = data.reliability || {};
  const got = {
    marca: m.found ? m.brand : (m.brandText || ""),
    vendedor: rel.seller || "",
    precio: rel.price ? rel.price.amount : null,
    moneda: rel.price ? rel.price.currency : null,
    calificacion: rel.structuredRating ? rel.structuredRating.score : null,
    msi: rel.installments ? (rel.installments.hasMsi ? (rel.installments.months || true) : false) : null
  };
  // Solo se comparan los campos escritos a mano en el .json (null o ausente = no se prueba).
  for (const k of ["marca", "vendedor", "precio", "moneda", "calificacion", "msi"]) {
    if (exp[k] === undefined || exp[k] === null) continue;
    const ok = typeof exp[k] === "string" && typeof got[k] === "string"
      ? got[k].toLowerCase().includes(exp[k].toLowerCase())
      : got[k] === exp[k];
    check(`${base}: ${k}`, ok, `esperado ${JSON.stringify(exp[k])}, leído ${JSON.stringify(got[k])}`);
  }
}

// Instantáneas de resultados de tiendas para el comparador en la tarjeta (F1)
const COMPARE_DIR = path.join(__dirname, "fixtures", "comparar");
const allCompareStores = Object.values(db.tiendas_comparar || {}).reduce((acc, list) => acc.concat(list), []);

const compareFixtures = [
  { file: "mercadolibre_resultado.html", domain: "mercadolibre.com.mx" },
  { file: "amazon_resultado.html", domain: "amazon.com.mx" },
  { file: "walmart_resultado.html", domain: "walmart.com.mx" },
  { file: "ebay_resultado.html", domain: "ebay.com" }
];

for (const cf of compareFixtures) {
  const p = path.join(COMPARE_DIR, cf.file);
  if (!fs.existsSync(p)) {
    check(`Comparar fixture ${cf.file}: archivo existe`, false);
    continue;
  }
  const html = fs.readFileSync(p, "utf8");
  const storeConfig = allCompareStores.find((s) => (s.fixture && s.fixture.endsWith(cf.file)) || s.dominio === cf.domain) || { dominio: cf.domain, nombre: cf.domain };
  const w = load(html, `https://${storeConfig.dominio}/search`);
  const items = w.QED.extractStoreItems(html, w.document, storeConfig);
  check(`Comparar fixture: ${storeConfig.nombre} extrae resultados (${cf.file})`,
    items.length > 0 && items[0].title && (items[0].price !== null || items[0].url),
    `extraídos ${items.length} productos, primero: ${items[0] && items[0].title}`
  );
}

console.log(`\n${pass}/${total} pruebas de instantáneas correctas (${files.length} páginas de producto, ${compareFixtures.length} de búsqueda)`);
process.exit(pass === total ? 0 : 1);
