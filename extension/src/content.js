// SPDX-License-Identifier: MIT
// Orquesta en la página:
//  · Tiendas: lee la marca del producto, la busca en la memoria local y, si no está, consulta la IA vía el service worker.
//    Además muestra quién es dueño de la tienda.
//  · Vuelos: detecta la aerolínea del sitio o las aerolíneas que aparecen en agencias y metabuscadores.
//  · Hospedaje: muestra quién es dueño de la plataforma (Airbnb, Booking, Expedia…).
// Sigue los cambios de página sin recarga (aplicaciones de una sola página).
(function () {
  const QED = globalThis.QED;
  const api = typeof browser !== "undefined" ? browser : chrome;
  let index = null, alt = null, airIndex = null, packaged = null, registry = null, entry = null;
  let prefs = { enabled: true, minimized: false, aiEnabled: false, values: {}, showLobbying: true, showAlternatives: true };
  let cachedPriceHistory = {}, cachedCrossHistory = {};
  let lastKey = "", closedFor = "", lastResult = null, timer = null, seq = 0;

  async function load() {
    if (!packaged) packaged = await (await fetch(api.runtime.getURL("data/brands.json"))).json();
    if (!registry) registry = await (await fetch(api.runtime.getURL("data/sites.json"))).json();
    if (!QED.PROJECT) { try { QED.PROJECT = await (await fetch(api.runtime.getURL("data/proyecto.json"))).json(); } catch (e) { QED.PROJECT = {}; } }
    const st = await api.storage.local.get(["customBrands", "enabled", "minimized", "remoteBase", "verified", "groupPatches", "settings", "repPatches", "priceHistory", "crossPlatformHistory"]);
    prefs.enabled = st.enabled !== false;
    prefs.minimized = !!st.minimized;
    prefs.aiEnabled = !!(st.settings && st.settings.aiEnabled && st.settings.classify && st.settings.classify.key);
    prefs.values = (st.settings && st.settings.values) || {};
    prefs.showLobbying = !(st.settings && st.settings.showLobbying === false);
    prefs.showAlternatives = !(st.settings && st.settings.showAlternatives === false);
    cachedPriceHistory = st.priceHistory || {};
    cachedCrossHistory = st.crossPlatformHistory || {};
    const remote = st.remoteBase && st.remoteBase.data;
    const db = remote && String(remote.version) > String(packaged.version) ? remote : packaged;
    if (!db.aerolineas) db.aerolineas = packaged.aerolineas; // bases remotas antiguas sin aerolíneas
    if (!db.reputacion) db.reputacion = packaged.reputacion; // bases remotas antiguas sin reputación
    index = QED.buildIndex(db, st.customBrands || [], st.verified || {}, st.groupPatches || {}, st.repPatches || {});
    airIndex = QED.buildAirlineIndex(db, index.groups);
    if (!db.categorias) db.categorias = packaged.categorias; // bases remotas antiguas sin categorías
    alt = QED.ALT ? QED.ALT.prepare(db, index) : null;
  }

  const groupOf = (gid) => (gid && index && index.groups[gid]) || null;
  const storeOf = (e) => (e && e.tipo === "tienda" ? { nombre: e.nombre, group: groupOf(e.g) } : null);

  function analyze(force) {
    if (!index || !prefs.enabled) { QED.hideCard(); return; }
    entry = QED.siteInfo(registry, location.hostname, location.pathname);
    const mode = QED.travelMode(entry, location.href);
    if (mode) return analyzeTravel(mode, force);
    analyzeProduct(force);
  }

  // ---------------------------------------------------------------- Viajes
  function analyzeTravel(mode, force) {
    let res;
    if (mode === "hospedaje") {
      res = { mode, agency: { nombre: entry.nombre, group: groupOf(entry.g) } };
    } else {
      const own = entry.tipo === "aerolinea" ? entry.g : null;
      const found = QED.detectAirlines(document, airIndex, { exclude: own, limit: 6 });
      res = {
        mode,
        airline: own ? { nombre: entry.nombre, group: groupOf(own) } : null,
        agency: entry.tipo === "agencia" ? { nombre: entry.nombre, group: groupOf(entry.g) } : null,
        airlines: found.map((a) => ({ n: a.n, count: a.count, g: a.g, group: groupOf(a.g) })).filter((a) => a.group)
      };
    }
    const key = location.pathname + "|" + mode + "|" + (res.airlines || []).map((a) => a.g + a.count).join(",");
    if (!force && key === lastKey) return;
    lastKey = key;
    lastResult = res;
    draw();
  }

  // Alternativas locales para el tipo de producto (según el país de la tienda).
  function withAlternatives(res, brand, title, categoryPath) {
    if (!alt || !prefs.showAlternatives || !entry || entry.tipo !== "tienda") return res;
    const catRes = QED.ALT.category(alt, brand, title, categoryPath);
    if (!catRes || !catRes.cat || catRes.confianza === "ninguna") return res;
    const cat = catRes.cat;
    const subcat = catRes.subcat;
    const custom = Object.values(prefs.values || {}).some((v) => v !== 1 && v != null);
    const items = QED.ALT.suggest(alt, cat, entry.pais, res.group && res.group.id, custom ? prefs.values : null, 5, title, subcat);
    const currentGid = res.group && res.group.id;
    const otherBrands = currentGid ? QED.ALT.otherBrandsOfSameOwner(alt, currentGid, brand || res.brandText, 6) : [];
    const dominant = catRes.confianza === "alta" ? QED.ALT.categoryDominantBrands(alt, cat, 4, currentGid, subcat) : [];
    res.alternativas = {
      cat,
      subcat,
      confianza: catRes.confianza,
      motivo: catRes.motivo,
      label: alt.cats[cat] ? alt.cats[cat].label : cat,
      pais: entry.pais,
      items,
      otherBrands,
      dominant,
      actualEsLocal: !!(res.group && QED.ALT.INDEP[res.group.tipo] && QED.ALT.countries(res.group.pais).includes(entry.pais))
    };
    return res;
  }

  async function recordPrice(productId, price, title) {
    if (!price || !price.amount) return;
    const pKey = (productId && productId.id) || (title ? title.slice(0, 40) : "");
    if (!pKey) return;
    try {
      const now = Date.now();
      const list = cachedPriceHistory[pKey] || [];
      const last = list[list.length - 1];
      if (!last || last.p !== price.amount || (now - last.t) > 3600000) {
        list.push({ t: now, p: price.amount });
        if (list.length > 100) list.shift();
        cachedPriceHistory[pKey] = list;
        await api.storage.local.set({ priceHistory: cachedPriceHistory });
      }
    } catch (e) {}
  }

  // Enriquecer el resultado con la evaluación de confiabilidad de compra y normas
  function enrichProduct(res, data) {
    if (!res) return res;
    res.title = res.title || data.title;
    res.specsText = data.specsText || "";
    const catRes = res.alternativas ? { cat: res.alternativas.cat, confianza: res.alternativas.confianza } : (alt ? QED.ALT.category(alt, res.brand || res.brandText, data.title, data.categoryPath) : null);
    const cat = catRes ? (typeof catRes === "string" ? catRes : catRes.cat) : null;
    const catConf = catRes ? (typeof catRes === "string" ? "media" : (catRes.confianza || "ninguna")) : "ninguna";
    const country = entry ? entry.pais : "MX";
    if (data.reliability && data.reliability.price) {
      recordPrice(data.reliability.productId, data.reliability.price, data.title);
    }
    if (QED.evaluateReliability) {
      const pKey = (data.reliability && data.reliability.productId && data.reliability.productId.id) || (data.title ? data.title.slice(0, 40) : "");
      const prodHistory = (cachedPriceHistory && cachedPriceHistory[pKey]) || [];
      res.reliabilityEval = QED.evaluateReliability(
        data.reliability,
        res.group,
        cat,
        data.title,
        country,
        entry,
        { priceHistory: prodHistory, crossPlatformHistory: cachedCrossHistory }
      );
    }
    if (QED.evaluateProductNotices) {
      res.productNotices = QED.evaluateProductNotices({
        title: data.title,
        category: cat,
        categoryConfidence: catConf,
        storeCountry: country,
        brand: res.found ? res.brand : res.brandText,
        brandGroup: res.group,
        specsText: data.specsText,
        aditivosDb: (packaged && packaged.aditivos) || [],
        alertasDb: (packaged && packaged.alertas) || [],
        options: prefs
      });
    }
    return res;
  }

  // ---------------------------------------------------------------- Productos
  function analyzeProduct(force) {
    const siteName = QED.site(location.hostname);
    if (!QED.isProductPage(document, siteName, location.href, entry)) { QED.hideCard(); lastResult = null; lastKey = ""; return; }
    const data = QED.extract(document, location.hostname);
    if (!data.title && !data.candidates.length) return; // la página aún está cargando
    const key = location.pathname + "|" + data.title + "|" + data.candidates.map((c) => c.text).join(",");
    if (!force && key === lastKey) return;
    lastKey = key;
    const store = storeOf(entry);
    const local = QED.match(index, data.candidates, data.title);
    if (local.found) {
      lastResult = enrichProduct(withAlternatives(Object.assign(local, { store }), local.brand, data.title, data.categoryPath), data);
      draw();
      return;
    }

    // No está en la memoria local → service worker: caché de IA, clasificación en vivo y registro de pendientes.
    const my = ++seq;
    lastResult = enrichProduct(withAlternatives(Object.assign(local, { kind: prefs.aiEnabled ? "loading" : "none", title: data.title, store }), local.brandText, data.title, data.categoryPath), data);
    draw();
    const site = entry ? `${entry.nombre} (${entry.pais})` : siteName;
    api.runtime.sendMessage({ type: "qed:resolve", brandText: local.brandText, title: data.title, site }).then((r) => {
      if (my !== seq || !r) return; // el usuario ya cambió de producto
      if ((r.status === "ai" || r.status === "cache") && r.result) {
        // Si la IA asignó la marca a un grupo de la base, se usan los datos locales (incluida su reputación).
        if (r.result.gid && index.groups[r.result.gid]) r.result.group = index.groups[r.result.gid];
        lastResult = enrichProduct(withAlternatives(Object.assign(r.result, { store }), r.result.brand, data.title, data.categoryPath), data);
      }
      else lastResult = enrichProduct(withAlternatives(Object.assign({}, local, { kind: "none", aiStatus: r.status, aiError: r.error, limit: r.limit, aiOn: prefs.aiEnabled, store }), local.brandText, data.title, data.categoryPath), data);
      draw();
    }).catch(() => {});
  }

  // Cuenta qué grupos ves para que la investigación semanal priorice su reputación (solo en local).
  let seenBuf = {}, seenTimer = null, seenKey = "";
  function noteSeen(res) {
    const ids = [];
    const add = (g) => { if (g && g.id && !String(g.id).startsWith("__")) ids.push(g.id); };
    add(res.group); add(res.store && res.store.group); add(res.airline && res.airline.group); add(res.agency && res.agency.group);
    (res.airlines || []).forEach((a) => add(a.group));
    const k = location.pathname + "|" + ids.join(",");
    if (!ids.length || k === seenKey) return;
    seenKey = k;
    ids.forEach((id) => { seenBuf[id] = (seenBuf[id] || 0) + 1; });
    clearTimeout(seenTimer);
    seenTimer = setTimeout(async () => {
      const buf = seenBuf; seenBuf = {};
      try {
        const { seenGroups = {} } = await api.storage.local.get("seenGroups");
        for (const [id, n] of Object.entries(buf)) seenGroups[id] = (seenGroups[id] || 0) + n;
        await api.storage.local.set({ seenGroups });
      } catch (e) {}
    }, 2000);
  }

  function draw() {
    if (!lastResult || closedFor === location.pathname) return;
    noteSeen(lastResult);
    QED.showCard(lastResult, {
      minimized: prefs.minimized, values: prefs.values, showLobbying: prefs.showLobbying,
      onToggle: (m) => { prefs.minimized = m; api.storage.local.set({ minimized: m }); draw(); },
      onClose: () => { closedFor = location.pathname; }
    });
  }

  function schedule(force) { clearTimeout(timer); timer = setTimeout(() => analyze(force), 700); }

  api.storage.onChanged.addListener(async (ch) => {
    if (ch.customBrands || ch.enabled || ch.remoteBase || ch.verified || ch.groupPatches || ch.settings || ch.repPatches || ch.priceHistory || ch.crossPlatformHistory) { await load(); schedule(true); }
  });

  api.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg && msg.type === "qed:get") reply({ result: lastResult, url: location.href, site: entry });
    if (msg && msg.type === "qed:show") { closedFor = ""; prefs.minimized = false; analyze(true); reply({ ok: true }); }
    return false;
  });

  load().then(() => {
    analyze(true);
    [1500, 3500, 7000, 12000].forEach((ms) => setTimeout(() => analyze(false), ms));
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) { lastUrl = location.href; closedFor = ""; schedule(true); }
      else schedule(false);
    }).observe(document.body || document.documentElement, { childList: true, subtree: true });
  }).catch((e) => console.warn("[Gina] No se pudo cargar la base:", e));
})();
