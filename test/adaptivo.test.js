// SPDX-License-Identifier: MIT
// Gina — Pruebas de la lectura adaptativa (extension/src/adaptivo.js), inspirada en el «adaptive scraping» de Scrapling.
// Usa las páginas reales guardadas de Mercado Libre y Amazon México (test/fixtures/semejanza) y simula un rediseño:
// todas las clases cambian de nombre y desaparecen los atributos que usan los selectores.
"use strict";
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.join(__dirname, "..");
for (const f of ["matcher.js", "semejanza.js", "comparador.js", "adaptivo.js"]) require(path.join(ROOT, "extension", "src", f));
const QED = globalThis.QED;

const vc = new VirtualConsole(); // las hojas de estilo de las páginas reales no le interesan a la prueba
const docOf = (html) => new JSDOM(html, { virtualConsole: vc }).window.document;

let pass = 0, total = 0;
function check(name, cond, detail) {
  total++;
  if (cond) { pass++; console.log("OK    " + name); }
  else { console.error("FALLA " + name + (detail ? " → " + detail : "")); }
}

const tiendas = JSON.parse(fs.readFileSync(path.join(ROOT, "datagen", "tiendas_comparar.json"), "utf8")).tiendas["México"];
const CFG = {
  mercadolibre_mx: Object.assign({ pais: "México" }, tiendas.find((s) => /Mercado/.test(s.nombre))),
  amazon_mx: Object.assign({ pais: "México" }, tiendas.find((s) => /Amazon/.test(s.nombre)))
};

// Rediseño simulado: cada clase se renombra y se quitan data-component-type / data-automation-id
function redisenar(html) {
  return html
    .replace(/class="([^"]*)"/g, (m, v) => 'class="' + v.split(/\s+/).filter(Boolean).map((x) => "r" + x.length + x.slice(-2)).join(" ") + '"')
    .replace(/\sdata-(component-type|automation-id)="[^"]*"/g, "");
}
const sinScripts = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, "");
const clave = (it) => it.title.slice(0, 40);

console.log("\n=== 1. Páginas reales: rediseño simulado ===");
const casos = [];
for (const [dir, cfg] of Object.entries(CFG)) {
  for (const c of ["caso1", "caso2", "caso3", "caso4", "caso5"]) {
    const p = path.join(__dirname, "fixtures", "semejanza", dir, c + ".html");
    if (!fs.existsSync(p)) continue;
    const html = fs.readFileSync(p, "utf8");
    if (html.length < 20000) continue; // captcha guardado, no hay productos
    casos.push([dir, c, cfg, sinScripts(html)]);
  }
}
check("Hay al menos 6 páginas reales con productos para probar", casos.length >= 6, String(casos.length));

let reubicadas = 0, descubiertas = 0;
for (const [dir, c, cfg, html] of casos) {
  const doc = docOf(html);
  const base = QED.extractStoreItemsWithMeta(html, doc, cfg);
  const baseKeys = new Set(base.items.map(clave));
  const fp = base.fingerprint;

  const html2 = redisenar(html);
  const doc2 = docOf(html2);
  const conSelectores = QED.parseStoreWithSelectors(doc2, cfg.selectores, cfg.dominio, "MXN");

  const conHuella = QED.extractStoreItemsWithMeta(html2, doc2, Object.assign({}, cfg, { _fingerprint: fp }));
  const sinHuella = QED.extractStoreItemsWithMeta(html2, docOf(html2), cfg);
  const comunes = (r) => r.items.filter((it) => baseKeys.has(clave(it))).length;
  const minimo = Math.min(5, baseKeys.size);

  check(`${dir}/${c}: los selectores leen la página original y dejan huella`, base.items.length >= 5 && base.items[0]._extractMethod === "selectores" && !!fp,
    `${base.items.length} productos, huella ${!!fp}`);
  check(`${dir}/${c}: tras el rediseño los selectores ya no encuentran nada`, conSelectores.length === 0, String(conSelectores.length));
  const okH = conHuella.items.length >= minimo && comunes(conHuella) >= minimo && conHuella.via === "huella" && conHuella.items[0]._extractMethod === "adaptivo";
  if (okH) reubicadas++;
  check(`${dir}/${c}: con la huella se reubican los mismos productos (${comunes(conHuella)} de ${baseKeys.size})`, okH,
    `via=${conHuella.via} n=${conHuella.items.length}`);
  const okD = sinHuella.items.length >= minimo && comunes(sinHuella) >= minimo;
  if (okD) descubiertas++;
  check(`${dir}/${c}: sin huella se descubren por su forma (${comunes(sinHuella)} de ${baseKeys.size})`, okD, `via=${sinHuella.via} n=${sinHuella.items.length}`);

  const malos = conHuella.items.filter((it) => !(it.price > 0) || !/^https:\/\//.test(it.url) || !QED.hostMatches(new URL(it.url).hostname, cfg.dominio) || it.currency !== "MXN" || !it.title);
  check(`${dir}/${c}: cada producto reubicado trae título, precio > 0, MXN y enlace https de la propia tienda`, malos.length === 0, JSON.stringify(malos[0] || {}).slice(0, 200));

  // Precio: el reubicado coincide con el que leyeron los selectores (mismo producto, ±1 peso por centavos)
  // (dos publicaciones pueden tener el mismo título con distinto precio: vale cualquiera de los precios de ese título)
  const porClave = new Map();
  for (const it of base.items) if (it.price != null) { if (!porClave.has(clave(it))) porClave.set(clave(it), []); porClave.get(clave(it)).push(it.price); }
  const conPar = conHuella.items.filter((it) => porClave.has(clave(it)));
  const difPrecio = conPar.filter((it) => !porClave.get(clave(it)).some((p) => Math.abs(p - it.price) <= 1));
  check(`${dir}/${c}: los precios reubicados coinciden con los de los selectores (${conPar.length} comparados)`, conPar.length >= 3 && difPrecio.length === 0, difPrecio.map((x) => `${clave(x)}: ${x.price} vs ${porClave.get(clave(x))}`).join("; "));
}
console.log(`   Reubicadas con huella: ${reubicadas}/${casos.length} · descubiertas sin huella: ${descubiertas}/${casos.length}`);

console.log("\n=== 2. Casos controlados ===");
{
  // Tarjetas con enlace a otra tienda, sin precio o solo filtros de precio: no son productos
  const html = `<html><body>
    <ul class="filtros">${[1, 2, 3, 4].map((i) => `<li><a href="/s?precio=${i}00">Hasta $${i}00</a></li>`).join("")}</ul>
    <div class="grid">${[1, 2, 3, 4].map((i) => `<div class="card"><img src="https://img.evil.example/${i}.jpg"><h3><a href="https://evil.example/p/${i}">Producto ajeno ${i}</a></h3><span>$${i}99</span></div>`).join("")}</div>
  </body></html>`;
  const r = QED.extractStoreItemsWithMeta(html, docOf(html), { dominio: "mercadolibre.com.mx", pais: "México" });
  check("Enlaces a otro dominio y filtros de precio sin imagen no se toman como productos", r.items.length === 0, JSON.stringify(r.items).slice(0, 200));
}
{
  // Precio tachado (antes) frente al actual
  const card = (i) => `<li class="x"><img src="https://http2.mlstatic.com/${i}.jpg"><h2><a href="https://www.mercadolibre.com.mx/p/MLM${i}">Nutella 1 kg tarro ${i}</a></h2><s class="old">$${i}50</s><span class="now"><span>$</span><span>${i}20</span></span></li>`;
  const html = `<html><body><ol>${[2, 3, 4].map(card).join("")}</ol></body></html>`;
  const r = QED.extractStoreItemsWithMeta(html, docOf(html), { dominio: "mercadolibre.com.mx", pais: "México" });
  check("Se lee el precio actual, no el tachado", r.items.length === 3 && r.items[0].price === 220 && r.items[2].price === 420, JSON.stringify(r.items.map((x) => x.price)));
}
{
  // Texto hostil en la tarjeta: se guarda como texto, las URLs javascript: no pasan
  const card = (i) => `<div class="c"><img src="javascript:alert(1)"><h3><a href="javascript:alert(${i})">x</a><a href="https://www.mercadolibre.com.mx/p/MLM${i}">&lt;img src=x onerror=alert(1)&gt; Producto ${i}</a></h3><b>$${i}00</b></div>`;
  const html = `<html><body><section>${[1, 2, 3].map(card).join("")}</section></body></html>`;
  const r = QED.extractStoreItemsWithMeta(html, docOf(html), { dominio: "mercadolibre.com.mx", pais: "México" });
  check("Contenido hostil: imagen javascript: descartada y enlace solo https de la tienda", r.items.length === 3 && r.items.every((x) => x.image === "" && x.url.startsWith("https://www.mercadolibre.com.mx/")), JSON.stringify(r.items[0] || {}));
}
{
  // Huella falsa o corrupta (por ejemplo, de una base manipulada): se ignora y se usa el descubrimiento
  const card = (i) => `<li><img src="https://http2.mlstatic.com/${i}.jpg"><h2><a href="https://www.mercadolibre.com.mx/p/MLM${i}">Producto real ${i}</a></h2><span>$${i}00</span></li>`;
  const html = `<html><body><ol>${[1, 2, 3].map(card).join("")}</ol></body></html>`;
  const malas = [{ v: 1, tag: "img onerror=x", classes: [], attrs: [], path: [], sig: {} }, { v: 2 }, "texto", null];
  const ok = malas.every((fp) => {
    const r = QED.extractStoreItemsWithMeta(html, docOf(html), { dominio: "mercadolibre.com.mx", pais: "México", _fingerprint: fp });
    return r.items.length === 3 && r.via === "descubrimiento";
  });
  check("Huellas inválidas se ignoran sin romper la lectura", ok);
  check("validFingerprint rechaza huellas malformadas", malas.every((fp) => !QED.ADAPT.validFingerprint(fp)));
}
{
  // Página sin productos (captcha o error): nada
  const html = fs.readFileSync(path.join(__dirname, "fixtures", "semejanza", "walmart_mx", "caso1.html"), "utf8");
  const r = QED.extractStoreItemsWithMeta(html, docOf(html), { dominio: "walmart.com.mx", pais: "México" });
  check("Página de bloqueo de Walmart: la lectura adaptativa no inventa productos", r.items.length === 0, String(r.items.length));
}
{
  // Similitud: la tarjeta original se parece más a sí misma que a un bloque de navegación
  const html = `<html><body><nav><div class="menu"><a href="https://www.mercadolibre.com.mx/ofertas">Ofertas</a></div></nav>
    <ol class="res"><li class="card"><img src="https://http2.mlstatic.com/1.jpg"><h2><a href="https://www.mercadolibre.com.mx/p/1">A</a></h2><span>$100</span></li></ol></body></html>`;
  const d = docOf(html);
  const card = d.querySelector("li.card");
  const fp = QED.ADAPT.fingerprint(card, "mercadolibre.com.mx");
  const sSelf = QED.ADAPT.similarity(fp, card, "mercadolibre.com.mx");
  const sNav = QED.ADAPT.similarity(fp, d.querySelector("div.menu"), "mercadolibre.com.mx");
  check("Similitud: 1.0 consigo misma y mucho menor con un menú", sSelf === 1 && sNav < 0.5, `${sSelf} vs ${sNav}`);
}

{
  // Regresión (validación 2026-11-14): el selector de precio de Mercado Libre leía el precio ANTERIOR (tachado) en productos
  // con descuento: Coca-Cola Zero 6 pack salía a $143 cuando costaba $98.31.
  const html = sinScripts(fs.readFileSync(path.join(__dirname, "fixtures", "semejanza", "mercadolibre_mx", "caso2.html"), "utf8"));
  const items = QED.parseStoreWithSelectors(docOf(html), CFG.mercadolibre_mx.selectores, CFG.mercadolibre_mx.dominio, "MXN");
  const coca = items.find((it) => /Coca-Cola Zero sin Az.car 6 Pack 355ml/i.test(it.title));
  check("Mercado Libre: el selector lee el precio actual con centavos ($98.31), no el anterior tachado ($143)", coca && coca.price === 98.31, coca ? String(coca.price) : "no encontrado");
}

console.log("\n=== 3. Integración ===");
{
  const bg = fs.readFileSync(path.join(ROOT, "extension", "src", "background.js"), "utf8");
  const off = fs.readFileSync(path.join(ROOT, "extension", "src", "offscreen.html"), "utf8");
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, "extension", "manifest.json"), "utf8"));
  check("Chrome (importScripts), offscreen y Firefox (background.scripts) cargan adaptivo.js",
    /importScripts\([^)]*"adaptivo\.js"/.test(bg) && /adaptivo\.js/.test(off) && (man.background.scripts || []).includes("src/adaptivo.js"));
  const opt = fs.readFileSync(path.join(ROOT, "extension", "options", "options.js"), "utf8");
  check("«Borrar memoria» también borra las huellas guardadas", /compareFingerprints:\s*\{\}/.test(opt));
}

console.log(`\n${pass}/${total} pruebas de lectura adaptativa correctas`);
if (pass !== total) process.exit(1);
