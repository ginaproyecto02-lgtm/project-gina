// SPDX-License-Identifier: MIT
// Gina — Suite de pruebas del sitio público (GitHub Pages: index, privacidad, soporte) y cumplimiento (J1).

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const DOCS = path.join(ROOT, "docs");
const EXT = path.join(ROOT, "extension");

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

// Extraer claves de primer nivel dentro de llamadas set({ ... }) o .set({ ... })
function extractStorageKeys() {
  const dirs = [path.join(EXT, "src"), path.join(EXT, "options")];
  function getJsFiles(dir) {
    let res = [];
    if (!fs.existsSync(dir)) return res;
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) res = res.concat(getJsFiles(full));
      else if (item.name.endsWith(".js")) res.push(full);
    }
    return res;
  }

  const files = dirs.flatMap(getJsFiles);
  const keys = new Set();

  function extractTopLevelKeys(str) {
    const list = [];
    let depth = 0;
    let currentKey = "";
    let inKey = true;
    let inString = null;

    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (inString) {
        if (ch === inString && str[i - 1] !== "\\") inString = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        inString = ch;
        continue;
      }
      if (ch === "{" || ch === "[" || ch === "(") {
        depth++;
        continue;
      }
      if (ch === "}" || ch === "]" || ch === ")") {
        depth--;
        continue;
      }
      if (depth === 0) {
        if (ch === ",") {
          const k = currentKey.trim().replace(/^['"]|['"]$/g, "");
          if (k) list.push(k);
          currentKey = "";
          inKey = true;
        } else if (ch === ":" || ch === "=") {
          inKey = false;
        } else if (inKey) {
          currentKey += ch;
        }
      }
    }
    const k = currentKey.trim().replace(/^['"]|['"]$/g, "");
    if (k) list.push(k);

    return list.map(item => {
      const m = item.match(/^[a-zA-Z0-9_$]+/);
      return m ? m[0] : item;
    }).filter(Boolean);
  }

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    let idx = 0;
    while (true) {
      const setIdx = content.indexOf("set({", idx);
      if (setIdx === -1) break;
      const braceStart = setIdx + 4; // '{'
      let depth = 1;
      let j = braceStart + 1;
      let inString = null;
      while (j < content.length && depth > 0) {
        const ch = content[j];
        if (inString) {
          if (ch === inString && content[j - 1] !== "\\") inString = null;
        } else if (ch === '"' || ch === "'" || ch === "`") {
          inString = ch;
        } else if (ch === "{") {
          depth++;
        } else if (ch === "}") {
          depth--;
        }
        j++;
      }
      const inside = content.slice(braceStart + 1, j - 1);
      const topKeys = extractTopLevelKeys(inside);
      for (const key of topKeys) keys.add(key);
      idx = j;
    }
  }

  return Array.from(keys).sort();
}

async function run() {
  console.log("Iniciando suite de pruebas del sitio público y privacidad (test/sitio.test.js)...\n");

  const files = ["index.html", "privacidad.html", "soporte.html", "estilo.css"];
  for (const f of files) {
    const full = path.join(DOCS, f);
    check(`1. Archivo docs/${f} existe y no está vacío`, fs.existsSync(full) && fs.statSync(full).size > 50);
  }

  const htmlFiles = ["index.html", "privacidad.html", "soporte.html"];
  const doms = {};

  for (const hf of htmlFiles) {
    const html = fs.readFileSync(path.join(DOCS, hf), "utf8");
    let dom;
    try {
      dom = new JSDOM(html);
      check(`2. ${hf} parsea correctamente con JSDOM`, true);
    } catch (e) {
      check(`2. ${hf} parsea correctamente con JSDOM`, false, e.message);
      continue;
    }
    doms[hf] = dom;
    const document = dom.window.document;

    // Verificar html lang
    const lang = document.documentElement.getAttribute("lang");
    check(`3. ${hf} tiene atributo lang válido`, Boolean(lang && (lang === "es" || lang === "en")), `lang="${lang}"`);

    // Sin <script src=...> ni <iframe>
    const scripts = document.querySelectorAll("script");
    const iframes = document.querySelectorAll("iframe");
    check(`4. ${hf} no incluye scripts externos ni iframes`, scripts.length === 0 && iframes.length === 0, `scripts: ${scripts.length}, iframes: ${iframes.length}`);

    // Verificar todos los enlaces y recursos
    const elementsWithHref = document.querySelectorAll("[href]");
    const elementsWithSrc = document.querySelectorAll("[src]");

    let badLinks = [];
    for (const el of elementsWithHref) {
      const href = el.getAttribute("href");
      if (!href) continue;
      if (href.startsWith("#") || href.startsWith("mailto:")) continue;
      if (href.startsWith("https://github.com/ginaproyecto02-lgtm/")) continue;
      if (href.startsWith("http://") || href.startsWith("https://")) {
        badLinks.push(`Recurso externo no permitido: ${href}`);
      } else {
        // Enlace relativo: debe existir en docs/
        const cleanPath = href.split("?")[0].split("#")[0];
        const targetPath = path.resolve(DOCS, cleanPath);
        if (!fs.existsSync(targetPath)) {
          badLinks.push(`Enlace interno roto: ${href} (no existe en ${cleanPath})`);
        }
      }
    }

    for (const el of elementsWithSrc) {
      const src = el.getAttribute("src");
      if (!src) continue;
      if (src.startsWith("http://") || src.startsWith("https://")) {
        badLinks.push(`Recurso externo src no permitido: ${src}`);
      } else {
        const cleanPath = src.split("?")[0].split("#")[0];
        const targetPath = path.resolve(DOCS, cleanPath);
        if (!fs.existsSync(targetPath)) {
          badLinks.push(`Recurso local roto: ${src}`);
        }
      }
    }

    check(`5. ${hf} solo contiene enlaces relativos válidos o enlaces seguros a GitHub/mailto`, badLinks.length === 0, badLinks.join("; "));
  }

  // Contenido de index.html: qué es Gina (3 párrafos en es y en)
  if (doms["index.html"]) {
    const doc = doms["index.html"].window.document;
    const pEs = doc.querySelectorAll("section[lang='es'] p");
    const pEn = doc.querySelectorAll("section[lang='en'] p");
    check("6. index.html contiene 3 párrafos en español y 3 en inglés", pEs.length >= 3 && pEn.length >= 3, `es: ${pEs.length}, en: ${pEn.length}`);
    const nav = doc.querySelector("nav");
    check("6b. index.html tiene enlaces a privacidad, soporte y código", Boolean(nav && nav.querySelector("a[href='privacidad.html']") && nav.querySelector("a[href='soporte.html']")));
  }

  // Contenido de soporte.html: cómo reportar problemas y qué datos incluir
  if (doms["soporte.html"]) {
    const doc = doms["soporte.html"].window.document;
    const text = doc.body.textContent;
    const hasSugerir = text.includes("Sugerir") || text.includes("sugerir");
    const hasGitHub = text.includes("GitHub") || text.includes("issue");
    const hasDatos = (text.includes("Tienda") || text.includes("Store")) &&
                     (text.includes("URL") || text.includes("url")) &&
                     (text.includes("Navegador") || text.includes("Browser")) &&
                     (text.includes("Diagnóstico") || text.includes("Diagnostic"));
    check("7. soporte.html incluye botón sugerir, GitHub issues y datos requeridos", hasSugerir && hasGitHub && hasDatos);
  }

  // Contenido de privacidad.html: última actualización y versión
  if (doms["privacidad.html"]) {
    const text = doms["privacidad.html"].window.document.body.textContent;
    check("8. privacidad.html indica fecha de actualización y versión", text.includes("14 de noviembre de 2026") && text.includes("3.2.0"));
  }

  // Claves de storage.local en privacidad.html
  const privText = fs.readFileSync(path.join(DOCS, "privacidad.html"), "utf8");
  const storageKeys = extractStorageKeys();
  const missingKeys = storageKeys.filter(k => !privText.includes(k));

  check(
    "9. docs/privacidad.html menciona cada clave de storage.local encontrada con grep de set({",
    missingKeys.length === 0,
    missingKeys.length > 0 ? `Claves no mencionadas: ${missingKeys.join(", ")}` : `${storageKeys.length} claves verificadas (${storageKeys.join(", ")})`
  );

  // manifest.json homepage_url
  const manifest = JSON.parse(fs.readFileSync(path.join(EXT, "manifest.json"), "utf8"));
  check(
    "10. extension/manifest.json tiene homepage_url apuntando a GitHub Pages",
    manifest.homepage_url === "https://ginaproyecto02-lgtm.github.io/project-gina/",
    `homepage_url="${manifest.homepage_url}"`
  );

  console.log(`\nResultado: ${pass}/${total} pruebas pasaron.`);
  if (pass < total) process.exit(1);
}

run().catch((err) => {
  console.error("Error fatal ejecutando pruebas:", err);
  process.exit(1);
});
