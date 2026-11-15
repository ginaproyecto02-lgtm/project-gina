// SPDX-License-Identifier: MIT
// Gina — Lectura adaptativa de páginas de resultados (inspirada en el «adaptive scraping» de Scrapling, en JS y sin evadir defensas).
//
// Problema: las tiendas cambian su HTML (clases, contenedores) y los selectores de tiendas_comparar.json dejan de encontrar
// productos sin avisar. Solución en dos piezas:
//   1. Huella: cuando los selectores sí funcionan, se guarda la «huella» de la tarjeta de producto (etiqueta, clases, atributos,
//      camino de ancestros, padre y qué contiene: enlace a la tienda, imagen, precio). Si un día los selectores fallan,
//      se busca en la página la tarjeta más parecida a esa huella y sus hermanas.
//   2. Descubrimiento: sin huella, se buscan bloques repetidos que tengan enlace a la propia tienda, precio y título o imagen.
// Solo lee lo que la página ya entregó al navegador del usuario. No hay huellas TLS falsas, ni rotación de proxies, ni captchas.
(function (root) {
  const QED = (root.QED = root.QED || {});

  const PRICE_RE = /(?:US\$|MX\$|R\$|C\$|\$|€|£|¥|₩|₹)\s?\d|\d[\d.,\s]*\s?(?:€|MXN|USD|EUR|BRL|ARS|CLP|COP|GBP)\b/;
  const OLD_PRICE_RE = /previous|strike|tachad|antes|list-price|was-price|old-price|a-text-price/i;
  const RATING_RE = /(\d(?:[.,]\d)?)\s*(?:de|out of|von|sur|su|\/)\s*5\b/i;
  const CARD_TAGS = new Set(["li", "div", "article", "section"]);
  const MAX_TEXT = 2000;

  const lower = (s) => String(s || "").toLowerCase();
  const classesOf = (el) => (el && el.getAttribute ? (el.getAttribute("class") || "") : "").split(/\s+/).filter(Boolean).slice(0, 12);
  const attrNames = (el) => Array.from((el && el.attributes) || []).map((a) => a.name).filter((n) => n !== "class" && n !== "style").sort().slice(0, 15);
  const textOf = (el) => String((el && el.textContent) || "").replace(/\s+/g, " ").trim();

  function pathOf(el, n) {
    const p = [];
    let e = el && el.parentElement;
    while (e && p.length < (n || 5)) { p.push(lower(e.tagName)); e = e.parentElement; }
    return p;
  }

  function hostOk(host, domain) {
    const h = lower(host).replace(/^www\./, "");
    const d = lower(domain).replace(/^www\./, "");
    return !!d && (h === d || h.endsWith("." + d));
  }

  // Enlaces del bloque que llevan a la propia tienda (relativos o absolutos del mismo dominio)
  function storeLinks(el, domain) {
    const out = [];
    for (const a of Array.from(el.querySelectorAll ? el.querySelectorAll("a[href]") : [])) {
      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#") || /^(javascript|data|mailto):/i.test(href)) continue;
      try {
        const u = new URL(href, `https://www.${domain}/`);
        if (u.protocol === "https:" && hostOk(u.hostname, domain) && u.pathname.length > 1) out.push(a);
      } catch (_) {}
    }
    return out;
  }

  function contentSig(el, domain) {
    const txt = textOf(el);
    return {
      link: storeLinks(el, domain).length > 0,
      img: !!(el.querySelector && el.querySelector("img")),
      price: PRICE_RE.test(txt),
      heading: !!(el.querySelector && el.querySelector("h1,h2,h3,h4"))
    };
  }

  function fingerprint(el, domain) {
    if (!el || !el.tagName) return null;
    const parent = el.parentElement;
    return {
      v: 1,
      tag: lower(el.tagName),
      classes: classesOf(el),
      attrs: attrNames(el),
      path: pathOf(el, 5),
      parent: parent ? { tag: lower(parent.tagName), classes: classesOf(parent) } : null,
      sig: contentSig(el, domain)
    };
  }

  function jaccard(a, b) {
    const A = new Set(a || []), B = new Set(b || []);
    if (!A.size && !B.size) return 1;
    let inter = 0;
    for (const x of A) if (B.has(x)) inter++;
    return inter / (A.size + B.size - inter);
  }

  // Parecido de 0 a 1 entre una huella guardada y un elemento de la página.
  // Pesa más la forma (camino, contenido) que las clases, que es justo lo que las tiendas suelen renombrar.
  function similarity(fp, el, domain) {
    if (!fp || !el || !el.tagName) return 0;
    const cand = fingerprint(el, domain);
    let s = 0;
    s += 0.15 * (fp.tag === cand.tag ? 1 : 0);
    s += 0.15 * jaccard(fp.classes, cand.classes);
    s += 0.10 * jaccard(fp.attrs, cand.attrs);
    const pl = Math.max(fp.path.length, cand.path.length) || 1;
    let pathHits = 0;
    for (let i = 0; i < pl; i++) if (fp.path[i] && fp.path[i] === cand.path[i]) pathHits++;
    s += 0.20 * (pathHits / pl);
    s += 0.10 * (fp.parent && cand.parent ? (fp.parent.tag === cand.parent.tag ? 0.5 : 0) + 0.5 * jaccard(fp.parent.classes, cand.parent.classes) : 0);
    const keys = ["link", "img", "price", "heading"];
    s += 0.30 * (keys.filter((k) => !!fp.sig[k] === !!cand.sig[k]).length / keys.length);
    return Math.round(s * 1000) / 1000;
  }

  // ¿Puede este elemento ser una tarjeta de producto? (enlace a la tienda + precio + imagen o título, tamaño razonable)
  function isCardCandidate(el, domain) {
    if (!el || !CARD_TAGS.has(lower(el.tagName))) return false;
    const txt = textOf(el);
    if (txt.length < 15 || txt.length > MAX_TEXT) return false;
    const sig = contentSig(el, domain);
    return sig.link && sig.price && (sig.img || sig.heading);
  }

  // Quita los que contienen a otro del conjunto (nos quedamos con la tarjeta, no con la lista que la envuelve)
  function innermost(list) {
    const set = new Set(list);
    return list.filter((el) => !Array.from(el.querySelectorAll("*")).some((d) => set.has(d)));
  }
  // Quita los que están dentro de otro del conjunto (nos quedamos con la tarjeta completa, no con un pedazo)
  function outermost(list) {
    const set = new Set(list);
    return list.filter((el) => { let p = el.parentElement; while (p) { if (set.has(p)) return false; p = p.parentElement; } return true; });
  }

  // Precio actual: el elemento más interno que parece precio, fuera de precios tachados o anteriores
  function findPrice(card) {
    const all = Array.from(card.querySelectorAll("*"));
    for (const el of all) {
      const t = textOf(el);
      if (!t || t.length > 40 || !PRICE_RE.test(t)) continue;
      if (Array.from(el.children).some((c) => PRICE_RE.test(textOf(c)) && textOf(c).length <= 40)) continue; // hay uno más interno
      let p = el, old = false;
      while (p && p !== card) {
        if (/^(s|del|strike)$/i.test(p.tagName) || OLD_PRICE_RE.test(p.getAttribute("class") || "") || p.hasAttribute("data-a-strike")) { old = true; break; }
        p = p.parentElement;
      }
      if (old) continue;
      const n = QED.parsePriceText ? QED.parsePriceText(t) : parseFloat(t.replace(/[^\d.]/g, ""));
      if (n) return n;
    }
    return null;
  }

  function extractFromCard(card, domain, defCurrency) {
    const links = storeLinks(card, domain);
    if (!links.length) return null;
    const heading = card.querySelector("h2,h3,h4");
    const bestLink = links.slice().sort((a, b) => textOf(b).length - textOf(a).length)[0];
    const img = card.querySelector("img");
    let title = textOf(heading) || textOf(bestLink) || (bestLink.getAttribute("title") || "") || (img ? img.getAttribute("alt") || "" : "");
    title = title.slice(0, 150);
    if (title.length < 5) return null;
    // Enlace del título si es de la tienda; si no, el enlace de la tienda con más texto (nunca javascript:, data: ni otro dominio)
    const headLink = heading ? links.find((a) => a.contains(heading) || heading.contains(a)) : null;
    const href = headLink || bestLink;
    let url = "";
    try { url = new URL(href.getAttribute("href"), `https://www.${domain}/`).toString(); } catch (_) {}
    url = QED.sanitizeStoreUrl ? QED.sanitizeStoreUrl(url, domain) : url;
    const imgRaw = img ? (img.getAttribute("src") || img.getAttribute("data-src") || "") : "";
    const image = QED.sanitizeImageUrl ? QED.sanitizeImageUrl(imgRaw) : "";
    let rating = null;
    for (const el of Array.from(card.querySelectorAll("[aria-label], span, i")).slice(0, 200)) {
      const m = (el.getAttribute("aria-label") || textOf(el)).match(RATING_RE);
      if (m) { rating = parseFloat(m[1].replace(",", ".")); break; }
    }
    const price = findPrice(card);
    if (!url || price == null) return null;
    return { title, price, currency: defCurrency || "", url, image, rating, reviewsCount: null, gtin: "", mpn: "", model: "", brand: "" };
  }

  function toItems(cards, domain, defCurrency) {
    const items = [];
    const seen = new Set();
    for (const c of cards) {
      const it = extractFromCard(c, domain, defCurrency);
      if (!it || seen.has(it.url)) continue;
      seen.add(it.url);
      items.push(it);
      if (items.length >= 10) break;
    }
    return items;
  }

  // Sin huella: el grupo más grande de bloques hermanos con la misma forma que parecen tarjetas de producto
  function discoverCards(doc, domain) {
    if (!doc || !domain) return [];
    const cands = innermost(Array.from(doc.querySelectorAll("li,div,article,section")).filter((el) => isCardCandidate(el, domain)));
    // Sube al bloque completo: si el padre sigue siendo tarjeta y no contiene a otra candidata, es mejor tarjeta
    const lifted = outermost(cands.map((el) => {
      let best = el;
      let p = el.parentElement;
      while (p && isCardCandidate(p, domain) && !cands.some((o) => o !== el && p.contains(o))) { best = p; p = p.parentElement; }
      return best;
    }));
    const groups = new Map();
    for (const el of lifted) {
      const parentKey = el.parentElement ? lower(el.parentElement.tagName) + "." + classesOf(el.parentElement).slice(0, 2).join(".") : "";
      const key = lower(el.tagName) + "|" + pathOf(el, 3).join(">") + "|" + parentKey;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(el);
    }
    let best = [], bestScore = 0;
    for (const g of groups.values()) {
      if (g.length < 3) continue;
      const imgFrac = g.filter((e) => e.querySelector("img")).length / g.length;
      const score = g.length * 10 + imgFrac * 5;
      if (score > bestScore) { bestScore = score; best = g; }
    }
    return best;
  }

  // Con huella: las tarjetas que más se parecen a la que funcionó la última vez
  function relocate(doc, fp, domain, minScore) {
    if (!doc || !fp || !domain) return [];
    const min = typeof minScore === "number" ? minScore : 0.55;
    const scored = [];
    for (const el of Array.from(doc.querySelectorAll(fp.tag || "*"))) {
      if (!isCardCandidate(el, domain)) continue;
      const s = similarity(fp, el, domain);
      if (s >= min) scored.push([el, s]);
    }
    if (!scored.length) return [];
    const top = Math.max(...scored.map((x) => x[1]));
    return outermost(scored.filter((x) => x[1] >= top - 0.15).map((x) => x[0]));
  }

  // Punto de entrada que usa comparador.js cuando los selectores no encuentran nada
  function adaptiveExtract(doc, cfg) {
    const domain = (cfg && cfg.dominio) || "";
    const cur = QED.storeCurrency ? QED.storeCurrency(cfg || {}) : "";
    let cards = [], via = "";
    if (cfg && cfg._fingerprint) { cards = relocate(doc, cfg._fingerprint, domain); via = "huella"; }
    if (!cards.length) { cards = discoverCards(doc, domain); via = "descubrimiento"; }
    const items = toItems(cards, domain, cur);
    return { items, via, fingerprint: cards.length ? fingerprint(cards[0], domain) : null };
  }

  // Huella de la primera tarjeta que encontraron los selectores (para guardarla)
  function fingerprintFromSelectors(doc, cfg) {
    try {
      const sel = cfg && cfg.selectores && cfg.selectores.item;
      const el = sel && doc ? doc.querySelector(sel) : null;
      return el ? fingerprint(el, cfg.dominio || "") : null;
    } catch (_) { return null; }
  }

  // Una huella que llega de storage o de la base remota se valida antes de usarla
  function validFingerprint(fp) {
    return !!(fp && fp.v === 1 && typeof fp.tag === "string" && /^[a-z][a-z0-9-]{0,20}$/.test(fp.tag) &&
      Array.isArray(fp.classes) && Array.isArray(fp.attrs) && Array.isArray(fp.path) && fp.sig && typeof fp.sig === "object");
  }

  QED.ADAPT = { fingerprint, similarity, discoverCards, relocate, adaptiveExtract, fingerprintFromSelectors, validFingerprint, extractFromCard };
})(typeof globalThis !== "undefined" ? globalThis : this);
