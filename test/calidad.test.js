// SPDX-License-Identifier: MIT
// Gina — Suite de pruebas de Estudios Oficiales de Calidad y Grados Alimenticios (PROFECO, USDA, MAPA).

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const EXT = path.join(ROOT, "extension");

function loadModule(relPath, context = {}) {
  const fullPath = path.join(EXT, relPath);
  const code = fs.readFileSync(fullPath, "utf8");
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}

const db = JSON.parse(fs.readFileSync(path.join(EXT, "data", "brands.json"), "utf8"));
const estudiosReales = JSON.parse(fs.readFileSync(path.join(ROOT, "datagen", "estudios_calidad.json"), "utf8"));
// La lógica se prueba con copias marcadas como verificadas; los datos reales aún no lo están (ver prueba 0).
const estudios = estudiosReales.map((e) => Object.assign({}, e, { verificado: "prueba", url_estudio: e.url }));

let pass = 0;
let total = 0;
function check(name, cond, details = "") {
  total++;
  if (cond) {
    pass++;
    console.log(`OK    ${name}${details ? " → " + details : ""}`);
  } else {
    console.error(`FAIL  ${name}${details ? " → " + details : ""}`);
  }
}

async function run() {
  console.log("Iniciando suite de pruebas de Calidad y Grados Alimenticios (test/calidad.test.js)...\n");

  // Entorno VM con QED y dependencias
  const ctx = {
    console,
    location: { hostname: "www.amazon.com.mx", href: "https://www.amazon.com.mx/dp/B001" },
    document: {
      createElement: () => ({ setAttribute: () => {}, appendChild: () => {} }),
      head: { appendChild: () => {} }
    }
  };
  loadModule("src/matcher.js", ctx);
  loadModule("src/i18n.js", ctx);
  loadModule("src/notices.js", ctx);
  loadModule("src/card.js", ctx);

  const QED = ctx.QED;

  // 0. Validación 2026-11-09: ningún estudio sin verificar (fecha + URL del estudio concreto) llega a la tarjeta
  {
    const r = QED.evaluateProductNotices({ title: "Atún Aurrera en agua 140 g", category: "abarrotes", categoryConfidence: "alta",
      storeCountry: "México", brand: "Aurrera", estudiosCalidadDb: estudiosReales });
    const sinVerificar = estudiosReales.filter((e) => !e.verificado || !e.url_estudio).length;
    check("0. Estudios sin verificar no se muestran (son juicios sobre marcas reales)",
      !r.some((n) => n.categoria === "calidad"), `${sinVerificar} de ${estudiosReales.length} sin verificar`);
  }

  // 1. Auditoría de esquema de estudios_calidad.json
  {
    assert(Array.isArray(estudios) && estudios.length >= 8, "Debe haber al menos 8 estudios oficiales");
    let allValid = true;
    for (const est of estudios) {
      if (!est.id || !est.pais || !est.autoridad || !est.url || !est.url.startsWith("https://") || !Array.isArray(est.items) || est.items.length === 0) {
        allValid = false;
        break;
      }
    }
    check("1. Esquema de estudios_calidad.json válido (IDs, países, URLs seguras e items)", allValid, `${estudios.length} estudios validados`);
  }

  // 2. PROFECO México: Atún Dolores (Lomo / Positivo) vs Aurrera (Advertencia / Soya)
  {
    const rDolores = QED.evaluateProductNotices({
      title: "Atún Dolores en Agua Lomo 140 g",
      category: "abarrotes",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "Dolores",
      estudiosCalidadDb: estudios
    });
    const qDolores = rDolores.find(n => n.categoria === "calidad");

    const rAurrera = QED.evaluateProductNotices({
      title: "Atún con Soya Aurrera en Agua 140 g",
      category: "abarrotes",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "Aurrera",
      estudiosCalidadDb: estudios
    });
    const qAurrera = rAurrera.find(n => n.categoria === "calidad");

    check("2. PROFECO: Atún Dolores positivo (sin soya) vs Aurrera advertencia (62% soya)",
      !!qDolores && qDolores.resultado === "positivo" && qDolores.texto.includes("Sin soya") &&
      !!qAurrera && qAurrera.resultado === "advertencia" && qAurrera.texto.includes("hasta 62% de soya"),
      `Dolores: ${qDolores ? qDolores.resultado : "null"} | Aurrera: ${qAurrera ? qAurrera.resultado : "null"}`);
  }

  // 3. PROFECO México: Queso artesanal Covadonga y Flor de Alfalfa vs Imitación Franja
  {
    const rCova = QED.evaluateProductNotices({
      title: "Queso Panela Covadonga 400 g",
      category: "lacteos",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "Covadonga",
      estudiosCalidadDb: estudios
    });
    const rFlor = QED.evaluateProductNotices({
      title: "Queso Panela Flor de Alfalfa Artesanal 400 g",
      category: "lacteos",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "Flor de Alfalfa",
      estudiosCalidadDb: estudios
    });
    const rFranja = QED.evaluateProductNotices({
      title: "Queso Panela Franja Imitación con Grasa Vegetal 400 g",
      category: "lacteos",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "Franja",
      estudiosCalidadDb: estudios
    });

    const qCova = rCova.find(n => n.categoria === "calidad");
    const qFlor = rFlor.find(n => n.categoria === "calidad");
    const qFranja = rFranja.find(n => n.categoria === "calidad");

    check("3. PROFECO: Quesos auténticos (Covadonga, Flor de Alfalfa) vs Imitación vegetal (Franja)",
      !!qCova && qCova.resultado === "positivo" &&
      !!qFlor && qFlor.resultado === "positivo" &&
      !!qFranja && qFranja.resultado === "advertencia" && qFranja.texto.includes("Imitación"),
      `Cova: ${qCova ? qCova.resultado : "null"}, Flor: ${qFlor ? qFlor.resultado : "null"}, Franja: ${qFranja ? qFranja.resultado : "null"}`);
  }

  // 4. PROFECO México: Jamón Peñaranda (Extrafino) vs Duby (Económico con fécula)
  {
    const rPen = QED.evaluateProductNotices({
      title: "Jamón Horneado Peñaranda 250 g",
      category: "abarrotes",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "Peñaranda",
      estudiosCalidadDb: estudios
    });
    const rDuby = QED.evaluateProductNotices({
      title: "Jamón Cocido Duby Económico con Fécula 250 g",
      category: "abarrotes",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "Duby",
      estudiosCalidadDb: estudios
    });
    const qPen = rPen.find(n => n.categoria === "calidad");
    const qDuby = rDuby.find(n => n.categoria === "calidad");

    check("4. PROFECO: Jamón Extrafino (Peñaranda) vs Económico 10% fécula (Duby)",
      !!qPen && qPen.resultado === "positivo" && qPen.texto.includes("Extrafino") &&
      !!qDuby && qDuby.resultado === "advertencia" && qDuby.texto.includes("Económico"),
      `Peñaranda: ${qPen ? qPen.resultado : "null"} | Duby: ${qDuby ? qDuby.resultado : "null"}`);
  }

  // 5. PROFECO México: Aceite de Aguacate San Lucas e Inés (100% puro) vs Cate de Mi Corazón (mezcla)
  {
    const rLucas = QED.evaluateProductNotices({
      title: "Aceite de Aguacate Extra Virgen San Lucas 500 ml",
      category: "abarrotes",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "San Lucas",
      estudiosCalidadDb: estudios
    });
    const rCate = QED.evaluateProductNotices({
      title: "Aceite de Aguacate Cate de Mi Corazón 500 ml",
      category: "abarrotes",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "Cate de Mi Corazón",
      estudiosCalidadDb: estudios
    });
    const qLucas = rLucas.find(n => n.categoria === "calidad");
    const qCate = rCate.find(n => n.categoria === "calidad");

    check("5. PROFECO: Aceite 100% puro (San Lucas) vs mezcla con canola (Cate de Mi Corazón)",
      !!qLucas && qLucas.resultado === "positivo" && qLucas.texto.includes("100% Aceite puro") &&
      !!qCate && qCate.resultado === "advertencia" && qCate.texto.includes("canola"),
      `Lucas: ${qLucas ? qLucas.resultado : "null"} | Cate: ${qCate ? qCate.resultado : "null"}`);
  }

  // 6. PROFECO México: Sartenes antiadherentes T-Fal y Cinsa (Excelente / Muy Bueno) vs Iuno (Deficiente)
  {
    const rCinsa = QED.evaluateProductNotices({
      title: "Sartén Cinsa Clásico Antiadherente 24 cm",
      category: "electrodomesticos_cocina",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "Cinsa",
      estudiosCalidadDb: estudios
    });
    const rIuno = QED.evaluateProductNotices({
      title: "Sartén Iuno con Recubrimiento 24 cm",
      category: "electrodomesticos_cocina",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "Iuno",
      estudiosCalidadDb: estudios
    });
    const qCinsa = rCinsa.find(n => n.categoria === "calidad");
    const qIuno = rIuno.find(n => n.categoria === "calidad");

    check("6. PROFECO: Sartenes Cinsa (Muy Bueno) vs Iuno (Deficiente por desprendimiento)",
      !!qCinsa && qCinsa.resultado === "positivo" && qCinsa.texto.includes("Muy Bueno") &&
      !!qIuno && qIuno.resultado === "advertencia" && qIuno.texto.includes("Deficiente"),
      `Cinsa: ${qCinsa ? qCinsa.resultado : "null"} | Iuno: ${qIuno ? qIuno.resultado : "null"}`);
  }

  // 7. USDA EE.UU.: Certified Angus Beef (Prime Grade) y Organic Valley (USDA Organic)
  {
    const rBeef = QED.evaluateProductNotices({
      title: "Certified Angus Beef USDA Prime Ribeye 16 oz",
      category: "abarrotes",
      categoryConfidence: "alta",
      storeCountry: "EE.UU.",
      brand: "Certified Angus Beef",
      estudiosCalidadDb: estudios
    });
    const rOrg = QED.evaluateProductNotices({
      title: "Organic Valley Whole Milk Half Gallon",
      category: "lacteos",
      categoryConfidence: "alta",
      storeCountry: "EE.UU.",
      brand: "Organic Valley",
      estudiosCalidadDb: estudios
    });
    const qBeef = rBeef.find(n => n.categoria === "calidad");
    const qOrg = rOrg.find(n => n.categoria === "calidad");

    check("7. USDA (EE.UU.): Certified Angus Beef (Prime Grade) y Organic Valley (USDA Organic)",
      !!qBeef && qBeef.autoridad === "USDA" && qBeef.resultado === "positivo" && qBeef.texto.includes("USDA Prime") &&
      !!qOrg && qOrg.autoridad === "USDA" && qOrg.resultado === "positivo" && qOrg.texto.includes("Organic 100% Certified"),
      `Beef: ${qBeef ? qBeef.autoridad : "null"} | Organic: ${qOrg ? qOrg.autoridad : "null"}`);
  }

  // 8. MAPA España: Jamón Ibérico Cinco Jotas (Precinto Negro) y AOVE Castillo de Canena (Cosecha Temprana)
  {
    const rJamon = QED.evaluateProductNotices({
      title: "Jamón de Bellota 100% Ibérico Cinco Jotas 8 kg",
      category: "abarrotes",
      categoryConfidence: "alta",
      storeCountry: "España",
      brand: "Cinco Jotas",
      estudiosCalidadDb: estudios
    });
    const rAove = QED.evaluateProductNotices({
      title: "Aceite de Oliva Virgen Extra Castillo de Canena Primer Día de Cosecha 500 ml",
      category: "abarrotes",
      categoryConfidence: "alta",
      storeCountry: "España",
      brand: "Castillo de Canena",
      estudiosCalidadDb: estudios
    });
    const qJamon = rJamon.find(n => n.categoria === "calidad");
    const qAove = rAove.find(n => n.categoria === "calidad");

    check("8. MAPA (España): Jamón Ibérico Cinco Jotas (Precinto Negro) y AOVE Castillo de Canena",
      !!qJamon && qJamon.autoridad === "MAPA" && qJamon.resultado === "positivo" && qJamon.texto.includes("Precinto Negro") &&
      !!qAove && qAove.autoridad === "MAPA" && qAove.resultado === "positivo" && qAove.texto.includes("AOVE"),
      `Cinco Jotas: ${qJamon ? qJamon.resultado : "null"} | Canena: ${qAove ? qAove.resultado : "null"}`);
  }

  // 9. Aislamiento geográfico estricto: Tienda alemana (amazon.de) y francesa jamás muestran PROFECO ni USDA
  {
    const rDe = QED.evaluateProductNotices({
      title: "Thunfisch Dolores in Wasser 140g",
      category: "abarrotes",
      categoryConfidence: "alta",
      storeCountry: "Alemania",
      brand: "Dolores",
      estudiosCalidadDb: estudios
    });
    const rFr = QED.evaluateProductNotices({
      title: "Thon Dolores en boîte 140g",
      category: "abarrotes",
      categoryConfidence: "alta",
      storeCountry: "Francia",
      brand: "Dolores",
      estudiosCalidadDb: estudios
    });
    const qDe = rDe.find(n => n.categoria === "calidad");
    const qFr = rFr.find(n => n.categoria === "calidad");

    check("9. Aislamiento geográfico: Tiendas de Alemania o Francia jamás muestran estudios de PROFECO",
      !qDe && !qFr,
      `Alemania: ${qDe ? qDe.texto : "0"}, Francia: ${qFr ? qFr.texto : "0"}`);
  }

  // 10. Prioridad en ordenación: los avisos de calidad oficiales van al inicio de los avisos del producto
  {
    const rMulti = QED.evaluateProductNotices({
      title: "Atún Dolores en Agua Lomo 140 g Exceso Sodio",
      category: "abarrotes",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "Dolores",
      specsText: "Exceso sodio",
      estudiosCalidadDb: estudios
    });
    const firstNotice = rMulti[0];
    check("10. Prioridad de visualización: el aviso oficial de calidad va primero",
      !!firstNotice && firstNotice.categoria === "calidad" && firstNotice.tipo === "oficial",
      firstNotice ? `${firstNotice.categoria} (${firstNotice.titulo})` : "sin avisos");
  }

  // 11. Ejecución de la herramienta de minería (datagen/minar_profeco.py)
  {
    let toolExit = 0;
    let toolOut = "";
    try {
      toolOut = execFileSync("python", ["datagen/minar_profeco.py"], { cwd: ROOT, encoding: "utf8" });
    } catch (e) {
      toolExit = e.status || 1;
      toolOut = e.stderr || e.message;
    }
    check("11. Herramienta datagen/minar_profeco.py audita estudios y analiza cobertura sin errores",
      toolExit === 0 && toolOut.includes("cero errores") && toolOut.includes("Marcas analizadas"),
      `salida: ${toolOut.split("\n")[2]}`);
  }

  console.log(`\n${pass}/${total} pruebas de calidad y grados alimenticios correctas\n`);
  process.exit(pass === total ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
