// Tarjeta flotante dentro de un Shadow DOM, para que el CSS de la tienda no la afecte.
(function (root) {
  const QED = (root.QED = root.QED || {});
  const HOST_ID = "gina-tarjeta";

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const safe = (u) => (/^https?:\/\//i.test(String(u || "")) ? String(u) : "#"); // solo enlaces web

  const TIPO_INFO = {
    "Familia": "Una familia controla la empresa: estrategia estable y de largo plazo.",
    "Familia + fondos": "Una familia tiene el control y fondos institucionales son socios.",
    "Familia + capital privado": "Familia y un fondo de capital privado comparten el control.",
    "Familia + corporación": "Una familia y otra gran empresa son los accionistas de referencia.",
    "Fundador": "Su fundador conserva el control.",
    "Fundador + fondos": "El fundador manda y grandes fondos invierten.",
    "Fondos dispersos": "Nadie la controla por sí solo; los mayores accionistas suelen ser fondos indexados.",
    "Corporación": "Pertenece a otra gran empresa.",
    "Corporación + familia": "Pertenece a una gran empresa con socios familiares.",
    "Capital privado": "Un fondo de capital privado es el dueño.",
    "Estatal": "Pertenece a un Estado.",
    "Cooperativa": "Pertenece a sus socios cooperativistas.",
    "Empleados": "Pertenece a sus empleados.",
    "Privada": "Empresa privada que no cotiza en bolsa.",
    "Mixto": "Propiedad mixta (pública y privada).",
    "Corporación + capital privado": "Otra gran empresa y un fondo de capital privado son los accionistas de referencia.",
    "Fideicomiso": "La controla un fideicomiso (trust) con un fin definido, no un accionista que busque vender."
  };

  const CSS = `
  :host { all: initial; }
  .wrap { position: fixed; right: 16px; bottom: 16px; z-index: 2147483646; width: 340px; max-width: calc(100vw - 32px);
    font: 13px/1.45 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1c2233; }
  .card { background: #fff; border: 1px solid #d9dde6; border-radius: 12px; box-shadow: 0 8px 28px rgba(20,30,60,.18); overflow: hidden; }
  .top { display: flex; align-items: center; gap: 8px; background: #1f2a44; color: #fff; padding: 9px 12px; }
  .top .t { flex: 1; font-weight: 600; font-size: 12.5px; letter-spacing: .2px; }
  .top button { all: unset; cursor: pointer; padding: 2px 6px; border-radius: 6px; color: #cfd6e6; font-size: 14px; }
  .top button:hover { background: rgba(255,255,255,.12); color: #fff; }
  .body { padding: 12px 14px 10px; max-height: 60vh; overflow: auto; }
  .brand { font-size: 12px; color: #5a6478; }
  .brand b { color: #1c2233; font-size: 15px; }
  .emp { font-size: 15px; font-weight: 650; margin: 6px 0 2px; }
  .row { margin-top: 8px; }
  .k { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #7a8396; }
  .v { margin-top: 1px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .chip { font-size: 11.5px; padding: 2px 8px; border-radius: 999px; background: #eef1f7; color: #2b3550; }
  .chip.ia { background: #fde9d7; color: #8a3d00; }
  .spin { display: inline-block; width: 12px; height: 12px; border: 2px solid #c9a227; border-right-color: transparent; border-radius: 50%; animation: s 0.8s linear infinite; vertical-align: -2px; margin-right: 6px; }
  @keyframes s { to { transform: rotate(360deg); } }
  .chip.ok { background: #e2f0d9; color: #2d5a1b; } .chip.alta { background: #e6eefb; color: #1f4e8c; } .chip.ver { background: #fff4c2; color: #6b5300; }
  .hint { font-size: 12px; color: #4a5468; background: #f6f7fa; border-radius: 8px; padding: 7px 9px; margin-top: 8px; }
  .note { font-size: 12px; margin-top: 8px; padding: 7px 9px; border-left: 3px solid #c9a227; background: #fffbea; }
  a { color: #1f6fb2; }
  .store { margin-top: 10px; padding: 8px 10px; border-radius: 8px; background: #f2f5fb; font-size: 12px; }
  .store b { color: #1c2233; }
  .sec { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #7a8396; margin: 12px 0 4px; }
  details.air { border: 1px solid #e6e9f0; border-radius: 8px; padding: 6px 9px; margin-top: 6px; }
  details.air summary { cursor: pointer; font-weight: 600; list-style: none; }
  details.air summary::-webkit-details-marker { display: none; }
  details.air summary small { font-weight: 400; color: #6a7386; }
  .lead { font-size: 13px; margin-bottom: 2px; }
  .foot { font-size: 10.5px; color: #8a92a3; padding: 7px 14px 10px; border-top: 1px solid #eef0f4; }
  .rep { margin-top: 10px; border: 1px solid #e6e9f0; border-radius: 10px; padding: 8px 10px; }
  .score { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
  .num { font-size: 20px; font-weight: 700; min-width: 54px; } .num small { font-size: 11px; font-weight: 400; color: #7a8396; }
  .bar { flex: 1; height: 6px; background: #eef1f7; border-radius: 4px; overflow: hidden; } .bar i { display: block; height: 100%; }
  .c-ok { color: #2f7a24; } .bg-ok { background: #3c8d2f; } .c-ver { color: #8a6500; } .bg-ver { background: #d4a106; } .c-mal { color: #b03024; } .bg-mal { background: #c0392b; }
  .lvl { font-size: 12px; font-weight: 600; }
  .ev { display: flex; gap: 6px; margin-top: 6px; font-size: 12px; line-height: 1.35; }
  .ev .ic { flex: none; } .ev .tx { flex: 1; }
  .st { display: inline-block; font-size: 10.5px; padding: 0 6px; border-radius: 999px; background: #eef1f7; color: #3b4560; margin-left: 2px; white-space: nowrap; }
  .st.condena, .st.multa { background: #fbe1de; color: #8f241a; } .st.acuerdo { background: #fdebd3; color: #7a4300; }
  .st.absuelto, .st.anulado { background: #e2f0d9; color: #2d5a1b; }
  .warn { font-size: 12px; margin-top: 8px; padding: 7px 9px; border-left: 3px solid #c0392b; background: #fdf0ee; }
  .sum { font-size: 11.5px; color: #5a6478; margin-top: 2px; }
  details.more { margin-top: 8px; } details.more summary { cursor: pointer; color: #1f6fb2; font-size: 12px; }
  .method { font-size: 11px; color: #6a7386; margin-top: 8px; }
  .alt { margin-top: 10px; border-radius: 10px; padding: 8px 10px; background: #eef7ea; border: 1px solid #d3e8c9; }
  .alt .k { color: #3d6b2c; }
  .alt .it { margin-top: 6px; font-size: 12.5px; line-height: 1.35; }
  .alt .it b { font-size: 13px; } .alt .it small { color: #5a6478; }
  .alt .why { display: inline-block; font-size: 10.5px; padding: 0 6px; border-radius: 999px; background: #d9eecf; color: #2d5a1b; margin-left: 2px; }
  .mini { all: unset; cursor: pointer; position: fixed; right: 16px; bottom: 16px; z-index: 2147483646; background: #1f2a44; color: #fff;
    font: 600 12px -apple-system, "Segoe UI", Roboto, Arial, sans-serif; padding: 8px 12px; border-radius: 999px; box-shadow: 0 6px 18px rgba(20,30,60,.25); }
  `;

  function confChip(c) {
    const s = String(c || "");
    if (/investigación IA|revalidado/i.test(s)) return `<span class="chip ok" title="Confirmado por la investigación semanal con fuentes web">✔ Verificado por investigación</span>`;
    if (/^IA sin verificar/i.test(s)) return `<span class="chip ia" title="Clasificación automática de un modelo pequeño; la investigación semanal la confirmará">🤖 IA · sin verificar</span>`;
    if (/^verificado/i.test(s)) return `<span class="chip ok" title="Dato comprobado en una fuente con enlace">✔ Verificado</span>`;
    if (/^alta/i.test(s)) return `<span class="chip alta" title="Hecho ampliamente documentado; confírmalo en la fuente indicada">Confianza alta</span>`;
    if (/^verificar/i.test(s)) return `<span class="chip ver" title="El dato puede haber cambiado">⚠ Verificar</span>`;
    return `<span class="chip">${esc(s)}</span>`;
  }


  // Bloque con los datos de un grupo dueño (empresa, controlador, país, tipo, fondos, gobierno, nota, fuente).
  function groupBlock(g, compact) {
    g = g || {};
    const fuente = g.url
      ? `<a href="${esc(safe(g.url))}" target="_blank" rel="noopener noreferrer">${esc(g.fuente || "Ver fuente")}</a>`
      : esc(g.fuente || "Sin fuente");
    const more = Array.isArray(g.fuentes) && g.fuentes.length > 1
      ? g.fuentes.slice(1, 4).map((f) => `<br><a href="${esc(safe(f.url))}" target="_blank" rel="noopener noreferrer">${esc(f.titulo || f.url)}</a>`).join("") : "";
    return `
      <div class="emp">${esc(g.empresa)}</div>
      <div class="row"><div class="k">Quién la controla</div><div class="v">${esc(g.controlador)}</div></div>
      <div class="chips">${g.pais ? `<span class="chip">🌎 ${esc(g.pais)}</span>` : ""}${g.tipo ? `<span class="chip">${esc(g.tipo)}</span>` : ""}${confChip(g.confianza)}${repPill(g)}</div>
      ${!compact && g.tipo && TIPO_INFO[g.tipo] ? `<div class="hint">${esc(TIPO_INFO[g.tipo])}</div>` : ""}
      ${g.fondos ? `<div class="row"><div class="k">Grandes fondos</div><div class="v">${esc(g.fondos)}</div></div>` : ""}
      ${g.gobierno ? `<div class="row"><div class="k">Relación con gobiernos</div><div class="v">${esc(g.gobierno)}</div></div>` : ""}
      ${g.nota ? `<div class="note">${esc(g.nota)}</div>` : ""}
      <div class="row"><div class="k">Fuente</div><div class="v">${fuente}${more}</div></div>`;
  }

  // ---------------------------------------------------------------- Reputación
  const REP = () => QED.REP;
  function evRow(e, full) {
    const t = (REP().TEMAS[e.tema] || { icon: "•", label: e.tema });
    const st = (REP().ESTADOS[e.estado] || { label: e.estado }).label;
    return `<div class="ev"><span class="ic" title="${esc(t.label)}">${t.icon}</span><span class="tx">${esc(e.titulo)}
      <span class="st ${esc(e.estado)}">${esc(st)}</span> <small>${esc(e.anio || "")}${e.pais ? " · " + esc(e.pais) : ""}${e.monto ? " · " + esc(e.monto) : ""}</small>
      ${full && e.resumen ? `<div class="sum">${esc(e.resumen)}</div>` : ""}
      <a href="${esc(safe(e.url))}" target="_blank" rel="noopener noreferrer"><small>${esc(e.fuente || "fuente")}</small></a></span></div>`;
  }
  function meter(sc) {
    return `<div class="score"><span class="num c-${sc.color}">${sc.indice}<small>/100</small></span>
      <span class="bar"><i class="bg-${sc.color}" style="width:${sc.indice}%"></i></span></div>
      <div class="lvl c-${sc.color}">${esc(sc.nivel)} <small style="color:#7a8396;font-weight:400">· ${sc.n} ${sc.n === 1 ? "hecho" : "hechos"} con fuente</small></div>`;
  }
  function details(rec, sc, opts) {
    const evs = sc.eventos;
    const lob = opts.showLobbying !== false ? (rec.lobbying || []) : [];
    const pos = rec.positivos || [];
    return `<details class="more"><summary>Ver ${evs.length ? "todos los hechos" : "detalles"}${lob.length ? ", lobbying" : ""} y método</summary>
      ${evs.map((e) => evRow(e, true)).join("")}
      ${pos.length ? `<div class="sec">Hechos positivos</div>${pos.map((e) => `<div class="ev"><span class="ic">✅</span><span class="tx">${esc(e.titulo)} <small>${esc(e.anio || "")}</small> <a href="${esc(safe(e.url))}" target="_blank" rel="noopener noreferrer"><small>${esc(e.fuente || "fuente")}</small></a></span></div>`).join("")}` : ""}
      ${lob.length ? `<div class="sec">Lobbying y donaciones políticas</div>${lob.map((l) => `<div class="ev"><span class="ic">🏛️</span><span class="tx"><b>${esc(l.dato)}</b> <small>${esc(l.pais)} · ${esc(l.anio || "")}</small>${l.detalle ? `<div class="sum">${esc(l.detalle)}</div>` : ""}<a href="${esc(safe(l.url))}" target="_blank" rel="noopener noreferrer"><small>${esc(l.fuente || "fuente")}</small></a></span></div>`).join("")}` : ""}
      <div class="method">El índice solo resume hechos públicos con fuente: condena 10, multa 8, acuerdo 6, juicio en curso 3, investigación 2, alegación 1, desestimado o anulado 0; pesan menos los de hace más de 3 años y más los de montos grandes. No es una opinión sobre la empresa y no se ajusta por su tamaño.
      ${rec.desdeMatriz ? " Datos de la empresa matriz." : ""} Revisado: ${esc(rec.revisado || "")}${rec.origen ? " · " + esc(rec.origen) : ""}.</div>
    </details>`;
  }
  function repBlock(g, opts, compact) {
    opts = opts || {};
    if (!g || !QED.REP) return "";
    let h = "";
    if (g.rep) {
      const vals = opts.values || {};
      const custom = Object.values(vals).some((v) => v !== 1 && v != null);
      const sc = QED.REP.score(g.rep, custom ? vals : null);
      h += `<div class="rep"><div class="k">Reputación de ${esc(g.rep.nombre || g.empresa)}</div>`;
      if (sc.parcial && !sc.n) h += `<div class="sum">Historial en investigación: aún no hay hechos confirmados.</div>`;
      else {
        h += sc.parcial ? `<div class="sum">Historial incompleto (en investigación); el índice aún no se calcula.</div>` : meter(sc);
        if (custom && !sc.parcial) h += `<div class="sum">Según tus valores: <b class="c-${sc.personal >= 75 ? "ok" : sc.personal >= 50 ? "ver" : "mal"}">${sc.personal}/100</b></div>`;
        if (sc.choques && sc.choques.length) h += `<div class="warn">⚠ Choca con lo que te importa: ${sc.choques.map((t) => esc(QED.REP.TEMAS[t].label)).join(", ")}</div>`;
        if (!compact) h += sc.eventos.slice(0, 3).map((e) => evRow(e, false)).join("");
      }
      h += details(g.rep, sc, opts) + `</div>`;
    } else if (!compact) {
      h += `<div class="rep"><div class="k">Reputación</div><div class="sum">Aún sin investigar. La investigación semanal la incluirá cuando veas esta empresa con frecuencia.</div></div>`;
    }
    const funds = g.fondosRep || [];
    if (funds.length && !compact) {
      h += `<div class="sec">Reputación de sus fondos</div>` + funds.map((f) => {
        const sc = QED.REP.score(f);
        return `<details class="air"><summary>${esc(f.nombre)} <small>· ${sc.parcial ? "en investigación" : `${sc.indice}/100 · ${esc(sc.nivel)}`}</small></summary>
          ${sc.eventos.slice(0, 3).map((e) => evRow(e, false)).join("")}${details(f, sc, opts)}</details>`;
      }).join("");
    }
    return h;
  }
  // Píldora arriba de la tarjeta para ver la reputación sin desplazarse.
  function repPill(g) {
    if (!g || !g.rep || !QED.REP) return "";
    const sc = QED.REP.score(g.rep);
    if (sc.parcial) return "";
    return `<span class="chip" style="font-weight:600" title="${esc(sc.nivel)} · índice de reputación">⚖ <span class="c-${sc.color}">${sc.indice}/100</span></span>`;
  }
  const repChip = (g) => {
    if (!g || !g.rep || !QED.REP) return "";
    const sc = QED.REP.score(g.rep);
    return sc.parcial ? "" : ` <span class="st" title="${esc(sc.nivel)}">Reputación ${sc.indice}/100</span>`;
  };

  // ---------------------------------------------------------------- Alternativas locales
  function altBlock(res) {
    const a = res.alternativas;
    if (!a) return "";
    const head = `🌱 Alternativas de ${esc(a.label.toLowerCase())} con dueño local en ${esc(a.pais)}${a.actualEsLocal ? " <small style=\"text-transform:none;letter-spacing:0\">(esta marca también es de capital local)</small>" : ""}`;
    if (!a.items.length) {
      return `<div class="alt"><div class="k">${head}</div><div class="sum">Aún no tenemos alternativas verificadas de este tipo en ${esc(a.pais)}. Puedes sugerir una desde el ícono de Gina.</div></div>`;
    }
    return `<div class="alt"><div class="k">${head}</div>
      ${a.items.map((it) => `<div class="it"><b>${esc(it.marcas.join(", "))}</b> <span class="why">${esc(it.motivo)}</span> <small>· ${esc(it.capital)}</small>
        <br><small>${esc(it.group.empresa)}${it.rep != null ? ` · ⚖ ${esc(it.rep)}/100` : ""}${it.group.url ? ` · <a href="${esc(safe(it.group.url))}" target="_blank" rel="noopener noreferrer">fuente</a>` : ""}</small></div>`).join("")}
      <div class="method">Sugerencias por tipo de dueño (cooperativa, empleados, familia o fundador) y país; no comparan precio ni calidad.</div></div>`;
  }

  function storeBlock(store) {
    if (!store || !store.group) return "";
    const g = store.group;
    return `<div class="store">🏬 Compras en <b>${esc(store.nombre)}</b> → ${esc(g.empresa)} · ${esc(g.controlador)}${g.pais ? ` · ${esc(g.pais)}` : ""} ${confChip(g.confianza)}${repChip(g)}</div>`;
  }

  function renderTravel(res, opts) {
    if (res.mode === "hospedaje") {
      return `<div class="lead">Reservas en <b>${esc(res.agency && res.agency.nombre)}</b></div>${groupBlock(res.agency && res.agency.group)}${repBlock(res.agency && res.agency.group, opts)}`;
    }
    let h = "";
    if (res.airline) h += `<div class="lead">✈️ Vuelas con <b>${esc(res.airline.nombre)}</b></div>${groupBlock(res.airline.group)}${repBlock(res.airline.group, opts)}`;
    const list = res.airlines || [];
    if (list.length) {
      h += `<div class="sec">${res.airline ? "Otras aerolíneas en esta página" : "Aerolíneas en esta página"}</div>`;
      h += list.map((a, i) => `<details class="air"${i === 0 && !res.airline ? " open" : ""}><summary>${esc(a.n)} <small>· ${esc((a.group || {}).empresa)} · ${esc((a.group || {}).pais)} · aparece ${esc(a.count)} ${a.count === 1 ? "vez" : "veces"}</small></summary>${groupBlock(a.group, true)}${repBlock(a.group, opts, true)}</details>`).join("");
    } else if (!res.airline) {
      h += `<div class="hint">Aún no se detectan aerolíneas en la página. Aparecerán cuando carguen los resultados de la búsqueda.</div>`;
    }
    if (res.agency && res.agency.group) {
      const g = res.agency.group;
      h += `<div class="store">🧭 Reservas en <b>${esc(res.agency.nombre)}</b> → ${esc(g.empresa)} · ${esc(g.controlador)}${g.pais ? ` · ${esc(g.pais)}` : ""} ${confChip(g.confianza)}${repChip(g)}</div>`;
    }
    return h;
  }

  function render(res, opts) {
    if (res.mode) return renderTravel(res, opts);
    if (res.found) {
      const g = res.group || {};
      return `
        <div class="brand">Marca detectada: <b>${esc(res.brand)}</b> <span style="color:#9aa2b2">(${esc(res.source)})</span></div>
        ${groupBlock(g)}
        ${res.how === "título" ? `<div class="hint">La marca se dedujo del título del producto; revisa que sea la correcta.</div>` : ""}
        ${res.kind === "ai" ? `<div class="hint">Clasificado por IA (${esc(res.model)}, certeza ${esc(res.certeza)}). Quedó en la cola para que la investigación semanal lo confirme con fuentes.</div>` : ""}
        ${res.kind === "ai-base" ? `<div class="hint">La IA asoció esta marca a un grupo que ya está en la base (${esc(res.model)}); los datos del grupo vienen de la base.</div>` : ""}
        ${altBlock(res)}
        ${res.kind === "ai" ? "" : repBlock(g, opts)}
        ${storeBlock(res.store)}`;
    }
    if (res.kind === "loading") {
      return `<div class="emp"><span class="spin"></span>Consultando…</div>
        <div class="v">${res.brandText ? `La marca <b>${esc(res.brandText)}</b> no está en la memoria local; preguntando a la IA.` : "Analizando el producto con IA."}</div>`;
    }
    const why = {
      disabled: "La consulta con IA está desactivada. Puedes activarla en Opciones.",
      consent: "Falta tu consentimiento para enviar la marca y el título a la IA. Actívalo en Opciones → Guardar configuración.",
      limit: `Se alcanzó el límite diario de consultas a la IA (${esc(res.limit)}).`,
      error: `No se pudo consultar la IA: ${esc(res.aiError)}`
    }[res.aiStatus] || "";
    return `
      <div class="emp">Marca no encontrada en la base</div>
      <div class="v">${res.brandText ? `La página indica la marca <b>${esc(res.brandText)}</b>, pero todavía no está en la base.` : "No se pudo leer la marca de este producto."}</div>
      ${res.kind === "ai-unknown" ? `<div class="hint">La IA tampoco la reconoce con certeza.</div>` : ""}
      ${why ? `<div class="hint">${why}</div>` : ""}
      <div class="hint">📋 Quedó registrada como pendiente. Puedes sugerirla al proyecto o agregarla tú desde el ícono de Gina.</div>
      ${altBlock(res)}
      ${storeBlock(res.store)}`;
  }

  function getHost() {
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.attachShadow({ mode: "open" });
      document.documentElement.appendChild(host);
    }
    return host;
  }

  QED.showCard = function (res, opts) {
    opts = opts || {};
    const shadow = getHost().shadowRoot;
    if (opts.minimized) {
      const label = res.mode === "vuelos" ? `✈️ ${(res.airline ? 1 : 0) + (res.airlines || []).length} aerolínea(s)` : res.mode === "hospedaje" ? "🏨 Reserva" : `🔎 ${esc(res.found ? res.brand : "Marca")}`;
      shadow.innerHTML = `<style>${CSS}</style><button class="mini" title="Gina: ¿a quién apoya tu dinero?">${label} · Gina</button>`;
      shadow.querySelector(".mini").onclick = () => { opts.onToggle && opts.onToggle(false); };
      return;
    }
    shadow.innerHTML = `<style>${CSS}</style>
      <div class="wrap"><div class="card">
        <div class="top"><span class="t"><b>Gina</b> · ${res.mode === "vuelos" ? "¿a quién apoya tu dinero en este vuelo?" : res.mode === "hospedaje" ? "¿a quién apoya tu dinero en esta reserva?" : "¿a quién apoya tu dinero con esta marca?"}</span>
          <button class="min" title="Minimizar">–</button><button class="x" title="Cerrar en esta página">✕</button></div>
        <div class="body">${render(res, opts)}</div>
        <div class="foot">Información orientativa basada en fuentes públicas. No es una recomendación de compra ni de inversión.</div>
      </div></div>`;
    shadow.querySelector(".min").onclick = () => { opts.onToggle && opts.onToggle(true); };
    shadow.querySelector(".x").onclick = () => { QED.hideCard(); opts.onClose && opts.onClose(); };
  };

  QED.hideCard = function () {
    const h = document.getElementById(HOST_ID);
    if (h) h.remove();
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
