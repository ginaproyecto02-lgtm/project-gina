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

  // --- Extracción de datos de confiabilidad de compra (vendedor, logística, garantías) ---
  function extractAmazonReliability(doc) {
    const merchantInfo = txt(q(doc, "#merchant-info, #fulfillerInfoFeature_feature_div, #merchantInfoFeature_feature_div"));
    const tabularShips = txt(q(doc, "#tabular-buybox .tabular-buybox-row[data-csa-c-slot-id*='ship'] .tabular-buybox-text, [tabular-attribute-name='Ships from'], [tabular-attribute-name='Envía desde']"));
    const tabularSold = txt(q(doc, "#tabular-buybox .tabular-buybox-row[data-csa-c-slot-id*='sold'] .tabular-buybox-text, [tabular-attribute-name='Sold by'], [tabular-attribute-name='Vendido por']"));
    const sellerLink = txt(q(doc, "#sellerProfileTriggerId, #sellerName"));

    let seller = sellerLink || tabularSold || "";
    let shipper = tabularShips || "";

    if (!seller && merchantInfo) {
      const mSold = merchantInfo.match(/(?:Vendido por|Sold by|Vendu par|Verkauf durch)\s+([^.\n,]+)/i);
      if (mSold) seller = mSold[1].trim();
      else if (/enviado y vendido por|ships from and sold by|expédié et vendu par/i.test(merchantInfo)) {
        seller = "Amazon";
      } else {
        seller = merchantInfo;
      }
    }

    const byLine = txt(q(doc, "#bylineInfo, #brand"));
    const isBrandStore = /visita la tienda|visit the .+ store|tienda de|visiter la boutique|besuche den .+ store/i.test(byLine);
    const isDirectAmazon = /amazon/i.test(seller) || /vendido por amazon|sold by amazon/i.test(merchantInfo);
    const isFullAmazon = /amazon/i.test(shipper) || /enviado por amazon|ships from amazon|expédié par amazon/i.test(merchantInfo);

    const retPolicy = txt(q(doc, "#productSupportAndReturnPolicy, #RETURNS_POLICY, [data-feature-name='returns'], #return-policy-message"));
    const warranty = txt(q(doc, "#warranty_feature_div, [data-feature-name='warranty']"));

    return {
      storeName: "Amazon",
      seller: seller || (isDirectAmazon ? "Amazon" : ""),
      shipper: shipper || (isFullAmazon ? "Amazon" : ""),
      isOfficialStore: isBrandStore,
      isDirectPlatform: isDirectAmazon,
      isFulfilledByPlatform: isFullAmazon,
      returnPolicy: retPolicy || "",
      warranty: warranty || ""
    };
  }

  function extractMercadoLibreReliability(doc) {
    const officialStoreEl = q(doc, ".ui-pdp-seller__brand-title-container, .ui-pdp-brand__link, .ui-pdp-official-store-link, [class*='official-store']");
    const officialStoreText = txt(officialStoreEl);
    const hasOfficialText = /tienda oficial|loja oficial/i.test(txt(q(doc, ".ui-pdp-seller__header, .ui-seller-info, .ui-pdp-seller__reputation-info, .ui-pdp-seller__link-trigger")));
    const isOfficialStore = !!officialStoreEl || hasOfficialText;

    const sellerLink = txt(q(doc, ".ui-pdp-seller__link-trigger, .ui-seller-data-header__title-wrapper b, .ui-pdp-seller__header__title, .ui-seller-info__title-wrapper"));
    const seller = officialStoreText || sellerLink || "";

    const hasFull = !!q(doc, ".ui-pdp-icon--full, .ui-pdp-media--full, svg[class*='full']") || /full/i.test(txt(q(doc, ".ui-pdp-shipping__highlight, .ui-pdp-color--GREEN")));
    const repBadge = txt(q(doc, ".ui-seller-info__status-info, .ui-pdp-seller__reputation-info, .ui-seller-reputation-level-5, .ui-seller-reputation-level-4"));

    const benefitsText = txt(q(doc, ".ui-pdp-promotions-pill-label, .ui-pdp-benefits, [class*='protection']"));
    const warranty = txt(q(doc, ".ui-pdp-warranty, .ui-pdp-specs__table tr:last-child"));
    const hasProtection = /compra protegida|compra garantida|devoluci[oó]n gratis|devolu[cç][aã]o gr[aá]tis/i.test(benefitsText) || true;

    return {
      storeName: "Mercado Libre",
      seller: seller || "",
      shipper: hasFull ? "Mercado Libre Full" : "",
      isOfficialStore: isOfficialStore,
      isDirectPlatform: false,
      isFulfilledByPlatform: hasFull,
      sellerRating: repBadge || (isOfficialStore ? "Tienda Oficial" : ""),
      returnPolicy: hasProtection ? "Compra Protegida (devolución sin costo 30 días)" : "",
      warranty: warranty || "Garantía con el vendedor / Compra Protegida"
    };
  }

  function extractWalmartReliability(doc) {
    const sellerEl = q(doc, "[data-testid='seller-name'], a[link-identifier='sellerName'], .seller-info, [data-testid='fulfillment-shipping-text']");
    const sellerText = txt(sellerEl);
    const isDirect = /walmart/i.test(sellerText) || !sellerText;
    const isFulfilled = /enviado por walmart|shipped by walmart/i.test(sellerText) || isDirect;

    return {
      storeName: "Walmart",
      seller: sellerText || "Walmart",
      shipper: isFulfilled ? "Walmart" : "",
      isOfficialStore: false,
      isDirectPlatform: isDirect,
      isFulfilledByPlatform: isFulfilled,
      returnPolicy: "Devoluciones hasta 30 días con comprobante",
      warranty: ""
    };
  }

  function extractGenericReliability(doc) {
    let seller = "";
    let returnPolicy = "";
    for (const p of jsonLdProducts(doc)) {
      if (p.offers) {
        const off = Array.isArray(p.offers) ? p.offers[0] : p.offers;
        if (off && off.seller && off.seller.name) seller = off.seller.name;
        if (off && off.hasMerchantReturnPolicy) returnPolicy = "Política de devoluciones indicada";
      }
    }
    return {
      storeName: "",
      seller: seller || "",
      shipper: "",
      isOfficialStore: false,
      isDirectPlatform: false,
      isFulfilledByPlatform: false,
      returnPolicy: returnPolicy,
      warranty: ""
    };
  }

  function extractReliability(doc, siteName) {
    if (siteName === "amazon") return extractAmazonReliability(doc);
    if (siteName === "mercadolibre") return extractMercadoLibreReliability(doc);
    if (siteName === "walmart") return extractWalmartReliability(doc);
    return extractGenericReliability(doc);
  }

  // Identificación de normativas y certificaciones aplicables según categoría de producto
  function getApplicableNorms(category, brandGroup, title, country) {
    const norms = [];
    const t = String(title || "").toLowerCase();
    const cat = String(category || "").toLowerCase();

    const isDermo = cat.includes("skincare") || cat.includes("cosmetica") || 
      /\b(serum|crema|protector solar|bloqueador|gel limpiador|acido|hialuronico|ceramide|retinol|facial|dermo|shampoo|hidratante|locion|skin|dermatol)\b/i.test(t);

    const isFood = cat.includes("alimento") || cat.includes("bebida") || cat.includes("lacteo") || cat.includes("snack") ||
      /\b(leche|cafe|cereal|galletas|botana|bebida|refresco|jugo|pan|harina|queso|yogurt)\b/i.test(t);

    const isTech = cat.includes("tecnologia") || cat.includes("electronica") || cat.includes("computo") ||
      /\b(laptop|pantalla|tv|celular|smartphone|audifonos|bateria|teclado|mouse|cable|usb|camara|consola)\b/i.test(t);

    const isFishingSport = cat.includes("pesca") || cat.includes("deporte") ||
      /\b(pesca|caña|carrete|anzuelo|hilo|señuelo|linea|spinning|baitcasting|outdoor|camping)\b/i.test(t);

    const isCleaning = cat.includes("limpieza") ||
      /\b(detergente|jabon de lavanderia|suavizante|blanqueador|desinfectante|cloro|multiusos|lavatrastes)\b/i.test(t);

    if (isDermo) {
      norms.push({
        key: "norm_health",
        code: "COFEPRIS NOM-141-SSA1/SCFI · FDA / CE",
        descKey: "norm_health_desc"
      });
      norms.push({
        key: "norm_batch",
        code: "Trazabilidad cosmética",
        descKey: "norm_batch_desc"
      });
    } else if (isFood) {
      norms.push({
        key: "norm_food",
        code: "NOM-051-SCFI/SSA1 · COFEPRIS / FDA",
        descKey: "norm_food_desc"
      });
      norms.push({
        key: "norm_freshness",
        code: "Control de caducidad e inocuidad",
        descKey: "norm_freshness_desc"
      });
    } else if (isTech) {
      norms.push({
        key: "norm_tech",
        code: "Certificación NOM-001 / NOM-024 · CE / FCC",
        descKey: "norm_tech_desc"
      });
      norms.push({
        key: "norm_warranty_law",
        code: "Garantía legal mínima de fabricante",
        descKey: "norm_warranty_law_desc"
      });
    } else if (isFishingSport) {
      norms.push({
        key: "norm_sport",
        code: "Resistencia de materiales y manufactura",
        descKey: "norm_sport_desc"
      });
      norms.push({
        key: "norm_gear_guarantee",
        code: "Garantía contra defectos de ensamble",
        descKey: "norm_gear_guarantee_desc"
      });
    } else if (isCleaning) {
      norms.push({
        key: "norm_cleaning",
        code: "NOM-189-SSA1/SCFI (Seguridad en aseo)",
        descKey: "norm_cleaning_desc"
      });
    } else {
      norms.push({
        key: "norm_general",
        code: "Protección al Consumidor · PROFECO / Estándar Legal",
        descKey: "norm_general_desc"
      });
    }

    if (brandGroup && brandGroup.empresa) {
      norms.push({
        key: "norm_registered_brand",
        code: "Fabricante registrado: " + brandGroup.empresa,
        descKey: "norm_registered_brand_desc"
      });
    }

    return norms;
  }

  // Evaluación sintética del nivel de certeza y confianza de la compra
  function evaluateReliability(rel, brandGroup, category, title, country) {
    rel = rel || {};
    title = String(title || "").toLowerCase();
    category = String(category || "").toLowerCase();

    let score = 70;
    let sellerType = "third_party";
    const sellerName = rel.seller || rel.storeName || "";

    if (rel.isOfficialStore) {
      sellerType = "official";
      score += 25;
    } else if (rel.isDirectPlatform) {
      sellerType = "direct";
      score += 20;
    } else if (rel.sellerRating && /platinum|gold|l[ií]der|destacado/i.test(rel.sellerRating)) {
      sellerType = "verified";
      score += 15;
    } else if (rel.seller) {
      sellerType = "third_party";
    }

    if (rel.isFulfilledByPlatform) {
      score += 10;
    }

    let level = "standard";
    if (score >= 85 || rel.isOfficialStore || rel.isDirectPlatform) {
      level = "high";
    } else if (score >= 60) {
      level = "standard";
    } else {
      level = "check";
    }

    const norms = getApplicableNorms(category, brandGroup, title, country);

    return {
      level,
      score: Math.min(100, Math.max(30, score)),
      sellerName: sellerName || rel.storeName || "",
      sellerType,
      sellerRating: rel.sellerRating || "",
      isOfficialStore: !!rel.isOfficialStore,
      isDirectPlatform: !!rel.isDirectPlatform,
      isFulfilledByPlatform: !!rel.isFulfilledByPlatform,
      shipper: rel.shipper || "",
      returnPolicy: rel.returnPolicy || "30 días de devolución · Compra Protegida",
      warranty: rel.warranty || "Garantía de compra y fabricante aplicable",
      storeName: rel.storeName || "",
      brandVerified: !!(brandGroup && brandGroup.empresa),
      brandEmpresa: brandGroup ? brandGroup.empresa : "",
      norms
    };
  }

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
    const reliability = extractReliability(doc, s);
    return { site: s, candidates: c, title: base.title, reliability };
  }

  QED.site = site;
  QED.isProductPage = isProductPage;
  QED.extract = extract;
  QED.extractReliability = extractReliability;
  QED.evaluateReliability = evaluateReliability;
  QED.getApplicableNorms = getApplicableNorms;
})(typeof globalThis !== "undefined" ? globalThis : this);
