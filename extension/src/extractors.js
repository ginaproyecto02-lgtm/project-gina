// Lectura de la marca y el título del producto en cada tienda.
// Las tiendas cambian su HTML seguido; por eso cada sitio tiene varias rutas
// y al final se usan los datos estructurados (JSON-LD / microdatos), que son más estables.
(function (root) {
  const QED = (root.QED = root.QED || {});

  function txt(el) { return el ? (el.textContent || "").replace(/\s+/g, " ").trim() : ""; }
  function q(doc, sel) { try { return doc.querySelector(sel); } catch (e) { return null; } }
  function qa(doc, sel) { try { return Array.from(doc.querySelectorAll(sel)); } catch (e) { return []; } }

  function site(host) {
    host = String(host || "").toLowerCase();
    if (/(^|\.)mercadoli(b|v)re\./.test(host)) return "mercadolibre";
    if (/(^|\.)amazon\./.test(host)) return "amazon";
    if (/(^|\.)walmart\./.test(host)) return "walmart";
    return null;
  }

  // ¿Es una página de producto? (evita mostrar la tarjeta en búsquedas y portadas)
  function isProductPage(doc, siteName, url, entry) {
    const u = String(url || "");
    if (entry && entry.p) { try { if (new RegExp(entry.p).test(u)) return true; } catch (e) {} }
    const og = q(doc, 'meta[property="og:type"]');
    if (og && /product/i.test(og.getAttribute("content") || "")) return true;
    if (q(doc, '[itemtype*="schema.org/Product"]')) return true;
    if (siteName === "amazon" && /\/(dp|gp\/product|gp\/aw\/d)\//.test(u)) return true;
    if (siteName === "mercadolibre" && (/articulo\.mercadoli/.test(u) || /\/p\/ML[A-Z]\d+/.test(u) || /\/ML[A-Z]-?\d+/.test(u))) return true;
    if (siteName === "walmart" && /\/(ip|p)\//.test(u)) return true;
    return jsonLdProducts(doc).length > 0;
  }

  // Datos estructurados schema.org/Product
  function jsonLdProducts(doc) {
    const out = [];
    for (const s of qa(doc, 'script[type="application/ld+json"]')) {
      let data;
      try { data = JSON.parse(s.textContent); } catch (e) { continue; }
      const stack = [data];
      while (stack.length) {
        const x = stack.pop();
        if (!x || typeof x !== "object") continue;
        if (Array.isArray(x)) { stack.push(...x); continue; }
        const t = x["@type"];
        if (t === "Product" || (Array.isArray(t) && t.includes("Product"))) out.push(x);
        if (x["@graph"]) stack.push(x["@graph"]);
      }
    }
    return out;
  }
  function ldBrand(p) {
    const b = p.brand || p.manufacturer;
    if (!b) return "";
    if (typeof b === "string") return b;
    if (Array.isArray(b)) return ldBrand({ brand: b[0] });
    return b.name || "";
  }

  const SPEC_HEADERS = new Set(["marca", "brand", "fabricante", "manufacturer", "marque", "marke", "hersteller", "marchio", "produttore",
    "ブランド", "メーカー", "브랜드", "제조사", "品牌", "品牌名称", "מותג", "יצרן", "brand name", "nome da marca"]);

  // Busca filas de tablas de especificaciones cuyo encabezado sea «Marca» / «Brand».
  function specRow(doc) {
    const rows = qa(doc, "tr, .andes-table__row, .ui-vpp-highlighted-specs__key-value, li");
    for (const r of rows) {
      const head = r.querySelector("th, .andes-table__header, .ui-pdp-specs__table__label, span:first-child, b");
      if (!head) continue;
      const h = txt(head).replace(/[:：]\s*$/, "").toLowerCase();
      if (SPEC_HEADERS.has(h)) {
        const val = r.querySelector("td, .andes-table__column--value, .andes-table__column, span:last-child");
        const v = val && val !== head ? txt(val) : txt(r).replace(txt(head), "");
        if (v && v.length < 60) return v.replace(/^[:：]\s*/, "");
      }
    }
    return "";
  }

  const SITE = {
    amazon(doc) {
      const c = [];
      const by = txt(q(doc, "#bylineInfo"));
      if (by) c.push({ text: by, source: "Amazon: enlace de la marca" });
      const po = txt(q(doc, "tr.po-brand td.a-span9 span")) || txt(q(doc, "tr.po-brand td:last-child"));
      if (po) c.push({ text: po, source: "Amazon: ficha del producto" });
      const title = txt(q(doc, "#productTitle")) || txt(q(doc, "#title"));
      return { candidates: c, title };
    },
    mercadolibre(doc) {
      const c = [];
      const brandLink = txt(q(doc, ".ui-pdp-brand__link, .ui-pdp-seller__brand-title-container, a[class*='brand']"));
      if (brandLink) c.push({ text: brandLink, source: "Mercado Libre: tienda oficial" });
      const title = txt(q(doc, "h1.ui-pdp-title")) || txt(q(doc, "h1"));
      return { candidates: c, title };
    },
    walmart(doc) {
      const c = [];
      const b = txt(q(doc, "[itemprop='brand']")) || txt(q(doc, "a[link-identifier='brandName']")) || txt(q(doc, "[data-testid='product-brand']"));
      if (b) c.push({ text: b, source: "Walmart: marca del producto" });
      const title = txt(q(doc, "h1[itemprop='name']")) || txt(q(doc, "#main-title")) || txt(q(doc, "h1"));
      return { candidates: c, title };
    }
  };

  function extract(doc, host) {
    const s = site(host);
    const base = s ? SITE[s](doc) : { candidates: [], title: "" };
    const c = base.candidates.slice();
    for (const p of jsonLdProducts(doc)) {
      const b = ldBrand(p);
      if (b) c.push({ text: b, source: "Datos estructurados de la página" });
      if (!base.title && p.name) base.title = String(p.name);
    }
    const micro = q(doc, '[itemtype*="schema.org/Product"] [itemprop="brand"]');
    if (micro) {
      const nm = micro.querySelector('[itemprop="name"]');
      const v = (nm && (nm.getAttribute("content") || txt(nm))) || micro.getAttribute("content") || txt(micro);
      if (v && v.length < 60) c.push({ text: v, source: "Microdatos de la página" });
    }
    const meta = q(doc, 'meta[property="product:brand"], meta[property="og:brand"], meta[itemprop="brand"], meta[name="brand"]');
    if (meta && meta.content) c.push({ text: meta.content, source: "Metadatos de la página" });
    const spec = specRow(doc);
    if (spec) c.push({ text: spec, source: "Tabla de especificaciones" });
    if (!base.title) base.title = txt(q(doc, "h1")) || (doc.title || "");
    return { site: s, candidates: c, title: base.title };
  }

  QED.site = site;
  QED.isProductPage = isProductPage;
  QED.extract = extract;
})(typeof globalThis !== "undefined" ? globalThis : this);
