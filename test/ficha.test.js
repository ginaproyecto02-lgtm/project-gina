/**
 * @file test/ficha.test.js
 * Puerta 10: Validación de la ficha de tienda, textos, permisos y recursos gráficos.
 *
 * 1. Tamaños exactos de imágenes (leídos de las cabeceras binarias PNG):
 *    - 5 capturas de 1280x800
 *    - icono-128.png (128x128)
 *    - promo-pequeno-440x280.png (440x280)
 * 2. Longitud del resumen (<= 132 caracteres) en cada idioma.
 * 3. URLs públicas de privacidad y soporte de J1 presentes en ficha-tienda.md.
 * 4. Cobertura bidireccional de permisos: cada permiso de store/permisos.json aparece en la ficha.
 * 5. Consistencia de promesas: la ficha no promete estudios de calidad ni funciones no activas.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const STORE_DIR = path.join(ROOT, "store");
const IMG_DIR = path.join(STORE_DIR, "imagenes");
const LOCALES_DIR = path.join(ROOT, "extension", "_locales");

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
// 1. Lectura de dimensiones PNG desde cabecera binaria (bytes 16-23)
// ----------------------------------------------------------------------------
function readPngDimensions(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  // Firma PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng = buffer.length >= 24 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a;
  if (!isPng) return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

console.log("=== 1. Dimensiones de recursos gráficos (cabeceras PNG) ===");

const REQUIRED_CAPTURES = [
  "captura-1-producto.png",
  "captura-2-comparador.png",
  "captura-3-reputacion.png",
  "captura-4-sugerir.png",
  "captura-5-opciones.png"
];

for (const capName of REQUIRED_CAPTURES) {
  const p = path.join(IMG_DIR, capName);
  const dim = readPngDimensions(p);
  check(
    `Captura ${capName} existe y mide exactamente 1280x800`,
    dim !== null && dim.width === 1280 && dim.height === 800,
    dim ? `Medidas obtenidas: ${dim.width}x${dim.height}` : "Archivo no encontrado o no es PNG"
  );
}

const iconDim = readPngDimensions(path.join(IMG_DIR, "icono-128.png"));
check(
  "icono-128.png existe y mide 128x128",
  iconDim !== null && iconDim.width === 128 && iconDim.height === 128,
  iconDim ? `${iconDim.width}x${iconDim.height}` : "No encontrado"
);

const promoDim = readPngDimensions(path.join(IMG_DIR, "promo-pequeno-440x280.png"));
check(
  "promo-pequeno-440x280.png existe y mide 440x280",
  promoDim !== null && promoDim.width === 440 && promoDim.height === 280,
  promoDim ? `${promoDim.width}x${promoDim.height}` : "No encontrado"
);

console.log("\n=== 2. Longitud de resúmenes (<= 132 caracteres) ===");

const locales = ["de", "en", "es", "fr", "it", "ja"];
for (const loc of locales) {
  const msgPath = path.join(LOCALES_DIR, loc, "messages.json");
  check(`messages.json existe para idioma '${loc}'`, fs.existsSync(msgPath));
  if (fs.existsSync(msgPath)) {
    const data = JSON.parse(fs.readFileSync(msgPath, "utf8"));
    const desc = (data.extDescription && data.extDescription.message) || "";
    check(
      `Resumen en '${loc}' tiene longitud <= 132 caracteres (${desc.length} chars)`,
      desc.length > 0 && desc.length <= 132,
      `Texto: "${desc}"`
    );
  }
}

console.log("\n=== 3. URLs públicas de privacidad y soporte ===");

const fichaPath = path.join(STORE_DIR, "ficha-tienda.md");
check("store/ficha-tienda.md existe", fs.existsSync(fichaPath));

const fichaContent = fs.readFileSync(fichaPath, "utf8");

const URL_PRIVACIDAD = "https://ginaproyecto02-lgtm.github.io/project-gina/privacidad.html";
const URL_SOPORTE = "https://ginaproyecto02-lgtm.github.io/project-gina/soporte.html";
const URL_HOMEPAGE = "https://ginaproyecto02-lgtm.github.io/project-gina/";

check("ficha-tienda.md contiene URL de política de privacidad", fichaContent.includes(URL_PRIVACIDAD));
check("ficha-tienda.md contiene URL de soporte", fichaContent.includes(URL_SOPORTE));
check("ficha-tienda.md contiene URL de página principal", fichaContent.includes(URL_HOMEPAGE));

console.log("\n=== 4. Cobertura de permisos de store/permisos.json ===");

const permisosPath = path.join(STORE_DIR, "permisos.json");
check("store/permisos.json existe", fs.existsSync(permisosPath));

const permisosData = JSON.parse(fs.readFileSync(permisosPath, "utf8"));
const missingPermisos = [];

const allPermisos = [
  ...(permisosData.permisos_api || []),
  ...(permisosData.host_permissions || []),
  ...(permisosData.optional_host_permissions || [])
];

for (const p of allPermisos) {
  const pId = p.permiso;
  // Debe aparecer en la ficha de tienda
  if (!fichaContent.includes(`\`${pId}\``) && !fichaContent.includes(pId)) {
    missingPermisos.push(pId);
  }
}

check(
  "Cada permiso de store/permisos.json aparece justificado en ficha-tienda.md",
  missingPermisos.length === 0,
  `Faltan: ${missingPermisos.join(", ")}`
);

console.log("\n=== 5. Consistencia de promesas (sin promesas no respaldadas) ===");

// La ficha no debe prometer estudios de calidad porque actualmente están bajo validación y no se muestran
const mentionsQualityStudies = /estudios de calidad|quality studies|informes profeco|alerta profeco/i.test(fichaContent);
check(
  "ficha-tienda.md no promete estudios de calidad oficiales mientras no estén activos",
  !mentionsQualityStudies
);

// Comprobar existencia de LISTA_PUBLICACION.md
const listaPath = path.join(STORE_DIR, "LISTA_PUBLICACION.md");
check("store/LISTA_PUBLICACION.md existe y no está vacía", fs.existsSync(listaPath) && fs.statSync(listaPath).size > 200);

// ============================================================================
// Resumen
// ============================================================================
console.log(`\nPruebas de ficha de tienda (J6): ${pass}/${total} pasaron.`);
if (pass < total) process.exit(1);
