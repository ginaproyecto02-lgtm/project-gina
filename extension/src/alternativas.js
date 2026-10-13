// SPDX-License-Identifier: MIT
// Alternativas locales: para el tipo de producto que se ve, marcas de la base cuyo dueño es una cooperativa,
// sus empleados, un fideicomiso, una familia o su fundador, con capital del país de la tienda.
// Solo usa datos de propiedad de la base (con fuente); no evalúa calidad ni precio.
(function (root) {
  const QED = (root.QED = root.QED || {});

  const INDEP = {
    "Cooperativa": { label: "Cooperativa", prio: 4 },
    "Empleados": { label: "De sus empleados", prio: 4 },
    "Fideicomiso": { label: "Controlada por un fideicomiso", prio: 3 },
    "Familia": { label: "Empresa familiar", prio: 2 },
    "Fundador": { label: "De su fundador", prio: 2 },
    "Privada": { label: "Privada independiente", prio: 2 },
    "Hard discount": { label: "Cadena de descuento", prio: 1 },
    "Marca propia": { label: "Marca propia de tienda", prio: 1 },
    "Familia + fondos": { label: "Familiar (con fondos minoritarios)", prio: 0 },
    "Fundador + fondos": { label: "De su fundador (con fondos)", prio: 0 }
  };
  const GENTILICIO = {
    "México": "mexicano", "EE.UU.": "estadounidense", "Canadá": "canadiense", "Brasil": "brasileño", "Argentina": "argentino", "Chile": "chileno",
    "Reino Unido": "británico", "Alemania": "alemán", "Francia": "francés", "España": "español", "Italia": "italiano", "China": "chino",
    "Japón": "japonés", "Corea del Sur": "coreano", "Singapur": "singapurense", "Israel": "israelí", "India": "indio", "Colombia": "colombiano"
  };

  const SHORT_KW_WHITELIST = new Set(["tv", "pla", "petg", "fps", "spf", "pan", "cat", "dog", "rod", "gel"]);
  const MULTICAT_GROUPS = new Set(["philips", "samsung", "lg", "nestle", "pg", "unilever", "ge", "whirlpool", "sony", "xiaomi", "3m", "haier", "midea", "danone", "coca", "pepsico", "kraftheinz"]);

  // «Otros (Japón)» → ["Japón"]; «EE.UU. / México» → ["EE.UU.", "México"]
  function countries(pais) {
    return String(pais || "").split("/").map((p) => p.trim().replace(/^Otros\s*\((.*)\)$/i, "$1").trim()).filter(Boolean);
  }

  function makeCategoryResult(cat, subcat, confianza, motivo) {
    return {
      cat: cat || null,
      subcat: subcat || null,
      confianza: confianza || "ninguna",
      motivo: motivo || "",
      toString() { return this.cat || ""; },
      valueOf() { return this.cat || ""; }
    };
  }

  // Prepara índices una vez por base: marca → categoría y palabras clave normalizadas.
  function prepare(db, index) {
    const cats = (db && db.categorias) || {};
    const storeCats = (db && db.categorias_tienda) || {};
    const byBrand = new Map();
    const brandCatMap = new Map();
    const kws = [];

    for (const [id, c] of Object.entries(cats)) {
      for (const m of c.marcas || []) {
        const nm = QED.norm(m);
        byBrand.set(nm, id);
        if (!brandCatMap.has(nm)) brandCatMap.set(nm, new Set());
        brandCatMap.get(nm).add(id);
      }
      for (const k of c.kw || []) {
        const nk = QED.norm(k);
        if (!nk) continue;
        if (nk.length < 4 && !SHORT_KW_WHITELIST.has(nk)) continue;
        kws.push({ id, re: QED.keyRegex(nk), len: nk.length, kw: nk });
      }
    }
    kws.sort((a, b) => b.len - a.len);

    // C4: Solo marcas que pertenecen a una única categoría y no son conglomerados gigantes deciden la categoría
    const singleCategoryBrands = new Map();
    for (const [nm, catSet] of brandCatMap.entries()) {
      if (catSet.size === 1) {
        const catId = Array.from(catSet)[0];
        const e = index && index.exact && index.exact.get(nm);
        if (e && MULTICAT_GROUPS.has(e.g)) continue;
        singleCategoryBrands.set(nm, catId);
      }
    }

    return { cats, storeCats, byBrand, singleCategoryBrands, kws, index, db };
  }

  // Clasificador por capas: devuelve { cat, subcat, confianza: "alta"|"media"|"ninguna", motivo }
  function category(prep, brand, title, categoryPath) {
    if (!prep) return makeCategoryResult(null, null, "ninguna", "Sin base de datos");

    // ══ C1. Categoría de la tienda (la señal más fuerte) ══
    if (categoryPath) {
      const pStr = Array.isArray(categoryPath) ? categoryPath.join(" > ") : String(categoryPath || "");
      const pNorm = QED.norm(pStr);
      if (pNorm) {
        const storeEntries = Object.entries(prep.storeCats || {});
        for (const [patron, target] of storeEntries) {
          const parts = patron.split("|").map((p) => QED.norm(p.trim())).filter(Boolean);
          const matched = parts.some((p) => p && pNorm.includes(p));
          if (matched) {
            if (target === null) {
              // Categoría explícitamente no cubierta (p. ej. accesorios para celulares) → no seguir a otras capas
              return makeCategoryResult(null, null, "ninguna", `Categoría de tienda no cubierta por Gina (${patron})`);
            }
            const cat = typeof target === "string" ? target : target.cat;
            const subcat = typeof target === "object" ? target.subcat : null;
            return makeCategoryResult(cat, subcat, "alta", "Categoría de la tienda (breadcrumb)");
          }
        }
      }
    }

    // ══ C2. Núcleo del título (qué ES el producto) ══
    const tRaw = String(title || "");
    const tNorm = QED.norm(tRaw);
    const CONNECTOR_RE = /\s+(?:para(?!\s+(?:ropa|trastes|lavavajillas|perros?|gatos?|mascotas?|viaje)\b)|for(?!\s+(?:laundry|dishes|dogs?|cats?|pets?|travel)\b)|compatible con|compatible with|con aroma|con sabor|sabor a|sabor|aroma a|con olor a|tipo|estilo)\s+/i;
    let core = tNorm;
    const mConn = tNorm.match(CONNECTOR_RE);
    if (mConn) {
      core = tNorm.slice(0, mConn.index).trim();
    }
    const corePadded = " " + core + " ";
    const fullPadded = " " + tNorm + " ";

    // ══ C3. Exclusiones semánticas y palabras clave estrictas ══
    const isSkinOrFace = /\b(piel|facial|rostro|cutis|ojos|dermatol|dermocosmet|skincare|serum|suero|bloqueador|solar|niacinamid|ceramida|hialuronico|hidratante|antiarrugas|antiedad|antimanchas|acne|poros)\b/i.test(fullPadded);
    const isHouseholdClean = /\b(lavatrastes|lavavajillas|ropa|pisos|banos|inodoro|suavizante|trastes|multiusos|lavanderia)\b/i.test(fullPadded);
    const isDairySkinDisqualifier = /\b(corporal|limpiadora|piel|facial|rostro|cabello|shampoo|jabon|crema corporal|locion corporal)\b/i.test(fullPadded);

    const excludedCats = new Set();
    if (isSkinOrFace) excludedCats.add("limpieza");
    if (isHouseholdClean) excludedCats.add("skincare_cosmetica");
    if (isDairySkinDisqualifier) excludedCats.add("lacteos");

    for (const [id, c] of Object.entries(prep.cats)) {
      const exclList = c.excluye || [];
      for (const ex of exclList) {
        const nex = QED.norm(ex);
        if (nex && fullPadded.includes(nex)) {
          excludedCats.add(id);
          break;
        }
      }
    }

    const scores = new Map();
    for (const k of prep.kws) {
      if (excludedCats.has(k.id)) continue;
      if (k.re.test(corePadded)) {
        const baseWeight = k.len >= 10 ? k.len * 2 : k.len;
        const weight = baseWeight * 3; // Coincidencia en el núcleo: peso x3
        scores.set(k.id, (scores.get(k.id) || 0) + weight);
      }
      // Después del corte conector: peso 0 (no puntúa)
    }

    if (scores.size) {
      const sorted = Array.from(scores.entries()).sort((x, y) => y[1] - x[1]);
      const topCat = sorted[0][0];
      const topScore = sorted[0][1];
      const runnerUpScore = sorted.length > 1 ? sorted[1][1] : 0;
      const confianza = (runnerUpScore === 0 || topScore >= runnerUpScore * 2) ? "alta" : "media";

      // Subcategoría de dos niveles dentro de la ganadora
      let bestSubcat = null;
      const catObj = prep.cats[topCat];
      if (catObj && catObj.subcats) {
        let maxSubScore = 0;
        for (const [subId, subData] of Object.entries(catObj.subcats)) {
          let subScore = 0;
          for (const sk of (subData.kw || [])) {
            const nsk = QED.norm(sk);
            if (nsk && fullPadded.includes(nsk)) {
              subScore += nsk.length;
            }
          }
          if (subScore > maxSubScore) {
            maxSubScore = subScore;
            bestSubcat = subId;
          }
        }
      }
      return makeCategoryResult(topCat, bestSubcat, confianza, `Núcleo del título (${confianza})`);
    }

    // ══ C4. Marca monomarca (solo si la marca pertenece a una sola categoría) ══
    const b = QED.norm(brand || "");
    if (b && prep.singleCategoryBrands.has(b)) {
      const cat = prep.singleCategoryBrands.get(b);
      return makeCategoryResult(cat, null, "media", "Marca monomarca");
    }

    // ══ C5. Sin coincidencia ══
    return makeCategoryResult(null, null, "ninguna", "No identificamos el tipo de producto");
  }

  // Alternativas para una categoría/subcategoría en el país de la tienda, sin el grupo actual.
  function suggest(prep, catId, pais, currentGid, values, limit, title, subcatId) {
    if (!prep || !catId || !pais || pais === "Global") return [];
    const cat = prep.cats[catId];
    if (!cat) return [];

    let brandList = cat.marcas || [];
    if (subcatId && cat.subcats && cat.subcats[subcatId]) {
      brandList = cat.subcats[subcatId].marcas || [];
    }

    const normTitle = QED.norm(title || "");
    const byGroup = new Map();
    for (const m of brandList) {
      const e = prep.index.exact.get(QED.norm(m));
      if (!e || e.custom || e.verified) continue;
      const g = prep.index.groups[e.g];
      if (!g || e.g === currentGid || !INDEP[g.tipo]) continue;
      if (!countries(g.pais).includes(pais)) continue;
      const cur = byGroup.get(e.g) || { gid: e.g, group: g, marcas: [] };
      if (!cur.marcas.includes(e.n)) cur.marcas.push(e.n);
      byGroup.set(e.g, cur);
    }

    const out = Array.from(byGroup.values()).map((a) => {
      const sc = a.group.rep && QED.REP ? QED.REP.score(a.group.rep, values) : null;
      const repVal = sc && !sc.parcial ? (values ? sc.personal : sc.indice) : null;

      if (normTitle && a.marcas.length > 1) {
        a.marcas.sort((m1, m2) => {
          const score1 = normTitle.split(" ").filter((w) => w.length >= 4 && QED.norm(m1).includes(w)).length;
          const score2 = normTitle.split(" ").filter((w) => w.length >= 4 && QED.norm(m2).includes(w)).length;
          return score2 - score1;
        });
      }
      a.marcas = a.marcas.slice(0, 3);

      return Object.assign(a, {
        motivo: INDEP[a.group.tipo].label, prio: INDEP[a.group.tipo].prio, rep: repVal, nivel: sc && !sc.parcial ? sc.nivel : "",
        capital: GENTILICIO[pais] ? `capital ${GENTILICIO[pais]}` : `capital de ${pais}`,
        esEconomica: !!(a.group && a.group.ahorro_fuente && /^https?:\/\//i.test(a.group.ahorro_fuente))
      });
    });

    out.sort((x, y) => y.prio - x.prio || (y.rep == null ? 80 : y.rep) - (x.rep == null ? 80 : x.rep) || x.marcas[0].localeCompare(y.marcas[0]));
    return out.slice(0, limit || 5);
  }

  // Otras marcas del mismo dueño en brands.json (máximo limit, por defecto 6), excluyendo la marca actual y alias
  function otherBrandsOfSameOwner(dbOrPrep, groupGid, currentBrand, limit) {
    const db = (dbOrPrep && dbOrPrep.db) ? dbOrPrep.db : dbOrPrep;
    if (!db || !db.marcas || !groupGid) return [];
    const curNorm = QED.norm(currentBrand || "");
    const seen = new Set();
    const result = [];
    const max = limit || 6;
    for (const m of db.marcas) {
      if (m.g === groupGid) {
        const nm = (m.n || "").trim();
        const nNorm = QED.norm(nm);
        if (!nNorm || nNorm === curNorm) continue;
        // Colapsar alias
        const isAlias = Array.from(seen).some((s) => s.startsWith(nNorm) || nNorm.startsWith(s));
        if (isAlias) continue;
        seen.add(nNorm);
        result.push(nm);
        if (result.length >= max) break;
      }
    }
    return result;
  }

  // Otras marcas de este tipo en la base: agrupadas por DUEÑO, excluyendo grupo actual y sin fuentes válidas
  function categoryDominantBrands(prep, catId, limit, currentGid, subcatId) {
    if (!prep || !catId || !prep.cats || !prep.cats[catId]) return [];
    const cat = prep.cats[catId];

    let brandList = cat.marcas || [];
    if (subcatId && cat.subcats && cat.subcats[subcatId]) {
      brandList = cat.subcats[subcatId].marcas || [];
    }

    const byOwner = new Map();
    let idx = 0;
    for (const m of brandList) {
      idx++;
      const e = prep.index && prep.index.exact && prep.index.exact.get(QED.norm(m));
      if (!e) continue;
      const g = prep.index && prep.index.groups && prep.index.groups[e.g];
      if (!g) continue;
      if (currentGid && e.g === currentGid) continue; // Excluir dueño del producto actual
      if (!g.url || g.fuente === "Conocimiento del modelo") continue; // Excluir sin URL o sin fuente real

      if (!byOwner.has(e.g)) {
        byOwner.set(e.g, {
          gid: e.g,
          empresa: g.empresa || e.n,
          marcas: [],
          controlador: g.controlador || "",
          tipo: g.tipo || "",
          pais: g.pais || "",
          fuente: g.fuente || "",
          url: g.url || "",
          minOrder: idx
        });
      }
      const rec = byOwner.get(e.g);
      const nm = e.n.trim();
      const nNorm = QED.norm(nm);
      // Colapsar alias del mismo grupo (Penn = Penn Fishing)
      const isAlias = rec.marcas.some((existing) => {
        const exNorm = QED.norm(existing);
        return exNorm.startsWith(nNorm) || nNorm.startsWith(exNorm);
      });
      if (!isAlias && !rec.marcas.includes(nm)) {
        rec.marcas.push(nm);
      }
    }

    // Regla: si una subcategoría queda con menos de 2 grupos distintos con fuente, no se muestra
    if (byOwner.size < 2) return [];

    const out = Array.from(byOwner.values());
    // Ordenar por número de marcas en la subcategoría y luego por orden de aparición
    out.sort((a, b) => b.marcas.length - a.marcas.length || a.minOrder - b.minOrder || a.empresa.localeCompare(b.empresa));
    return out.slice(0, limit || 4);
  }

  // Enlace para sugerir al proyecto marcas faltantes o alternativas locales:
  const clean = (v, n) => String(v == null ? "" : v).replace(/[|\n\r]+/g, " ").replace(/\s+/g, " ").trim().slice(0, n || 120);
  function suggestionLink(proj, tipo, items) {
    proj = proj || {};
    const lines = (items || []).slice(0, 40).map((it) => tipo === "alternativa"
      ? `- alternativa: ${clean(it.marca, 80)} | categoría: ${clean(it.categoria, 40)} | país: ${clean(it.pais, 40)} | dueño: ${clean(it.dueno, 120)} | fuente: ${clean(it.fuente, 200)}`
      : `- marca: ${clean(it.marca, 80)} | tienda: ${clean(it.tienda, 60)} | producto: ${clean(it.producto, 140)}`);
    const title = tipo === "alternativa" ? `Alternativa local: ${clean((items[0] || {}).marca, 60)}` : items.length === 1 ? `Marca faltante: ${clean(items[0].marca || items[0].producto, 60)}` : `${items.length} marcas faltantes`;
    const body = `<!-- gina:sugerencia v1 tipo=${tipo} -->\n${lines.join("\n")}\n\n(Enviado desde la extensión Gina. Revisa y edita antes de enviar; no incluye datos personales.)`;
    if (proj.issuesUrl) return `${proj.issuesUrl}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=sugerencia`;
    if (proj.contacto) return `mailto:${proj.contacto}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    return "";
  }

  QED.ALT = { INDEP, countries, prepare, category, suggest, suggestionLink, otherBrandsOfSameOwner, categoryDominantBrands };
})(typeof globalThis !== "undefined" ? globalThis : this);
