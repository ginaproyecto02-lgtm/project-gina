// SPDX-License-Identifier: MIT
// Lectura de la marca, título del producto y confiabilidad de compra en cada tienda.
// Fuentes directas del DOM y datos estructurados (schema.org/Product / JSON-LD / microdatos).
// Regla de oro: cada dato conserva su origen exacto y no se inventan calificaciones.
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
    if (/(^|\.)liverpool\.com\.mx$/i.test(host)) return "liverpool";
    if (/(^|\.)coppel\.com$/i.test(host)) return "coppel";
    if (/(^|\.)bestbuy\./i.test(host)) return "bestbuy";
    return null;
  }

  // ¿Es una página de producto?
  function isProductPage(doc, siteName, url, entry) {
    const u = String(url || "");
    if (entry && entry.p) { try { if (new RegExp(entry.p).test(u)) return true; } catch (e) {} }
    const og = q(doc, 'meta[property="og:type"]');
    if (og && /product/i.test(og.getAttribute("content") || "")) return true;
    if (q(doc, '[itemtype*="schema.org/Product"]')) return true;
    if (siteName === "amazon" && /\/(dp|gp\/product|gp\/aw\/d)\//.test(u)) return true;
    if (siteName === "mercadolibre" && (/articulo\.mercadoli/.test(u) || /\/p\/ML[A-Z]\d+/.test(u) || /\/ML[A-Z]-?\d+/.test(u))) return true;
    if (siteName === "walmart" && /\/(ip|p)\//.test(u)) return true;
    if (siteName === "liverpool" && /\/pdp\//.test(u)) return true;
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

  // Extracción de calificación y reseñas verbatim (aggregateRating)
  function extractAggregateRating(doc) {
    if (!doc) return null;
    for (const p of jsonLdProducts(doc)) {
      const agg = p.aggregateRating;
      if (agg) {
        const val = agg.ratingValue;
        const count = agg.reviewCount || agg.ratingCount;
        if (val != null) {
          const valStr = String(val).replace(".", ",");
          const countStr = count != null ? new Intl.NumberFormat("es-ES").format(count) : null;
          return countStr
            ? `Calificación en la tienda: ${valStr} de 5 · ${countStr} reseñas`
            : `Calificación en la tienda: ${valStr} de 5`;
        }
      }
    }
    const microAgg = q(doc, '[itemprop="aggregateRating"]');
    if (microAgg) {
      const v = txt(microAgg.querySelector('[itemprop="ratingValue"]')) || microAgg.getAttribute("content");
      const c = txt(microAgg.querySelector('[itemprop="reviewCount"], [itemprop="ratingCount"]'));
      if (v) {
        return `Calificación en la tienda: ${v.replace(".", ",")} de 5${c ? ` · ${c} reseñas` : ""}`;
      }
    }
    // Amazon #acrPopover y #acrCustomerReviewText
    const acrPop = q(doc, "#acrPopover, [data-action='acr-popover-touch']");
    if (acrPop) {
      const popText = acrPop.getAttribute("title") || txt(acrPop);
      const mScore = popText.match(/(\d+(?:[.,]\d+)?)\s*(?:de|out of|\/)\s*5/i) || popText.match(/(\d+(?:[.,]\d+)?)/);
      if (mScore) {
        const valStr = mScore[1].replace(".", ",");
        const acrCnt = q(doc, "#acrCustomerReviewText");
        let countStr = null;
        if (acrCnt) {
          const cntText = txt(acrCnt);
          const mCnt = cntText.match(/([\d.,\s]+)/);
          if (mCnt) countStr = mCnt[1].trim();
        }
        return countStr
          ? `Calificación en la tienda: ${valStr} de 5 · ${countStr} reseñas`
          : `Calificación en la tienda: ${valStr} de 5`;
      }
    }
    return null;
  }

  // Detección de certificaciones mencionadas en texto o especificaciones
  function extractCertifications(doc, title) {
    const textPool = (String(title || "") + " " + txt(q(doc, "#feature-bullets, #specifications, .ui-pdp-specs, table"))).trim();
    const matches = textPool.match(/\b(NOM(-\d+[\w/-]*)?|CE|UL|FCC|ETL|INMETRO|PSE|CCC)\b/g);
    if (!matches || !matches.length) return "";
    const uniq = Array.from(new Set(matches));
    return `La página menciona: ${uniq.join(", ")} · Gina no lo verifica`;
  }

  // Detección de envío internacional / "Enviado desde China"
  function extractInternationalShipping(doc, shipper, storeCountry) {
    const fullText = (doc && doc.body ? doc.body.textContent || "" : "");
    const isChina = /enviado desde china|envía desde china|ships from china|se envía desde china/i.test(fullText) ||
                    (shipper && /china/i.test(shipper));
    const isGeneralIntl = /compra internacional|venta internacional|se envía desde el extranjero|importado por/i.test(fullText);
    if (isChina || isGeneralIntl) {
      return "Compra internacional: la garantía, las devoluciones y los cargos de aduana pueden ser distintos a los de una compra nacional.";
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
    },
    liverpool(doc) {
      const c = [];
      const b = txt(q(doc, "[itemprop='brand']")) || txt(q(doc, ".m-product__brand, .brand-name"));
      if (b) c.push({ text: b, source: "Liverpool: marca del producto" });
      const title = txt(q(doc, "h1.m-product__title, h1[itemprop='name'], h1"));
      return { candidates: c, title };
    },
    coppel(doc) {
      const c = [];
      const b = txt(q(doc, "[itemprop='brand']")) || txt(q(doc, ".brand, .marca"));
      if (b) c.push({ text: b, source: "Coppel: marca del producto" });
      const title = txt(q(doc, "h1.pdp-title, h1[itemprop='name'], h1"));
      return { candidates: c, title };
    },
    bestbuy(doc) {
      const c = [];
      const b = txt(q(doc, "[itemprop='brand']")) || txt(q(doc, ".brand, .product-data-value a"));
      if (b) c.push({ text: b, source: "Best Buy: marca del producto" });
      const title = txt(q(doc, "h1.heading-5, h1.sku-title, h1"));
      return { candidates: c, title };
    }
  };

  // Sanitización de vendedor (descarta cadenas de interfaz y nombres > 60 caracteres)
  function sanitizeSellerName(name) {
    if (!name) return "";
    let clean = String(name).trim();
    if (clean.length > 60) return "";
    if (/^(?:m[aá]s informaci[oó]n|more info|ver m[aá]s|visit the|visita la tienda(?: de)?)/i.test(clean)) return "";
    if (/^(?:visiter la boutique|besuche den .+ store)/i.test(clean)) return "";
    clean = clean.replace(/^(?:vendido por|sold by|vendu par|verkauf durch)\s*:?\s*/i, "").trim();
    if (clean.length > 60 || !clean) return "";
    if (/^(?:m[aá]s informaci[oó]n|more info|ver m[aá]s|visit the|visita la tienda(?: de)?)/i.test(clean)) return "";
    return clean;
  }

  // --- Extracción de confiabilidad por tienda ---
  function extractAmazonReliability(doc) {
    // 1. Vendedor desde #sellerProfileTriggerId o #sellerName
    let seller = sanitizeSellerName(txt(q(doc, "#sellerProfileTriggerId, #sellerName")));

    // 2. Vendedor y envío desde #tabular-buybox
    let tabularShips = "";
    const shipEl = q(doc, "#tabular-buybox [tabular-attribute-name='Ships from'] .tabular-buybox-text, #tabular-buybox [tabular-attribute-name='Envía desde'] .tabular-buybox-text, #tabular-buybox [tabular-attribute-name='Envía'] .tabular-buybox-text, #tabular-buybox .tabular-buybox-row[data-csa-c-slot-id*='ship'] .tabular-buybox-text");
    if (shipEl) tabularShips = txt(shipEl).trim();

    if (!seller) {
      const soldEl = q(doc, "#tabular-buybox [tabular-attribute-name='Sold by'] .tabular-buybox-text, #tabular-buybox [tabular-attribute-name='Vendido por'] .tabular-buybox-text, #tabular-buybox .tabular-buybox-row[data-csa-c-slot-id*='sold'] .tabular-buybox-text");
      if (soldEl) {
        seller = sanitizeSellerName(txt(soldEl));
      } else {
        for (const row of qa(doc, "#tabular-buybox tr, #tabular-buybox .tabular-buybox-row, #tabular-buybox .tabular-buybox-container tr")) {
          const rowText = txt(row);
          if (/vendido por|sold by/i.test(rowText)) {
            const cells = qa(row, "td, .tabular-buybox-text, a, span");
            const val = cells.length >= 2 ? txt(cells[cells.length - 1]) : txt(row).replace(/.*(?:vendido por|sold by)\s*:?/i, "").trim();
            const cand = sanitizeSellerName(val);
            if (cand) {
              seller = cand;
              break;
            }
          }
        }
      }
    }

    if (!tabularShips) {
      for (const row of qa(doc, "#tabular-buybox tr, #tabular-buybox .tabular-buybox-row, #tabular-buybox .tabular-buybox-container tr")) {
        const rowText = txt(row);
        if (/env[ií]a(?: desde)?|ships from/i.test(rowText)) {
          const cells = qa(row, "td, .tabular-buybox-text, a, span");
          const val = cells.length >= 2 ? txt(cells[cells.length - 1]) : txt(row).replace(/.*(?:env[ií]a(?: desde)?|ships from)\s*:?/i, "").trim();
          if (val) {
            tabularShips = val;
            break;
          }
        }
      }
    }

    // 3. Vendedor y envío desde #merchant-info
    const merchantInfo = txt(q(doc, "#merchant-info, #fulfillerInfoFeature_feature_div, #merchantInfoFeature_feature_div"));
    if (!seller && merchantInfo) {
      const mSold = merchantInfo.match(/(?:Vendido por|Sold by|Vendu par|Verkauf durch)\s+([^.\n,]+)/i);
      if (mSold) {
        seller = sanitizeSellerName(mSold[1]);
      } else if (/enviado y vendido por|ships from and sold by|expédié et vendu par/i.test(merchantInfo)) {
        seller = "Amazon";
      }
    }

    // 4. Fulfillment desde #icon-farm o #merchant-info
    const iconFarm = txt(q(doc, "#icon-farm, #delivery-block, #fulfillment-block, .icon-farm"));
    let isFullAmazon = /amazon/i.test(tabularShips) ||
                       /enviado por amazon|ships from amazon|expédi[ée] par amazon/i.test(iconFarm) ||
                       /enviado por amazon|ships from amazon|expédi[ée] par amazon/i.test(merchantInfo);

    let isDirectAmazon = /^(?:vendido por\s+)?amazon(?:\.com(?:\.mx)?)?$/i.test(seller) ||
                         /vendido por amazon|sold by amazon|ships from and sold by amazon/i.test(merchantInfo);

    if (isDirectAmazon) {
      seller = "Amazon";
      isFullAmazon = true;
    }

    // 5. Envío (fulfillment)
    let shipper = tabularShips || (isFullAmazon ? "Amazon" : "");

    // 6. Si sellerName ≠ Amazon pero enviado por Amazon → "Vendido por <Tercero>, enviado por Amazon"
    let sellerDisplay = seller;
    if (seller && seller !== "Amazon" && !/amazon/i.test(seller) && isFullAmazon) {
      const cleanThird = seller.replace(/^vendido por\s+/i, "").trim();
      sellerDisplay = `Vendido por ${cleanThird}, enviado por Amazon`;
    }

    // 7. Devoluciones: extraer texto exacto
    let retPolicy = "";
    const retEl = q(doc, "#RETURNS_POLICY, #productSupportAndReturnPolicy_feature_div, #productSupportAndReturnPolicy, [data-feature-name='returns'], #return-policy-message, [data-action='return-policy-modal']");
    if (retEl) {
      const rawRet = txt(retEl).trim();
      const mKnown = rawRet.match(/(?:no se puede devolver|not returnable|devoluci[oó]n gratis|devoluciones gratis|devoluci[oó]n gratuita|devoluciones gratuitas|free returns?|30 d[ií]as de devoluci[oó]n(?:\s+sin costo)?|\d+\s*d[ií]as de devoluci[oó]n)/i);
      if (mKnown) {
        retPolicy = mKnown[0];
      } else if (rawRet.length <= 80) {
        retPolicy = rawRet;
      } else {
        retPolicy = rawRet.slice(0, 80);
      }
    }

    const byLine = txt(q(doc, "#bylineInfo, #brand"));
    const isBrandStore = /visita la tienda|visit the .+ store|tienda de|visiter la boutique|besuche den .+ store/i.test(byLine);
    const warranty = txt(q(doc, "#warranty_feature_div, [data-feature-name='warranty']"));
    const title = txt(q(doc, "#productTitle")) || txt(q(doc, "#title"));

    return {
      storeName: "Amazon",
      seller: sellerDisplay || (isDirectAmazon ? "Amazon" : ""),
      shipper: shipper || (isFullAmazon ? "Amazon" : ""),
      isOfficialStore: isBrandStore,
      isDirectPlatform: isDirectAmazon,
      isFulfilledByPlatform: isFullAmazon,
      returnPolicy: retPolicy || "",
      warranty: warranty || "",
      storeRating: extractAggregateRating(doc),
      certificationsText: extractCertifications(doc, title),
      internationalWarning: extractInternationalShipping(doc, shipper, "EE.UU.")
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
    const hasProtection = /compra protegida|compra garantida|devoluci[oó]n gratis|devolu[cç][aã]o gr[aá]tis/i.test(benefitsText);
    const title = txt(q(doc, "h1.ui-pdp-title")) || txt(q(doc, "h1"));

    return {
      storeName: "Mercado Libre",
      seller: seller || "",
      shipper: hasFull ? "Mercado Libre Full" : "",
      isOfficialStore: isOfficialStore,
      isDirectPlatform: false,
      isFulfilledByPlatform: hasFull,
      sellerRating: repBadge || "",
      storeRating: extractAggregateRating(doc),
      returnPolicy: hasProtection ? benefitsText.slice(0, 120) : "",
      warranty: warranty || "",
      certificationsText: extractCertifications(doc, title),
      internationalWarning: extractInternationalShipping(doc, "", "México")
    };
  }

  function extractWalmartReliability(doc) {
    const sellerEl = q(doc, "[data-testid='seller-name'], a[link-identifier='sellerName'], .seller-info, [data-testid='fulfillment-shipping-text']");
    const sellerText = txt(sellerEl);
    const isDirect = /(vendido|sold)( y enviado| and shipped)? por walmart|(sold|shipped)( and shipped)? by walmart|^walmart(\.com)?$/i.test(sellerText.trim());
    const isFulfilled = /enviado por walmart|shipped by walmart|fulfilled by walmart/i.test(sellerText);
    const title = txt(q(doc, "h1[itemprop='name']")) || txt(q(doc, "#main-title")) || txt(q(doc, "h1"));

    return {
      storeName: "Walmart",
      seller: sellerText || "",
      shipper: isFulfilled ? "Walmart" : "",
      isOfficialStore: false,
      isDirectPlatform: isDirect,
      isFulfilledByPlatform: isFulfilled,
      returnPolicy: "",
      warranty: "",
      storeRating: extractAggregateRating(doc),
      certificationsText: extractCertifications(doc, title),
      internationalWarning: extractInternationalShipping(doc, "", "México")
    };
  }

  function extractLiverpoolReliability(doc) {
    const sellerEl = q(doc, ".m-product__seller-name, .seller-info, .seller-name, [class*='seller']");
    const sellerText = txt(sellerEl);
    const warranty = txt(q(doc, ".warranty-info, [class*='garantia']"));
    const title = txt(q(doc, "h1.m-product__title, h1"));

    return {
      storeName: "Liverpool",
      seller: sellerText || "",
      shipper: "Liverpool",
      isOfficialStore: false,
      isDirectPlatform: !sellerText || /liverpool/i.test(sellerText),
      isFulfilledByPlatform: true,
      returnPolicy: "",
      warranty: warranty || "",
      storeRating: extractAggregateRating(doc),
      certificationsText: extractCertifications(doc, title),
      internationalWarning: extractInternationalShipping(doc, "", "México")
    };
  }

  function extractCoppelReliability(doc) {
    const sellerEl = q(doc, ".mkp-seller, .seller-name, [class*='seller']");
    const sellerText = txt(sellerEl);
    const title = txt(q(doc, "h1.pdp-title, h1"));
    return {
      storeName: "Coppel",
      seller: sellerText || "",
      shipper: "Coppel",
      isOfficialStore: false,
      isDirectPlatform: !sellerText || /coppel/i.test(sellerText),
      isFulfilledByPlatform: true,
      returnPolicy: "",
      warranty: "",
      storeRating: extractAggregateRating(doc),
      certificationsText: extractCertifications(doc, title),
      internationalWarning: extractInternationalShipping(doc, "", "México")
    };
  }

  function extractBestBuyReliability(doc) {
    const sellerEl = q(doc, ".seller-info, .marketplace-seller-name, [class*='seller']");
    const sellerText = txt(sellerEl);
    const title = txt(q(doc, "h1.heading-5, h1.sku-title, h1"));
    return {
      storeName: "Best Buy",
      seller: sellerText || "",
      shipper: "Best Buy",
      isOfficialStore: false,
      isDirectPlatform: !sellerText || /best buy/i.test(sellerText),
      isFulfilledByPlatform: true,
      returnPolicy: "",
      warranty: "",
      storeRating: extractAggregateRating(doc),
      certificationsText: extractCertifications(doc, title),
      internationalWarning: extractInternationalShipping(doc, "", "EE.UU.")
    };
  }

  function extractGenericReliability(doc) {
    let seller = "";
    let returnPolicy = "";
    let title = txt(q(doc, "h1")) || "";
    for (const p of jsonLdProducts(doc)) {
      if (!title && p.name) title = p.name;
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
      warranty: "",
      storeRating: extractAggregateRating(doc),
      certificationsText: extractCertifications(doc, title),
      internationalWarning: extractInternationalShipping(doc, "", "")
    };
  }

  function extractReliability(doc, siteName) {
    if (siteName === "amazon") return extractAmazonReliability(doc);
    if (siteName === "mercadolibre") return extractMercadoLibreReliability(doc);
    if (siteName === "walmart") return extractWalmartReliability(doc);
    if (siteName === "liverpool") return extractLiverpoolReliability(doc);
    if (siteName === "coppel") return extractCoppelReliability(doc);
    if (siteName === "bestbuy") return extractBestBuyReliability(doc);
    return extractGenericReliability(doc);
  }

  // --- Normas y Garantías Oficiales por País ---
  const GARANTIAS_PAIS = [
    { pais: "México", minimo: "90 días naturales", ley: "Ley Federal de Protección al Consumidor, Art. 77", url_oficial: "https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPC.pdf" },
    { pais: "EE.UU.", minimo: "Sin mínimo federal obligatorio; garantía según fabricante o ley estatal", ley: "Magnuson-Moss Warranty Act (15 U.S.C. § 2301) / FTC", url_oficial: "https://www.ftc.gov/business-guidance/resources/businesspersons-guide-federal-warranty-law" },
    { pais: "Canadá", minimo: "Garantía legal de durabilidad razonable según provincia", ley: "Loi sur la protection du consommateur / Prov. Acts", url_oficial: "https://www.canada.ca/en/services/business/permits/federallyregulatedindustrysectors/consumer-protection.html" },
    { pais: "Alemania", minimo: "2 años (garantía legal de conformidad)", ley: "Bürgerliches Gesetzbuch (BGB) § 438 Abs. 1 Nr. 3", url_oficial: "https://www.gesetze-im-internet.de/bgb/__438.html" },
    { pais: "Francia", minimo: "2 ans (garantie légale de conformité)", ley: "Code de la consommation, Art. L217-3", url_oficial: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044142476" },
    { pais: "España", minimo: "3 años para bienes nuevos", ley: "Real Decreto Legislativo 1/2007, Art. 120", url_oficial: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555" },
    { pais: "Italia", minimo: "2 anni (garanzia legale di conformità)", ley: "Codice del Consumo, Art. 133 (D.Lgs. 206/2005)", url_oficial: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-09-06;206" },
    { pais: "Reino Unido", minimo: "Hasta 6 años por falta de conformidad", ley: "Consumer Rights Act 2015, Part 1", url_oficial: "https://www.legislation.gov.uk/ukpga/2015/15/part/1" },
    { pais: "Brasil", minimo: "90 dias (duráveis) / 30 dias (não duráveis)", ley: "Código de Defesa do Consumidor, Art. 26", url_oficial: "https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm" },
    { pais: "Argentina", minimo: "6 meses para cosas muebles no consumibles", ley: "Ley de Defensa del Consumidor nº 24.240, Art. 11", url_oficial: "https://servicios.infoleg.gob.ar/infolegInternet/anexos/0-4999/638/texact.htm" },
    { pais: "Chile", minimo: "6 meses (garantía legal Pro Consumidor)", ley: "Ley nº 19.496, Art. 21", url_oficial: "https://www.bcn.cl/leychile/navegar?idNorma=61438" },
    { pais: "Japón", minimo: "1 año estándar contra vicios ocultos / contrato", ley: "Consumer Contract Act / Civil Code Art. 566", url_oficial: "https://www.caa.go.jp/policies/policy/consumer_system/consumer_contract_act/" },
    { pais: "Corea del Sur", minimo: "1 año estándar para electrónicos", ley: "Framework Act on Consumers / KCA", url_oficial: "https://www.kca.go.kr" },
    { pais: "Singapur", minimo: "6 meses bajo Lemon Law", ley: "Consumer Protection (Fair Trading) Act, Part III", url_oficial: "https://sso.agc.gov.sg/Act/CPFTA2003" },
    { pais: "Israel", minimo: "1 año para bienes eléctricos > 150 NIS", ley: "Consumer Protection Regulations 2006", url_oficial: "https://www.gov.il/he/departments/legalInfo/consumer_protection_regulations_warranty" },
    { pais: "India", minimo: "Garantía de fabricante y responsabilidad objetiva", ley: "Consumer Protection Act, 2019", url_oficial: "https://consumeraffairs.nic.in/acts-and-rules/consumer-protection" },
    { pais: "China", minimo: "Política de Tres Garantías (San Bao, 1 año)", ley: "Ley de Protección del Consumidor de la RPC", url_oficial: "http://www.samr.gov.cn" }
  ];

  const NORMAS_PAIS = [
    { pais: "México", categoria: "audio_electronica", codigo: "NOM-001-SCFI-2018 / NOM-024-SCFI-2013", organismo: "DGN / IFT", url_oficial: "https://www.gob.mx/se/acciones-y-programas/competitividad-y-normatividad-normalizacion" },
    { pais: "México", categoria: "tecnologia", codigo: "NOM-001-SCFI-2018 / NOM-024-SCFI-2013", organismo: "DGN / IFT", url_oficial: "https://www.gob.mx/se/acciones-y-programas/competitividad-y-normatividad-normalizacion" },
    { pais: "México", categoria: "skincare_cosmetica", codigo: "NOM-141-SSA1/SCFI-2012 (Etiquetado cosmético)", organismo: "COFEPRIS", url_oficial: "https://www.gob.mx/cofepris" },
    { pais: "México", categoria: "alimentos", codigo: "NOM-051-SCFI/SSA1-2010 (Etiquetado frontal)", organismo: "COFEPRIS / DGN", url_oficial: "https://www.gob.mx/se/acciones-y-programas/competitividad-y-normatividad-normalizacion" },
    { pais: "México", categoria: "lacteos", codigo: "NOM-243-SSA1-2010 / NOM-155-SCFI-2012", organismo: "COFEPRIS / DGN", url_oficial: "https://www.gob.mx/cofepris" },
    { pais: "México", categoria: "limpieza", codigo: "NOM-189-SSA1/SCFI-2018 (Etiquetado de productos de aseo)", organismo: "COFEPRIS / DGN", url_oficial: "https://www.gob.mx/cofepris" },
    { pais: "Alemania", categoria: "audio_electronica", codigo: "CE-Kennzeichnung / DIN EN 62368-1 / RED", organismo: "Bundesnetzagentur (BNetzA)", url_oficial: "https://www.bundesnetzagentur.de" },
    { pais: "Alemania", categoria: "tecnologia", codigo: "CE-Kennzeichnung / DIN EN 62368-1 / EMV", organismo: "Bundesnetzagentur (BNetzA)", url_oficial: "https://www.bundesnetzagentur.de" },
    { pais: "Alemania", categoria: "skincare_cosmetica", codigo: "EU Kosmetik-Verordnung (EG) 1223/2009", organismo: "BVL", url_oficial: "https://www.bvl.bund.de" },
    { pais: "Alemania", categoria: "alimentos", codigo: "LFGB / LMIV (EU 1169/2011)", organismo: "BVL", url_oficial: "https://www.bvl.bund.de" },
    { pais: "Alemania", categoria: "limpieza", codigo: "Detergenzienverordnung (EG) 648/2004", organismo: "BAuA", url_oficial: "https://www.baua.de" },
    { pais: "EE.UU.", categoria: "audio_electronica", codigo: "FCC Part 15 / UL 62368-1", organismo: "FCC / CPSC", url_oficial: "https://www.fcc.gov" },
    { pais: "EE.UU.", categoria: "tecnologia", codigo: "FCC Part 15 / UL Certification", organismo: "FCC", url_oficial: "https://www.fcc.gov" },
    { pais: "EE.UU.", categoria: "skincare_cosmetica", codigo: "FDA MoCRA 2022", organismo: "FDA", url_oficial: "https://www.fda.gov/cosmetics" },
    { pais: "EE.UU.", categoria: "alimentos", codigo: "FDA FSMA / 21 CFR 101", organismo: "FDA", url_oficial: "https://www.fda.gov/food" },
    { pais: "España", categoria: "audio_electronica", codigo: "Marcado CE / Directiva RED 2014/53/UE", organismo: "Ministerio para la Transformación Digital", url_oficial: "https://portal.mineco.gob.es" },
    { pais: "España", categoria: "skincare_cosmetica", codigo: "Reglamento (CE) 1223/2009", organismo: "AEMPS", url_oficial: "https://www.aemps.gob.es" },
    { pais: "España", categoria: "alimentos", codigo: "Reglamento (UE) 1169/2011", organismo: "AESAN", url_oficial: "https://www.aesan.gob.es" },
    { pais: "Francia", categoria: "audio_electronica", codigo: "Marquage CE / Directive RED 2014/53/UE", organismo: "ANFR", url_oficial: "https://www.economie.gouv.fr/dgccrf" },
    { pais: "Francia", categoria: "skincare_cosmetica", codigo: "Règlement (CE) 1223/2009", organismo: "ANSM", url_oficial: "https://ansm.sante.fr" },
    { pais: "Reino Unido", categoria: "audio_electronica", codigo: "UKCA mark / Radio Equipment Regs 2017", organismo: "OPSS", url_oficial: "https://www.gov.uk/government/organisations/office-for-product-safety-and-standards" },
    { pais: "Brasil", categoria: "audio_electronica", codigo: "Homologação Anatel / Inmetro", organismo: "Anatel / Inmetro", url_oficial: "https://www.gov.br/inmetro" },
    { pais: "Japón", categoria: "audio_electronica", codigo: "PSE Mark / Giteki (技適)", organismo: "METI", url_oficial: "https://www.meti.go.jp" }
  ];

  function getLegalWarranty(country) {
    if (!country) return null;
    const norm = String(country).trim();
    const g = GARANTIAS_PAIS.find((item) => item.pais.toLowerCase() === norm.toLowerCase() || (item.pais === "EE.UU." && /ee\.uu\.|estados unidos|usa|us/i.test(norm)));
    if (g && g.url_oficial) return g;
    return null;
  }

  function getApplicableNorms(category, brandGroup, title, country) {
    if (!country) return [];
    const normCountry = String(country).trim();
    const cat = String(category || "").toLowerCase();
    const t = String(title || "").toLowerCase();

    // Filtra estrictamente por el país de la tienda (en amazon.de jamás aparecen NOM ni PROFECO)
    const countryNorms = NORMAS_PAIS.filter((item) => item.pais.toLowerCase() === normCountry.toLowerCase() || (item.pais === "EE.UU." && /ee\.uu\.|estados unidos|usa|us/i.test(normCountry)));
    if (!countryNorms.length) return [];

    // Mapeo de categoría o palabras clave
    let matchedCat = cat;
    if (!matchedCat || matchedCat === "null" || matchedCat === "undefined") {
      if (/\b(audifonos|auriculares|bocina|parlante|pantalla|tv|televisor|celular|smartphone|laptop|computadora)\b/i.test(t)) matchedCat = "audio_electronica";
      else if (/\b(serum|crema|protector solar|bloqueador|gel limpiador|shampoo|dermo)\b/i.test(t)) matchedCat = "skincare_cosmetica";
      else if (/\b(leche|cafe|cereal|galletas|botana|bebida|refresco|jugo|pan)\b/i.test(t)) matchedCat = "alimentos";
      else if (/\b(detergente|jabon|blanqueador|desinfectante|cloro)\b/i.test(t)) matchedCat = "limpieza";
    }

    const matches = countryNorms.filter((n) => n.categoria === matchedCat || (matchedCat === "audio_electronica" && n.categoria === "tecnologia"));
    return matches.map((m) => ({
      code: m.codigo,
      organismo: m.organismo,
      url: m.url_oficial
    }));
  }

  // Evaluación de confiabilidad (SIN `score` artificial)
  function evaluateReliability(rel, brandGroup, category, title, country, siteEntry) {
    rel = rel || {};
    title = String(title || "").toLowerCase();
    category = String(category || "").toLowerCase();
    country = country || (siteEntry && siteEntry.pais) || "México";

    let sellerType = rel.sellerType || "third_party";
    let sellerName = rel.seller || rel.storeName || "";

    const siteModel = (siteEntry && siteEntry.modelo) || rel.siteModel;

    // Regla 9: Un retailer sin vendedor externo detectado → vendedor = la tienda, insignia "Tienda directa". Nunca "Revisar" solo porque no se leyó el vendedor.
    if (siteModel === "retailer") {
      if (!rel.seller || rel.seller === (siteEntry && siteEntry.nombre)) {
        sellerName = (siteEntry && siteEntry.nombre) || rel.storeName || "Tienda directa";
        sellerType = "direct";
        rel.isDirectPlatform = true;
      }
    }

    if (rel.isOfficialStore) {
      sellerType = "official";
    } else if (rel.isDirectPlatform) {
      sellerType = "direct";
    } else if (rel.sellerRating && /platinum|gold|l[ií]der|destacado|verificado/i.test(rel.sellerRating)) {
      sellerType = "verified";
    } else if (rel.seller) {
      sellerType = "third_party";
    }

    let level = "standard";
    if (sellerType === "official" || sellerType === "direct") {
      level = "high";
    } else if (sellerType === "verified" || rel.isFulfilledByPlatform) {
      level = "standard";
    } else {
      level = "check";
    }

    const norms = getApplicableNorms(category, brandGroup, title, country);
    const legalWarranty = getLegalWarranty(country);

    return {
      level,
      sellerName: sellerName || rel.storeName || "",
      sellerType,
      storeRating: rel.storeRating || null,
      isOfficialStore: !!rel.isOfficialStore,
      isDirectPlatform: !!rel.isDirectPlatform,
      isFulfilledByPlatform: !!rel.isFulfilledByPlatform,
      shipper: rel.shipper || "",
      returnPolicy: rel.returnPolicy || "",
      warranty: rel.warranty || "",
      storeName: rel.storeName || (siteEntry && siteEntry.nombre) || "",
      brandVerified: !!(brandGroup && brandGroup.empresa),
      brandEmpresa: brandGroup ? brandGroup.empresa : "",
      norms,
      legalWarranty,
      certificationsText: rel.certificationsText || "",
      internationalWarning: rel.internationalWarning || ""
    };
  }

  function extractCategoryPath(doc, siteName) {
    if (!doc) return "";
    // Amazon
    const amzBc = q(doc, "#wayfinding-breadcrumbs_feature_div");
    if (amzBc) {
      const crumbs = qa(amzBc, "li a, span.a-list-item, a").map((el) => txt(el)).filter(Boolean);
      if (crumbs.length) return crumbs.join(" > ");
    }
    // Mercado Libre
    const mlBc = q(doc, ".andes-breadcrumb");
    if (mlBc) {
      const crumbs = qa(mlBc, "a, span").map((el) => txt(el)).filter(Boolean);
      if (crumbs.length) return crumbs.join(" > ");
    }
    // Walmart
    const wmBc = q(doc, "[data-testid='breadcrumb'], .breadcrumb");
    if (wmBc) {
      const crumbs = qa(wmBc, "li, a").map((el) => txt(el)).filter(Boolean);
      if (crumbs.length) return crumbs.join(" > ");
    }
    // Liverpool
    const livBc = q(doc, ".m-breadcrumb");
    if (livBc) {
      const crumbs = qa(livBc, "li, a").map((el) => txt(el)).filter(Boolean);
      if (crumbs.length) return crumbs.join(" > ");
    }
    // JSON-LD BreadcrumbList y Product.category
    for (const s of qa(doc, 'script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(s.textContent);
        const items = Array.isArray(data) ? data : [data];
        for (const it of items) {
          if (it["@type"] === "BreadcrumbList" && Array.isArray(it.itemListElement)) {
            const names = it.itemListElement.map((x) => (x.item && x.item.name) || x.name).filter(Boolean);
            if (names.length) return names.join(" > ");
          }
          if ((it["@type"] === "Product" || (Array.isArray(it["@type"]) && it["@type"].includes("Product"))) && it.category) {
            return String(it.category);
          }
        }
      } catch (e) {}
    }
    // Meta tags
    const metaCat = q(doc, 'meta[property="product:category"], meta[name="category"]');
    if (metaCat && metaCat.content) return metaCat.content;
    return "";
  }

  function extract(doc, host) {
    const s = site(host);
    const base = s && SITE[s] ? SITE[s](doc) : { candidates: [], title: "" };
    const c = base.candidates.slice();
    for (const p of jsonLdProducts(doc)) {
      const b = ldBrand(p);
      if (b) c.push({ text: b, source: "Datos estructurados de la página" });
      if (!base.title && p.name) base.title = String(p.name);
    }
    const micro = q(doc, '[itemprop="brand"]');
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
    const categoryPath = extractCategoryPath(doc, s);
    const specsEl = q(doc, "#feature-bullets, #productDetails_techSpec_section_1, #specifications, .ui-pdp-specs, table, #detailBullets_feature_div, [data-testid='product-description']");
    const specsText = specsEl ? txt(specsEl) : "";
    return { site: s, candidates: c, title: base.title, categoryPath, reliability, specsText };
  }

  QED.site = site;
  QED.isProductPage = isProductPage;
  QED.extract = extract;
  QED.extractCategoryPath = extractCategoryPath;
  QED.extractReliability = extractReliability;
  QED.evaluateReliability = evaluateReliability;
  QED.getApplicableNorms = getApplicableNorms;
  QED.getLegalWarranty = getLegalWarranty;
  QED.GARANTIAS_PAIS = GARANTIAS_PAIS;
  QED.NORMAS_PAIS = NORMAS_PAIS;
})(typeof globalThis !== "undefined" ? globalThis : this);
