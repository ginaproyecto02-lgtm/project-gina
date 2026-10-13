// SPDX-License-Identifier: MIT
// Páginas de viajes: decide si la página es de vuelos u hospedaje y detecta qué aerolíneas aparecen.
// Funciona en sitios de aerolíneas, agencias (Expedia, Despegar…) y metabuscadores (Google Vuelos, Kayak, Skyscanner…).
(function (root) {
  const QED = (root.QED = root.QED || {});

  const FLIGHT_URL = /(flight|flights|vuelo|vuelos|voo|voos|passagens|flug|fluge|flüge|vols?\b|\/vol\/|voli\b|volo\b|airfare|aereo|機票|机票|항공권|航空券|フライト|טיסות|travel\/flights)/i;
  const STAY_URL = /(\/rooms\/|\/hotel|hotels?\.|hospedaje|alojamiento|hospedagem|unterkunft|hebergement|alloggi|\/stays?\b)/i;

  // Modo de la página según el tipo de sitio y la URL.
  function travelMode(entry, url) {
    if (!entry) return null;
    const u = String(url || "");
    if (entry.tipo === "aerolinea") return "vuelos";
    if (entry.tipo === "hospedaje") {
      if (entry.p) { try { return new RegExp(entry.p).test(u) ? "hospedaje" : null; } catch (e) { return null; } }
      return "hospedaje";
    }
    if (entry.tipo === "agencia") {
      let v = null;
      if (entry.v) { try { v = new RegExp(entry.v); } catch (e) {} }
      if ((v && v.test(u)) || FLIGHT_URL.test(u)) return "vuelos";
      if (STAY_URL.test(u)) return "hospedaje";
      return null;
    }
    return null;
  }

  // Recorre los textos visibles cortos (nombres de aerolínea en tarjetas de resultados) y
  // atributos alt / aria-label / title de los logotipos. Devuelve [{g, n, count}] ordenado por apariciones.
  function detectAirlines(doc, ai, opts) {
    opts = opts || {};
    const counts = new Map();
    const add = (e, w) => {
      const c = counts.get(e.g) || { g: e.g, n: e.n, count: 0 };
      c.count += w || 1;
      if (!e.s && e.n.length > c.n.length) c.n = e.n; // prefiere el nombre largo
      counts.set(e.g, c);
    };
    const test = (raw) => {
      const t = QED.norm(raw);
      if (!t || t.length < 2) return;
      const ex = ai.exact.get(t);
      if (ex) { add(ex, 1); return; }
      if (t.length > 160) return;
      for (const l of ai.long) if (l.re.test(t)) { add(l, 1); return; }
    };

    const rootEl = doc.body || doc.documentElement;
    if (!rootEl) return [];
    const walker = doc.createTreeWalker(rootEl, 4 /* NodeFilter.SHOW_TEXT */);
    let n = 0, node;
    const max = opts.maxNodes || 25000;
    while ((node = walker.nextNode()) && n < max) {
      n++;
      const p = node.parentElement;
      if (!p || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(p.tagName)) continue;
      const v = node.nodeValue;
      if (v && v.trim().length >= 2 && v.length <= 200) test(v);
    }
    let m = 0;
    for (const el of doc.querySelectorAll("img[alt], [aria-label], [title]")) {
      if (++m > 5000) break;
      for (const attr of ["alt", "aria-label", "title"]) {
        const v = el.getAttribute(attr);
        if (v && v.length <= 160) test(v);
      }
    }
    // Datos estructurados de vuelos (schema.org/Flight, FlightReservation)
    for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
      let d; try { d = JSON.parse(s.textContent); } catch (e) { continue; }
      const stack = [d];
      while (stack.length) {
        const x = stack.pop();
        if (!x || typeof x !== "object") continue;
        if (Array.isArray(x)) { stack.push(...x); continue; }
        const air = x.airline || x.provider;
        if (air && typeof air === "object" && air.name) test(air.name);
        for (const k in x) if (x[k] && typeof x[k] === "object") stack.push(x[k]);
      }
    }
    // Excluye el propio sitio si es una aerolínea (se muestra aparte).
    if (opts.exclude) counts.delete(opts.exclude);
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, opts.limit || 6);
  }

  QED.travelMode = travelMode;
  QED.detectAirlines = detectAirlines;
})(typeof globalThis !== "undefined" ? globalThis : this);
