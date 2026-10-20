// SPDX-License-Identifier: MIT
// Pruebas de seguridad «de marco rudo»: inyección en la tarjeta, base remota envenenada, enlaces,
// Keepa y rastreadores, sugerencias por correo, procesador de correo y detección de sitios oficiales.
// Cada caso usa cargas maliciosas reales (XSS, javascript:, CRLF, marcado de GitHub, SSRF).
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const { JSDOM } = require("jsdom");
const EXT = path.join(__dirname, "..", "extension");
const ROOT = path.join(__dirname, "..");
const baseDb = JSON.parse(fs.readFileSync(path.join(EXT, "data/brands.json"), "utf8"));
const registry = JSON.parse(fs.readFileSync(path.join(EXT, "data/sites.json"), "utf8"));

let pass = 0, total = 0;
function check(name, ok, detail) { total++; if (ok) pass++; console.log(`${ok ? "OK   " : "FALLA"} ${name}${detail && !ok ? " → " + detail : ""}`); }

const X = {
  tag: `<img src=x onerror="window.__pwned=1">`,
  svg: `"><svg/onload=window.__pwned=1>`,
  attr: `" onmouseover="window.__pwned=1" x="`,
  js: "javascript:window.__pwned=1",
  dataUrl: "data:text/html,<script>window.__pwned=1</script>",
  style: `</style><style>*{background:url(https://evil.example/x)}</style>`,
  tpl: "${7*7}{{constructor.constructor('window.__pwned=1')()}}",
};
const ALL = Object.values(X).join(" ");

function env(html, url) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, { url, runScripts: "outside-only" });
  for (const f of ["src/matcher.js", "src/reputation.js", "src/alternativas.js", "src/extractors.js", "src/semejanza.js", "src/comparador.js", "src/flights.js", "src/notices.js", "src/i18n.js", "src/card.js"]) vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), dom.getInternalVMContext());
  if (dom.window.QED.I18N) dom.window.QED.I18N.setLang("es");
  return dom.window;
}
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;

// Igual que content.js (mínimo): extrae, empareja, evalúa confiabilidad y muestra la tarjeta.
function analyze(w, url, db, extra) {
  const QED = w.QED, u = new URL(url);
  const index = QED.buildIndex(db, [], {}, {});
  const entry = QED.siteInfo(registry, u.hostname, u.pathname);
  const data = QED.extract(w.document, u.hostname, entry ? entry.pais : "");
  const r = QED.match(index, data.candidates, data.title);
  r.store = entry && entry.tipo === "tienda" ? { nombre: entry.nombre, group: index.groups[entry.g], id: entry.g, entry, pais: entry.pais } : null;
  const prep = QED.ALT.prepare(db, index);
  const catRes = QED.ALT.category(prep, r.found ? r.brand : r.brandText, data.title, data.categoryPath);
  if (catRes && catRes.cat) {
    r.alternativas = { cat: catRes.cat, label: (prep.cats[catRes.cat] || {}).label || catRes.cat, pais: entry && entry.pais, confianza: catRes.confianza,
      items: QED.ALT.suggest(prep, catRes.cat, entry && entry.pais, r.group && r.group.id, null, 3, data.title, catRes.subcat), otherBrands: [], dominant: [] };
  }
  r.reliabilityEval = QED.evaluateReliability(data.reliability, r.group, catRes && catRes.cat, data.title, entry ? entry.pais : "México", entry,
    Object.assign({ host: u.hostname, rawTitle: data.title, brand: r.brand || r.brandText, rastreadores: db.rastreadores, tiendasComparar: db.tiendas_comparar }, extra || {}));
  QED.showCard(r, { values: { seguridad: 2, laboral: 2 } });
  return r;
}
const rootOf = (w) => (w.QED.__cardRoot ? w.QED.__cardRoot() : (w.document.getElementById("gina-tarjeta") || {}).shadowRoot);

// Revisa el árbol de la tarjeta: sin scripts, sin manejadores en atributos, solo enlaces web o mailto.
function auditTree(root) {
  const bad = [];
  if (!root) return ["sin tarjeta"];
  for (const el of root.querySelectorAll("*")) {
    const tag = el.tagName.toLowerCase();
    if (["script", "iframe", "object", "embed", "img", "form", "meta", "link", "base", "foreignobject"].includes(tag)) bad.push(`<${tag}>`);
    for (const a of Array.from(el.attributes)) {
      const n = a.name.toLowerCase(), v = a.value.trim().toLowerCase();
      if (n.startsWith("on")) bad.push(`${tag}[${n}]`);
      if ((n === "href" || n === "src" || n === "action" || n === "formaction" || n === "xlink:href") && v && !/^(https?:\/\/|#|mailto:)/.test(v)) bad.push(`${tag}[${n}=${v.slice(0, 40)}]`);
      if (/javascript:|data:text\/html/.test(v)) bad.push(`${tag}[${n}] con ${v.slice(0, 30)}`);
      if (n === "style" && /url\(|expression\(/.test(v)) bad.push(`${tag}[style url()]`);
    }
  }
  const styles = root.querySelectorAll("style");
  if (styles.length > 1) bad.push(`${styles.length} <style> (se inyectó una hoja)`);
  for (const el of root.querySelectorAll("*")) for (const a of Array.from(el.attributes)) if (/evil\.example/.test(a.value)) bad.push(`${el.tagName.toLowerCase()}[${a.name}] apunta a evil.example`);
  for (const s of styles) if (/evil\.example|url\(/.test(s.textContent)) bad.push("hoja de estilo con url() externa");
  return bad;
}

// ---------------------------------------------------------------- 1. Página de tienda maliciosa
const pages = [
  ["Amazon MX", "https://www.amazon.com.mx/dp/B0ABCDEF12",
    `<span id="productTitle">Crema ${X.tag} ${X.svg}</span><a id="bylineInfo">Visita la tienda de ${X.attr}</a>
     <div id="merchant-info">Vendido por ${X.tag}</div><span class="a-price"><span class="a-offscreen">$1,299.00</span></span>
     <div id="installmentCalculator_feature_div">Hasta 12 meses sin intereses ${X.svg}</div>
     <input id="ASIN" value="${X.svg.replace(/"/g, "&quot;")}">`],
  ["JSON-LD hostil", "https://www.liverpool.com.mx/tienda/pdp/1",
    ld({ "@context": "https://schema.org", "@type": "Product", name: `Tenis ${X.tag}`, brand: { "@type": "Brand", name: X.svg }, gtin13: X.attr, sku: X.js,
      offers: { "@type": "Offer", price: X.attr, priceCurrency: X.svg, seller: { name: X.tag }, url: X.js },
      aggregateRating: { ratingValue: X.attr, reviewCount: X.svg } }) + `<h1>Tenis ${X.svg}</h1>`],
  ["Mercado Libre", "https://articulo.mercadolibre.com.mx/MLM-123456789-x",
    `<h1 class="ui-pdp-title">Leche ${X.tag}</h1><div class="ui-pdp-seller__header__title">${X.svg}</div><span class="andes-money-amount__fraction">${X.attr}</span>`],
];
for (const [name, url, html] of pages) {
  const w = env(html, url);
  let err = null;
  try { analyze(w, url, baseDb); } catch (e) { err = e; }
  const bad = auditTree(rootOf(w));
  check(`Inyección desde la página (${name}): la tarjeta no ejecuta ni inserta marcado`, !err && bad.length === 0 && !w.__pwned, err ? String(err) : bad.join(", "));
}

// ---------------------------------------------------------------- 2. Base remota envenenada (repo comprometido)
{
  const db = JSON.parse(JSON.stringify(baseDb));
  const g = db.grupos.ferrero;
  Object.assign(g, { empresa: `Ferrero ${X.tag}`, controlador: X.svg, nota: X.style, fuente: X.attr, url: X.js, fondos: X.tag, gobierno: X.svg,
    pais: `Italia ${X.tag}`, tipo: `Familia${X.attr}`, ahorro_fuente: X.dataUrl, sitio_oficial: X.js, busqueda_oficial: X.js + "{q}" });
  db.reputacion = db.reputacion || {};
  db.reputacion.ferrero = { revisado: "2026-01-01", eventos: [{ tema: "laboral", estado: "multa", titulo: X.tag, url: X.js, fuente: X.svg, anio: X.attr, monto: X.tag }], positivos: [{ titulo: X.svg, url: X.dataUrl }], lobbying: [{ titulo: X.attr, url: X.js }] };
  db.rastreadores = [{ nombre: `Keepa ${X.tag}`, desc: X.svg, requiere: "asin", dominios: { "amazon.com.mx": "javascript:window.__pwned=1//{asin}" } },
    { nombre: X.svg, desc: X.attr, requiere: "q", dominios: { "amazon.com.mx": X.dataUrl } }];
  db.tiendas_comparar = { "México": [{ nombre: X.tag, dominio: "evil.example", url_busqueda: "javascript:window.__pwned=1/{q}" }, { nombre: "Ok", dominio: "x.example", url_busqueda: X.dataUrl + "{q}" }] };
  const url = "https://www.amazon.com.mx/dp/B0ABCDEF12";
  const w = env(`<span id="productTitle">Nutella 650 g</span><a id="bylineInfo">Visita la tienda de Ferrero</a><span class="a-price"><span class="a-offscreen">$99.00</span></span>`, url);
  let err = null;
  try { analyze(w, url, db); } catch (e) { err = e; }
  const root = rootOf(w);
  const bad = auditTree(root);
  check("Base remota envenenada: textos escapados y enlaces javascript:/data: neutralizados", !err && bad.length === 0 && !w.__pwned, err ? String(err) : bad.join(", "));
}

// ---------------------------------------------------------------- 3. Integridad de la tarjeta frente a la página
{
  const url = "https://www.amazon.com.mx/dp/B0ABCDEF12";
  const w = env(`<span id="productTitle">Nutella 650 g</span><a id="bylineInfo">Visita la tienda de Ferrero</a>`, url);
  analyze(w, url, baseDb);
  const host = w.document.getElementById("gina-tarjeta");
  // Lo que ve un script de la propia página (host.shadowRoot): con Shadow DOM cerrado es null.
  check("La página no puede leer ni alterar la tarjeta (Shadow DOM cerrado)", host && !host.shadowRoot && !!rootOf(w), host && host.shadowRoot ? "shadowRoot abierto: la tienda puede reescribir el veredicto" : "sin tarjeta");
}

// ---------------------------------------------------------------- 4. Keepa y rastreadores: escenarios
{
  const W = env("", "https://www.amazon.com.mx/");
  const Q = W.QED;
  const tbl = baseDb.rastreadores;
  const cases = [
    ["www.amazon.com.mx", { id: "B0ABCDEF12", type: "asin" }, "https://keepa.com/#!product/11-B0ABCDEF12"],
    ["www.amazon.com", { id: "B0ABCDEF12", type: "asin" }, "https://keepa.com/#!product/1-B0ABCDEF12"],
    ["smile.amazon.com", { id: "B0ABCDEF12", type: "asin" }, "https://keepa.com/#!product/1-B0ABCDEF12"],
    ["www.amazon.co.uk", { id: "B0ABCDEF12", type: "asin" }, "https://keepa.com/#!product/2-B0ABCDEF12"],
    ["www.amazon.de", { id: "B0ABCDEF12", type: "asin" }, "https://keepa.com/#!product/3-B0ABCDEF12"],
    ["www.amazon.es", { id: "B0ABCDEF12", type: "asin" }, "https://keepa.com/#!product/9-B0ABCDEF12"],
    ["www.amazon.co.jp", { id: "B0ABCDEF12", type: "asin" }, "https://keepa.com/#!product/5-B0ABCDEF12"],
  ];
  for (const [host, pid, want] of cases) {
    const links = Q.getTrackerLinks(host, pid, "q", tbl);
    const k = links.find((l) => l.name === "Keepa");
    check(`Keepa en ${host} → ${want.split("/").pop()}`, k && k.url === want, k ? k.url : "sin enlace");
  }
  const noAsin = Q.getTrackerLinks("www.amazon.com.mx", { id: "", type: "none" }, "q", tbl);
  check("Amazon sin ASIN → sin Keepa ni CamelCamelCamel", !noAsin.some((l) => /Keepa|Camel/.test(l.name)), JSON.stringify(noAsin));
  const ml = Q.getTrackerLinks("articulo.mercadolibre.com.mx", { id: "MLM123456", type: "mlm" }, "q", tbl);
  check("Mercado Libre → sin Keepa", !ml.some((l) => l.name === "Keepa"), JSON.stringify(ml));
  const fake = Q.getTrackerLinks("amazon.com.mx.evil.example", { id: "B0ABCDEF12", type: "asin" }, "q", tbl);
  check("Dominio impostor (amazon.com.mx.evil.example) → sin rastreadores", fake.length === 0, JSON.stringify(fake));
  const evilAsinPage = env(`<input id="ASIN" value='B0X"&gt;&lt;svg onload=1&gt;'>`, "https://www.amazon.com.mx/gp/offer-listing/");
  const pid = evilAsinPage.QED.extractProductId(evilAsinPage.document, "amazon", "https://www.amazon.com.mx/gp/offer-listing/");
  check("ASIN falso en <input id=ASIN> se descarta (solo 10 caracteres A-Z0-9)", pid.type !== "asin", JSON.stringify(pid));
  const tp1 = Q.computeTargetPrice(null, 1000);
  const DAY = 86400000, now = Date.UTC(2026, 9, 16);
  const tp2 = Q.computeTargetPrice({ p: [{ t: now - 40 * DAY, p: 850 }, { t: now - 5 * DAY, p: 990 }] }, 1000, now);
  const tp3 = Q.computeTargetPrice({ p: [{ t: now - 200 * DAY, p: 500 }, { t: now - 3 * DAY, p: 990 }] }, 1000, now);
  check("Precio objetivo: sin historial = 10% abajo; con 7+ días = mínimo de 90 días; ignora puntos de más de 90 días", tp1 === 900 && tp2 === 850 && tp3 === 900, `${tp1} ${tp2} ${tp3}`);
  check("Precio objetivo con precio 0, negativo o NaN → sin precio objetivo", Q.computeTargetPrice(null, 0) == null && Q.computeTargetPrice(null, -5) == null && Q.computeTargetPrice(null, NaN) == null);
}

// ---------------------------------------------------------------- 4b. Keepa en la tarjeta (recorrido visual)
{
  const url = "https://www.amazon.com.mx/dp/B0ABCDEF12";
  const w = env(`<span id="productTitle">Nutella 650 g</span><a id="bylineInfo">Visita la tienda de Ferrero</a><div id="corePriceDisplay_desktop_feature_div"><span class="a-price"><span class="a-offscreen">$100.00</span></span></div>`, url);
  analyze(w, url, baseDb);
  const root = rootOf(w);
  const a = root && root.querySelector("a.keepa-follow-btn");
  const target = root && root.querySelector(".keepa-copy-btn");
  check("Tarjeta en Amazon MX: botón «Seguir precio en Keepa» al producto exacto y precio objetivo 10% abajo",
    a && a.getAttribute("href") === "https://keepa.com/#!product/11-B0ABCDEF12" && a.getAttribute("rel") === "noopener noreferrer" && target && target.getAttribute("data-target") === "90",
    a ? `${a.getAttribute("href")} · ${target && target.getAttribute("data-target")}` : "sin botón");
  const url2 = "https://articulo.mercadolibre.com.mx/MLM-123456789-leche";
  const w2 = env(`<h1 class="ui-pdp-title">Leche Lala 1 L</h1>`, url2);
  analyze(w2, url2, baseDb);
  check("Tarjeta en Mercado Libre: sin botón de Keepa", !rootOf(w2).querySelector("a.keepa-follow-btn"));
}

// ---------------------------------------------------------------- 5. Sugerencias por correo (extensión)
{
  const W = env("", "https://www.amazon.com.mx/");
  const ALT = W.QED.ALT;
  const proj = { contacto: "gina.proyecto02@gmail.com" };
  const evil = { marca: "Acme\r\nBcc: victima@example.com\r\n-->@everyone [x](https://evil.example)", tienda: "amazon\n%0d%0aCc: a@b.c", producto: "x".repeat(5000) };
  const d = ALT.suggestionMailData ? ALT.suggestionMailData(proj, "marca", [evil]) : null;
  const link = ALT.suggestionLink(proj, "marca", [evil]);
  const all = JSON.stringify(d || {}) + link;
  const decoded = decodeURIComponent((link.split("?")[1] || "").replace(/&(subject|body)=/g, "\n"));
  check("Correo de sugerencia: sin saltos de línea en el asunto ni cabeceras inyectadas", link.startsWith("mailto:gina.proyecto02@gmail.com?subject=") && !/[\r\n]/.test(decodeURIComponent(link.split("subject=")[1].split("&")[0])) && !/&(cc|bcc)=/i.test(link), link.slice(0, 160));
  check("Correo de sugerencia: el bloque gina:sugerencia no se puede cerrar desde la marca (-->)", (decoded.match(/-->/g) || []).length === 1, decoded.slice(0, 200));
  check("Correo de sugerencia: longitud acotada (≤ 2,000 caracteres en el cuerpo)", decoded.length < 2000, String(decoded.length));
  const contactoMalo = ALT.suggestionLink({ contacto: "x@y.z?bcc=a@b.c" }, "marca", [{ marca: "A" }]);
  check("Correo de proyecto con parámetros (?bcc=) se rechaza", !/bcc=/i.test(contactoMalo), contactoMalo);
}

// ---------------------------------------------------------------- 6. Procesador de correo (robot)
const correo = require(path.join(ROOT, "job", "correo.js"));
function mime(subject, bodyText, opts = {}) {
  const enc = opts.enc || "7bit";
  let b = bodyText;
  if (enc === "quoted-printable") b = bodyText.replace(/[^\x20-\x7e\n]/g, (c) => Array.from(Buffer.from(c, "utf8")).map((x) => "=" + x.toString(16).toUpperCase().padStart(2, "0")).join("")).replace(/=/g, (m, i, s) => m).replace(/\n/g, "\r\n");
  if (enc === "base64") b = Buffer.from(bodyText, "utf8").toString("base64");
  const head = `From: Persona <persona@example.com>\r\nTo: gina.proyecto02@gmail.com\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\n`;
  if (opts.multipart) {
    return head + `Content-Type: multipart/alternative; boundary="BB"\r\n\r\n--BB\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: ${enc}\r\n\r\n${b}\r\n--BB\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n<div>${bodyText.replace(/</g, "&lt;")}</div>\r\n--BB--\r\n`;
  }
  return head + `Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: ${enc}\r\n\r\n${b}\r\n`;
}
const block = (marca, extra = "") => `<!-- gina:sugerencia v1 tipo=marca -->\n- marca: ${marca}\n- tienda: amazon.com.mx\n- producto: Producto de prueba categoría\n- fecha: 2026-10-16${extra}\n\n(Enviado desde la extensión Gina.)`;

function fakeImap(messages) {
  // messages: [{ uid, raw }]; recuerda qué se movió y qué se borró.
  const st = { moved: [], deleted: [], expunged: 0, box: messages.slice() };
  return {
    st,
    async searchUnseen() { return st.box.map((m) => m.uid); },
    async searchGina() { return st.box.filter((m) => /\[gina:sugerencia\]/i.test(m.raw.split("\r\n\r\n")[0])).map((m) => m.uid); },
    async fetchRaw(uid) { const m = st.box.find((x) => x.uid === uid); return m ? m.raw : ""; },
    async fetchBody(uid) { const m = st.box.find((x) => x.uid === uid); return m ? m.raw.split("\r\n\r\n").slice(1).join("\r\n\r\n") : ""; },
    async moveToProcessed(uid) { st.moved.push(uid); },
    async markProcessed(uid) { st.moved.push(uid); },
  };
}

(async () => {
  {
    const msgs = [
      { uid: 101, raw: mime("Hola, ¿comemos el viernes?", "Nos vemos. La marca: Patito es la mejor.") },             // correo personal
      { uid: 102, raw: mime("Alerta de seguridad de Google", "Alguien inició sesión.\nmarca: Google") },             // correo del sistema
      { uid: 103, raw: mime("[gina:sugerencia] Marca faltante: Jabones Zazil", block("Jabones Zazil"), { enc: "quoted-printable", multipart: true }) },
      { uid: 104, raw: mime("[gina:sugerencia] Marca faltante: Café Ñandú", block("Café Ñandú"), { enc: "base64" }) },
      { uid: 105, raw: mime("[gina:sugerencia] Marca faltante: Nutella", block("Nutella")) },                         // ya está en la base
      { uid: 106, raw: mime("[gina:sugerencia] Marca faltante: x", block("@everyone ![p](https://evil.example/p.png) <img src=x onerror=alert(1)> [click](javascript:alert(1)) Zuzu")) },
    ];
    const imap = fakeImap(msgs);
    const created = [];
    const exec = (cmd, args) => { if (args[0] === "issue" && args[1] === "create") created.push({ title: args[args.indexOf("--title") + 1], body: args[args.indexOf("--body") + 1] || "" }); return ""; };
    let res, err = null;
    try { res = await correo.processEmails({ imap, brandsDb: baseDb, openIssues: [], repo: "o/r", execFile: exec }); } catch (e) { err = e; }
    check("Correo: ignora y NO toca correos ajenos (personales o del sistema)", !err && !imap.st.moved.includes(101) && !imap.st.moved.includes(102) && !created.some((c) => /Patito|Google/.test(c.title)), err ? String(err) : `movidos ${imap.st.moved} · issues ${created.map((c) => c.title)}`);
    check("Correo: decodifica quoted-printable y base64 (acentos intactos)", created.some((c) => /Jabones Zazil/.test(c.title)) && created.some((c) => /Café Ñandú/.test(c.title)), created.map((c) => c.title).join(" | "));
    check("Correo: marca existente (Nutella) no crea issue", !created.some((c) => /Nutella/.test(c.title)));
    const txt = created.map((c) => c.title + "\n" + c.body).join("\n");
    check("Correo: ningún issue lleva menciones, imágenes, HTML ni enlaces javascript: (la marca hostil se descarta)", !/@everyone|!\[|<img|onerror|javascript:|evil\.example/i.test(txt), txt.slice(0, 200));
    check("Correo: el issue no lleva la dirección del remitente", !created.some((c) => /persona@example\.com/.test(c.title + c.body)));
  }
  {
    // Inundación: 200 correos válidos distintos → tope por ejecución.
    const msgs = Array.from({ length: 200 }, (_, i) => ({ uid: 1000 + i, raw: mime(`[gina:sugerencia] Marca faltante: Zmarca${i}`, block(`Zmarca${i}`)) }));
    const imap = fakeImap(msgs);
    let n = 0;
    await correo.processEmails({ imap, brandsDb: baseDb, openIssues: [], repo: "o/r", execFile: (c, a) => { if (a[1] === "create") n++; return ""; } });
    check("Correo: tope de issues por ejecución (≤ 25) ante una inundación", n > 0 && n <= 25, String(n));
  }
  {
    // Duplicado contra issues cerrados (rechazados antes): no se vuelve a abrir.
    const imap = fakeImap([{ uid: 7, raw: mime("[gina:sugerencia] Marca faltante: Marca Rechazada", block("Marca Rechazada")) }]);
    let n = 0;
    await correo.processEmails({ imap, brandsDb: baseDb, openIssues: [{ title: "Marca faltante: Marca Rechazada", body: "", state: "CLOSED" }], repo: "o/r", execFile: (c, a) => { if (a[1] === "create") n++; return ""; } });
    check("Correo: una marca con issue ya cerrado no se vuelve a abrir", n === 0, String(n));
  }
  {
    // Cliente IMAP: los comandos usan UID (no números de secuencia que cambian tras borrar) y no borran.
    const src = fs.readFileSync(path.join(ROOT, "job", "correo.js"), "utf8");
    check("IMAP: usa UID SEARCH/FETCH/MOVE (los números de secuencia cambian tras EXPUNGE)", /UID SEARCH/.test(src) && /UID FETCH/.test(src) && !/[^D] FETCH \$\{seq/.test(src));
    check("IMAP: nunca marca \\Deleted ni hace EXPUNGE en el buzón", !/\\\\Deleted|EXPUNGE/.test(src));
    check("IMAP: lee sin marcar como leído (BODY.PEEK)", /BODY\.PEEK/.test(src));
    check("IMAP: credenciales entre comillas escapadas (sin inyección de comandos)", /quoteImap|imapQuote|literal/i.test(src));
  }

  {
    // Cliente IMAP real contra un servidor simulado: literales por bytes (con «G3 OK» dentro del correo) y comandos exactos.
    const net = require("net");
    const mail = Buffer.from("Subject: =?UTF-8?Q?[gina:sugerencia]_Marca_faltante:_Caf=C3=A9_Lun=C3=A1?=\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n<!-- gina:sugerencia v1 tipo=marca -->\r\n- marca: Caf=C3=A9 Lun=C3=A1\r\n- tienda: amazon.com.mx\r\nG3 OK esto es texto del correo, no una respuesta\r\n", "utf8");
    const seen = [];
    const server = net.createServer((sock) => {
      sock.write("* OK Gmail listo\r\n");
      let acc = "";
      sock.on("data", (d) => {
        acc += d.toString("latin1");
        let i;
        while ((i = acc.indexOf("\r\n")) >= 0) {
          const line = acc.slice(0, i); acc = acc.slice(i + 2);
          const [tag, ...rest] = line.split(" "); const cmd = rest.join(" ");
          seen.push(cmd);
          if (/^LOGIN/.test(cmd)) sock.write(`${tag} OK LOGIN\r\n`);
          else if (/^CAPABILITY/.test(cmd)) sock.write(`* CAPABILITY IMAP4rev1 MOVE UIDPLUS\r\n${tag} OK\r\n`);
          else if (/^SELECT/.test(cmd)) sock.write(`* 3 EXISTS\r\n${tag} OK [READ-WRITE]\r\n`);
          else if (/^UID SEARCH/.test(cmd)) sock.write(`* SEARCH 41\r\n${tag} OK\r\n`);
          else if (/^UID FETCH 41 \(BODY\.PEEK\[\]\)/.test(cmd)) { sock.write(`* 1 FETCH (UID 41 BODY[] {${mail.length}}\r\n`); sock.write(mail); sock.write(`)\r\n${tag} OK FETCH\r\n`); }
          else if (/^CREATE/.test(cmd)) sock.write(`${tag} NO [ALREADYEXISTS]\r\n`);
          else if (/^UID MOVE 41/.test(cmd)) sock.write(`${tag} OK MOVE\r\n`);
          else if (/^LOGOUT/.test(cmd)) { sock.write(`* BYE\r\n${tag} OK\r\n`); sock.end(); }
          else sock.write(`${tag} BAD\r\n`);
        }
      });
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const port = server.address().port;
    const client = new correo.SimpleImapClient({ user: 'yo"@x', pass: "a\\b\"c", socketFactory: () => net.connect(port, "127.0.0.1") });
    let res, err = null;
    const created = [];
    try {
      await client.connect(); await client.login(); await client.select("INBOX");
      res = await correo.processEmails({ imap: client, brandsDb: baseDb, issues: [], repo: "o/r", execFile: (c, a) => { if (a[1] === "create") created.push(a[a.indexOf("--title") + 1]); return ""; } });
      await client.logout();
    } catch (e) { err = e; }
    server.close();
    check("IMAP real (servidor simulado): lee el literal completo aunque contenga «G3 OK», decodifica el asunto RFC 2047 y crea 1 issue",
      !err && res && res.created === 1 && created[0] === "Marca faltante: Café Luná", err ? String(err) : JSON.stringify({ res, created }));
    check("IMAP real: comandos esperados (UID SEARCH con asunto, BODY.PEEK, UID MOVE; contraseña escapada)",
      seen.some((c) => c === 'LOGIN "yo\\"@x" "a\\\\b\\"c"') && seen.some((c) => /^UID SEARCH SUBJECT "gina:sugerencia"/.test(c)) && seen.some((c) => /^UID MOVE 41 "gina\/procesado"/.test(c)) && !seen.some((c) => /EXPUNGE|\\Deleted/.test(c)), seen.join(" | "));
  }

  {
    // Contrato del recorrido: el issue que crea el correo lo entiende el robot (parseIssueContent) sin pérdida.
    const job = require(path.join(ROOT, "job", "investigar.js"));
    const p1 = correo.sanitize(correo.parseEmailBody(block("Jabones Zazil")));
    const parsedM = job.parseIssueContent({ number: 1, title: "Marca faltante: Jabones Zazil", body: correo.buildIssueBody(p1), labels: ["sugerencia"] });
    const p2 = correo.sanitize({ tipo: "alternativa", marca: "Café Ñandú", categoria: "Café", pais: "México", dueno: "Cooperativa X", fuente: "https://cooperativa-x.mx/quienes-somos" });
    const parsedA = job.parseIssueContent({ number: 2, title: "Alternativa local: Café Ñandú", body: correo.buildIssueBody(p2), labels: ["sugerencia"] });
    check("Recorrido: correo → issue → robot entiende marca, tienda y producto",
      parsedM && parsedM.tipo === "marca" && parsedM.items[0].brand === "Jabones Zazil" && parsedM.items[0].site === "amazon.com.mx" && /Producto de prueba/.test(parsedM.items[0].title), JSON.stringify(parsedM));
    check("Recorrido: correo de alternativa → issue → robot entiende categoría, país, dueño y fuente",
      parsedA && parsedA.tipo === "alternativa" && parsedA.items[0].marca === "Café Ñandú" && parsedA.items[0].fuente === "https://cooperativa-x.mx/quienes-somos", JSON.stringify(parsedA));
  }

  // ---------------------------------------------------------------- 7. Sitios oficiales: SSRF, dominio cruzado y entidad equivocada
  const so = require(path.join(ROOT, "job", "sitios_oficiales.js"));
  const page = (body, type = "text/html") => ({ ok: true, status: 200, headers: new Map([["content-type", type]]), text: async () => body, json: async () => JSON.parse(body) });
  {
    const html = `<link rel="search" type="application/opensearchdescription+xml" href="/os.xml">`;
    const fetchX = async (u) => /os\.xml/.test(u) ? page(`<OpenSearchDescription><Url type="text/html" template="https://evil.example/s?q={searchTerms}"/></OpenSearchDescription>`, "application/xml") : page("");
    const t = await so.extractOpenSearch(html, "https://www.marca.com/", fetchX);
    check("Sitios oficiales: buscador OpenSearch en otro dominio se rechaza", !t, String(t));
    const t2 = so.extractSearchAction(ld({ "@type": "WebSite", potentialAction: { "@type": "SearchAction", target: "https://www.marca.com/buscar?q={search_term_string}" } }), "https://www.marca.com/");
    check("Sitios oficiales: SearchAction del mismo dominio se acepta", t2 === "https://www.marca.com/buscar?q={q}", String(t2));
    const t3 = so.extractSearchAction(ld({ "@type": "WebSite", potentialAction: { "@type": "SearchAction", target: "https://shop.marca.com/s/{search_term_string}" } }), "https://www.marca.com/");
    check("Sitios oficiales: subdominio de la marca se acepta", t3 === "https://shop.marca.com/s/{q}", String(t3));
  }
  {
    const visited = [];
    const fetchX = async (u) => {
      visited.push(u);
      if (/wbgetentities/.test(u)) return page(JSON.stringify({ entities: { Q1: { claims: { P856: [{ mainsnak: { datavalue: { value: "http://169.254.169.254/latest/meta-data/" } } }] } } } }), "application/json");
      return page("");
    };
    const r = await so.investigateBrandOfficialSite({ brand: "Marca", wikipedia_url: "https://en.wikipedia.org/wiki/Marca" }, { fetchImpl: fetchX });
    check("Sitios oficiales: P856 apuntando a IP interna (169.254.169.254) no se visita ni se guarda", !r && !visited.some((u) => /169\.254/.test(u)), JSON.stringify(r));
  }
  {
    const fetchX = async (u) => {
      if (/wbsearchentities/.test(u)) return page(JSON.stringify({ search: [{ id: "Q2" }] }), "application/json");
      if (/wbgetentities/.test(u) && /ids=Q2/.test(u)) return page(JSON.stringify({ entities: { Q2: { claims: { P856: [{ mainsnak: { datavalue: { value: "https://www.otra-cosa.com/" } } }] } } } }), "application/json");
      if (/wbgetentities/.test(u)) return page(JSON.stringify({ entities: { "-1": {} } }), "application/json");
      return page("");
    };
    const r = await so.investigateBrandOfficialSite({ brand: "Gain" }, { fetchImpl: fetchX });
    check("Sitios oficiales: sin página de Wikipedia propia no se adivina por nombre (Gain ≠ primera entidad que coincide)", !r, JSON.stringify(r));
    const r2 = await so.investigateBrandOfficialSite({ brand: "Olay", url: "https://en.wikipedia.org/wiki/Procter_%26_Gamble" }, { fetchImpl: fetchX });
    check("Sitios oficiales: el sitio del DUEÑO no se asigna como tienda oficial de cada marca", !r2, JSON.stringify(r2));
  }

  // ---------------------------------------------------------------- 8. Comparador en la tarjeta: resultados hostiles
  {
    const w = env("<div></div>", "https://www.mercadolibre.com.mx/MLM-123");
    const QED = w.QED;

    // 8a. Saneamiento de URLs de tiendas:
    check("Comparador: URL javascript: rechazada por sanitizeStoreUrl",
      !QED.sanitizeStoreUrl("javascript:window.__pwned=1", "walmart.com.mx"));
    check("Comparador: URL http: no segura rechazada por sanitizeStoreUrl",
      !QED.sanitizeStoreUrl("http://www.walmart.com.mx/p/123", "walmart.com.mx"));
    check("Comparador: URL de otro dominio (evil.com) rechazada por sanitizeStoreUrl",
      !QED.sanitizeStoreUrl("https://evil.com/phishing", "walmart.com.mx"));
    check("Comparador: URL válida https del dominio de la tienda aceptada",
      QED.sanitizeStoreUrl("https://www.walmart.com.mx/ip/123", "walmart.com.mx") === "https://www.walmart.com.mx/ip/123");

    // 8b. Saneamiento de imágenes de productos de otras tiendas:
    check("Comparador: imagen http: rechazada por sanitizeImageUrl",
      QED.sanitizeImageUrl("http://images.walmart.com/pic.jpg") === "");
    check("Comparador: imagen javascript: o data: rechazada por sanitizeImageUrl",
      QED.sanitizeImageUrl("javascript:alert(1)") === "" && QED.sanitizeImageUrl("data:image/svg+xml,...") === "");
    check("Comparador: imagen https válida aceptada",
      QED.sanitizeImageUrl("https://images.walmart.com/pic.jpg") === "https://images.walmart.com/pic.jpg");

    // 8c. Renderizado en Shadow DOM de un resultado hostil:
    const hostileResult = {
      store: { nombre: "Mercado Libre", pais: "México", d: "mercadolibre.com.mx" },
      found: true,
      brand: "Sony",
      title: "Audífonos Sony",
      reliabilityEval: { price: { amount: 7000, currency: "MXN" } },
      compareData: {
        same: [
          {
            title: `Audífonos <img src=x onerror="window.__pwned=1">`,
            price: 6500,
            currency: "MXN",
            store: "Walmart",
            storeDomain: "walmart.com.mx",
            url: "javascript:window.__pwned=1",
            image: "http://evil.com/pic.jpg",
            isCheapest: true
          },
          {
            title: `Audífonos ${X.tag}`,
            price: 6800,
            currency: "MXN",
            store: "Liverpool",
            storeDomain: "liverpool.com.mx",
            url: "https://evil.example.com/pwn",
            image: "https://liverpool.com.mx/pic.jpg"
          }
        ],
        similar: [],
        unreadable: ["Tienda <script>alert(1)</script>"]
      }
    };

    QED.showCard(hostileResult, { compareConsent: true, compareEnabled: true });
    const cardShadow = rootOf(w);

    check("Comparador: script hostil en título no ejecuta código (window.__pwned undefined)",
      w.__pwned === undefined);

    const compareLinks = Array.from((cardShadow && cardShadow.querySelectorAll("a.compare-link")) || []);
    const anyJsLink = compareLinks.some((a) => /^javascript:/i.test(a.getAttribute("href") || ""));
    check("Comparador: ningún enlace de comparación tiene href javascript:", !anyJsLink);

    const anyEvilLink = compareLinks.some((a) => /evil\.example/i.test(a.getAttribute("href") || ""));
    check("Comparador: URL de otro dominio no se muestra en el enlace (neutralizada a #)", !anyEvilLink);

    const compareImgs = Array.from((cardShadow && cardShadow.querySelectorAll(".compare-item-row img")) || []);
    const anyHttpImg = compareImgs.some((img) => /^http:/i.test(img.getAttribute("src") || ""));
    check("Comparador: ninguna imagen tiene protocolo inseguro http:", !anyHttpImg);

    // Auditoría de seguridad del árbol renderizado con datos hostiles
    const badNodes = [];
    for (const el of cardShadow.querySelectorAll("*")) {
      const tag = el.tagName.toLowerCase();
      if (["script", "iframe", "object", "embed", "form", "meta", "link", "base", "foreignobject"].includes(tag)) badNodes.push(`<${tag}>`);
      for (const a of Array.from(el.attributes)) {
        const n = a.name.toLowerCase(), v = a.value.trim().toLowerCase();
        if (n.startsWith("on")) badNodes.push(`${tag}[${n}]`);
        if (/javascript:|data:text\/html/.test(v)) badNodes.push(`${tag}[${n}] con ${v.slice(0, 30)}`);
        if (/evil\.example/.test(v)) badNodes.push(`${tag}[${n}] apunta a evil.example`);
      }
      if (tag === "img") {
        const ref = el.getAttribute("referrerpolicy");
        const src = el.getAttribute("src") || "";
        if (ref !== "no-referrer") badNodes.push("img sin referrerpolicy=no-referrer");
        if (!src.startsWith("https://")) badNodes.push("img src no https");
      }
    }
    check("Comparador: el árbol de la tarjeta con datos hostiles pasa la auditoría de seguridad",
      badNodes.length === 0, badNodes.join("; "));
  }

  // ---------------------------------------------------------------- 12b. Validación 2026-10-18: permiso, enlaces y rastreadores en la tarjeta
  {
    const w = env("<div></div>", "https://www.mercadolibre.com.mx/MLM-123");
    const sent = [];
    const stored = {};
    // Un script de contenido real NO tiene chrome.permissions: así se simula.
    w.chrome = { runtime: { sendMessage: async (m) => { sent.push(m); return { ok: true }; } }, storage: { local: { set: async (o) => Object.assign(stored, o) } } };
    const base = { store: { nombre: "Mercado Libre", pais: "México", d: "mercadolibre.com.mx" }, found: true, brand: "Sony", title: "Audífonos Sony", reliabilityEval: { price: { amount: 7000, currency: "MXN" } } };
    w.QED.showCard(Object.assign({}, base), { compareConsent: false, compareEnabled: true });
    const btn = rootOf(w).querySelector("#card-compare-consent-btn");
    if (btn) btn.click();
    await new Promise((r) => setTimeout(r, 20));
    check("Comparador: el botón de la tarjeta pide abrir la página de permiso y NO se da el consentimiento a sí mismo",
      !!btn && sent.some((m) => m.type === "qed:open_compare_consent" && m.pais === "México") && stored.compareConsent === undefined,
      JSON.stringify({ sent, stored }));

    const w2 = env("<div></div>", "https://www.mercadolibre.com.mx/MLM-123");
    w2.QED.showCard(Object.assign({}, base, { compareData: { same: [
      { title: "Sin dominio", price: 6500, currency: "MXN", url: "https://cualquier-sitio.example/p", storeName: "X" },
      { title: "Amazon India", price: 6600, currency: "MXN", url: "https://www.amazon.in/dp/B0ABCDEF12", storeName: "Amazon.in", storeDomain: "amazon.in" },
      { title: "Amazon MX", price: 6700, currency: "MXN", url: "https://www.amazon.com.mx/dp/B0ABCDEF12", storeName: "Amazon México", storeDomain: "amazon.com.mx" }
    ], similar: [], unreadable: [] } }), { compareConsent: true, compareEnabled: true });
    const root2 = rootOf(w2);
    const links = Array.from(root2.querySelectorAll("a.compare-link")).map((a) => a.getAttribute("href"));
    const keepa = Array.from(root2.querySelectorAll(".btn-follow-price-mini")).map((a) => a.getAttribute("href"));
    check("Comparador: un resultado sin dominio de tienda conocido no lleva enlace", links[0] === "#", JSON.stringify(links));
    check("Comparador: Keepa solo para Amazon con código conocido (amazon.in sin botón; amazon.com.mx → 11)",
      keepa.length === 1 && keepa[0] === "https://keepa.com/#!product/11-B0ABCDEF12", JSON.stringify(keepa));

    // Clic en un rastreador: una sola pestaña (la del fondo), no también la del enlace
    const sent2 = [];
    w2.chrome = { runtime: { sendMessage: async (m) => { sent2.push(m); return { ok: true }; } } };
    const a = root2.querySelector(".btn-follow-price-mini");
    const ev = new w2.MouseEvent("click", { bubbles: true, cancelable: true });
    a.dispatchEvent(ev);
    check("Rastreador: el clic se abre solo por el fondo (sin pestaña doble)", ev.defaultPrevented === true && sent2.length === 1 && sent2[0].type === "qed:open_tracker");
  }

  // ---------------------------------------------------------------- 12d. Enlaces «Ver en <tienda>» debajo de los resultados
  {
    const w = env("<div></div>", "https://www.mercadolibre.com.mx/MLM-123");
    w.QED.showCard({ store: { nombre: "Mercado Libre", pais: "México", d: "mercadolibre.com.mx" }, found: true, brand: "Sony", title: "Audífonos Sony",
      reliabilityEval: { price: { amount: 7000, currency: "MXN" } },
      compareData: { same: [{ title: "Sony WH-1000XM5", price: 6500, currency: "MXN", rating: 4.6, reviewsCount: 120, url: "https://www.walmart.com.mx/ip/1", storeName: "Walmart México", storeDomain: "walmart.com.mx" }], similar: [], unreadable: ["Amazon México"],
        searchLinks: [
          { nombre: "Walmart México", dominio: "walmart.com.mx", url: "https://www.walmart.com.mx/search?q=Sony%20WH-1000XM5" },
          { nombre: "Amazon México", dominio: "amazon.com.mx", url: "https://www.amazon.com.mx/s?k=Sony%20WH-1000XM5" },
          { nombre: "<img src=x onerror=alert(1)>", dominio: "amazon.com.mx", url: "javascript:alert(1)" },
          { nombre: "Fuga", dominio: "walmart.com.mx", url: "https://evil.example/s?q=x" } ] } },
      { compareConsent: true, compareEnabled: true });
    const root = rootOf(w);
    const links = Array.from(root.querySelectorAll("a.compare-search-link")).map((a) => [a.textContent.trim(), a.getAttribute("href")]);
    const fila = (root.querySelector(".compare-item-row") || {}).textContent || "";
    check("Comparador: precio y estrellas en la tarjeta, y debajo «Ver en <tienda>» solo con enlaces https del dominio de cada tienda",
      links.length === 2 && links[0][0].startsWith("Ver en Walmart México") && links[1][1].startsWith("https://www.amazon.com.mx/s?k=") &&
      /6,?500/.test(fila) && /★ 4\.6 \(120\)/.test(fila), JSON.stringify({ links, fila: fila.replace(/\s+/g, " ").slice(0, 160) }));
  }

  // ---------------------------------------------------------------- 12e. «Sugerir» en la tarjeta: el mensaje dice lo que de verdad pasó
  {
    const probar = async (respuesta) => {
      const w = env("<div></div>", "https://www.amazon.com.mx/dp/B0ABCDEF12");
      const sent = [];
      w.chrome = { runtime: { sendMessage: async (m) => { sent.push(m); return respuesta; } } };
      w.QED.showCard({ found: false, brandText: "Marca Nueva Prueba", title: "Producto de prueba", store: { nombre: "Amazon", pais: "México", d: "amazon.com.mx" } }, {});
      const root = rootOf(w);
      const btn = root.querySelector("#card-suggest-btn");
      if (btn) btn.click();
      await new Promise((r) => setTimeout(r, 20));
      const ok = root.querySelector("#card-suggest-ok");
      return { hayBoton: !!btn, msg: ok ? ok.textContent.trim() : "", visible: ok ? ok.style.display : "", sent };
    };
    const env1 = await probar({ ok: true, status: "enviada" });
    const env2 = await probar({ ok: true, status: "en_cola" });
    const env3 = await probar({ ok: false, status: "rechazada" });
    check("Tarjeta: «Sugerir» manda el dominio real (amazon.com.mx) y no el nombre de la tienda",
      env1.hayBoton && env1.sent[0] && env1.sent[0].site === "www.amazon.com.mx" && env1.sent[0].brand === "Marca Nueva Prueba", JSON.stringify(env1.sent));
    check("Tarjeta: «Enviada» solo si la hoja la guardó; en cola o rechazada lo dice",
      /Enviada/.test(env1.msg) && /Guardada en tu navegador/.test(env2.msg) && /no es válido/.test(env3.msg), JSON.stringify([env1.msg, env2.msg, env3.msg]));
  }

  // ---------------------------------------------------------------- 12c. Página de permiso del comparador (options/comparar.html)
  {
    const runPage = async (pais, grant) => {
      const html = fs.readFileSync(path.join(EXT, "options/comparar.html"), "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
      const dom = new JSDOM(html, { url: "chrome-extension://gina/options/comparar.html?pais=" + encodeURIComponent(pais), runScripts: "outside-only" });
      const w = dom.window, stored = {}, asked = [];
      w.chrome = {
        runtime: { getURL: (p) => "ext://" + p },
        storage: { local: { get: async () => ({}), set: async (o) => Object.assign(stored, o) } },
        permissions: { request: async (req) => { asked.push(req); return grant; } }
      };
      w.fetch = async (u) => ({ json: async () => JSON.parse(fs.readFileSync(path.join(EXT, String(u).slice(6)), "utf8")) });
      for (const f of ["src/i18n.js", "options/comparar.js"]) vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), dom.getInternalVMContext());
      await new Promise((r) => setTimeout(r, 30));
      const btn = w.document.getElementById("cmp_allow");
      if (!btn.disabled) btn.click();
      await new Promise((r) => setTimeout(r, 30));
      return { stored, asked, items: w.document.querySelectorAll("#cmp_stores li").length };
    };
    const ok = await runPage("México", true);
    const origins = (ok.asked[0] && ok.asked[0].origins) || [];
    check("Página de permiso: pide solo los dominios del país y guarda el consentimiento al concederse",
      ok.stored.compareConsent === true && ok.items >= 1 && origins.length === ok.items && origins.every((o) => /^https:\/\/\*\.[a-z0-9.-]+\/\*$/.test(o)) && !origins.includes("https://*/*"),
      JSON.stringify(ok));
    const no = await runPage("México", false);
    check("Página de permiso: si el usuario lo niega, no se guarda consentimiento", no.stored.compareConsent === undefined);
    const none = await runPage("Atlántida", true);
    check("Página de permiso: país sin tiendas → no pide permisos", none.asked.length === 0 && none.stored.compareConsent === undefined);
  }

  // ---------------------------------------------------------------- 13. F2. Rastreadores y SAFE_OPEN
  {
    const bgCode = fs.readFileSync(path.join(EXT, "src/background.js"), "utf8");
    const mSafeOpen = bgCode.match(/const SAFE_OPEN = (\/[^\n]+\/);/);
    const SAFE_OPEN = mSafeOpen ? eval(mSafeOpen[1]) : null;

    check("F2. SAFE_OPEN está definido en background.js", !!SAFE_OPEN);

    // Dominios válidos de rastreadores.json
    check("F2. SAFE_OPEN permite Keepa https://", SAFE_OPEN.test("https://keepa.com/#!product/11-B0ABCDEF12"));
    check("F2. SAFE_OPEN permite CamelCamelCamel https://", SAFE_OPEN.test("https://camelcamelcamel.com/product/B0ABCDEF12"));
    check("F2. SAFE_OPEN permite subdominios por país de CamelCamelCamel (de.camelcamelcamel.com)",
      SAFE_OPEN.test("https://de.camelcamelcamel.com/product/B0ABCDEF12") && SAFE_OPEN.test("https://uk.camelcamelcamel.com/product/B0ABCDEF12"));
    check("F2. SAFE_OPEN permite Pricearchive https://", SAFE_OPEN.test("https://www.pricearchive.org/search/aliexpress.com/reloj/1"));
    check("F2. SAFE_OPEN permite Alitools https://", SAFE_OPEN.test("https://alitools.io/"));

    // URLs hostiles o no permitidas
    check("F2. SAFE_OPEN rechaza Keepa sobre protocolo inseguro http://", !SAFE_OPEN.test("http://keepa.com/#!product/11-B0ABCDEF12"));
    check("F2. SAFE_OPEN rechaza dominio impostor en subdirectorio (evil.example/keepa.com)", !SAFE_OPEN.test("https://evil.example/keepa.com/product"));
    check("F2. SAFE_OPEN rechaza subdominio atacante (keepa.com.evil.example)", !SAFE_OPEN.test("https://keepa.com.evil.example/product"));
    check("F2. SAFE_OPEN rechaza javascript:", !SAFE_OPEN.test("javascript:alert(1)"));
    check("F2. SAFE_OPEN rechaza rastreador excluido / no autorizado (waltrack.net)", !SAFE_OPEN.test("https://waltrack.net/search"));

    // Botón «Seguir precio» en tarjeta
    const urlAmz = "https://www.amazon.com.mx/dp/B0ABCDEF12";
    const wAmz = env(`<span id="productTitle">Nutella 650 g</span><a id="bylineInfo">Visita la tienda de Ferrero</a><div id="corePriceDisplay_desktop_feature_div"><span class="a-price"><span class="a-offscreen">$100.00</span></span></div>`, urlAmz);
    analyze(wAmz, urlAmz, baseDb);
    const rootAmz = rootOf(wAmz);
    const followBtn = rootAmz && rootAmz.querySelector("a.btn-follow-price");
    check("F2. Tarjeta muestra botón «Seguir precio» en la fila del precio del producto actual",
      !!followBtn && followBtn.getAttribute("href") === "https://keepa.com/#!product/11-B0ABCDEF12" &&
      followBtn.getAttribute("rel") === "noopener noreferrer" &&
      SAFE_OPEN.test(followBtn.getAttribute("href")));
  }

  // ---------------------------------------------------------------- 14. G4. Comparador en tarjeta: escape hostil, precio unitario y grupos
  {
    const w = env("", "https://www.amazon.com.mx/dp/B0ABCDEF12");
    const QED = w.QED;

    const hostileDiff = `<img src=x onerror="window.__pwned=1">Otra presentación: 350 g<script>window.__pwned=1</script>`;
    const hostileUnitPrice = `$218.00/kg <svg onload="window.__pwned=1">`;
    const hostileTitle = `Nutella <script>window.__pwned=1</script>`;

    const sameItems = Array.from({ length: 7 }, (_, i) => ({
      title: `Nutella 1 kg item ${i}`,
      storeName: "Amazon",
      storeDomain: "amazon.com.mx",
      url: `https://www.amazon.com.mx/dp/B00000000${i}`,
      price: 199 + i,
      currency: "MXN",
      unitPrice: { value: 199 + i, unit: "kg", text: `$${199 + i}.00/kg` },
      isCheapest: i === 0,
      rating: 4.8,
      reviewsCount: 150
    }));

    const similarItems = [
      {
        title: hostileTitle,
        storeName: "Walmart",
        storeDomain: "walmart.com.mx",
        url: "https://www.walmart.com.mx/ip/nutella/123",
        price: 89,
        currency: "MXN",
        difference: hostileDiff,
        reason: "otra_presentacion",
        unitPrice: { text: hostileUnitPrice }
      },
      {
        title: "Bosch GSB 13 RE 127 V",
        storeName: "Mercado Libre",
        storeDomain: "mercadolibre.com.mx",
        url: "https://articulo.mercadolibre.com.mx/MLM-999",
        price: 1250,
        currency: "MXN",
        difference: "Otro voltaje: 127 V",
        reason: "variante"
      },
      {
        title: "Extra 1",
        storeName: "Walmart",
        storeDomain: "walmart.com.mx",
        url: "https://www.walmart.com.mx/ip/1",
        price: 100,
        currency: "MXN",
        reason: "otra_presentacion"
      },
      {
        title: "Extra 2",
        storeName: "Walmart",
        storeDomain: "walmart.com.mx",
        url: "https://www.walmart.com.mx/ip/2",
        price: 110,
        currency: "MXN",
        reason: "variante"
      },
      {
        title: "Extra 3 (debe recortarse por tope de 4)",
        storeName: "Walmart",
        storeDomain: "walmart.com.mx",
        url: "https://www.walmart.com.mx/ip/3",
        price: 120,
        currency: "MXN",
        reason: "otra_presentacion"
      }
    ];

    const searchLinks = [
      { storeId: "walmart_mx", nombre: "Walmart", url: "https://www.walmart.com.mx/search?q=nutella", dominio: "walmart.com.mx" }
    ];

    const html = QED.buildCompareResultsHtml({
      same: sameItems,
      similar: similarItems,
      unreadable: [],
      searchLinks
    });

    const container = w.document.createElement("div");
    container.innerHTML = html;

    // 1. Escapado de texto hostil
    const scripts = container.querySelectorAll("script");
    const imgs = container.querySelectorAll("img[onerror]");
    const svgs = container.querySelectorAll("svg");
    check("G4. Comparador: texto hostil en diferencia, título y precio unitario no inserta etiquetas maliciosas",
      scripts.length === 0 && imgs.length === 0 && svgs.length === 0 && !w.__pwned);
    check("G4. Comparador: etiqueta de diferencia con HTML malicioso se muestra escapada como texto",
      container.innerHTML.includes("&lt;img src=x onerror=") && !container.innerHTML.includes("<img src=x onerror="));
    check("G4. Comparador: precio unitario hostil se muestra escapado como texto",
      container.innerHTML.includes("&lt;svg onload=") && !container.innerHTML.includes("<svg onload="));

    // 2. Precio unitario visible en clase .compare-unit-price
    const unitPriceEls = container.querySelectorAll(".compare-unit-price");
    check("G4. Comparador: precio unitario se muestra en elementos .compare-unit-price",
      unitPriceEls.length > 0 && unitPriceEls[0].textContent.includes("/kg"));

    // 3. Tope de 5 'mismo' y 4 'parecidos'
    const rows = container.querySelectorAll(".compare-item-row");
    // 5 mismo + 4 similar = 9 filas en total
    check("G4. Comparador: respeta tope de 5 productos 'mismo' y 4 'parecidos'",
      rows.length === 9, `filas encontradas: ${rows.length}`);

    // 4. Orden de secciones: Mismo -> Otra presentación / Variante distinta -> Enlaces
    const textAll = container.textContent;
    const posSame = textAll.indexOf("Mismo producto");
    const posPres = textAll.indexOf("Otra presentación");
    const posVar = textAll.indexOf("Variante distinta");
    const posLinks = container.querySelector(".compare-search-links") ? container.innerHTML.indexOf("compare-search-links") : -1;
    check("G4. Comparador: orden correcto de grupos (Mismo → Otra presentación → Variante distinta → Enlaces)",
      posSame !== -1 && posPres !== -1 && posVar !== -1 && posLinks !== -1 &&
      posSame < posPres && posPres < posVar && container.innerHTML.indexOf("Mismo producto") < posLinks);
  }

  console.log(`\n${pass}/${total} pruebas de seguridad correctas`);
  process.exit(pass === total ? 0 : 1);
})();
