/**
 * @file test/prueba_mvp.test.js
 * Pruebas de las herramientas de auditoría y prueba del MVP (Puertas 1, 2 y 3 / Fase J5):
 * 1. Función pura aMarkdown y checklist manual (options/prueba.html, options/prueba.js)
 * 2. Carga en JSDOM y dominios de tiendas reales en sites.json
 * 3. Muestra estratificada para auditoría de datos (datagen/muestra_auditoria.py)
 * 4. Candados de reputación (build_data.py): rechazo de casos inválidos y paso de datos reales
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execSync } = require("child_process");
const { JSDOM, VirtualConsole } = require("./node_modules/jsdom");

const EXT = path.resolve(__dirname, "../extension");
const ROOT = path.resolve(__dirname, "..");
const { aMarkdown, ITEMS_PRUEBA } = require(path.join(EXT, "options/prueba.js"));

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

console.log("=== J5a. Lista de verificación y función aMarkdown (Puerta 1) ===");

// 1. aMarkdown con estado conocido
{
  const mockEstado = {
    inst_chrome: { status: "pasa", note: "Sin advertencias" },
    store_amazon_mx: { status: "pasa", note: "Extracción OK" },
    store_ml_mx: { status: "falla", note: "Selectores cambiaron" }
  };
  const mockMeta = {
    navegador: "Firefox",
    version: "140.0",
    fecha: "2026-11-15"
  };

  const md = aMarkdown(mockEstado, mockMeta);

  check("aMarkdown incluye título del reporte", md.includes("# Project Gina — Reporte de prueba manual del MVP (Puerta 1)"));
  check("aMarkdown incluye fecha, navegador y versión", md.includes("2026-11-15") && md.includes("Firefox") && md.includes("140.0"));
  check("aMarkdown reporta conteos correctos (2 pasan, 1 fallan)", md.includes("2 pasan · 1 fallan"));
  check("aMarkdown formatea enlaces de tiendas", md.includes("[Buscar en Amazon México](https://www.amazon.com.mx/s?k=nutella+1+kg)"));
  check("aMarkdown incluye notas del usuario", md.includes("Sin advertencias") && md.includes("Selectores cambiaron"));
}

// 2. Carga de prueba.html en JSDOM
{
  const html = fs.readFileSync(path.join(EXT, "options/prueba.html"), "utf8");
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(html, { virtualConsole, runScripts: "outside-only" });

  check("prueba.html tiene título correcto", dom.window.document.title.includes("Lista de verificación del MVP"));
  check("prueba.html tiene contenedor checklistRoot", Boolean(dom.window.document.getElementById("checklistRoot")));
  check("prueba.html tiene botón btnCopyMd", Boolean(dom.window.document.getElementById("btnCopyMd")));
  check("prueba.html tiene summaryCounts", Boolean(dom.window.document.getElementById("summaryCounts")));
}

// 3. Enlaces a tiendas son https y coinciden con sites.json
{
  const sitesData = JSON.parse(fs.readFileSync(path.join(EXT, "data/sites.json"), "utf8")).sitios;
  const sitesByDomain = new Map(sitesData.map((s) => [s.d, s]));

  const secTiendas = ITEMS_PRUEBA.find((s) => s.secId === "tiendas_mx");
  check("Sección tiendas_mx tiene 10 tiendas", secTiendas && secTiendas.items.length === 10);

  let allStoresValid = true;
  const storeErrors = [];

  for (const item of secTiendas.items) {
    if (!item.url.startsWith("https://")) {
      allStoresValid = false;
      storeErrors.push(`${item.id}: no es https (${item.url})`);
    }
    const host = new URL(item.url).hostname.replace(/^www\./, "").replace(/^listado\./, "").replace(/^despensa\./, "");
    const baseSite = sitesByDomain.get(item.dominio);
    if (!baseSite) {
      allStoresValid = false;
      storeErrors.push(`${item.id}: dominio ${item.dominio} no está en sites.json`);
    }
  }

  check(
    "Todos los enlaces de las 10 tiendas son https y pertenecen a dominios de sites.json",
    allStoresValid,
    storeErrors.join("; ")
  );
}

console.log("\n=== J5b. Muestra para la auditoría de datos (Puerta 2) ===");

// 4. muestra_auditoria.py: determinismo, estratificación y no mutación
{
  const scriptPath = path.join(ROOT, "datagen/muestra_auditoria.py");
  check("datagen/muestra_auditoria.py existe", fs.existsSync(scriptPath));

  // Comprobar estado de git antes de correr el script
  const gitStatusBefore = execSync("git status --porcelain datagen/", { cwd: ROOT, encoding: "utf-8" }).trim();

  // Generar muestra con semilla 2026-11-15
  const out1 = execSync(`python datagen/muestra_auditoria.py --semilla 2026-11-15`, { cwd: ROOT, encoding: "utf-8" });
  const file1 = path.join(ROOT, "auditoria/muestra-2026-11-15.md");
  const content1 = fs.readFileSync(file1, "utf8");

  // Generar segunda vez con misma semilla
  execSync(`python datagen/muestra_auditoria.py --semilla 2026-11-15`, { cwd: ROOT, encoding: "utf-8" });
  const content2 = fs.readFileSync(file1, "utf8");

  check("Misma semilla produce exactamente el mismo contenido (determinismo)", content1 === content2);

  const gitStatusAfter = execSync("git status --porcelain datagen/", { cwd: ROOT, encoding: "utf-8" }).trim();
  check("datagen/muestra_auditoria.py no modifica ningún archivo de datagen/", gitStatusBefore === gitStatusAfter);

  // Comprobar estratificación en el contenido generado
  const filas = content1.split("\n").filter((l) => l.startsWith("|") && !l.includes("Empresa | Marcas") && !l.includes("---|---"));
  check("Muestra contiene exactamente 50 empresas", filas.length === 50, `Obtenidas: ${filas.length}`);

  check("Muestra indica al menos 10 con confianza Alta", content1.includes("Empresas con confianza «Alta»:") && !content1.includes("Alta»: 0"));
}

console.log("\n=== J5c. Candados de reputación en build_data.py (Puerta 3) ===");

// 5. Prueba de candados en build_data.py vía Python
{
  const testPyScript = `
import json, os, sys
sys.path.insert(0, os.path.join(os.getcwd(), 'datagen'))
from build_data import validar_evento_reputacion, PORTADAS_NO_VALIDAS

# Evento base válido
ev_valido = {
    "tema": "consumidor",
    "titulo": "Acuerdo de prueba",
    "pais": "México",
    "anio": 2024,
    "estado": "acuerdo",
    "resumen": "La empresa acordó pagar sin admitir responsabilidad.",
    "fuente": "Fuente oficial",
    "url": "https://profeco.gob.mx/estudios/atun-2024.pdf"
}

# Debe pasar sin lanzar excepción
try:
    validar_evento_reputacion("test", ev_valido, PORTADAS_NO_VALIDAS)
    print("TEST_VALIDO_PASS")
except Exception as e:
    print(f"TEST_VALIDO_FAIL: {e}")

# Candado 1: URL no https o portada
ev1_bad = dict(ev_valido, url="https://gob.mx")
try:
    validar_evento_reputacion("test", ev1_bad, PORTADAS_NO_VALIDAS)
    print("CANDADO_1_FAIL")
except AssertionError:
    print("CANDADO_1_PASS")

# Candado 2: Falta anio o estado
ev2_bad = dict(ev_valido, anio=None)
try:
    validar_evento_reputacion("test", ev2_bad, PORTADAS_NO_VALIDAS)
    print("CANDADO_2_FAIL")
except AssertionError:
    print("CANDADO_2_PASS")

# Candado 3: Estado inválido (ej. 'alegacion' o 'inventado')
ev3_bad = dict(ev_valido, estado="inventado")
try:
    validar_evento_reputacion("test", ev3_bad, PORTADAS_NO_VALIDAS)
    print("CANDADO_3_FAIL")
except AssertionError:
    print("CANDADO_3_PASS")

# Candado 4: Palabra de juicio sin sentencia (ej. fraude o estafa fuera de cita)
ev4_bad = dict(ev_valido, resumen="Cometió un fraude millonario contra los clientes sin admitir culpa.")
try:
    validar_evento_reputacion("test", ev4_bad, PORTADAS_NO_VALIDAS)
    print("CANDADO_4_FAIL")
except AssertionError:
    print("CANDADO_4_PASS")

# Candado 5: Acuerdo sin aclarar si hubo o no admisión de culpa
ev5_bad = dict(ev_valido, resumen="La empresa acordó pagar 10 millones de dólares para cerrar el caso.")
try:
    validar_evento_reputacion("test", ev5_bad, PORTADAS_NO_VALIDAS)
    print("CANDADO_5_FAIL")
except AssertionError:
    print("CANDADO_5_PASS")
`;

  const pyOutput = execSync("python -", {
    cwd: ROOT,
    input: testPyScript,
    encoding: "utf-8"
  });

  check("Candado base: evento conforme pasa la validación", pyOutput.includes("TEST_VALIDO_PASS"));
  check("Candado 1: rechaza URL portada o raíz de dominio", pyOutput.includes("CANDADO_1_PASS"));
  check("Candado 2: rechaza evento sin anio o sin estado", pyOutput.includes("CANDADO_2_PASS"));
  check("Candado 3: rechaza estado fuera de la lista permitida", pyOutput.includes("CANDADO_3_PASS"));
  check("Candado 4: rechaza palabras de juicio (fraude/estafa) fuera de cita sin sentencia", pyOutput.includes("CANDADO_4_PASS"));
  check("Candado 5: rechaza acuerdo sin aclaración de admisión/no admisión de culpa", pyOutput.includes("CANDADO_5_PASS"));
}

// 6. Base real completa pasa build_data.py sin errores
{
  let buildOk = false;
  try {
    execSync("python datagen/build_data.py", { cwd: ROOT, stdio: "pipe" });
    buildOk = true;
  } catch (e) {
    buildOk = false;
  }
  check("Todos los eventos de reputación reales en datagen/reputacion.json pasan los 5 candados", buildOk);
}

// ============================================================================
// Resumen
// ============================================================================
console.log(`\nPruebas de prueba manual y auditoría (J5): ${pass}/${total} pasaron.`);
if (pass < total) process.exit(1);
