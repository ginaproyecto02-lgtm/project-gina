// SPDX-License-Identifier: MIT
// Gina — Suite de pruebas de cumplimiento de políticas de tiendas de extensiones (Chrome, Edge, Firefox) (J2).

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const EXT = path.join(ROOT, "extension");
const STORE = path.join(ROOT, "store");

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

function getAllFiles(dir) {
  let res = [];
  if (!fs.existsSync(dir)) return res;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) res = res.concat(getAllFiles(full));
    else res.push(full);
  }
  return res;
}

async function run() {
  console.log("Iniciando suite de políticas de tiendas de extensiones (test/politicas.test.js)...\n");

  const manifestPath = path.join(EXT, "manifest.json");
  const permisosPath = path.join(STORE, "permisos.json");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const permisos = JSON.parse(fs.readFileSync(permisosPath, "utf8"));

  // 1. Permisos del manifest = permisos justificados, en los dos sentidos
  const manifestApi = new Set(manifest.permissions || []);
  const docApi = new Set((permisos.permisos_api || []).map((p) => p.permiso));

  const manifestHosts = new Set(manifest.host_permissions || []);
  const docHosts = new Set((permisos.host_permissions || []).map((p) => p.permiso));

  const manifestOptHosts = new Set(manifest.optional_host_permissions || []);
  const docOptHosts = new Set((permisos.optional_host_permissions || []).map((p) => p.permiso));

  const manifestMatches = new Set((manifest.content_scripts && manifest.content_scripts[0] && manifest.content_scripts[0].matches) || []);
  const docMatches = new Set((permisos.tiendas_compatibles && permisos.tiendas_compatibles.patrones) || []);

  const diffApiM = [...manifestApi].filter((x) => !docApi.has(x));
  const diffApiD = [...docApi].filter((x) => !manifestApi.has(x));
  const diffHostsM = [...manifestHosts].filter((x) => !docHosts.has(x));
  const diffHostsD = [...docHosts].filter((x) => !manifestHosts.has(x));
  const diffOptM = [...manifestOptHosts].filter((x) => !docOptHosts.has(x));
  const diffOptD = [...docOptHosts].filter((x) => !manifestOptHosts.has(x));
  const diffMatchM = [...manifestMatches].filter((x) => !docMatches.has(x));
  const diffMatchD = [...docMatches].filter((x) => !manifestMatches.has(x));

  const hasPermMismatch = diffApiM.length || diffApiD.length || diffHostsM.length || diffHostsD.length || diffOptM.length || diffOptD.length || diffMatchM.length || diffMatchD.length;

  check(
    "1. Permisos del manifest coinciden exactamente y de forma bidireccional con store/permisos.json",
    !hasPermMismatch,
    hasPermMismatch
      ? `Discrepancias: API: +[${diffApiM}], -[${diffApiD}]; Hosts: +[${diffHostsM}], -[${diffHostsD}]; Opt: +[${diffOptM}], -[${diffOptD}]; Matches: +${diffMatchM.length}, -${diffMatchD.length}`
      : `${manifestApi.size} API, ${manifestHosts.size} hosts, ${manifestOptHosts.size} opt hosts, ${manifestMatches.size} tiendas justificadas`
  );

  // 2. Escaneo de extension/**/*.js y *.html: sin eval, new Function, setTimeout("...", importScripts("http... o <script src="http...
  const allExtFiles = getAllFiles(EXT);
  const badPatterns = [
    { name: "eval(", regex: /\beval\s*\(/ },
    { name: "new Function(", regex: /new\s+Function\s*\(/ },
    { name: "setTimeout con cadena", regex: /setTimeout\s*\(\s*["'`]/ },
    { name: "setInterval con cadena", regex: /setInterval\s*\(\s*["'`]/ },
    { name: "importScripts remoto", regex: /importScripts\s*\(\s*["'`]https?:\/\//i },
    { name: "<script src remoto", regex: /<script[^>]+src=["']https?:\/\//i }
  ];

  const foundBad = [];
  for (const f of allExtFiles) {
    if (f.endsWith(".js") || f.endsWith(".html")) {
      const code = fs.readFileSync(f, "utf8");
      for (const pat of badPatterns) {
        if (pat.regex.test(code)) {
          foundBad.push(`${path.relative(ROOT, f)}: ${pat.name}`);
        }
      }
    }
  }

  check(
    "2. Escaneo de extension/**/*.js y *.html: 0 código remoto o ejecución dinámica no segura",
    foundBad.length === 0,
    foundBad.length ? `Hallazgos: ${foundBad.join(", ")}` : "Limpio: sin eval, new Function, timers con string ni scripts remotos"
  );

  // 3. CSP: no hay o no relaja la política (sin unsafe-eval ni hosts remotos en script-src)
  let cspValid = true;
  let cspDetails = "CSP por defecto de Manifest V3 (no relajada)";
  if (manifest.content_security_policy) {
    const cspStr = typeof manifest.content_security_policy === "string"
      ? manifest.content_security_policy
      : JSON.stringify(manifest.content_security_policy);
    if (/unsafe-eval/i.test(cspStr) || /https?:\/\//i.test(cspStr)) {
      cspValid = false;
      cspDetails = `CSP contiene directivas no permitidas: ${cspStr}`;
    }
  }
  check("3. Content Security Policy no relaja la política por defecto", cspValid, cspDetails);

  // 4. Cada página HTML de la extensión carga solo scripts locales
  const htmlPages = allExtFiles.filter((f) => f.endsWith(".html"));
  let badHtmlScripts = [];
  for (const htmlFile of htmlPages) {
    const content = fs.readFileSync(htmlFile, "utf8");
    const dom = new JSDOM(content);
    const scripts = dom.window.document.querySelectorAll("script");
    for (const s of scripts) {
      const src = s.getAttribute("src");
      if (src) {
        if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("//")) {
          badHtmlScripts.push(`${path.relative(ROOT, htmlFile)}: script remoto ${src}`);
        } else {
          const resolved = path.resolve(path.dirname(htmlFile), src);
          if (!fs.existsSync(resolved)) {
            badHtmlScripts.push(`${path.relative(ROOT, htmlFile)}: script local faltante ${src}`);
          }
        }
      }
    }
  }

  check(
    "4. Todas las páginas HTML de la extensión cargan únicamente scripts locales existentes",
    badHtmlScripts.length === 0,
    badHtmlScripts.length ? `Errores: ${badHtmlScripts.join(", ")}` : `${htmlPages.length} páginas HTML verificadas`
  );

  // 5. browser_specific_settings.gecko con id, strict_min_version y data_collection_permissions válidos
  const gecko = manifest.browser_specific_settings && manifest.browser_specific_settings.gecko;
  const geckoValid = Boolean(
    gecko &&
    typeof gecko.id === "string" && gecko.id.includes("@") &&
    typeof gecko.strict_min_version === "string" && parseFloat(gecko.strict_min_version) >= 121 &&
    gecko.data_collection_permissions &&
    Array.isArray(gecko.data_collection_permissions.required) &&
    gecko.data_collection_permissions.required.includes("none") &&
    Array.isArray(gecko.data_collection_permissions.optional) &&
    gecko.data_collection_permissions.optional.includes("websiteContent")
  );

  check(
    "5. browser_specific_settings.gecko tiene id, strict_min_version y data_collection_permissions conformes",
    geckoValid,
    gecko ? `id="${gecko.id}", strict_min_version="${gecko.strict_min_version}", required=[${gecko.data_collection_permissions?.required}], optional=[${gecko.data_collection_permissions?.optional}]` : "Falta configuración gecko"
  );

  // 6. Ningún archivo pesa más de 4 MB; el total del paquete, menos de 10 MB
  let totalBytes = 0;
  const oversizedFiles = [];
  for (const f of allExtFiles) {
    const stat = fs.statSync(f);
    totalBytes += stat.size;
    if (stat.size > 4 * 1024 * 1024) {
      oversizedFiles.push(`${path.relative(ROOT, f)}: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  const sizeValid = oversizedFiles.length === 0 && totalBytes < 10 * 1024 * 1024;
  check(
    "6. Límites de tamaño: ningún archivo > 4 MB y paquete total < 10 MB",
    sizeValid,
    `Total: ${(totalBytes / 1024 / 1024).toFixed(3)} MB (límite 10 MB); archivos > 4MB: ${oversizedFiles.length}`
  );

  // 7. Manifest específico para Chrome/Edge (Chromium MV3)
  const chromeMPath = path.join(EXT, "manifest.chrome.json");
  const chromeMExists = fs.existsSync(chromeMPath);
  let chromeMValid = false;
  let chromeMDetails = "";
  if (chromeMExists) {
    const mChrome = JSON.parse(fs.readFileSync(chromeMPath, "utf8"));
    const errorsChrome = [];
    if (mChrome.manifest_version !== 3) errorsChrome.push("manifest_version !== 3");
    if (mChrome.version !== "3.3.0") errorsChrome.push(`version !== 3.3.0 (${mChrome.version})`);
    if (!mChrome.background || mChrome.background.service_worker !== "src/background.js") {
      errorsChrome.push("background.service_worker !== 'src/background.js'");
    }
    if (mChrome.background && mChrome.background.scripts !== undefined) {
      errorsChrome.push("background.scripts presente en Chrome (prohibido en MV3 Chromium)");
    }
    if (mChrome.browser_specific_settings !== undefined) {
      errorsChrome.push("browser_specific_settings presente en Chrome (clave desconocida en Chromium)");
    }
    if (mChrome.minimum_chrome_version !== "121") {
      errorsChrome.push(`minimum_chrome_version !== '121' (${mChrome.minimum_chrome_version})`);
    }
    const mChromeApi = new Set(mChrome.permissions || []);
    if (!mChromeApi.has("offscreen") || !mChromeApi.has("storage") || !mChromeApi.has("alarms")) {
      errorsChrome.push("Faltan permisos requeridos en Chromium (offscreen, storage, alarms)");
    }
    chromeMValid = errorsChrome.length === 0;
    chromeMDetails = chromeMValid ? "Chromium MV3 válido: service_worker, sin browser_specific_settings ni background.scripts" : errorsChrome.join("; ");
  } else {
    chromeMDetails = "Falta extension/manifest.chrome.json";
  }
  check("7. Manifest de Chrome/Edge: service_worker exclusivo, sin claves incompatibles de Firefox", chromeMValid, chromeMDetails);

  // 8. Manifest específico para Firefox AMO (Gecko MV3)
  const ffMPath = path.join(EXT, "manifest.firefox.json");
  const ffMExists = fs.existsSync(ffMPath);
  let ffMValid = false;
  let ffMDetails = "";
  if (ffMExists) {
    const mFF = JSON.parse(fs.readFileSync(ffMPath, "utf8"));
    const errorsFF = [];
    if (mFF.manifest_version !== 3) errorsFF.push("manifest_version !== 3");
    if (mFF.version !== "3.3.0") errorsFF.push(`version !== 3.3.0 (${mFF.version})`);
    if (!mFF.background || !Array.isArray(mFF.background.scripts) || mFF.background.scripts.length === 0) {
      errorsFF.push("background.scripts ausente o vacío en Firefox");
    }
    if (mFF.background && mFF.background.service_worker !== undefined) {
      errorsFF.push("background.service_worker presente en Firefox (ignorado con advertencia en AMO)");
    }
    if (mFF.minimum_chrome_version !== undefined) {
      errorsFF.push("minimum_chrome_version presente en Firefox");
    }
    if (!mFF.browser_specific_settings || !mFF.browser_specific_settings.gecko || !mFF.browser_specific_settings.gecko.id) {
      errorsFF.push("browser_specific_settings.gecko ausente o sin id");
    }
    const mFFApi = new Set(mFF.permissions || []);
    if (mFFApi.has("offscreen")) {
      errorsFF.push("offscreen presente en Firefox (API no implementada en Firefox, genera advertencia en AMO)");
    }
    if (!mFFApi.has("storage") || !mFFApi.has("alarms")) {
      errorsFF.push("Faltan permisos requeridos en Firefox (storage, alarms)");
    }
    ffMValid = errorsFF.length === 0;
    ffMDetails = ffMValid ? "Gecko MV3 válido: background.scripts (9 módulos), gecko id, sin service_worker ni offscreen" : errorsFF.join("; ");
  } else {
    ffMDetails = "Falta extension/manifest.firefox.json";
  }
  check("8. Manifest de Firefox AMO: background.scripts exclusivo, sin claves incompatibles de Chrome", ffMValid, ffMDetails);

  // 9. Verificación de los paquetes ZIP de salida en dist/
  const { execFileSync } = require("child_process");
  const distDir = path.join(ROOT, "dist");
  const chromeZipPath = path.join(distDir, "gina-chrome-edge-3.3.0.zip");
  const ffZipPath = path.join(distDir, "gina-firefox-3.3.0.zip");

  // Si los zips no existen aún, generarlos con empaquetar
  if (!fs.existsSync(chromeZipPath) || !fs.existsSync(ffZipPath)) {
    execFileSync("python", [path.join(ROOT, "datagen", "empaquetar.py")], { stdio: "inherit" });
  }

  function inspeccionarZip(zipPath) {
    const pyCode = "import zipfile, sys, json; z = zipfile.ZipFile(sys.argv[1]); print(json.dumps({'files': z.namelist(), 'manifest': json.loads(z.read('manifest.json').decode('utf-8'))}))";
    const out = execFileSync("python", ["-c", pyCode, zipPath], { encoding: "utf8" });
    return JSON.parse(out);
  }

  let zipsValid = false;
  let zipsDetails = "";
  try {
    const chromeZip = inspeccionarZip(chromeZipPath);
    const ffZip = inspeccionarZip(ffZipPath);

    const errorsZips = [];
    // Verificación de archivos clave dentro del zip de Chrome
    const reqFiles = ["manifest.json", "src/background.js", "src/content.js", "icons/icon128.png", "_locales/en/messages.json", "_locales/es/messages.json"];
    for (const rf of reqFiles) {
      if (!chromeZip.files.includes(rf)) errorsZips.push(`Chrome zip falta archivo: ${rf}`);
      if (!ffZip.files.includes(rf)) errorsZips.push(`Firefox zip falta archivo: ${rf}`);
    }

    // Sin archivos indeseables
    for (const f of chromeZip.files.concat(ffZip.files)) {
      if (f.includes(".DS_Store") || f.includes("README.md") || f.includes("manifest.chrome.json") || f.includes("manifest.firefox.json")) {
        errorsZips.push(`Archivo indeseado en zip: ${f}`);
        break;
      }
    }

    // Manifest interno de Chrome
    if (chromeZip.manifest.background?.service_worker !== "src/background.js" || chromeZip.manifest.background?.scripts !== undefined) {
      errorsZips.push("Manifest interno de Chrome zip no tiene service_worker exclusivo");
    }

    // Manifest interno de Firefox
    if (!Array.isArray(ffZip.manifest.background?.scripts) || ffZip.manifest.background?.service_worker !== undefined) {
      errorsZips.push("Manifest interno de Firefox zip no tiene background.scripts exclusivo");
    }

    // Verificación de checksums sha256
    const crypto = require("crypto");
    for (const zp of [chromeZipPath, ffZipPath]) {
      const shaFile = zp + ".sha256";
      if (!fs.existsSync(shaFile)) {
        errorsZips.push(`Falta archivo de checksum: ${path.basename(shaFile)}`);
      } else {
        const fileBytes = fs.readFileSync(zp);
        const actualSha = crypto.createHash("sha256").update(fileBytes).digest("hex");
        const expectedSha = fs.readFileSync(shaFile, "utf8").trim().split(/\s+/)[0];
        if (actualSha !== expectedSha) {
          errorsZips.push(`Checksum no coincide para ${path.basename(zp)}: actual ${actualSha} !== guardado ${expectedSha}`);
        }
      }
    }

    zipsValid = errorsZips.length === 0;
    zipsDetails = zipsValid
      ? `Chrome zip (${(fs.statSync(chromeZipPath).size / 1024).toFixed(1)} KB) y Firefox zip (${(fs.statSync(ffZipPath).size / 1024).toFixed(1)} KB) con manifest.json interno adaptado y SHA-256 verificado`
      : errorsZips.join("; ");
  } catch (err) {
    zipsDetails = `Error inspeccionando zips: ${err.message}`;
  }

  check("9. Paquetes ZIP de salida: artefactos independientes para Chrome y Firefox con SHA256", zipsValid, zipsDetails);

  console.log(`\nResultado: ${pass}/${total} pruebas pasaron.`);
  if (pass < total) process.exit(1);
}

run().catch((err) => {
  console.error("Error fatal ejecutando pruebas:", err);
  process.exit(1);
});
