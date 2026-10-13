// SPDX-License-Identifier: MIT
// Coincidencia de marcas: normaliza texto y busca la marca en la base.
// Se carga como content script (global) y también en Node para pruebas.
(function (root) {
  const QED = (root.QED = root.QED || {});

  // Normaliza para comparar: quita acentos, pasa a minúsculas y conserva letras de cualquier alfabeto
  // (latino, chino, japonés, coreano, hebreo…). NFKD convierte también los caracteres de ancho completo (ＳＯＮＹ → sony).
  function norm(s) {
    return String(s || "")
      .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").normalize("NFC")
      .toLowerCase()
      .replace(/[’`´]/g, "'")
      .replace(/[^\p{L}\p{N}'&+.\- ]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  const NON_LATIN = /[^\u0000-\u024f]/; // claves en otros alfabetos: se buscan como subcadena (no hay espacios entre palabras)

  // Quita los textos que las tiendas ponen alrededor del nombre de la marca.
  function cleanBrandField(s) {
    let t = norm(s);
    const patterns = [
      /^visita la tienda de\s+/, /^visit the\s+/, /\s+store$/, /^visitar a loja\s+/,
      /^(?:marca|brand|marque|marke|marchio)(?:[:：]\s*|\s+)/, /^por\s+/, /^by\s+/, /^vendido por\s+/, /^tienda oficial\s+/,
      /^tienda oficial de\s+/, /\s+tienda oficial$/, /\s+oficial$/, /^loja oficial\s+/,
      /^(ブランド|メーカー|브랜드|제조사|品牌|מותג)\s*[:：]?\s*/, /\s+(ストア|스토어|旗舰店|官方旗舰店)$/
    ];
    let prev;
    do { prev = t; for (const p of patterns) t = t.replace(p, "").trim(); } while (t !== prev);
    return t;
  }

  // Igual que cleanBrandField pero conserva mayúsculas y acentos (para mostrarla y enviarla a la IA).
  function displayBrand(s) {
    let t = String(s || "").normalize("NFKC").replace(/\s+/g, " ").trim();
    const patterns = [/^visita la tienda de\s+/i, /^visit the\s+/i, /\s+store$/i, /^visitar a loja\s+/i,
      /^(?:marca|brand|marque|marke|marchio)(?:[:：]\s*|\s+)/i,
      /^(por|by|vendido por)\s+/i, /^tienda oficial( de)?\s+/i, /\s+tienda oficial$/i, /\s+oficial$/i, /^loja oficial\s+/i,
      /^(ブランド|メーカー|브랜드|제조사|品牌|מותג)\s*[:：]?\s*/, /\s+(ストア|스토어|旗舰店|官方旗舰店)$/];
    let prev;
    do { prev = t; for (const p of patterns) t = t.replace(p, "").trim(); } while (t !== prev);
    return t;
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function keyRegex(key) {
    return NON_LATIN.test(key) ? new RegExp(escapeRe(key)) : new RegExp("(^|[^a-z0-9])" + escapeRe(key) + "($|[^a-z0-9])");
  }

  // Construye el índice a partir de brands.json (+ marcas propias del usuario).
  // verified: marcas confirmadas por el job semanal ({clave: {marca, empresa, ...}}); patches: correcciones a grupos de la base.
  function buildIndex(db, custom, verified, patches, repPatches) {
    const entries = [];
    const groups = {};
    for (const [id, g] of Object.entries(db.grupos)) groups[id] = Object.assign({}, g, (patches || {})[id] || {});
    for (const m of db.marcas) entries.push({ n: m.n, g: m.g, s: !!m.s });
    Object.values(verified || {}).forEach((v, i) => {
      if (!v || !v.marca) return;
      const gid = v.grupo_id && groups[v.grupo_id] ? v.grupo_id : "__verified_" + i;
      if (gid !== v.grupo_id) groups[gid] = v;
      entries.push({ n: v.marca, g: gid, s: false, verified: true });
    });
    (custom || []).forEach((c, i) => {
      const gid = "__custom_" + i;
      groups[gid] = Object.assign({ confianza: "Tuya (agregada por ti)", fuente: c.fuente || "Agregada por el usuario" }, c);
      entries.push({ n: c.marca, g: gid, s: false, custom: true });
    });
    const exact = new Map();
    const list = [];
    for (const e of entries) {
      const key = norm(e.n);
      if (!key) continue;
      if (!exact.has(key) || e.custom) exact.set(key, e); // gana la primera grafía; las del usuario siempre sobrescriben
      list.push({ e, key, re: keyRegex(key) });
    }
    list.sort((a, b) => b.key.length - a.key.length); // la marca más larga gana
    const rep = QED.REP ? QED.REP.attach(groups, db, repPatches) : {};
    return { groups, exact, list, rep };
  }

  // candidates: [{text, source}] desde el campo «marca» de la página. title: título del producto.
  function match(index, candidates, title) {
    for (const c of candidates || []) {
      const key = cleanBrandField(c.text);
      if (!key) continue;
      if (index.exact.has(key)) return result(index, index.exact.get(key), c.source, c.text, "exacta");
      for (const it of index.list) {
        if ((it.key.length >= 3 || NON_LATIN.test(it.key)) && it.re.test(key)) return result(index, it.e, c.source, c.text, "parcial");
      }
    }
    const t = norm(title);
    if (t) {
      for (const it of index.list) {
        if (it.e.s) continue; // marcas ambiguas solo cuentan desde el campo «marca»
        if (it.key.length < 3 && !NON_LATIN.test(it.key)) {
          // Siglas cortas (HP, LG): solo si aparecen en mayúsculas como palabra suelta en el título original.
          const up = new RegExp("(^|[^A-Za-z0-9])" + escapeRe(it.e.n.toUpperCase()) + "($|[^A-Za-z0-9])");
          if (it.e.n === it.e.n.toUpperCase() && up.test(String(title))) return result(index, it.e, "título", title, "título");
          continue;
        }
        if (it.re.test(t)) return result(index, it.e, "título", title, "título");
      }
    }
    const raw = (candidates && candidates[0]) ? displayBrand(candidates[0].text) : "";
    return { found: false, brandText: raw };
  }

  function result(index, e, source, raw, how) {
    return { found: true, brand: e.n, group: index.groups[e.g], source, raw, how, custom: !!e.custom,
      kind: e.custom ? "custom" : e.verified ? "verified" : "base" };
  }

  // ---- Aerolíneas: índice de nombres (exactos y de forma larga)
  function buildAirlineIndex(db, groups) {
    const exact = new Map(), long = [];
    for (const a of db.aerolineas || []) {
      const key = norm(a.n);
      if (!key) continue;
      const e = { n: a.n, g: a.g, s: !!a.s, key };
      if (!exact.has(key)) exact.set(key, e);
      if (!a.s && (key.length >= 6 || NON_LATIN.test(key))) long.push(Object.assign({ re: keyRegex(key) }, e));
    }
    long.sort((x, y) => y.key.length - x.key.length);
    return { exact, long, groups };
  }

  // ---- Sitios: qué tienda, agencia o aerolínea es la página actual
  function siteInfo(registry, hostname, pathname) {
    const h = String(hostname || "").toLowerCase(), path = pathname || "/";
    let best = null;
    for (const e of (registry && registry.sitios) || []) {
      if (!(h === e.d || h.endsWith("." + e.d))) continue;
      if (e.path && !path.startsWith(e.path)) continue;
      if (!best || e.d.length > best.d.length) best = e;
    }
    return best;
  }

  QED.buildAirlineIndex = buildAirlineIndex;
  QED.siteInfo = siteInfo;
  QED.keyRegex = keyRegex;
  QED.norm = norm;
  QED.cleanBrandField = cleanBrandField;
  QED.displayBrand = displayBrand;
  QED.buildIndex = buildIndex;
  QED.match = match;
})(typeof globalThis !== "undefined" ? globalThis : this);
