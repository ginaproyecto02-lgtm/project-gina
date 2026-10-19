// SPDX-License-Identifier: MIT
// Gina — Comparador en la tarjeta (lectura de tiendas, JSON-LD, selectores y clasificación de productos)
(function (root) {
  const QED = (root.QED = root.QED || {});

  const clip = (s, n) => String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, n);

  // Valida y sanea URLs: solo protocolo https y debe pertenecer al dominio de la tienda
  function sanitizeStoreUrl(rawUrl, storeDomain) {
    if (!rawUrl || typeof rawUrl !== "string") return "";
    try {
      const trimmed = rawUrl.trim();
      if (/^(javascript:|data:|vbscript:|file:|about:)/i.test(trimmed)) return "";
      const u = trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? new URL(trimmed)
        : new URL("https://" + (storeDomain || "") + (trimmed.startsWith("/") ? "" : "/") + trimmed);

      if (u.protocol !== "https:") return "";
      const h = u.hostname.replace(/^www\./, "").toLowerCase();
      const expected = String(storeDomain || "").replace(/^www\./, "").toLowerCase();
      if (!expected || (h !== expected && !h.endsWith("." + expected))) return "";
      return u.toString();
    } catch (_) {
      return "";
    }
  }

  // Valida URLs de imágenes: estrictamente https:// (sin http:, javascript:, data:)
  function sanitizeImageUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") return "";
    try {
      const u = new URL(rawUrl.trim());
      if (u.protocol !== "https:") return "";
      return u.toString();
    } catch (_) {
      return "";
    }
  }

  // Moneda por país de la tienda (validación 2026-10-18): antes todo resultado sin moneda explícita
  // se marcaba como MXN, también en eBay EE.UU. o Amazon Alemania.
  const COUNTRY_CURRENCY = {
    "México": "MXN", "EE.UU.": "USD", "Canadá": "CAD", "Brasil": "BRL", "Argentina": "ARS", "Chile": "CLP",
    "Colombia": "COP", "Reino Unido": "GBP", "Alemania": "EUR", "Francia": "EUR", "España": "EUR", "Italia": "EUR",
    "Japón": "JPY", "India": "INR", "Singapur": "SGD", "Corea del Sur": "KRW", "China": "CNY"
  };
  const DOMAIN_CURRENCY = {
    ".mx": "MXN", ".com.mx": "MXN", ".ca": "CAD", ".br": "BRL", ".com.br": "BRL",
    ".ar": "ARS", ".com.ar": "ARS", ".cl": "CLP", ".co": "COP", ".com.co": "COP",
    ".uk": "GBP", ".co.uk": "GBP", ".de": "EUR", ".fr": "EUR", ".es": "EUR", ".it": "EUR",
    ".jp": "JPY", ".co.jp": "JPY", ".in": "INR", ".sg": "SGD", "coupang.com": "KRW", "jd.com": "CNY"
  };
  function storeCurrency(cfg) {
    if (!cfg) return "";
    let c = cfg.moneda || COUNTRY_CURRENCY[String(cfg.pais || "").trim()];
    if (!c && cfg.dominio) {
      const d = String(cfg.dominio).toLowerCase().trim();
      for (const [k, v] of Object.entries(DOMAIN_CURRENCY)) {
        if (d.endsWith(k) || d === k) { c = v; break; }
      }
    }
    return c ? String(c).toUpperCase() : "";
  }

  // Precio de texto con separadores de cualquier país: «$20,499.00», «1.299,00 €», «1 299,99», «¥12,800».
  function parsePriceText(raw) {
    let v = String(raw == null ? "" : raw).replace(/[^0-9.,]/g, "");
    if (!v) return null;
    const lastDot = v.lastIndexOf("."), lastComma = v.lastIndexOf(",");
    if (lastDot >= 0 && lastComma >= 0) {
      // El separador que aparece al final es el decimal
      v = lastComma > lastDot ? v.replace(/\./g, "").replace(",", ".") : v.replace(/,/g, "");
    } else if (lastComma >= 0) {
      const dec = v.length - lastComma - 1;
      v = (dec === 1 || dec === 2) && v.indexOf(",") === lastComma ? v.replace(",", ".") : v.replace(/,/g, "");
    } else if (lastDot >= 0) {
      const dec = v.length - lastDot - 1;
      // «1.299» (miles, estilo europeo) frente a «12.99»
      if (dec === 3 || v.indexOf(".") !== lastDot) v = v.replace(/\./g, "");
    }
    const n = parseFloat(v);
    return !isNaN(n) && n > 0 ? n : null;
  }

  // Limpieza de GTIN/EAN/UPC (8 a 14 dígitos)
  function cleanGtin(raw) {
    if (!raw) return "";
    const digits = String(raw).replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 14) return digits;
    return "";
  }

  // Limpieza de código de modelo / MPN
  function cleanModel(raw) {
    if (!raw) return "";
    return String(raw).trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  }

  // Detección de bloqueos o Captcha para omisión silenciosa
  function isBlockedOrCaptcha(htmlText, status) {
    if (status === 403 || status === 429 || status === 503) return true;
    if (!htmlText || typeof htmlText !== "string") return false;
    if (htmlText.includes("api-services-support") || /Robot Check|automated access/i.test(htmlText)) return true;
    if (/opfcaptcha|images-amazon\.com\/captcha|validateCaptcha/i.test(htmlText)) return true;
    if (/cf-chl-|Cloudflare Ray ID|Attention Required!|Just a moment\.\.\./i.test(htmlText)) return true;
    if (/g-recaptcha|recaptcha\.net|datadome/i.test(htmlText)) return true;
    return false;
  }

  // Extracción de bloques JSON-LD (funciona con DOM o con texto en Service Worker)
  function extractJsonLd(htmlOrDoc) {
    const list = [];
    if (typeof htmlOrDoc === "string") {
      const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let m;
      while ((m = re.exec(htmlOrDoc)) !== null) {
        try {
          const parsed = JSON.parse(m[1].trim());
          if (Array.isArray(parsed)) list.push(...parsed);
          else if (parsed && parsed["@graph"] && Array.isArray(parsed["@graph"])) list.push(...parsed["@graph"]);
          else if (parsed) list.push(parsed);
        } catch (_) {}
      }
    } else if (htmlOrDoc && htmlOrDoc.querySelectorAll) {
      const scripts = htmlOrDoc.querySelectorAll('script[type="application/ld+json"]');
      for (const s of scripts) {
        try {
          const parsed = JSON.parse(s.textContent.trim());
          if (Array.isArray(parsed)) list.push(...parsed);
          else if (parsed && parsed["@graph"] && Array.isArray(parsed["@graph"])) list.push(...parsed["@graph"]);
          else if (parsed) list.push(parsed);
        } catch (_) {}
      }
    }
    return list;
  }

  // Extrae __NEXT_DATA__ si la tienda lo usa
  function extractNextData(htmlOrDoc) {
    let raw = "";
    if (typeof htmlOrDoc === "string") {
      const m = /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(htmlOrDoc);
      if (m) raw = m[1];
    } else if (htmlOrDoc && htmlOrDoc.querySelector) {
      const el = htmlOrDoc.querySelector("#__NEXT_DATA__");
      if (el) raw = el.textContent;
    }
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  // Extrae __PRELOADED_STATE__ si la tienda lo usa
  function extractPreloadedState(htmlOrDoc) {
    let raw = "";
    if (typeof htmlOrDoc === "string") {
      const m = /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/i.exec(htmlOrDoc)
        || /<script[^>]*id=["']__PRELOADED_STATE__["'][^>]*>([\s\S]*?)<\/script>/i.exec(htmlOrDoc);
      if (m) raw = m[1];
    } else if (htmlOrDoc && htmlOrDoc.querySelector) {
      const el = htmlOrDoc.querySelector("#__PRELOADED_STATE__");
      if (el) raw = el.textContent;
    }
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  // Parsea productos desde objetos JSON embebidos (__NEXT_DATA__, e.g. Walmart, o __PRELOADED_STATE__)
  function parseProductsFromNextData(nextData, storeDomain, defCurrency) {
    if (!nextData || typeof nextData !== "object") return [];
    const pageProps = (nextData.props && nextData.props.pageProps) || nextData.pageProps || nextData;
    const initialData = pageProps.initialData || pageProps;
    const results = [];

    // 1. Resultados de búsqueda (e.g. Walmart props.pageProps.initialData.searchResult.itemStacks[*].items)
    const searchResult = initialData.searchResult || pageProps.searchResult;
    if (searchResult && Array.isArray(searchResult.itemStacks)) {
      for (const stack of searchResult.itemStacks) {
        if (!stack || !Array.isArray(stack.items)) continue;
        for (const it of stack.items) {
          if (!it || typeof it !== "object") continue;
          const title = clip(it.name || it.title || "", 150);
          if (!title) continue;

          let price = null;
          let currency = defCurrency || "";
          if (it.priceInfo && it.priceInfo.currentPrice) {
            const cp = it.priceInfo.currentPrice;
            if (typeof cp.price === "number") price = cp.price;
            else if (cp.price) price = parsePriceText(cp.price);
            else if (cp.priceText) price = parsePriceText(cp.priceText);
            if (cp.currencyUnit) currency = String(cp.currencyUnit).trim().toUpperCase();
          } else if (typeof it.price === "number") {
            price = it.price;
          } else if (it.price) {
            price = parsePriceText(it.price);
          }

          const rawUrl = it.canonicalUrl || it.productUrl || (it.usItemId ? "/ip/" + it.usItemId : (it.id ? "/ip/" + it.id : ""));
          const validUrl = sanitizeStoreUrl(rawUrl, storeDomain);

          let rating = null;
          let reviewsCount = null;
          if (it.rating) {
            const rVal = parseFloat(it.rating.averageRating || it.rating.ratingValue || it.rating.score);
            if (!isNaN(rVal)) rating = rVal;
            const rCnt = parseInt(it.rating.numberOfReviews || it.rating.reviewCount || it.rating.count, 10);
            if (!isNaN(rCnt)) reviewsCount = rCnt;
          }

          let image = "";
          if (it.imageInfo) {
            image = it.imageInfo.thumbnailUrl || it.imageInfo.imageUrl || "";
          } else if (typeof it.image === "string") {
            image = it.image;
          }
          const validImg = sanitizeImageUrl(image);

          const gtin = cleanGtin(it.upc || it.gtin || it.gtin13 || it.gtin14);
          const mpn = cleanModel(it.model || it.mpn || it.modelNumber);
          const brand = clip(it.brand || (it.brandName ? it.brandName : ""), 60);

          if (title && (price !== null || validUrl)) {
            results.push({
              title,
              price,
              currency,
              url: validUrl,
              image: validImg,
              rating,
              reviewsCount,
              gtin,
              mpn,
              model: mpn,
              brand
            });
          }
        }
      }
    }

    // 2. Ficha de producto en initialData.product
    const product = initialData.product || pageProps.product;
    if (product && typeof product === "object") {
      const pItems = parseProductsFromJsonLd(product, storeDomain, defCurrency);
      if (pItems.length > 0) {
        results.push(...pItems);
      } else if (product.name || product.title) {
        const title = clip(product.name || product.title || "", 150);
        let price = null;
        let currency = defCurrency || "";
        if (product.priceInfo && product.priceInfo.currentPrice) {
          const cp = product.priceInfo.currentPrice;
          if (typeof cp.price === "number") price = cp.price;
          else if (cp.price) price = parsePriceText(cp.price);
          else if (cp.priceText) price = parsePriceText(cp.priceText);
          if (cp.currencyUnit) currency = String(cp.currencyUnit).trim().toUpperCase();
        } else if (typeof product.price === "number") {
          price = product.price;
        } else if (product.price) {
          price = parsePriceText(product.price);
        }
        const rawUrl = product.canonicalUrl || product.productUrl || (product.usItemId ? "/ip/" + product.usItemId : "");
        const validUrl = sanitizeStoreUrl(rawUrl, storeDomain);
        const validImg = sanitizeImageUrl(product.imageInfo?.thumbnailUrl || product.image || "");
        const gtin = cleanGtin(product.upc || product.gtin13 || product.gtin);
        const mpn = cleanModel(product.model || product.mpn);
        const brand = clip(product.brand || "", 60);
        if (title && (price !== null || validUrl)) {
          results.push({
            title,
            price,
            currency,
            url: validUrl,
            image: validImg,
            rating: parseFloat(product.rating?.averageRating) || null,
            reviewsCount: parseInt(product.rating?.numberOfReviews, 10) || null,
            gtin,
            mpn,
            model: mpn,
            brand
          });
        }
      }
    }

    return results;
  }

  function parseProductsFromPreloadedState(state, storeDomain, defCurrency) {
    if (!state || typeof state !== "object") return [];
    if (state.searchResults || state.items || state.products) {
      const list = state.searchResults || state.items || state.products;
      if (Array.isArray(list)) {
        return parseProductsFromNextData({ props: { pageProps: { initialData: { searchResult: { itemStacks: [{ items: list }] } } } } }, storeDomain, defCurrency);
      }
    }
    return [];
  }

  // Parsea productos desde objetos JSON-LD
  function parseProductsFromJsonLd(ldObj, storeDomain, defCurrency) {
    if (!ldObj || typeof ldObj !== "object") return [];
    const type = String(ldObj["@type"] || "");
    const results = [];

    if (type === "ItemList" && Array.isArray(ldObj.itemListElement)) {
      for (const el of ldObj.itemListElement) {
        const item = el.item || el;
        const sub = parseProductsFromJsonLd(item, storeDomain, defCurrency);
        results.push(...sub);
      }
      return results;
    }

    if (type.includes("Product") || ldObj.offers || ldObj.name) {
      const title = clip(ldObj.name || ldObj.title || "", 150);
      let price = null;
      let currency = defCurrency || "";
      let offerUrl = "";

      const rawOffers = ldObj.offers;
      const offersList = Array.isArray(rawOffers) ? rawOffers : (rawOffers ? [rawOffers] : []);
      if (offersList.length) {
        for (const o of offersList) {
          const rawP = o.price != null && o.price !== "" ? o.price : o.lowPrice;
          const p = typeof rawP === "number" ? rawP : parsePriceText(rawP);
          if (p != null && !isNaN(p) && p > 0 && (price === null || p < price)) {
            price = p;
            if (o.priceCurrency) currency = String(o.priceCurrency).trim().toUpperCase();
            if (o.url) offerUrl = o.url;
          }
        }
      }

      let rating = null;
      let reviewsCount = null;
      if (ldObj.aggregateRating) {
        const rVal = parseFloat(ldObj.aggregateRating.ratingValue);
        if (!isNaN(rVal)) rating = rVal;
        const rCnt = parseInt(ldObj.aggregateRating.reviewCount || ldObj.aggregateRating.ratingCount, 10);
        if (!isNaN(rCnt)) reviewsCount = rCnt;
      }

      let image = "";
      if (typeof ldObj.image === "string") image = ldObj.image;
      else if (Array.isArray(ldObj.image) && ldObj.image.length) {
        image = typeof ldObj.image[0] === "string" ? ldObj.image[0] : (ldObj.image[0] && ldObj.image[0].url);
      } else if (ldObj.image && typeof ldObj.image === "object") {
        image = ldObj.image.url || ldObj.image.contentUrl || "";
      }

      const gtin = cleanGtin(ldObj.gtin13 || ldObj.gtin || ldObj.gtin14 || ldObj.gtin8 || ldObj.isbn);
      const mpn = cleanModel(ldObj.mpn || ldObj.model);
      const brand = ldObj.brand ? (typeof ldObj.brand === "string" ? ldObj.brand : ldObj.brand.name || "") : "";

      const validUrl = sanitizeStoreUrl(offerUrl || ldObj.url, storeDomain);
      const validImg = sanitizeImageUrl(image);

      if (title && (price !== null || validUrl)) {
        results.push({
          title,
          price,
          currency,
          url: validUrl,
          image: validImg,
          rating,
          reviewsCount,
          gtin,
          mpn,
          model: mpn || cleanModel(ldObj.model || ""),
          brand
        });
      }
    }
    return results;
  }

  // Parsea selectores HTML si se dispone de DOM
  function parseStoreWithSelectors(doc, selectors, storeDomain, defCurrency) {
    if (!doc || !selectors || !selectors.item) return [];
    const items = doc.querySelectorAll(selectors.item);
    const results = [];
    for (const it of items) {
      const titleEl = selectors.titulo ? it.querySelector(selectors.titulo) : null;
      const title = clip(titleEl ? titleEl.textContent : "", 150);

      const priceEl = selectors.precio ? it.querySelector(selectors.precio) : null;
      let price = null;
      if (priceEl) {
        price = parsePriceText(priceEl.textContent);
      }

      const linkEl = selectors.enlace ? it.querySelector(selectors.enlace) : null;
      const rawUrl = linkEl ? (linkEl.getAttribute("href") || "") : "";
      const validUrl = sanitizeStoreUrl(rawUrl, storeDomain);

      let rating = null;
      if (selectors.calificacion) {
        const rEl = it.querySelector(selectors.calificacion);
        if (rEl) {
          const m = rEl.textContent.match(/([0-9]+([.,][0-9]+)?)/);
          if (m) {
            const parsedR = parseFloat(m[1].replace(",", "."));
            if (!isNaN(parsedR)) rating = parsedR;
          }
        }
      }

      let reviewsCount = null;
      if (selectors.resenas) {
        const revEl = it.querySelector(selectors.resenas);
        if (revEl) {
          const m = revEl.textContent.match(/([0-9]+([0-9,\.]*))/);
          if (m) {
            const parsedC = parseInt(m[1].replace(/\D/g, ""), 10);
            if (!isNaN(parsedC)) reviewsCount = parsedC;
          }
        }
      }

      let image = "";
      if (selectors.imagen) {
        const imgEl = it.querySelector(selectors.imagen);
        if (imgEl) image = imgEl.getAttribute("src") || imgEl.getAttribute("data-src") || "";
      }
      const validImg = sanitizeImageUrl(image);

      let gtin = cleanGtin(it.getAttribute("data-gtin") || it.getAttribute("data-asin") || "");
      if (!gtin && selectors.gtin) {
        const gEl = it.querySelector(selectors.gtin);
        if (gEl) gtin = cleanGtin(gEl.textContent || gEl.getAttribute("content") || "");
      }

      let brand = it.getAttribute("data-brand") || "";
      if (!brand && selectors.marca) {
        const bEl = it.querySelector(selectors.marca);
        if (bEl) brand = clip(bEl.textContent || bEl.getAttribute("content") || "", 60);
      }

      let model = cleanModel(it.getAttribute("data-model") || "");
      if (!model && selectors.modelo) {
        const mEl = it.querySelector(selectors.modelo);
        if (mEl) model = cleanModel(mEl.textContent || mEl.getAttribute("content") || "");
      }

      if (title && (price !== null || validUrl)) {
        results.push({
          title,
          price,
          currency: defCurrency || "",
          url: validUrl,
          image: validImg,
          rating,
          reviewsCount,
          gtin,
          mpn: model,
          model,
          brand
        });
      }
    }
    return results;
  }

  // Extrae productos de una tienda usando el orden de prioridad estricto (G2):
  // 1. JSON embebido (__NEXT_DATA__, __PRELOADED_STATE__)
  // 2. JSON-LD
  // 3. Selectores
  // Lee hasta 10 resultados de la página de búsqueda.
  function extractStoreItems(htmlText, docOrStore, storeConfig) {
    let doc = null;
    let cfg = storeConfig;
    if (docOrStore && (docOrStore.dominio || !storeConfig)) {
      cfg = docOrStore;
      doc = null;
    } else {
      doc = docOrStore;
    }
    cfg = cfg || {};
    if (!htmlText && !doc) return [];
    const domain = cfg.dominio || "";
    const cur = storeCurrency(cfg);

    // 1. JSON embebido (__NEXT_DATA__, __PRELOADED_STATE__)
    const nextData = extractNextData(doc || htmlText);
    if (nextData) {
      const nextItems = parseProductsFromNextData(nextData, domain, cur);
      if (nextItems.length > 0) return nextItems.slice(0, 10);
    }

    const preloadedState = extractPreloadedState(doc || htmlText);
    if (preloadedState) {
      const preItems = parseProductsFromPreloadedState(preloadedState, domain, cur);
      if (preItems.length > 0) return preItems.slice(0, 10);
    }

    // 2. JSON-LD
    const jsonLds = extractJsonLd(doc || htmlText);
    const ldItems = [];
    for (const ld of jsonLds) {
      ldItems.push(...parseProductsFromJsonLd(ld, domain, cur));
    }
    if (ldItems.length > 0) return ldItems.slice(0, 10);

    // 3. Selectores (si hay doc disponible)
    if (doc && cfg.selectores) {
      const selItems = parseStoreWithSelectors(doc, cfg.selectores, domain, cur);
      if (selItems.length > 0) return selItems.slice(0, 10);
    }

    return [];
  }

  // Clasificación de concordancia de producto (Mismo producto / Parecido / Ninguno)
  function classifyProductMatch(current, candidate) {
    if (!current || !candidate) return { type: "none" };

    // 1. Coincidencia por GTIN / EAN / UPC
    const currGtin = cleanGtin(current.gtin);
    const candGtin = cleanGtin(candidate.gtin);
    if (currGtin && candGtin && currGtin === candGtin) {
      return { type: "same", matchBy: "gtin" };
    }

    // 2. Coincidencia por número de modelo / MPN
    const currMpn = cleanModel(current.mpn || current.model);
    const candMpn = cleanModel(candidate.mpn || candidate.model);
    if (currMpn && candMpn && currMpn.length >= 3 && currMpn === candMpn) {
      return { type: "same", matchBy: "mpn" };
    }

    // Verificar concordancia de marca
    const currBrand = String(current.brand || "").trim().toLowerCase();
    const candBrand = String(candidate.brand || "").trim().toLowerCase();
    const candTitle = String(candidate.title || "").trim().toLowerCase();
    const brandMatches = currBrand && (candBrand === currBrand || candTitle.includes(currBrand));

    if (!brandMatches) {
      return { type: "none" };
    }

    // Marca coincide: revisar si es el mismo modelo en el título o producto parecido
    const normalize = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    const candNorm = normalize(candidate.title || "");
    const candCleanTitle = cleanModel(candidate.title || "");

    if (currMpn && currMpn.length >= 3 && candCleanTitle.includes(currMpn)) {
      return { type: "same", matchBy: "mpn_in_title" };
    }

    // Extraer núcleo de palabras clave del producto actual
    const stopWords = new Set(["para", "con", "de", "del", "la", "el", "los", "las", "un", "una", "en", "por", "y", "o", "the", "for", "with", "and", "negro", "blanco", "azul"]);
    const currWords = normalize(current.title || "")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !stopWords.has(w) && w !== currBrand);

    // Revisar si las palabras clave del producto coinciden
    const matchesKeywords = currWords.filter((w) => candNorm.includes(w)).length >= 2;

    if (matchesKeywords) {
      return { type: "similar", matchBy: "brand_and_model_core" };
    }

    return { type: "different" };
  }

  // Agrupa y ordena los resultados de comparación
  function groupAndRankComparison(currentProduct, candidateItems) {
    const same = [];
    const similar = [];

    for (const it of candidateItems || []) {
      const match = it.matchType ? { type: it.matchType, matchBy: it.matchBy } : classifyProductMatch(currentProduct, it);
      if (match.type === "same") {
        same.push(Object.assign({}, it, { matchType: "same", matchBy: match.matchBy }));
      } else if (match.type === "similar") {
        similar.push(Object.assign({}, it, { matchType: "similar", matchBy: match.matchBy }));
      }
    }

    // Mismo producto: ordenado por precio de menor a mayor
    same.sort((a, b) => {
      const pa = typeof a.price === "number" ? a.price : Infinity;
      const pb = typeof b.price === "number" ? b.price : Infinity;
      return pa - pb;
    });

    // Insignia «El más barato que encontramos»:
    // Incluye la tienda actual en la comparación. Solo dentro de la misma moneda.
    if (same.length > 0 && typeof same[0].price === "number") {
      const cheapestCand = same[0];
      const currPrice = currentProduct ? (typeof currentProduct.price === "number" ? currentProduct.price : (typeof currentProduct.amount === "number" ? currentProduct.amount : null)) : null;
      const currCurr = (currentProduct && (currentProduct.currency || currentProduct.priceCurrency) || "").trim().toUpperCase();
      const candCurr = (cheapestCand.currency || "").trim().toUpperCase();

      if (currCurr && candCurr && currCurr === candCurr && currPrice != null) {
        if (cheapestCand.price < currPrice) {
          cheapestCand.isCheapest = true;
        } else {
          cheapestCand.isCheapest = false;
        }
      } else {
        cheapestCand.isCheapest = false;
      }
      for (let i = 1; i < same.length; i++) {
        same[i].isCheapest = false;
      }
    }

    // Parecidos: máximo 3, con etiqueta «Parecido, revisa el modelo» y sin insignia de precio
    const parecidos = similar.slice(0, 3).map((it) => {
      const copy = Object.assign({}, it, { isSimilar: true, isCheapest: false });
      return copy;
    });

    return { same, similar: parecidos };
  }

  // Genera la consulta de búsqueda para otra tienda según la prioridad:
  // 1. GTIN -> 2. Marca + modelo -> 3. Marca + núcleo del título (nunca título completo)
  function queryForCompare(product) {
    if (!product) return "";
    const gtin = cleanGtin(product.gtin);
    if (gtin) return gtin;

    const brand = String(product.brand || "").trim();
    const model = cleanModel(product.mpn || product.model);
    if (brand && model) return `${brand} ${model}`;
    if (model) return model;

    // Núcleo del título
    const title = String(product.title || "").trim();
    const stopWords = new Set(["para", "con", "de", "del", "la", "el", "los", "las", "un", "una", "en", "por", "y", "o", "the", "for", "with", "and"]);
    const brandLower = brand.toLowerCase();
    const words = title
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !stopWords.has(w.toLowerCase()) && (!brandLower || w.toLowerCase() !== brandLower));

    const core = words.slice(0, 3).join(" ");
    return brand ? `${brand} ${core}`.trim() : core;
  }

  function buildCompareCacheKey(storeDomain, query) {
    return `cmp:${String(storeDomain || "").toLowerCase()}:${String(query || "").toLowerCase().trim()}`;
  }

  const hostMatches = (host, domain) => {
    const h = String(host || "").toLowerCase().replace(/^www\./, "");
    const d = String(domain || "").toLowerCase();
    return h === d || h.endsWith("." + d);
  };

  // Exportar utilidades
  QED.hostMatches = hostMatches;
  QED.sanitizeStoreUrl = sanitizeStoreUrl;
  QED.sanitizeImageUrl = sanitizeImageUrl;
  QED.cleanGtin = cleanGtin;
  QED.parsePriceText = parsePriceText;
  QED.storeCurrency = storeCurrency;
  QED.cleanModel = cleanModel;
  QED.isBlockedOrCaptcha = isBlockedOrCaptcha;
  QED.extractJsonLd = extractJsonLd;
  QED.extractNextData = extractNextData;
  QED.extractPreloadedState = extractPreloadedState;
  QED.parseProductsFromNextData = parseProductsFromNextData;
  QED.parseProductsFromPreloadedState = parseProductsFromPreloadedState;
  QED.parseProductsFromJsonLd = parseProductsFromJsonLd;
  QED.parseStoreWithSelectors = parseStoreWithSelectors;
  QED.extractStoreItems = extractStoreItems;
  QED.classifyProductMatch = classifyProductMatch;
  QED.groupAndRankComparison = groupAndRankComparison;
  QED.queryForCompare = queryForCompare;
  QED.buildCompareCacheKey = buildCompareCacheKey;
})(typeof globalThis !== "undefined" ? globalThis : this);
