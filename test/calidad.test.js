// SPDX-License-Identifier: MIT
// Gina — Suite de pruebas de Estudios Oficiales de Calidad y Grados Alimenticios (PROFECO, USDA, MAPA).

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync, spawnSync } = require("child_process");

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
    const estudiosSinVerificar = [
      { id: "sin-verif-1", pais: "México", paises_tienda: ["México"], autoridad: "PROFECO", categoria: "abarrotes", items: [{ marca: "Aurrera", resultado: "advertencia", grado: "Prueba" }] },
      { id: "sin-verif-2", pais: "México", paises_tienda: ["México"], autoridad: "PROFECO", categoria: "abarrotes", verificado: "2026-11-09", items: [{ marca: "Aurrera", resultado: "advertencia", grado: "Prueba" }] },
      { id: "sin-verif-3", pais: "México", paises_tienda: ["México"], autoridad: "PROFECO", categoria: "abarrotes", url_estudio: "https://gob.mx/test", items: [{ marca: "Aurrera", resultado: "advertencia", grado: "Prueba" }] }
    ];
    const r = QED.evaluateProductNotices({ title: "Atún Aurrera en agua 140 g", category: "abarrotes", categoryConfidence: "alta",
      storeCountry: "México", brand: "Aurrera", estudiosCalidadDb: estudiosSinVerificar });
    check("0. Estudios sin verificar no se muestran (son juicios sobre marcas reales)",
      !r.some((n) => n.categoria === "calidad"), "Estudios sin verificado y url_estudio no se muestran");
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

  // 2. PROFECO México: Atún Dolores (Lomo / 1–4 % soya) vs Aurrera (30–62 % soya)
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

    check("2. PROFECO: Atún Dolores (1–4 % soya) vs Aurrera (30–62 % soya)",
      !!qDolores && qDolores.texto.includes("1–4 % de soya") &&
      !!qAurrera && qAurrera.texto.includes("30–62 % de soya"),
      `Dolores: ${qDolores ? qDolores.resultado : "null"} | Aurrera: ${qAurrera ? qAurrera.resultado : "null"}`);
  }

  // 2b. I2: Herdez salsa NO recibe el estudio de atún de Herdez (sin coincidencia por grupo ni categoría errónea)
  {
    const rSalsa = QED.evaluateProductNotices({
      title: "Salsa Casera Mexicana Herdez 240 g",
      category: "abarrotes",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "Herdez",
      brandGroup: { id: "herdez" },
      estudiosCalidadDb: estudios
    });
    const qSalsa = rSalsa.find(n => n.categoria === "calidad");
    check("2b. I2: Herdez salsa NO recibe estudio de atún de Herdez (no coincide tipo de producto)",
      !qSalsa,
      qSalsa ? `infiltrado: ${qSalsa.texto}` : "0 avisos de calidad (correcto)");
  }

  // 2c. I2: Un título con «lala» dentro de otra palabra no coincide (palabra completa estricta)
  {
    const rLalaSub = QED.evaluateProductNotices({
      title: "Postre Clalafate Helado 500 ml",
      category: "lacteos",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "",
      estudiosCalidadDb: estudios
    });
    const qLalaSub = rLalaSub.find(n => n.categoria === "calidad");
    check("2c. I2: Substring 'lala' dentro de 'Clalafate' no coincide (palabra completa)",
      !qLalaSub,
      qLalaSub ? `infiltrado: ${qLalaSub.texto}` : "0 avisos (correcto)");
  }

  // 2d. I2: El atún Aurrera sí coincide (con datos verificados)
  {
    const rAurreraVerif = QED.evaluateProductNotices({
      title: "Atún con Soya Aurrera en Agua 140 g",
      category: "abarrotes",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "Aurrera",
      estudiosCalidadDb: estudios
    });
    const qAurreraVerif = rAurreraVerif.find(n => n.categoria === "calidad");
    check("2d. I2: Atún Aurrera sí coincide (marca exacta y palabras clave verificadas)",
      !!qAurreraVerif && qAurreraVerif.texto.includes("30–62 % de soya"),
      qAurreraVerif ? qAurreraVerif.texto : "no encontrado");
  }

  // 2e. I2: Estudio con antigüedad (> 3 años) sale como informativo y muestra el año a la vista
  {
    const rAurreraAged = QED.evaluateProductNotices({
      title: "Atún con Soya Aurrera en Agua 140 g",
      category: "abarrotes",
      categoryConfidence: "alta",
      storeCountry: "México",
      brand: "Aurrera",
      estudiosCalidadDb: estudios
    });
    const qAurreraAged = rAurreraAged.find(n => n.categoria === "calidad");
    check("2e. I2: Estudio con antigüedad sale como informativo y muestra el año (2019) a la vista",
      !!qAurreraAged && qAurreraAged.resultado === "informativo" && qAurreraAged.texto.includes("2019") && qAurreraAged.antiguedad === true,
      `resultado: ${qAurreraAged ? qAurreraAged.resultado : "null"}, texto: ${qAurreraAged ? qAurreraAged.texto.split("·")[0] : "null"}`);
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
      !!qFranja && (qFranja.resultado === "informativo" || qFranja.resultado === "advertencia") && qFranja.texto.includes("Imitación"),
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
      !!qDuby && (qDuby.resultado === "informativo" || qDuby.resultado === "advertencia") && qDuby.texto.includes("Económico"),
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
      !!qCate && (qCate.resultado === "informativo" || qCate.resultado === "advertencia") && qCate.texto.includes("canola"),
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
      !!qIuno && (qIuno.resultado === "informativo" || qIuno.resultado === "advertencia") && qIuno.texto.includes("Deficiente"),
      `Cinsa: ${qCinsa ? qCinsa.resultado : "null"} | Iuno: ${qIuno ? qIuno.resultado : "null"}`);
  }

  // 7. USDA EE.UU.: Organic Valley (USDA Organic 100% Certified)
  {
    const rOrg = QED.evaluateProductNotices({
      title: "Organic Valley Whole Milk Half Gallon",
      category: "lacteos",
      categoryConfidence: "alta",
      storeCountry: "EE.UU.",
      brand: "Organic Valley",
      estudiosCalidadDb: estudios
    });
    const qOrg = rOrg.find(n => n.categoria === "calidad");

    check("7. USDA (EE.UU.): Organic Valley (USDA Organic)",
      !!qOrg && qOrg.autoridad === "USDA" && qOrg.resultado === "positivo" && qOrg.texto.includes("Organic 100% Certified"),
      `Organic: ${qOrg ? qOrg.autoridad : "null"}`);
  }

  // 8. MAPA España: AOVE Castillo de Canena (Premios Alimentos de España)
  {
    const rAove = QED.evaluateProductNotices({
      title: "Aceite de Oliva Virgen Extra Castillo de Canena Primer Día de Cosecha 500 ml",
      category: "abarrotes",
      categoryConfidence: "alta",
      storeCountry: "España",
      brand: "Castillo de Canena",
      estudiosCalidadDb: estudios
    });
    const qAove = rAove.find(n => n.categoria === "calidad");

    check("8. MAPA (España): AOVE Castillo de Canena (Premios Alimentos de España)",
      !!qAove && qAove.autoridad === "MAPA" && qAove.resultado === "positivo" && qAove.texto.includes("AOVE"),
      `Canena: ${qAove ? qAove.resultado : "null"}`);
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

  // 12. Candado 1: build_data.py falla si un estudio verificado no tiene url_estudio o usa portada no válida
  {
    const pyOpts = { encoding: "utf8", cwd: ROOT, env: Object.assign({}, process.env, { PYTHONIOENCODING: "utf-8" }) };
    const pyCode1a = "import sys, json, builtins, io; sys.path.insert(0, 'datagen'); real_open = builtins.open; builtins.open = (lambda f, *a, **kw: io.StringIO(json.dumps([{'id': 'test-c1', 'url': 'https://www.gob.mx/test', 'autoridad': 'PROFECO', 'fecha': '2024', 'verificado': '2024-05'}])) if 'estudios_calidad.json' in str(f) else real_open(f, *a, **kw)); import build_data";
    const res1a = spawnSync("python", ["-c", pyCode1a], pyOpts);
    const ok1a = res1a.status !== 0 && (res1a.stderr || "").includes("carece de 'url_estudio'");

    const pyCode1b = "import sys, json, builtins, io; sys.path.insert(0, 'datagen'); real_open = builtins.open; builtins.open = (lambda f, *a, **kw: io.StringIO(json.dumps([{'id': 'test-c1b', 'url': 'https://www.gob.mx/test', 'autoridad': 'PROFECO', 'fecha': '2024', 'verificado': '2024-05', 'url_estudio': 'https://www.gob.mx/profeco/documentos/estudios-de-calidad'}])) if 'estudios_calidad.json' in str(f) else real_open(f, *a, **kw)); import build_data";
    const res1b = spawnSync("python", ["-c", pyCode1b], pyOpts);
    const ok1b = res1b.status !== 0 && (res1b.stderr || "").includes("portada no");

    check("12. Candado 1: build_data.py falla si estudio verificado carece de url_estudio o usa portada",
      ok1a && ok1b,
      "Falla con AssertionError: url_estudio inválido o portada no válida");
  }

  // 13. Candado 2: build_data.py falla si un estudio tiene url o url_estudio que no corresponde a su autoridad
  {
    const pyOpts = { encoding: "utf8", cwd: ROOT, env: Object.assign({}, process.env, { PYTHONIOENCODING: "utf-8" }) };
    const pyCode2 = "import sys, json, builtins, io; sys.path.insert(0, 'datagen'); real_open = builtins.open; builtins.open = (lambda f, *a, **kw: io.StringIO(json.dumps([{'id': 'test-c2', 'url': 'https://example.com/bad', 'autoridad': 'PROFECO', 'fecha': '2024'}])) if 'estudios_calidad.json' in str(f) else real_open(f, *a, **kw)); import build_data";
    const res2 = spawnSync("python", ["-c", pyCode2], pyOpts);
    const ok2 = res2.status !== 0 && (res2.stderr || "").includes("no corresponde a");
    check("13. Candado 2: build_data.py falla si estudio tiene dominio no correspondiente a su autoridad",
      ok2,
      "Falla con AssertionError: dominio no corresponde a autoridad");
  }

  // 14. Candado 3: build_data.py falla si una empresa con confianza «Alta» o «Verificado» tiene una portada como url
  {
    const pyOpts = { encoding: "utf8", cwd: ROOT, env: Object.assign({}, process.env, { PYTHONIOENCODING: "utf-8" }) };
    const pyCode3 = "import sys; sys.path.insert(0, 'datagen'); import data_base as base; base.g('grupo_bad_url', 'Bad URL SA', 'Nadie', 'México', 'Privada', confianza='Alta', fuente='Prueba', url='https://www.gob.mx/profeco'); import build_data";
    const res3 = spawnSync("python", ["-c", pyCode3], pyOpts);
    const ok3 = res3.status !== 0 && (res3.stderr || "").includes("portada no");
    check("14. Candado 3: build_data.py falla si empresa Alta/Verificado tiene una portada como url",
      ok3,
      "Falla con AssertionError: portada no válida como url");
  }

  // 15. Candado 4: build_data.py falla si fecha tiene formato no válido o es posterior a verificado
  {
    const pyOpts = { encoding: "utf8", cwd: ROOT, env: Object.assign({}, process.env, { PYTHONIOENCODING: "utf-8" }) };
    const pyCode4a = "import sys, json, builtins, io; sys.path.insert(0, 'datagen'); real_open = builtins.open; builtins.open = (lambda f, *a, **kw: io.StringIO(json.dumps([{'id': 'test-c4a', 'url': 'https://www.gob.mx/test', 'autoridad': 'PROFECO', 'fecha': 'marzo 2024'}])) if 'estudios_calidad.json' in str(f) else real_open(f, *a, **kw)); import build_data";
    const res4a = spawnSync("python", ["-c", pyCode4a], pyOpts);
    const ok4a = res4a.status !== 0 && (res4a.stderr || "").includes("formato AAAA o AAAA-MM");

    const pyCode4b = "import sys, json, builtins, io; sys.path.insert(0, 'datagen'); real_open = builtins.open; builtins.open = (lambda f, *a, **kw: io.StringIO(json.dumps([{'id': 'test-c4b', 'url': 'https://www.gob.mx/test', 'autoridad': 'PROFECO', 'fecha': '2025-05', 'verificado': '2024-11-09', 'url_estudio': 'https://www.gob.mx/profeco/estudio-123.pdf'}])) if 'estudios_calidad.json' in str(f) else real_open(f, *a, **kw)); import build_data";
    const res4b = spawnSync("python", ["-c", pyCode4b], pyOpts);
    const ok4b = res4b.status !== 0 && (res4b.stderr || "").includes("es posterior a fecha de");

    check("15. Candado 4: build_data.py falla si fecha tiene formato no válido o es posterior a verificado",
      ok4a && ok4b,
      "Falla con AssertionError: formato fecha inválido o posterior a verificado");
  }

  // 16. build_data.py con los datos reales pasa exitosamente
  {
    const resReal = spawnSync("python", ["datagen/build_data.py"], { encoding: "utf8", cwd: ROOT });
    check("16. build_data.py pasa con éxito en los datos reales",
      resReal.status === 0,
      `exit: ${resReal.status}`);
  }

  console.log(`\n${pass}/${total} pruebas de calidad y grados alimenticios correctas\n`);
  process.exit(pass === total ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
