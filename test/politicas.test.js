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

  console.log(`\nResultado: ${pass}/${total} pruebas pasaron.`);
  if (pass < total) process.exit(1);
}

run().catch((err) => {
  console.error("Error fatal ejecutando pruebas:", err);
  process.exit(1);
});
