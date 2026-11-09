// SPDX-License-Identifier: MIT
// Gina — Avisos del producto en Confiabilidad.
// Solo se activa cuando el clasificador por capas tiene confianza «alta».
// Regla de oro: Gina no evalúa salud ni eficiencia. Solo muestra:
//   (a) lo que dice la página («según la página»);
//   (b) acciones de una autoridad (prohibición, restricción, advertencia obligatoria,
//       retiro, certificación oficial), cada una con URL oficial.
// Cero palabras de alarma o juicio: nunca «dañino», «tóxico», «cancerígeno» ni «peligroso para la salud».
(function (root) {
  const QED = (root.QED = root.QED || {});

  const FOOD_CATS = new Set([
    "lacteos", "bebidas", "cerveza", "cafe", "chocolate_dulces",
    "botanas_galletas", "abarrotes", "panaderia_harinas", "mascotas"
  ]);

  const APPLIANCE_CATS = new Set([
    "electrodomesticos_cocina", "electrodomesticos_clima", "audio_electronica",
    "tecnologia_3d", "herramientas"
  ]);

  const VOLTAGE_120_COUNTRIES = new Set([
    "méxico", "mexico", "ee.uu.", "us", "usa", "canadá", "canada",
    "japón", "japan", "colombia"
  ]);

  const VOLTAGE_230_COUNTRIES = new Set([
    "españa", "spain", "francia", "france", "alemania", "germany",
    "italia", "italy", "reino unido", "uk", "argentina", "chile",
    "uruguay", "ue", "eu"
  ]);

  const EU_COUNTRIES = new Set([
    "españa", "spain", "francia", "france", "alemania", "germany",
    "italia", "italy", "ue", "eu", "portugal", "países bajos", "bélgica",
    "austria", "irlanda", "suecia", "dinamarca", "finlandia", "polonia"
  ]);

  const NOM051_STAMPS = [
    { id: "azucares", re: /\bexceso\s+az[uú]cares\b/i, label: "Exceso azúcares" },
    { id: "calorias", re: /\bexceso\s+calor[ií]as\b/i, label: "Exceso calorías" },
    { id: "sodio", re: /\bexceso\s+sodio\b/i, label: "Exceso sodio" },
    { id: "grasas_sat", re: /\bexceso\s+grasas\s+saturadas\b/i, label: "Exceso grasas saturadas" },
    { id: "grasas_trans", re: /\bexceso\s+grasas\s+trans\b/i, label: "Exceso grasas trans" },
    { id: "edulcorantes", re: /\bcontiene\s+edulcorantes(?:\s*-\s*evitar\s+en\s+ni[ñn]os)?\b/i, label: "Contiene edulcorantes" },
    { id: "cafeina", re: /\bcontiene\s+cafe[ií]na(?:\s*-\s*evitar\s+en\s+ni[ñn]os)?\b/i, label: "Contiene cafeína" }
  ];

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

  function evaluateProductNotices(params) {
    params = params || {};
    const cat = params.category;
    const catConf = params.categoryConfidence || "ninguna";

    // Regla estricta: va DESPUÉS del clasificador por capas; solo se activa con confianza "alta"
    if (catConf !== "alta" || !cat) {
      return [];
    }

    const title = String(params.title || "").trim();
    const specsText = String(params.specsText || "").trim();
    const textPool = (title + " " + specsText).trim();
    const textLower = textPool.toLowerCase();
    const country = String(params.storeCountry || "México").trim().toLowerCase();
    const brand = String(params.brand || params.brandName || "").trim();
    const brandGroup = params.brandGroup || params.group || null;
    const aditivosDb = params.aditivosDb || params.aditivos || (QED.DB && QED.DB.aditivos) || [];
    const alertasDb = params.alertasDb || params.alertas || (QED.DB && QED.DB.alertas) || [];
    const estudiosDb = params.estudiosCalidadDb || params.estudios_calidad || (QED.DB && QED.DB.estudios_calidad) || [];
    const lang = (QED.I18N && QED.I18N.getLang ? QED.I18N.getLang() : "es") || "es";
    const t = (k, o) => (QED.I18N && QED.I18N.t ? QED.I18N.t(k, o) : k);

    const notices = [];

    // ---------------------------------------------------------------- 1. ALIMENTOS
    if (FOOD_CATS.has(cat)) {
      // 1a. Sellos NOM-051 del texto de la ficha
      const foundStamps = [];
      for (const st of NOM051_STAMPS) {
        if (st.re.test(textPool)) {
          foundStamps.push(st.label);
        }
      }
      if (foundStamps.length > 0) {
        notices.push({
          tipo: "info",
          categoria: "alimentos",
          titulo: t("lbl_nom051_title") || "Sellos NOM-051",
          texto: `Sellos NOM-051 según la página: ${foundStamps.join(", ")}`,
          origen: t("src_page") || "según la página"
        });
      }

      // 1b. Aditivos con acción regulatoria (FDA, UE)
      if (Array.isArray(aditivosDb)) {
        for (const ad of aditivosDb) {
          const namesInLang = (ad.nombres && ad.nombres[lang]) || (ad.nombres && ad.nombres.es) || [];
          const allNames = Array.from(new Set([
            ad.codigo,
            ad.e_number,
            ad.ins,
            ...namesInLang,
            ...(ad.nombres ? Object.values(ad.nombres).flat() : [])
          ])).filter(Boolean);

          let matchedName = null;
          for (const nm of allNames) {
            if (!nm || nm.length < 2) continue;
            const escNm = nm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
            const re = new RegExp(`(^|[^a-záéíóúñ0-9])${escNm}([^a-záéíóúñ0-9]|$)`, "i");
            if (re.test(textPool)) {
              matchedName = ad.codigo || nm;
              break;
            }
          }

          if (matchedName) {
            const isBanned = ad.accion === "prohibido";
            const actionVerb = isBanned ? "lo prohibió" : "exige advertencia";
            const juris = ad.jurisdiccion || "";
            const fechaStr = ad.fecha ? ` (${ad.fecha})` : "";
            const aut = ad.autoridad || "Autoridad sanitaria";
            const noticeText = `Contiene ${matchedName}: ${aut} ${actionVerb} en ${juris}${fechaStr}`;

            notices.push({
              tipo: "oficial",
              categoria: "aditivos",
              titulo: `Acción regulatoria: ${matchedName}`,
              texto: noticeText,
              url: ad.url_oficial,
              autoridad: aut,
              origen: `Dato oficial: <a href="${ad.url_oficial}" target="_blank" rel="noopener noreferrer">${aut}</a>`
            });
          }
        }
      }
    }

    // ---------------------------------------------------------------- 2. ELECTRODOMÉSTICOS
    if (APPLIANCE_CATS.has(cat)) {
      // 2a. Consumo kWh/año
      const mCons = textPool.match(/(?:consumo(?:\s+el[eé]ctrico|\s+energ[eé]tico)?\s*[:：]?\s*)?(\d+(?:[.,]\d+)?\s*kwh\s*(?:\/|\s*por\s*|\s*al\s*)a[ñn]o|\d+(?:[.,]\d+)?\s*kwh\s*(?:\/|\s*per\s*)year)/i);
      if (mCons) {
        notices.push({
          tipo: "info",
          categoria: "energia",
          titulo: "Consumo energético",
          texto: `Consumo ${mCons[1]} según la página`,
          origen: t("src_page") || "según la página"
        });
      }

      // 2b. Clase energética
      const mClass = textPool.match(/(?:clase|etiqueta|eficiencia)\s+energ[eé]tica\s*[:：]?\s*([A-G](?:\+{1,3})?)\b|(?:energy\s+class|energy\s+efficiency\s+rating)\s*[:：]?\s*([A-G](?:\+{1,3})?)\b/i);
      if (mClass) {
        const cl = (mClass[1] || mClass[2]).toUpperCase();
        notices.push({
          tipo: "info",
          categoria: "energia",
          titulo: "Clase energética",
          texto: `Clase energética ${cl} según la página`,
          origen: t("src_page") || "según la página"
        });
      }

      // 2c. Etiqueta NOM-ENER
      const mNom = textPool.match(/\b(NOM-\d{3}-ENER(?:[/-]\d{4})?)\b/i);
      if (mNom) {
        notices.push({
          tipo: "info",
          categoria: "normas",
          titulo: "Norma de eficiencia",
          texto: `Etiqueta ${mNom[1].toUpperCase()} según la página`,
          origen: t("src_page") || "según la página"
        });
      }

      // 2d. ENERGY STAR
      if (/\bENERGY\s+STAR\b/i.test(textPool)) {
        notices.push({
          tipo: "info",
          categoria: "energia",
          titulo: "Certificación ENERGY STAR",
          texto: "ENERGY STAR mencionado en la página",
          origen: t("src_page") || "según la página"
        });
      }
    }

    // ---------------------------------------------------------------- 3. CELULARES (UE)
    if (cat === "audio_electronica" && EU_COUNTRIES.has(country)) {
      const mRep = textPool.match(/(?:[ií]ndice\s+de\s+reparabilidad|indice\s+de\s+r[eé]parabilit[eé]|reparaturindex|repairability\s+index)\s*[:：]?\s*(\d+(?:[.,]\d+)?(?:\s*\/\s*10)?)/i);
      if (mRep) {
        notices.push({
          tipo: "info",
          categoria: "reparabilidad",
          titulo: "Índice de reparabilidad",
          texto: `Índice de reparabilidad: ${mRep[1]} (según la página)`,
          origen: t("src_page") || "según la página"
        });
      }
    }

    // ---------------------------------------------------------------- 4. COMPRA INTERNACIONAL (VOLTAJE)
    if (APPLIANCE_CATS.has(cat)) {
      if (VOLTAGE_120_COUNTRIES.has(country)) {
        if (/\b220\s*v\b|\b230\s*v\b|\b240\s*v\b/i.test(textPool)) {
          notices.push({
            tipo: "info",
            categoria: "voltaje",
            titulo: "Compatibilidad de voltaje",
            texto: "Voltaje 220 V según la página: revisa la compatibilidad",
            origen: t("src_page") || "según la página"
          });
        }
      } else if (VOLTAGE_230_COUNTRIES.has(country)) {
        if (/\b110\s*v\b|\b120\s*v\b/i.test(textPool)) {
          notices.push({
            tipo: "info",
            categoria: "voltaje",
            titulo: "Compatibilidad de voltaje",
            texto: "Voltaje 110 V según la página: revisa la compatibilidad",
            origen: t("src_page") || "según la página"
          });
        }
      }
    }

    // ---------------------------------------------------------------- 5. RETIROS Y ALERTAS (COFEPRIS, PROFECO)
    if (Array.isArray(alertasDb)) {
      const brandLower = brand.toLowerCase();
      const gid = brandGroup && (brandGroup.id || brandGroup.g);

      for (const al of alertasDb) {
        const alMarca = String(al.marca || "").toLowerCase();
        const matchesBrand = (alMarca && brandLower === alMarca) || (gid && al.grupo === gid);

        if (matchesBrand) {
          const modLower = String(al.modelo || "").trim().toLowerCase();
          const loteLower = String(al.lote || "").trim().toLowerCase();
          const matchesSpecific = (modLower && textLower.includes(modLower)) || (loteLower && textLower.includes(loteLower));

          if (matchesSpecific) {
            notices.push({
              tipo: "oficial",
              categoria: "alerta",
              titulo: `Alerta sanitaria (${al.autoridad})`,
              texto: `Alerta sanitaria (${al.autoridad}): ${al.titulo}`,
              url: al.url,
              autoridad: al.autoridad,
              origen: `Dato oficial: <a href="${al.url}" target="_blank" rel="noopener noreferrer">${al.autoridad}</a>`
            });
          } else {
            // Regla estricta: si solo coincide la marca → "Hay alertas de esta marca" con enlace, sin afirmar que es este producto
            notices.push({
              tipo: "oficial",
              categoria: "alerta",
              titulo: `Alerta sanitaria (${al.autoridad})`,
              texto: `Hay alertas de esta marca (${al.autoridad})`,
              url: al.url,
              autoridad: al.autoridad,
              origen: `Dato oficial: <a href="${al.url}" target="_blank" rel="noopener noreferrer">${al.autoridad}</a>`
            });
          }
        }
      }
    }

    // ---------------------------------------------------------------- 6. ESTUDIOS DE CALIDAD Y GRADOS OFICIALES (PROFECO, USDA, MAPA)
    if (Array.isArray(estudiosDb) && estudiosDb.length > 0) {
      const cNorm = country.replace(/[.,]/g, "").trim();
      const brandNorm = normalizeText(brand);
      const titleNorm = normalizeText(title);
      const textPoolNorm = normalizeText(textPool);
      const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      for (const study of estudiosDb) {
        // Validación 2026-11-09: un estudio solo se muestra si alguien lo comprobó contra el documento oficial
        // («verificado» con fecha) y trae la URL del estudio concreto («url_estudio»), no la portada de la institución.
        // Son juicios de calidad sobre marcas reales: sin eso, nada se muestra.
        if (!study || !study.verificado || !/^https:\/\//.test(String(study.url_estudio || ""))) continue;
        // Validación geográfica estricta: solo tiendas del país correspondiente
        const studyCountries = (study.paises_tienda || [study.pais || ""]).map(p => String(p).toLowerCase().replace(/[.,]/g, "").trim());
        const matchesCountry = studyCountries.some(sc => cNorm === sc || cNorm.includes(sc) || sc.includes(cNorm));
        if (!matchesCountry) continue;

        // Comprobación de categoría si aplica
        if (study.categoria && study.categoria !== "alimentos" && cat !== study.categoria) {
          const isBothFood = FOOD_CATS.has(cat) && (study.categoria === "abarrotes" || study.categoria === "lacteos" || study.categoria === "mascotas");
          if (!isBothFood) continue;
        }

        for (const item of (study.items || [])) {
          const itemMarca = String(item.marca || "").trim();
          if (!itemMarca) continue;
          const itemMarcaNorm = normalizeText(itemMarca);

          // I2 Candado 1 y 2: Quitar coincidencia por grupo. Solo coincide con la marca evaluada,
          // usando palabra completa (misma normalización y regla que semejanza.js).
          const wordRe = new RegExp(`(^|\\s)${escRe(itemMarcaNorm)}(\\s|$)`);
          const matchesBrand = (brandNorm && (brandNorm === itemMarcaNorm || wordRe.test(brandNorm))) ||
                               (!brandNorm && wordRe.test(titleNorm));
          if (!matchesBrand) continue;

          // I2 Candado 3: Exigir que el producto sea del tipo estudiado mediante keywords
          // (keywords del item o del estudio). Si no coinciden, no se aplica el estudio.
          const studyKws = Array.isArray(study.keywords) ? study.keywords : [];
          const itemKws = Array.isArray(item.keywords) ? item.keywords : [];
          const allKeywords = itemKws.length > 0 ? itemKws : studyKws;

          if (allKeywords.length === 0) {
            continue;
          }

          const matchesKeywords = allKeywords.some(kw => {
            const kwNorm = normalizeText(kw);
            if (!kwNorm) return false;
            const kwRe = new RegExp(`(^|\\s)${escRe(kwNorm)}(\\s|$)`);
            return kwRe.test(textPoolNorm);
          });
          if (!matchesKeywords) continue;

          const aut = study.autoridad || "Autoridad oficial";
          const sub = study.subcategoria ? ` (${study.subcategoria})` : "";
          let resType = item.resultado || "informativo";
          const anio = String(study.fecha || "").split("-")[0];

          let noticeTitle = `Estudio de calidad (${aut}): ${item.grado}`;
          let noticeText = `${aut}${sub}: ${item.grado} · ${item.veredicto}`;

          // I2 Candado 4: Estudios de más de 3 años (antiguedad: true) pasan de advertencia
          // a informativo y muestran el año a la vista («Estudio PROFECO de 2019: puede haber cambiado»).
          if (study.antiguedad) {
            if (resType === "advertencia") {
              resType = "informativo";
            }
            const agedNotice = t("lbl_quality_aged", { autoridad: aut, anio: anio }) || `Estudio ${aut} de ${anio}: puede haber cambiado`;
            noticeTitle = `${agedNotice}: ${item.grado}`;
            noticeText = `${agedNotice} · ${item.grado} · ${item.veredicto}`;
          }

          const estudioUrl = study.url_estudio || study.url;
          notices.push({
            tipo: "oficial",
            categoria: "calidad",
            resultado: resType,
            autoridad: aut,
            antiguedad: !!study.antiguedad,
            anio: anio,
            titulo: noticeTitle,
            texto: noticeText,
            grado: item.grado,
            veredicto: item.veredicto,
            url: estudioUrl,
            origen: `Estudio oficial: <a href="${estudioUrl}" target="_blank" rel="noopener noreferrer">${study.fuente || aut}</a>`
          });
          break; // Máximo 1 aviso de calidad por estudio
        }
      }
    }

    // ---------------------------------------------------------------- Ordenar y Limitar
    // Los avisos de calidad primero, luego alertas sanitarias, luego oficiales, luego informativos.
    notices.sort((a, b) => {
      if (a.categoria === "calidad" && b.categoria !== "calidad") return -1;
      if (a.categoria !== "calidad" && b.categoria === "calidad") return 1;
      if (a.tipo === "oficial" && b.tipo !== "oficial") return -1;
      if (a.tipo !== "oficial" && b.tipo === "oficial") return 1;
      return 0;
    });

    return notices.slice(0, 3);
  }

  QED.FOOD_CATS = FOOD_CATS;
  QED.APPLIANCE_CATS = APPLIANCE_CATS;
  QED.evaluateProductNotices = evaluateProductNotices;
})(typeof globalThis !== "undefined" ? globalThis : this);
