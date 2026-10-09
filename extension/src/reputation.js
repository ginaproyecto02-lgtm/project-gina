// Reputación: hechos con fuente (controversias, hechos positivos, lobbying) de empresas y fondos,
// un índice transparente calculado SOLO a partir de esos hechos y la afinidad con los valores del usuario.
(function (root) {
  const QED = (root.QED = root.QED || {});

  const TEMAS = {
    ambiental: { label: "Medio ambiente", icon: "🌱" },
    laboral: { label: "Trabajo", icon: "👷" },
    corrupcion: { label: "Corrupción y sanciones", icon: "⚖️" },
    privacidad: { label: "Privacidad y datos", icon: "🔒" },
    competencia: { label: "Competencia", icon: "🏛️" },
    consumidor: { label: "Trato al consumidor", icon: "🛒" },
    derechos_humanos: { label: "Derechos humanos", icon: "🤝" },
    fiscal: { label: "Impuestos", icon: "🧾" },
    seguridad: { label: "Seguridad y salud", icon: "🩺" },
    gobierno_corporativo: { label: "Gobierno corporativo", icon: "📊" }
  };

  // Peso de cada estado: una condena pesa más que una alegación; lo anulado o desestimado no resta.
  const ESTADOS = {
    condena: { label: "Condena o sentencia", peso: 10 },
    multa: { label: "Multa o sanción", peso: 8 },
    acuerdo: { label: "Acuerdo o pago", peso: 6 },
    litigio: { label: "Juicio en curso", peso: 3 },
    investigacion: { label: "Investigación abierta", peso: 2 },
    alegacion: { label: "Alegación", peso: 1 },
    absuelto: { label: "Desestimado o absuelto", peso: 0 },
    anulado: { label: "Sanción anulada", peso: 0 }
  };

  // Gestoras de fondos que se reconocen dentro del texto de propiedad de un grupo.
  const FONDOS = [
    { id: "fondo:blackrock", nombre: "BlackRock", re: /blackrock/i },
    { id: "fondo:vanguard", nombre: "The Vanguard Group", re: /vanguard/i },
    { id: "fondo:statestreet", nombre: "State Street", re: /state\s*street/i },
    { id: "fondo:blackstone", nombre: "Blackstone", re: /blackstone/i },
    { id: "fondo:kkr", nombre: "KKR", re: /\bkkr\b/i },
    { id: "fondo:berkshire", nombre: "Berkshire Hathaway", re: /berkshire/i },
    { id: "fondo:apollo", nombre: "Apollo Global Management", re: /\bapollo\b/i }
  ];

  // Grupos que comparten historial con su matriz (la tienda y la marca son la misma empresa).
  const MATRIZ = { amazon_tienda: "amazon", walmart_tienda: "walmart", walmex: "walmart", costco_tienda: "costco" };

  // Monto aproximado en millones de US$ (solo para graduar la gravedad; no se muestra).
  // El orden importa: «A$», «C$», «R$» y «MXN» antes que «$».
  const FX = { "A$": 0.65, "C$": 0.73, "R$": 0.18, "MXN": 0.055, "US$": 1, "USD": 1, "€": 1.1, "EUR": 1.1, "£": 1.3, "₹": 0.012, "¥": 0.007, "$": 1 };
  function montoUSD(text) {
    const s = String(text || "");
    if (!s || /anulad|desestimad/i.test(s)) return 0;
    const m = s.match(/([\d.,]+)\s*(mil\s+millones|millones|crore|M\b)/i);
    if (!m) return 0;
    let n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
    if (!isFinite(n)) return 0;
    if (/mil\s+millones/i.test(m[2])) n *= 1000;
    if (/crore/i.test(m[2])) n *= 10;
    let rate = 1;
    for (const [k, v] of Object.entries(FX)) if (s.includes(k)) { rate = v; break; }
    if (/yuan/i.test(s)) rate = 0.14;
    return n * rate;
  }
  function gravedad(ev) {
    const usd = montoUSD(ev.monto);
    if (!usd) return 1;
    if (usd >= 1000) return 1.5;
    if (usd >= 100) return 1.2;
    if (usd < 10) return 0.7;
    return 1;
  }
  function vigencia(anio, hoy) {
    const age = Math.max(0, hoy - (parseInt(anio, 10) || hoy));
    return age <= 3 ? 1 : age <= 6 ? 0.6 : 0.3;
  }
  const valorPeso = (v) => (v === 0 ? 0 : v === 2 ? 2 : 1);

  // Índice de 0 a 100 = 100 · e^(−Σ peso·vigencia·gravedad / 40). Positivos: +3 cada uno (máx. +6).
  function score(rec, values, hoy) {
    if (!rec) return null;
    hoy = hoy || new Date().getFullYear();
    const evs = (rec.eventos || []).map((e) => {
      const base = (ESTADOS[e.estado] || { peso: 1 }).peso * vigencia(e.anio, hoy) * gravedad(e);
      return Object.assign({}, e, { _p: base });
    });
    const pos = Math.min(2, (rec.positivos || []).length) * 3;
    const idx = (pen) => Math.max(0, Math.min(100, Math.round(100 * Math.exp(-pen / 40) + pos)));
    const pen = evs.reduce((s, e) => s + e._p, 0);
    const out = { indice: idx(pen), eventos: evs.sort((a, b) => b._p - a._p || (b.anio || 0) - (a.anio || 0)), parcial: !!rec.parcial, n: evs.length };
    out.nivel = out.indice >= 75 ? "Pocas controversias registradas" : out.indice >= 50 ? "Controversias moderadas" : out.indice >= 25 ? "Controversias relevantes" : "Historial de sanciones serio";
    out.color = out.indice >= 75 ? "ok" : out.indice >= 50 ? "ver" : "mal";
    if (values) {
      const penP = evs.reduce((s, e) => s + e._p * valorPeso(values[e.tema]), 0);
      out.personal = idx(penP);
      out.choques = Object.keys(TEMAS).filter((t) => values[t] === 2 &&
        evs.some((e) => e.tema === t && ["condena", "multa", "acuerdo"].includes(e.estado) && hoy - (e.anio || 0) <= 6));
    }
    return out;
  }

  // Une la base con las actualizaciones de la investigación semanal (por id). Lo más reciente gana.
  function repTable(db, patches) {
    const t = Object.assign({}, (db && db.reputacion) || {});
    for (const [id, r] of Object.entries(patches || {})) {
      if (!r) continue;
      if (!t[id] || String(r.revisado || "") >= String(t[id].revisado || "")) t[id] = r;
    }
    return t;
  }

  // Pone en cada grupo su historial (rep) y el de los fondos que lo poseen (fondosRep).
  function attach(groups, db, patches) {
    const t = repTable(db, patches);
    for (const [id, g] of Object.entries(groups)) {
      g.id = g.id || id;
      const own = t[id] || (MATRIZ[id] && t[MATRIZ[id]]);
      if (own) g.rep = Object.assign({ desdeMatriz: !t[id] }, own);
      const text = [g.controlador, g.fondos, g.nota].join(" ");
      g.fondosRep = FONDOS.filter((f) => f.re.test(text) && t[f.id]).map((f) => Object.assign({ id: f.id }, t[f.id]));
    }
    return t;
  }

  // ¿Qué entidades conviene investigar? Grupos vistos por el usuario o en la base, sin historial o con historial viejo.
  function needsResearch(t, id, days) {
    const r = t[id];
    if (!r) return true;
    if (r.parcial) return true;
    const t0 = Date.parse(r.revisado || "");
    return !(isFinite(t0) && Date.now() - t0 < (days || 180) * 86400000);
  }

  // Une un historial existente con el resultado de una investigación nueva (sin duplicar por URL o título).
  function merge(prev, nuevo, meta) {
    const uni = (a, b) => {
      const out = [], seen = new Map();
      for (const e of b || []) { const k = (e.url || "") || (e.titulo || ""); seen.set(k, out.length); out.push(e); }
      for (const e of a || []) { const k = (e.url || "") || (e.titulo || ""); if (!seen.has(k)) out.push(e); }
      return out;
    };
    prev = prev || {};
    return Object.assign({}, prev, meta || {}, {
      eventos: uni(prev.eventos, nuevo.eventos), positivos: uni(prev.positivos, nuevo.positivos), lobbying: uni(prev.lobbying, nuevo.lobbying)
    });
  }

  // Ids de fondos que aparecen en el texto de propiedad de un grupo (tengan o no historial).
  const fundIds = (g) => FONDOS.filter((f) => f.re.test([g.controlador, g.fondos, g.nota].join(" "))).map((f) => f.id);

  QED.REP = { TEMAS, ESTADOS, FONDOS, MATRIZ, score, repTable, attach, needsResearch, montoUSD, merge, fundIds };
})(typeof globalThis !== "undefined" ? globalThis : this);
