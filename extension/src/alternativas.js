// Alternativas locales: para el tipo de producto que se ve, marcas de la base cuyo dueño es una cooperativa,
// sus empleados, un fideicomiso, una familia o su fundador, con capital del país de la tienda.
// Solo usa datos de propiedad de la base (con fuente); no evalúa calidad ni precio.
(function (root) {
  const QED = (root.QED = root.QED || {});

  const INDEP = {
    "Cooperativa": { label: "Cooperativa", prio: 3 },
    "Empleados": { label: "De sus empleados", prio: 3 },
    "Fideicomiso": { label: "Controlada por un fideicomiso", prio: 2 },
    "Familia": { label: "Empresa familiar", prio: 1 },
    "Fundador": { label: "De su fundador", prio: 1 },
    "Privada": { label: "Privada independiente", prio: 1 },
    "Familia + fondos": { label: "Familiar (con fondos minoritarios)", prio: 0 },
    "Fundador + fondos": { label: "De su fundador (con fondos)", prio: 0 }
  };
  const GENTILICIO = {
    "México": "mexicano", "EE.UU.": "estadounidense", "Canadá": "canadiense", "Brasil": "brasileño", "Argentina": "argentino", "Chile": "chileno",
    "Reino Unido": "británico", "Alemania": "alemán", "Francia": "francés", "España": "español", "Italia": "italiano", "China": "chino",
    "Japón": "japonés", "Corea del Sur": "coreano", "Singapur": "singapurense", "Israel": "israelí", "India": "indio", "Colombia": "colombiano"
  };

  // «Otros (Japón)» → ["Japón"]; «EE.UU. / México» → ["EE.UU.", "México"]
  function countries(pais) {
    return String(pais || "").split("/").map((p) => p.trim().replace(/^Otros\s*\((.*)\)$/i, "$1").trim()).filter(Boolean);
  }

  // Prepara índices una vez por base: marca → categoría y palabras clave normalizadas.
  function prepare(db, index) {
    const cats = (db && db.categorias) || {};
    const byBrand = new Map();
    const kws = [];
    for (const [id, c] of Object.entries(cats)) {
      for (const m of c.marcas || []) byBrand.set(QED.norm(m), id);
      for (const k of c.kw || []) {
        const nk = QED.norm(k);
        if (nk) kws.push({ id, re: QED.keyRegex(nk), len: nk.length });
      }
    }
    kws.sort((a, b) => b.len - a.len);
    return { cats, byBrand, kws, index };
  }

  function category(prep, brand, title) {
    if (!prep) return null;
    const b = QED.norm(brand || "");
    const t = " " + QED.norm(title || "") + " ";

    // Filtros de descalificación por incompatibilidad semántica:
    // Si el título describe cuidado de la piel/rostro/dermocosmética, no puede ser limpieza del hogar.
    const isSkinOrFace = /\b(piel|facial|rostro|cutis|ojos|dermatol|dermocosmet|skincare|serum|suero|bloqueador|solar|niacinamid|ceramida|hialuronico|hidratante|antiarrugas|antiedad|antimanchas)\b/i.test(t);
    const isHouseholdClean = /\b(lavatrastes|lavavajillas|ropa|pisos|banos|inodoro|suavizante|trastes|multiusos|lavanderia)\b/i.test(t);

    const scores = new Map();
    for (const k of prep.kws) {
      if (isSkinOrFace && k.id === "limpieza") continue;
      if (isHouseholdClean && k.id === "skincare_cosmetica") continue;
      if (k.re.test(t)) {
        const weight = k.len >= 10 ? k.len * 2 : k.len;
        scores.set(k.id, (scores.get(k.id) || 0) + weight);
      }
    }

    // 1) Si el título tiene una coincidencia semántica clara (≥ 12 pts), prima el tipo real de producto
    if (scores.size) {
      const sorted = Array.from(scores.entries()).sort((x, y) => y[1] - x[1]);
      if (sorted[0][1] >= 12) return sorted[0][0];
    }

    // 2) Si no hay señal fuerte en el título, verificar si la marca tiene categoría fija
    if (b && prep.byBrand.has(b)) return prep.byBrand.get(b);

    // 3) Si hubo alguna coincidencia menor en el título
    if (scores.size) {
      const sorted = Array.from(scores.entries()).sort((x, y) => y[1] - x[1]);
      return sorted[0][0];
    }

    return null;
  }

  // Alternativas para una categoría en el país de la tienda, sin el grupo actual. values: valores del usuario.
  function suggest(prep, catId, pais, currentGid, values, limit, title) {
    if (!prep || !catId || !pais || pais === "Global") return [];
    const cat = prep.cats[catId];
    if (!cat) return [];
    const normTitle = QED.norm(title || "");
    const byGroup = new Map();
    for (const m of cat.marcas || []) {
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

      // Ordenar marcas del grupo dando prioridad a las más afines léxicamente al título del producto
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
        capital: GENTILICIO[pais] ? `capital ${GENTILICIO[pais]}` : `capital de ${pais}`
      });
    });
    // Primero cooperativas y de empleados; luego mejor reputación (sin historial cuenta como neutral, 80).
    out.sort((x, y) => y.prio - x.prio || (y.rep == null ? 80 : y.rep) - (x.rep == null ? 80 : x.rep) || x.marcas[0].localeCompare(y.marcas[0]));
    return out.slice(0, limit || 3);
  }


  // Enlace para sugerir al proyecto marcas faltantes o alternativas locales (lo envía el usuario, por su voluntad):
  // un issue de GitHub prellenado o, si no hay repositorio, un correo. El job del servidor lee el marcador «gina:sugerencia».
  const clean = (v, n) => String(v == null ? "" : v).replace(/[|\n\r]+/g, " ").replace(/\s+/g, " ").trim().slice(0, n || 120);
  function suggestionLink(proj, tipo, items) {
    proj = proj || {};
    const lines = (items || []).slice(0, 40).map((it) => tipo === "alternativa"
      ? `- alternativa: ${clean(it.marca, 80)} | categoría: ${clean(it.categoria, 40)} | país: ${clean(it.pais, 40)} | dueño: ${clean(it.dueno, 120)} | fuente: ${clean(it.fuente, 200)}`
      : `- marca: ${clean(it.marca, 80)} | tienda: ${clean(it.tienda, 60)} | producto: ${clean(it.producto, 140)}`);
    const title = tipo === "alternativa" ? `Alternativa local: ${clean((items[0] || {}).marca, 60)}` : items.length === 1 ? `Marca faltante: ${clean(items[0].marca || items[0].producto, 60)}` : `${items.length} marcas faltantes`;
    const body = `<!-- gina:sugerencia v1 tipo=${tipo} -->\n${lines.join("\n")}\n\n(Enviado desde la extensión Gina. Revisa y edita antes de enviar; no incluye datos personales.)`;
    if (proj.issuesUrl) return `${proj.issuesUrl}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    if (proj.contacto) return `mailto:${proj.contacto}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    return "";
  }

  QED.ALT = { INDEP, countries, prepare, category, suggest, suggestionLink };
})(typeof globalThis !== "undefined" ? globalThis : this);
