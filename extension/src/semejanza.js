// SPDX-License-Identifier: MIT
// Project Gina — Motor de semejanza y clasificación del comparador (tanda G)
// Módulo de funciones puras: normalización, extracción de atributos, variantes,
// cálculo de precio unitario y decisiones deterministas.
(function (root) {
  const QED = (root.QED = root.QED || {});
  const Semejanza = (root.Semejanza = root.GINA_SEMEJANZA = root.GINA_SEMEJANZA || {});

  // 1. Normalización de texto
  // - Minúsculas y sin acentos
  // - Puntuación convertida a espacios (e.g. «coca-cola» -> «coca cola»)
  function normalizeText(text) {
    if (text == null) return "";
    return String(text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Limpieza de modelo conservando espacios originales entre tokens
  function cleanModelWithSpaces(raw) {
    if (!raw) return "";
    return String(raw)
      .trim()
      .replace(/[^A-Za-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Modelo en forma compacta (sin espacios ni guiones) para comparación
  function compactModel(raw) {
    if (!raw) return "";
    return String(raw).toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  // 2. Diccionarios de variantes multilingües (es, en, pt)
  const DICT_ESPECIE = {
    perro: ["perro", "perros", "canino", "canina", "caninos", "dog", "dogs", "cachorro", "cao", "caes"],
    gato: ["gato", "gatos", "felino", "felina", "felinos", "cat", "cats", "kitten", "gatinho", "felis"]
  };

  const DICT_ETAPA = {
    cachorro: ["cachorro", "cachorros", "puppy", "puppies", "filhote", "filhotes"],
    kitten: ["kitten", "gatito", "gatitos", "gatinho", "gatinhos"],
    adulto: ["adulto", "adultos", "adult", "adults", "adulte", "adul", "adto"],
    senior: ["senior", "maduro", "mature", "7+", "8+", "11+", "edad avanzada", "geriatrico", "idoso"]
  };

  const DICT_TALLA = {
    pequenas: ["pequenas", "pequena", "pequenos", "pequeno", "raza pequena", "razas pequenas", "small breed", "small", "mini", "toy", "porte pequeno"],
    medianas: ["medianas", "mediana", "medianos", "mediano", "raza mediana", "razas medianas", "medium breed", "medium", "porte medio"],
    grandes: ["grandes", "grande", "raza grande", "razas grandes", "large breed", "large", "giant", "porte grande", "maxi"]
  };

  const DICT_FORMULA = {
    indoor: ["indoor", "interior", "interiores", "gato de interior"],
    light: ["light", "control de peso", "weight control", "weight care", "obesity", "peso saludable", "control peso"],
    sensible: ["sensible", "sensitive", "sensibilidad digestiva", "skin coat", "skin & coat", "piel sensible", "digestive"],
    sin_granos: ["sin granos", "grain free", "sem graos", "no grain"],
    hairball: ["hairball", "control bolas de pelo", "bolas de pelo", "anti hairball"],
    urinary: ["urinary", "cuidado urinario", "salud urinaria", "tracto urinario"]
  };

  const DICT_SABOR_TIPO = {
    zero: ["zero", "sin azucar", "sugar free", "sem acucar", "cero azucar"],
    light: ["light", "diet", "dietetica"],
    regular: ["regular", "original", "clasica", "classic", "tradicional"],
    b_ready: ["b-ready", "b ready", "bready"],
    plant_based: ["plant based", "plant-based", "vegano", "vegan", "vegetal"]
  };

  // Patrones que identifican accesorios, refacciones o fundas (a descartar si el producto original no lo es)
  const ACCESSORY_PATTERNS = [
    /\bfunda\s+(?:para|compatible|de|protectora)\b/i,
    /\b(?:case|cover)\s+(?:for|compatible)\b/i,
    /\bcompatibles?\s+con\b/i,
    /\b(?:mica|cristal\s+templado|protector\s+de\s+pantalla)\b/i,
    /\b(?:repuesto|repuestos)\s+(?:para|de)?\b/i,
    /\brefill\s+(?:para|de)?\b/i,
    /\baccesorio\s+para\b/i,
    /\badaptador\s+para\b/i,
    /\bsoporte\s+para\b/i,
    /\bcargador\s+(?:para|compatible)\b/i,
    /\bbateria\s+de\s+repuesto\b/i,
    /\bvacuum\s+bottle\b/i,
    /\btaza\s+(?:de|con)\b/i,
    /\btermo\s+(?:de|con)\b/i
  ];

  function isAccessoryOrSpare(title) {
    if (!title) return false;
    for (const pat of ACCESSORY_PATTERNS) {
      if (pat.test(title)) return true;
    }
    return false;
  }

  // 3. Extracción de Atributos desde el Título y Ficha
  function extractAttributes(title, ficha) {
    const rawTitle = String(title || "");
    const fullText = (rawTitle + " " + (ficha ? JSON.stringify(ficha) : "")).trim();
    const norm = normalizeText(rawTitle);

    // A. Cantidad y Unidad normalizada (a g o ml)
    let cantidad = null;
    // Prioridad a patrones específicos de peso/volumen
    // 1. Kilos: 1 kg, 1.5 kg, 1,5 kg, 5kg
    const kgMatch = rawTitle.match(/\b(\d+(?:[.,]\d+)?)\s*(?:kg|kilos?|kilogramos?)\b/i);
    // 2. Gramos: 1,000 g, 1.000 g, 350g, 500 g
    const gMatch = rawTitle.match(/\b(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(?:g|gr|grs|gramos)\b/i);
    // 3. Litros: 1 L, 1.5 l, 0.355 L, 2 litros
    const lMatch = rawTitle.match(/\b(\d+(?:[.,]\d+)?)\s*(?:l|lt|lts|litros?)\b/i);
    // 4. Mililitros: 355 ml, 355ml, 355 mL, 500 ml
    const mlMatch = rawTitle.match(/\b(\d+(?:[.,]\d+)?)\s*(?:ml|mls|mililitros?|cc)\b/i);
    // 5. Libras: 1 lb, 5 lbs
    const lbMatch = rawTitle.match(/\b(\d+(?:[.,]\d+)?)\s*(?:lb|lbs|libras?)\b/i);
    // 6. Onzas: 12 oz, 12 fl oz
    const ozMatch = rawTitle.match(/\b(\d+(?:[.,]\d+)?)\s*(?:fl\s*oz|onzas?|oz)\b/i);

    if (kgMatch) {
      const v = parseFloat(kgMatch[1].replace(",", "."));
      if (!isNaN(v) && v > 0) {
        const valG = Math.round(v * 1000);
        cantidad = { valor: valG, unidad: "g", texto: v === 1 ? "1 kg" : `${v} kg`, raw: kgMatch[0] };
      }
    } else if (lMatch && !mlMatch) {
      const v = parseFloat(lMatch[1].replace(",", "."));
      if (!isNaN(v) && v > 0) {
        const valMl = Math.round(v * 1000);
        cantidad = { valor: valMl, unidad: "ml", texto: v === 1 ? "1 L" : `${v} L`, raw: lMatch[0] };
      }
    } else if (mlMatch) {
      const v = parseFloat(mlMatch[1].replace(",", "."));
      if (!isNaN(v) && v > 0) {
        cantidad = { valor: v, unidad: "ml", texto: `${v} ml`, raw: mlMatch[0] };
      }
    } else if (gMatch) {
      let rawNum = gMatch[1];
      if (/^\d{1,3}[.,]\d{3}$/.test(rawNum)) {
        rawNum = rawNum.replace(/[.,]/g, "");
      } else {
        rawNum = rawNum.replace(",", ".");
      }
      const v = parseFloat(rawNum);
      if (!isNaN(v) && v > 0) {
        cantidad = { valor: v, unidad: "g", texto: v >= 1000 ? `${v / 1000} kg` : `${v} g`, raw: gMatch[0] };
      }
    } else if (lbMatch) {
      const v = parseFloat(lbMatch[1].replace(",", "."));
      if (!isNaN(v) && v > 0) {
        const valG = Math.round(v * 453.592);
        cantidad = { valor: valG, unidad: "g", texto: `${v} lb`, raw: lbMatch[0] };
      }
    } else if (ozMatch) {
      const v = parseFloat(ozMatch[1].replace(",", "."));
      if (!isNaN(v) && v > 0) {
        // En bebidas o contexto líquido, 12 oz ≈ 355 ml. En peso, 1 oz ≈ 28.35 g.
        const isFluid = /refresco|bebida|soda|jugo|cerveza|agua|lata|botella/i.test(rawTitle);
        if (isFluid || v === 12) {
          const valMl = Math.round(v * 29.5735);
          cantidad = { valor: valMl, unidad: "ml", texto: `${valMl} ml`, raw: ozMatch[0] };
        } else {
          const valG = Math.round(v * 28.3495);
          cantidad = { valor: valG, unidad: "g", texto: `${valG} g`, raw: ozMatch[0] };
        }
      }
    }

    // B. Paquete / Multipack
    let paquete = 1;
    let paqueteTexto = "";
    const packPatterns = [
      /\b(\d+)\s*(?:pack|pk|-pack)\b/i,
      /\bpack\s*(?:de|x)?\s*(\d+)\b/i,
      /\b(?:paquete|caja|kit|combo|bultos?|mangas?)\s*(?:de|con|x)?\s*(\d+)\b/i,
      /\b(?:c\/|x\s*)(\d+)\b/i,
      /\b(\d+)\s*x\s*(?:\d+)/i,
      /\b(\d+)\s*(?:latas|botellas|piezas|pzas|bultos|mangas|sobres|tarros|frascos|bolsas|unidades|paquetes|cajas|envases|potes)\b/i
    ];
    for (const pat of packPatterns) {
      const m = rawTitle.match(pat);
      if (m && m[1]) {
        const count = parseInt(m[1], 10);
        if (count > 1 && count <= 100) {
          paquete = count;
          paqueteTexto = m[0].trim();
          break;
        }
      }
    }
    if (paquete === 1) {
      if (/\bsix\s*pack\b/i.test(rawTitle)) {
        paquete = 6;
        paqueteTexto = "6 pack";
      } else if (/\bduo\s*pack\b/i.test(rawTitle)) {
        paquete = 2;
        paqueteTexto = "2 pack";
      }
    }

    // C. Voltaje
    let voltaje = null;
    const vMatch = rawTitle.match(/\b(110|115|120|127|220|230|240)\s*(?:v|volts?|voltios?)\b/i);
    const batMatch = rawTitle.match(/\b(12|18|20|36|40)\s*(?:v|volts?)\s*(?:max|bateria|inalambrico|cordless)?\b/i);
    if (vMatch) {
      const vNum = parseInt(vMatch[1], 10);
      voltaje = {
        tipo: "red",
        valor: vNum >= 200 ? "220V" : "127V",
        raw: `${vNum} V`
      };
    } else if (batMatch) {
      voltaje = {
        tipo: "bateria",
        valor: `${batMatch[1]}V`,
        raw: batMatch[0]
      };
    }

    // D. Potencia (W)
    let potencia = null;
    const wMatch = rawTitle.match(/\b(\d+)\s*(?:w|watts?|vatios?)\b/i);
    if (wMatch) {
      potencia = parseInt(wMatch[1], 10);
    }

    // E. Modelo
    let modelo = "";
    let modeloCompacto = "";
    // Detectar modelos conocidos con tokens alfanuméricos específicos
    const gsbMatch = rawTitle.match(/\b(GSB\s*\d+\s*(?:RE|2\s*RE)?)\b/i);
    const generalModelMatch = rawTitle.match(/\b([A-Z]{2,4}\s*\d{2,4}\s*[A-Z0-9-]{0,4})\b/);
    if (gsbMatch) {
      modelo = cleanModelWithSpaces(gsbMatch[1]).toUpperCase();
      modeloCompacto = compactModel(modelo);
    } else if (ficha && (ficha.mpn || ficha.model)) {
      modelo = cleanModelWithSpaces(ficha.mpn || ficha.model);
      modeloCompacto = compactModel(modelo);
    } else if (generalModelMatch) {
      modelo = cleanModelWithSpaces(generalModelMatch[1]);
      modeloCompacto = compactModel(modelo);
    }

    // F. Kit / Accesorios
    const kit = {
      conMaletin: /\bmalet[ií]n\b/i.test(rawTitle) || /\bestuche\b/i.test(rawTitle),
      brocas: (() => {
        const b = rawTitle.match(/(\d+)\s*brocas/i);
        return b ? parseInt(b[1], 10) : (/\bbrocas\b/i.test(rawTitle) ? true : false);
      })(),
      accesorios: (() => {
        const a = rawTitle.match(/(\d+)\s*accesorios/i);
        return a ? parseInt(a[1], 10) : (/\baccesorios\b/i.test(rawTitle) ? true : false);
      })(),
      combo: /\bcombo\b/i.test(rawTitle) || /\+\s*mini\s*esmeril/i.test(rawTitle)
    };

    // G. Variantes
    const variantes = {};
    for (const [key, words] of Object.entries(DICT_ESPECIE)) {
      for (const w of words) {
        const re = new RegExp(`\\b${w}\\b`, "i");
        if (re.test(norm)) { variantes.especie = key; break; }
      }
      if (variantes.especie) break;
    }

    for (const [key, words] of Object.entries(DICT_ETAPA)) {
      for (const w of words) {
        const re = new RegExp(`\\b${w.replace("+", "\\+")}\\b`, "i");
        if (re.test(norm)) { variantes.etapa = key; break; }
      }
      if (variantes.etapa) break;
    }

    for (const [key, words] of Object.entries(DICT_TALLA)) {
      for (const w of words) {
        const re = new RegExp(`\\b${w}\\b`, "i");
        if (re.test(norm)) { variantes.talla_raza = key; break; }
      }
      if (variantes.talla_raza) break;
    }

    for (const [key, words] of Object.entries(DICT_FORMULA)) {
      for (const w of words) {
        const re = new RegExp(`\\b${w}\\b`, "i");
        if (re.test(norm)) { variantes.formula = key; break; }
      }
      if (variantes.formula) break;
    }

    for (const [key, words] of Object.entries(DICT_SABOR_TIPO)) {
      for (const w of words) {
        const re = new RegExp(`\\b${w}\\b`, "i");
        if (re.test(norm)) { variantes.sabor_tipo = key; break; }
      }
      if (variantes.sabor_tipo) break;
    }

    // H. Línea (palabras clave del producto sin marca ni atributos)
    const stopWords = new Set([
      "para", "con", "de", "del", "la", "el", "los", "las", "un", "una", "en", "por",
      "y", "o", "the", "for", "with", "and", "c/u", "tarro", "bolsa", "lata", "botella",
      "alimento", "comida", "refresco", "sabor", "color", "azul", "seco", "croquetas",
      "nutricion", "cientifica", "especializada", "original", "receta", "clasica", "tarro"
    ]);

    const words = norm.split(/\s+/).filter((w) => {
      if (w.length < 3) return false;
      if (stopWords.has(w)) return false;
      if (/^\d+/.test(w)) return false;
      return true;
    });

    // I. Capacidad de memoria (celulares, laptops, USB…): 128 GB, 1 TB
    let capacidad = null;
    const capM = rawTitle.match(/\b(\d+(?:[.,]\d+)?)\s*(gb|tb)\b/i);
    if (capM) {
      const v = parseFloat(capM[1].replace(",", "."));
      capacidad = { valor: /tb/i.test(capM[2]) ? v * 1024 : v, texto: `${capM[1]} ${capM[2].toUpperCase()}` };
    }

    // J. Códigos del producto: palabras con dígitos que no son cantidad, paquete, voltaje, potencia ni capacidad
    //    («15» de iPhone 15, «s23», «27gn800», «13» de GSB 13 RE). Si ambos los tienen y no son iguales, es otro producto.
    // Las medidas se quitan del título original (con sus decimales: «1.5 kg» no deja un «1» suelto)
    const sinMedidas = normalizeText(rawTitle.replace(/\d+(?:[.,]\d+)*\s?(?:kg|kilos?|kilogramos?|gr|grs|gramos|g|ml|mls|mililitros?|lt|lts|litros?|l|fl\s*oz|oz|onzas?|lbs?|libras?|gb|tb|v|volts?|w|watts?|cm|mm|pulgadas?|"|”)(?![a-z])/gi, " "))
      .replace(/\b\d+\s?(?:gb|tb|v|volts?|w|watts?|pulgadas?|cm|mm|m)\b/g, " ")
      .replace(/\b\d{1,3}(?:\s\d{3})?\s?(?:kg|kilos?|kilogramos?|g|gr|grs|gramos|l|lt|lts|litros?|ml|mls|mililitros?|cc|lb|lbs|libras?|oz|onzas?)\b/g, " ")
      .replace(/\b\d+\s?(?:kg|g|gr|ml|l)\b/g, " ")
      .replace(/\b\d+\s*(?:pack|pk|latas|botellas|piezas|pzas|bultos|mangas|sobres|tarros|frascos|bolsas|unidades|paquetes|cajas|brocas|accesorios|x)\b/g, " ")
      .replace(/\b(?:pack|paquete|caja|kit|combo|c|x)\s*(?:de|con|x)?\s*\d+\b/g, " ")
      .replace(/\b(?:omega)\s*\d+(?:\s*y\s*\d+)?\b/g, " ");
    const codigos = Array.from(new Set(sinMedidas.split(/\s+/).filter((w) => /\d/.test(w) && !/^\d{5,}$/.test(w))));

    // K. Calificadores que separan modelos de una misma línea (Pro, Max, Ultra, FE…) o productos de una misma marca
    const QUALIFIERS = ["pro", "max", "plus", "ultra", "mini", "lite", "fe", "air", "neo", "prime", "biscuits", "snack", "galletas", "barra", "helado", "go"];
    const calificadores = QUALIFIERS.filter((q) => new RegExp(`\\b${q}\\b`).test(norm));

    return {
      rawTitle,
      norm,
      capacidad,
      codigos,
      calificadores,
      cantidad,
      paquete,
      paqueteTexto,
      voltaje,
      potencia,
      modelo,
      modeloCompacto,
      kit,
      variantes,
      palabrasClave: words
    };
  }

  // 4. Cálculo de Precio por Unidad (kg, L, pieza)
  function calculateUnitPrice(price, cantidad, paquete) {
    if (typeof price !== "number" || price <= 0) return null;
    paquete = paquete || 1;

    if (cantidad && cantidad.valor > 0) {
      if (cantidad.unidad === "g") {
        const totalGrams = cantidad.valor * paquete;
        const perKg = price / (totalGrams / 1000);
        return {
          unitPrice: Math.round(perKg * 100) / 100,
          unitLabel: "/kg",
          text: `$${perKg.toFixed(2)}/kg`
        };
      }
      if (cantidad.unidad === "ml") {
        const totalMl = cantidad.valor * paquete;
        const perL = price / (totalMl / 1000);
        return {
          unitPrice: Math.round(perL * 100) / 100,
          unitLabel: "/L",
          text: `$${perL.toFixed(2)}/L`
        };
      }
    }

    if (paquete > 1) {
      const perUnit = price / paquete;
      return {
        unitPrice: Math.round(perUnit * 100) / 100,
        unitLabel: "/pza",
        text: `$${perUnit.toFixed(2)}/pza`
      };
    }

    return null;
  }

  // 5. Comparación y Decisión pura
  // Retorna { type: 'same'|'similar'|'different', reason, label, difference, unitPrice }
  function classifyProductMatch(current, candidate, opts) {
    if (!current || !candidate) {
      return { type: "different", reason: "sin_datos" };
    }

    opts = opts || {};
    const currAttr = current._attr || extractAttributes(current.title || current.name || "", current);
    const candAttr = candidate._attr || extractAttributes(candidate.title || candidate.name || "", candidate);

    // 1. Accesorios / Refacciones descartados
    if (!isAccessoryOrSpare(currAttr.rawTitle) && isAccessoryOrSpare(candAttr.rawTitle)) {
      return { type: "different", reason: "accesorio", label: "Accesorio o refacción" };
    }

    // 2. Coincidencia estricta por GTIN / EAN / UPC
    const currGtin = QED.cleanGtin ? QED.cleanGtin(current.gtin) : (current.gtin || "");
    const candGtin = QED.cleanGtin ? QED.cleanGtin(candidate.gtin) : (candidate.gtin || "");
    const unitPrice = calculateUnitPrice(candidate.price, candAttr.cantidad, candAttr.paquete);

    if (currGtin && candGtin && currGtin === candGtin) {
      return { type: "same", reason: "gtin", matchBy: "gtin", unitPrice };
    }

    // 3. Verificación de Marca
    const currBrandNorm = normalizeText(current.brand || currAttr.rawTitle.split(/\s+/)[0] || "");
    const candBrandNorm = normalizeText(candidate.brand || "");
    const candTitleNorm = candAttr.norm;

    // Verificar si la marca coincide
    // Validación 2026-10-19: la marca se busca como palabra completa («lg» no está en «colgate») y
    // «tipo Nutella», «similar a…» o «compatible con…» es otra marca que imita, no la misma.
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const brandRe = currBrandNorm ? new RegExp(`(^|\\s)${esc(currBrandNorm)}(\\s|$)`) : null;
    let brandMatches = false;
    if (currBrandNorm) {
      // Marca declarada por la tienda (a veces es el fabricante: «Ferrero» para Nutella) o la marca como palabra del título
      brandMatches = brandRe.test(candTitleNorm) ||
        (!!candBrandNorm && (candBrandNorm === currBrandNorm || brandRe.test(candBrandNorm) || new RegExp(`(^|\\s)${esc(candBrandNorm)}(\\s|$)`).test(currBrandNorm)));
    }
    if (brandMatches && currBrandNorm && new RegExp(`\\b(?:tipo|estilo|similar a|como|parecid[oa] a|alternativa a|imitacion|compatible con|para)\\s+${esc(currBrandNorm)}\\b`).test(candTitleNorm)) {
      return { type: "different", reason: "imitacion", label: "Otra marca (imitación o compatible)" };
    }

    if (!brandMatches) {
      return { type: "different", reason: "marca_distinta", label: "Marca distinta" };
    }

    // Códigos del producto distintos (iPhone 15 vs 14, S23 vs S24, 27GN800 vs 27GL650): otro producto
    const cc = currAttr.codigos || [], ac = candAttr.codigos || [];
    if (cc.length && ac.length) {
      const setC = new Set(cc), setA = new Set(ac);
      const comunes = cc.filter((x) => setA.has(x)).length;
      if (comunes === 0) return { type: "different", reason: "codigo_distinto", label: `Modelo distinto: ${ac.join(" ")}` };
    }
    // Calificador presente en uno solo (Pro, Ultra, FE, Biscuits…): variante, nunca «mismo»
    const qc = currAttr.calificadores || [], qa = candAttr.calificadores || [];
    const qDiff = qa.filter((x) => !qc.includes(x)).concat(qc.filter((x) => !qa.includes(x)));
    if (qDiff.length) {
      const lbl = qa.filter((x) => !qc.includes(x)).length ? `Versión distinta: ${qa.filter((x) => !qc.includes(x)).join(" ")}` : "Versión distinta";
      return { type: "similar", reason: "variante", label: lbl, difference: lbl, unitPrice };
    }
    // Capacidad distinta (128 GB vs 256 GB)
    if (currAttr.capacidad && candAttr.capacidad && currAttr.capacidad.valor !== candAttr.capacidad.valor) {
      const lbl = `Otra capacidad: ${candAttr.capacidad.texto}`;
      return { type: "similar", reason: "otra_presentacion", label: lbl, difference: lbl, unitPrice };
    }
    if (currAttr.capacidad && !candAttr.capacidad && cc.length) {
      const lbl = "Capacidad no especificada";
      return { type: "similar", reason: "otra_presentacion", label: lbl, difference: lbl, unitPrice };
    }

    // 4. Choque de variantes biológicas / mascotas (ESPECIE, ETAPA, TALLA) -> DESCARTAR
    const cv = currAttr.variantes;
    const av = candAttr.variantes;

    if (cv.especie && av.especie && cv.especie !== av.especie) {
      return { type: "different", reason: "especie_choca", label: `Especie distinta: ${av.especie}` };
    }
    if (cv.etapa && av.etapa && cv.etapa !== av.etapa) {
      return { type: "different", reason: "etapa_choca", label: `Etapa distinta: ${av.etapa}` };
    }
    if (cv.talla_raza && av.talla_raza && cv.talla_raza !== av.talla_raza) {
      return { type: "different", reason: "talla_choca", label: `Talla distinta: ${av.talla_raza}` };
    }

    // 5. Comparación por Modelo (e.g. GSB 13 RE)
    const currModel = currAttr.modeloCompacto || compactModel(current.mpn || current.model);
    const candModel = candAttr.modeloCompacto || compactModel(candidate.mpn || candidate.model);

    if (currModel && currModel.length >= 3) {
      // Si ambos tienen modelo y no coinciden: DESCARTAR
      if (candModel && candModel !== currModel) {
        return { type: "different", reason: "modelo_distinto", label: `Modelo distinto: ${candAttr.modelo || candidate.model}` };
      }

      // Si el modelo candidato coincide o está exactamente delimitado en el título
      const modelInTitle = candAttr.norm.includes(currAttr.modelo.toLowerCase()) || candAttr.modeloCompacto === currModel;
      if (candModel === currModel || modelInTitle) {
        // Choque de Voltaje
        if (currAttr.voltaje && candAttr.voltaje && currAttr.voltaje.valor !== candAttr.voltaje.valor) {
          const voltDiff = `Otro voltaje: ${candAttr.voltaje.raw || candAttr.voltaje.valor}`;
          return { type: "similar", reason: "variante", label: voltDiff, difference: voltDiff, unitPrice };
        }

        // Choque de Kit (maletín / brocas / combo)
        const ck = currAttr.kit;
        const ak = candAttr.kit;
        if (ck.conMaletin || ck.brocas || ck.combo) {
          // Si el original tiene maletín y brocas
          if (ck.conMaletin && ck.brocas && (!ak.conMaletin && !ak.brocas)) {
            const kitDiff = "Sin maletín ni brocas";
            return { type: "similar", reason: "variante", label: kitDiff, difference: kitDiff, unitPrice };
          }
          if (ck.brocas && !ak.brocas) {
            const kitDiff = "Sin brocas";
            return { type: "similar", reason: "variante", label: kitDiff, difference: kitDiff, unitPrice };
          }
          if (ak.combo && !ck.combo) {
            const kitDiff = "Kit combo con herramientas adicionales";
            return { type: "similar", reason: "variante", label: kitDiff, difference: kitDiff, unitPrice };
          }
          if (ak.accesorios && ak.accesorios !== ck.accesorios && !ck.brocas) {
            const kitDiff = `Kit con ${ak.accesorios} accesorios`;
            return { type: "similar", reason: "variante", label: kitDiff, difference: kitDiff, unitPrice };
          }
        }

        // Mismo modelo sin choques de voltaje ni kit
        return { type: "same", reason: "model", matchBy: "model", unitPrice };
      }
    }

    // 6. Choque de Sabor / Tipo (e.g. Zero vs Regular, B-ready vs Nutella pura)
    if (cv.sabor_tipo && av.sabor_tipo && cv.sabor_tipo !== av.sabor_tipo) {
      const sabLabel = candAttr.variantes.sabor_tipo === "zero"
        ? `${current.brand || "Producto"} Zero`
        : (candAttr.variantes.sabor_tipo === "b_ready" ? `${current.brand || "Nutella"} B-ready` : `Variante: ${av.sabor_tipo}`);
      return { type: "similar", reason: "variante", label: sabLabel, difference: sabLabel, unitPrice };
    }
    // Si el original no es zero pero el candidato es zero
    if (!cv.sabor_tipo && av.sabor_tipo === "zero") {
      const sabLabel = `${current.brand || "Producto"} Zero`;
      return { type: "similar", reason: "variante", label: sabLabel, difference: sabLabel, unitPrice };
    }
    if (!cv.sabor_tipo && av.sabor_tipo === "light") {
      const sabLabel = `${current.brand || "Producto"} Light`;
      return { type: "similar", reason: "variante", label: sabLabel, difference: sabLabel, unitPrice };
    }
    if (!cv.sabor_tipo && av.sabor_tipo === "b_ready") {
      const sabLabel = `${current.brand || "Nutella"} B-ready`;
      return { type: "similar", reason: "variante", label: sabLabel, difference: sabLabel, unitPrice };
    }

    // Choque de fórmula (e.g. Indoor vs Sensible / Weight Control)
    if (cv.formula && av.formula && cv.formula !== av.formula) {
      const formName = av.formula === "light" ? "control de peso" : av.formula;
      const formLabel = `Fórmula distinta: ${formName}`;
      return { type: "similar", reason: "variante", label: formLabel, difference: formLabel, unitPrice };
    }
    if (!cv.formula && av.formula) {
      const formName = av.formula === "light" ? "control de peso" : av.formula;
      const formLabel = `Fórmula distinta: ${formName}`;
      return { type: "similar", reason: "variante", label: formLabel, difference: formLabel, unitPrice };
    }
    if (cv.formula && !av.formula) {
      const formLabel = "Fórmula regular / estándar";
      return { type: "similar", reason: "variante", label: formLabel, difference: formLabel, unitPrice };
    }

    // 7. Comparación de Cantidad y Paquete
    const cQ = currAttr.cantidad;
    const aQ = candAttr.cantidad;

    if (cQ && aQ) {
      const sameUnit = cQ.unidad === aQ.unidad;
      const diffRatio = sameUnit ? Math.abs(cQ.valor - aQ.valor) / cQ.valor : 1;
      const amountMatches = sameUnit && diffRatio <= 0.02; // ±2%

      // Diferencia de paquete (e.g. 1 lata vs 12 pack)
      if (currAttr.paquete !== candAttr.paquete) {
        const packDesc = candAttr.paquete > 1
          ? `${candAttr.paquete} × ${aQ.texto}`
          : `Presentación individual: ${aQ.texto}`;
        return {
          type: "similar",
          reason: "otra_presentacion",
          label: `Otra presentación: ${packDesc}`,
          difference: packDesc,
          unitPrice
        };
      }

      // Diferencia de cantidad unitaria (e.g. 1 kg vs 350 g, 5 kg vs 1.5 kg, 8 kg vs 2 kg)
      if (!amountMatches) {
        const diffDesc = `Otra presentación: ${aQ.texto}`;
        return {
          type: "similar",
          reason: "otra_presentacion",
          label: diffDesc,
          difference: diffDesc,
          unitPrice
        };
      }

      // Cantidad y paquete coinciden exactamente
      return { type: "same", reason: "brand_and_line", matchBy: "amount", unitPrice };
    } else if (cQ && !aQ) {
      // Solo el original tiene cantidad declarada: no es «mismo»
      return {
        type: "similar",
        reason: "otra_presentacion",
        label: "Presentación no especificada",
        difference: "Presentación no especificada",
        unitPrice
      };
    } else if (!cQ && aQ) {
      return {
        type: "similar",
        reason: "otra_presentacion",
        label: `Presentación: ${aQ.texto}`,
        difference: `Presentación: ${aQ.texto}`,
        unitPrice
      };
    }

    // Sin cantidad (electrónica, herramientas): los códigos del producto iguales y sin choques ya revisados → mismo
    if (cc.length && cc.every((x) => ac.includes(x))) {
      return { type: "same", reason: "codigo", matchBy: "codigo", unitPrice };
    }

    // Si ninguno tiene cantidad, revisar coincidencia de palabras clave
    const currKeys = currAttr.palabrasClave || [];
    if (currKeys.length > 0) {
      const candNorm = candAttr.norm;
      const matchingCount = currKeys.filter((k) => candNorm.includes(k)).length;
      const ratio = matchingCount / currKeys.length;
      if (ratio >= 0.6) {
        return { type: "same", reason: "brand_and_line", matchBy: "keywords", unitPrice };
      }
      if (matchingCount >= 1) {
        return { type: "similar", reason: "brand_core", label: "Producto parecido", unitPrice };
      }
    }

    return { type: "different", reason: "sin_coincidencia" };
  }

  // 6. Generación de Consultas de Búsqueda
  // Reglas:
  // 1. GTIN si existe
  // 2. Marca + modelo con sus espacios originales («Bosch GSB 13 RE»)
  // 3. Marca + 2-3 palabras de la línea + cantidad («Nutella 1 kg», «Coca-Cola 355 ml»,
  //    «Nupec felino adulto indoor 5 kg», «Nupec adulto razas pequeñas 8 kg»)
  function queryForCompare(product) {
    if (!product) return "";
    const gtin = QED.cleanGtin ? QED.cleanGtin(product.gtin) : (product.gtin || "");
    if (gtin) return gtin;

    const brand = String(product.brand || "").trim();
    const attr = product._attr || extractAttributes(product.title || "", product);

    if (attr.modelo) {
      const cleanM = cleanModelWithSpaces(attr.modelo);
      return brand ? `${brand} ${cleanM}`.trim() : cleanM;
    }

    // Armar consulta a partir de atributos clave
    const parts = [];
    if (brand) parts.push(brand);

    // Añadir variantes representativas (especie, etapa, talla, fórmula)
    const v = attr.variantes || {};
    if (v.especie === "gato" || v.especie === "felino") parts.push("felino");
    if (v.etapa === "adulto") parts.push("adulto");
    if (v.etapa === "cachorro") parts.push("cachorro");
    if (v.etapa === "kitten") parts.push("kitten");
    if (v.talla_raza === "pequenas") parts.push("razas pequeñas");
    if (v.talla_raza === "medianas") parts.push("razas medianas");
    if (v.talla_raza === "grandes") parts.push("razas grandes");
    if (v.formula === "indoor") parts.push("indoor");

    // Si no hay variantes, usar 2 o 3 palabras clave del título que no sean la marca
    const brandTokens = new Set(normalizeText(brand).split(/\s+/));
    const nonBrandKeywords = (attr.palabrasClave || []).filter((w) => !brandTokens.has(w));
    const codes = (attr.codigos || []).filter((c) => !normalizeText(brand).split(/\s+/).includes(c));
    if (parts.length <= 1 && nonBrandKeywords.length > 0) {
      // Con códigos (iPhone 15, Galaxy S23, 27GN800) van la primera palabra y los códigos; sin códigos, 2 palabras
      if (codes.length) parts.push(nonBrandKeywords[0], ...codes.filter((c) => c !== nonBrandKeywords[0]));
      else parts.push(...nonBrandKeywords.slice(0, 2));
    } else if (codes.length) {
      parts.push(...codes);
    }
    if (attr.capacidad && attr.capacidad.texto) parts.push(attr.capacidad.texto);

    // Añadir cantidad si existe
    if (attr.cantidad && attr.cantidad.texto) {
      parts.push(attr.cantidad.texto);
    }

    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  // Consulta de respaldo sin cantidad (máximo 2 consultas por tienda y por producto)
  function queryForCompareFallback(product) {
    if (!product) return "";
    const fullQ = queryForCompare(product);
    const attr = product._attr || extractAttributes(product.title || "", product);
    if (attr.cantidad && attr.cantidad.texto) {
      const stripped = fullQ.replace(new RegExp(`\\s*${attr.cantidad.texto}\\b`, "i"), "").trim();
      if (stripped && stripped !== fullQ) return stripped;
    }
    return fullQ;
  }

  // Exportar en Semejanza y en QED
  Semejanza.normalizeText = normalizeText;
  Semejanza.cleanModelWithSpaces = cleanModelWithSpaces;
  Semejanza.compactModel = compactModel;
  Semejanza.extractAttributes = extractAttributes;
  Semejanza.calculateUnitPrice = calculateUnitPrice;
  Semejanza.isAccessoryOrSpare = isAccessoryOrSpare;
  Semejanza.classifyProductMatch = classifyProductMatch;
  Semejanza.queryForCompare = queryForCompare;
  Semejanza.queryForCompareFallback = queryForCompareFallback;

  // Integrar en QED para compatibilidad directa
  QED.normalizeText = normalizeText;
  QED.extractAttributes = extractAttributes;
  QED.calculateUnitPrice = calculateUnitPrice;
  QED.classifyProductMatch = classifyProductMatch;
  QED.queryForCompare = queryForCompare;
  QED.queryForCompareFallback = queryForCompareFallback;
})(typeof globalThis !== "undefined" ? globalThis : this);
