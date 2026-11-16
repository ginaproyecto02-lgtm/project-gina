// SPDX-License-Identifier: MIT
// Gina — Herramienta de auditoría y prueba manual del MVP (Puerta 1).

const ITEMS_PRUEBA = [
  {
    secId: "instalacion",
    secTitle: "1. Instalación y arranque",
    items: [
      { id: "inst_chrome", title: "Carga en Chrome / Edge", desc: "Instalar vía 'Cargar descomprimida' sin advertencias ni errores en manifest." },
      { id: "inst_firefox", title: "Carga en Firefox", desc: "Carga temporal en about:debugging sin errores de compatibilidad." },
      { id: "inst_popup", title: "Popup inicial operativo", desc: "Abre correctamente, reporta fecha de base y conteo de marcas." }
    ]
  },
  {
    secId: "tiendas_mx",
    secTitle: "2. 10 Tiendas de México",
    items: [
      { id: "store_amazon_mx", title: "Amazon México", dominio: "amazon.com.mx", url: "https://www.amazon.com.mx/s?k=nutella+1+kg", desc: "Extracción de marca, byline y tarjeta de producto." },
      { id: "store_ml_mx", title: "Mercado Libre México", dominio: "mercadolibre.com.mx", url: "https://listado.mercadolibre.com.mx/nutella-1-kg", desc: "Extracción por ficha técnica o título." },
      { id: "store_walmart_mx", title: "Walmart México", dominio: "walmart.com.mx", url: "https://www.walmart.com.mx/search?q=nutella+1+kg", desc: "Lectura de marca y precio en catálogo." },
      { id: "store_aurrera_mx", title: "Bodega Aurrera", dominio: "bodegaaurrera.com.mx", url: "https://despensa.bodegaaurrera.com.mx/search?q=arroz", desc: "Detección de marca propia o productos de despensa." },
      { id: "store_liverpool_mx", title: "Liverpool México", dominio: "liverpool.com.mx", url: "https://www.liverpool.com.mx/tienda?s=cafe", desc: "Extracción por JSON-LD en ficha de producto." },
      { id: "store_coppel_mx", title: "Coppel", dominio: "coppel.com", url: "https://www.coppel.com/buscar?q=tenis", desc: "Carga de tarjeta y verificación de vendedor." },
      { id: "store_soriana_mx", title: "Soriana", dominio: "soriana.com", url: "https://www.soriana.com/buscar?q=leche", desc: "Extracción de marca en catálogo de supermercado." },
      { id: "store_chedraui_mx", title: "Chedraui", dominio: "chedraui.com.mx", url: "https://www.chedraui.com.mx/search?q=atun", desc: "Detección de marcas y alternativas en abarrotes." },
      { id: "store_homedepot_mx", title: "Home Depot México", dominio: "homedepot.com.mx", url: "https://www.homedepot.com.mx/buscar?text=taladro", desc: "Extracción de marcas de ferretería y herramientas." },
      { id: "store_costco_mx", title: "Costco México", dominio: "costco.com.mx", url: "https://www.costco.com.mx/buscar?text=cafe", desc: "Detección de marcas propias y marcas comerciales." }
    ]
  },
  {
    secId: "comparador",
    secTitle: "3. Comparador de precios (5 casos del dueño)",
    items: [
      { id: "comp_caso1", title: "Caso 1: Nutella 1 kg", desc: "Distingue mismo producto vs presentaciones de 350g/650g o B-ready." },
      { id: "comp_caso2", title: "Caso 2: Coca-Cola 355 ml", desc: "Distingue mismo producto vs Coca-Cola Sin Azúcar o botellas de 600ml." },
      { id: "comp_caso3", title: "Caso 3: Taladro Bosch GSB 13 RE", desc: "Distingue mismo modelo vs voltajes incompatibles o modelos GSB 16." },
      { id: "comp_caso4", title: "Caso 4: Nupec Felino Adulto Indoor 5 kg", desc: "Distingue misma fórmula vs presentaciones Kitten o 1.5kg." },
      { id: "comp_caso5", title: "Caso 5: Nupec Adulto Razas Pequeñas 8 kg", desc: "Distingue misma fórmula vs razas medianas o cachorros." }
    ]
  },
  {
    secId: "sugerencias",
    secTitle: "4. Flujo de sugerencias y alternativas",
    items: [
      { id: "sug_send", title: "Envío directo a Apps Script", desc: "Envío sin abrir pestañas ni cliente de correo." },
      { id: "sug_status", title: "Aviso de estado enviado / en cola", desc: "Muestra 'enviada' o 'en_cola' según conectividad." },
      { id: "sug_retry", title: "Reintento de sugerencias en cola", desc: "La alarma periódica vacía la cola local al recuperar red." },
      { id: "sug_alt", title: "Formulario de alternativas locales", desc: "Sugerir cooperativa o empresa familiar con fuente verificable." }
    ]
  }
];

// Función pura: genera el reporte estructurado en Markdown
function aMarkdown(estado, meta) {
  estado = estado || {};
  meta = meta || {};

  const fecha = meta.fecha || new Date().toISOString().slice(0, 10);
  const navegador = meta.navegador || "Navegador no especificado";
  const version = meta.version || "1.0";

  let totalPasa = 0;
  let totalFalla = 0;
  let totalSinProbar = 0;

  for (const sec of ITEMS_PRUEBA) {
    for (const item of sec.items) {
      const st = (estado[item.id] && estado[item.id].status) || "sin_probar";
      if (st === "pasa") totalPasa++;
      else if (st === "falla") totalFalla++;
      else totalSinProbar++;
    }
  }

  const total = totalPasa + totalFalla + totalSinProbar;

  const lines = [
    "# Project Gina — Reporte de prueba manual del MVP (Puerta 1)",
    "",
    `- **Fecha:** ${fecha}`,
    `- **Navegador:** ${navegador}`,
    `- **Versión del agente:** \`${version}\``,
    `- **Resultado global:** ${totalPasa} pasan · ${totalFalla} fallan · ${totalSinProbar} sin probar (total: ${total})`,
    ""
  ];

  for (const sec of ITEMS_PRUEBA) {
    lines.push(`## ${sec.secTitle}`);
    lines.push("");

    if (sec.secId === "tiendas_mx") {
      lines.push("| Tienda | Dominio | Enlace de búsqueda | Estado | Notas |");
      lines.push("|---|---|---|---|---|");
      for (const item of sec.items) {
        const row = estado[item.id] || { status: "sin_probar", note: "" };
        const icon = row.status === "pasa" ? "✅ Pasa" : row.status === "falla" ? "❌ Falla" : "⚪ Sin probar";
        const link = item.url ? `[Buscar en ${item.title}](${item.url})` : "—";
        const note = (row.note || "—").replace(/\|/g, "\\|");
        lines.push(`| ${item.title} | \`${item.dominio}\` | ${link} | ${icon} | ${note} |`);
      }
    } else {
      lines.push("| Punto de verificación | Descripción | Estado | Notas |");
      lines.push("|---|---|---|---|");
      for (const item of sec.items) {
        const row = estado[item.id] || { status: "sin_probar", note: "" };
        const icon = row.status === "pasa" ? "✅ Pasa" : row.status === "falla" ? "❌ Falla" : "⚪ Sin probar";
        const note = (row.note || "—").replace(/\|/g, "\\|");
        lines.push(`| ${item.title} | ${item.desc} | ${icon} | ${note} |`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

function detectarNavegador() {
  if (typeof navigator === "undefined") return { navegador: "Node.js", version: process.version };
  const ua = navigator.userAgent;
  let navegador = "Chrome";
  if (ua.includes("Firefox/")) navegador = "Firefox";
  else if (ua.includes("Edg/")) navegador = "Edge";
  return { navegador, version: ua };
}

// Inicialización de interfaz en el navegador
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", async () => {
    const api = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
    let estado = {};

    try {
      if (api && api.storage && api.storage.local) {
        const res = await api.storage.local.get("pruebaMVP");
        if (res && res.pruebaMVP) estado = res.pruebaMVP;
      }
    } catch (_) {}

    const root = document.getElementById("checklistRoot");
    const summaryEl = document.getElementById("summaryCounts");
    const msgStatus = document.getElementById("msgStatus");

    function actualizarResumen() {
      let pasa = 0, falla = 0, sin = 0;
      for (const sec of ITEMS_PRUEBA) {
        for (const it of sec.items) {
          const st = (estado[it.id] && estado[it.id].status) || "sin_probar";
          if (st === "pasa") pasa++;
          else if (st === "falla") falla++;
          else sin++;
        }
      }
      if (summaryEl) {
        summaryEl.textContent = `${pasa} pasados · ${falla} fallidos · ${sin} pendientes`;
      }
    }

    async function guardarEstado() {
      try {
        if (api && api.storage && api.storage.local) {
          await api.storage.local.set({ pruebaMVP: estado });
          if (msgStatus) {
            msgStatus.textContent = "Guardado";
            setTimeout(() => { msgStatus.textContent = ""; }, 1500);
          }
        }
      } catch (_) {}
      actualizarResumen();
    }

    if (root) {
      root.innerHTML = "";
      for (const sec of ITEMS_PRUEBA) {
        const secDiv = document.createElement("section");
        secDiv.className = "sec-card";

        const h2 = document.createElement("h2");
        h2.textContent = sec.secTitle;
        secDiv.appendChild(h2);

        for (const item of sec.items) {
          const row = document.createElement("div");
          row.className = "item-row";

          const colTitle = document.createElement("div");
          const tSpan = document.createElement("div");
          tSpan.className = "item-title";
          tSpan.textContent = item.title;
          colTitle.appendChild(tSpan);

          const subSpan = document.createElement("div");
          subSpan.className = "item-sub";
          if (item.url) {
            subSpan.innerHTML = `${item.desc} — <a href="${item.url}" target="_blank" rel="noopener">Abrir búsqueda ↗</a>`;
          } else {
            subSpan.textContent = item.desc;
          }
          colTitle.appendChild(subSpan);
          row.appendChild(colTitle);

          // Selector de estado
          const colSelect = document.createElement("div");
          const select = document.createElement("select");
          select.className = "status-select";
          select.dataset.id = item.id;

          const optSin = document.createElement("option");
          optSin.value = "sin_probar";
          optSin.textContent = "⚪ Sin probar";
          const optPasa = document.createElement("option");
          optPasa.value = "pasa";
          optPasa.textContent = "✅ Pasa";
          const optFalla = document.createElement("option");
          optFalla.value = "falla";
          optFalla.textContent = "❌ Falla";

          select.appendChild(optSin);
          select.appendChild(optPasa);
          select.appendChild(optFalla);

          const currentSt = (estado[item.id] && estado[item.id].status) || "sin_probar";
          select.value = currentSt;
          select.classList.add(currentSt);

          select.addEventListener("change", (e) => {
            const val = e.target.value;
            select.className = `status-select ${val}`;
            if (!estado[item.id]) estado[item.id] = {};
            estado[item.id].status = val;
            guardarEstado();
          });
          colSelect.appendChild(select);
          row.appendChild(colSelect);

          // Campo de notas
          const colNote = document.createElement("div");
          const noteInput = document.createElement("input");
          noteInput.type = "text";
          noteInput.className = "notes-input";
          noteInput.placeholder = "Notas u observaciones…";
          noteInput.value = (estado[item.id] && estado[item.id].note) || "";

          noteInput.addEventListener("input", (e) => {
            if (!estado[item.id]) estado[item.id] = {};
            estado[item.id].note = e.target.value;
            guardarEstado();
          });
          colNote.appendChild(noteInput);
          row.appendChild(colNote);

          secDiv.appendChild(row);
        }

        root.appendChild(secDiv);
      }
      actualizarResumen();
    }

    const btnCopy = document.getElementById("btnCopyMd");
    if (btnCopy) {
      btnCopy.addEventListener("click", async () => {
        const meta = {
          ...detectarNavegador(),
          fecha: new Date().toISOString().slice(0, 10)
        };
        const md = aMarkdown(estado, meta);
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(md);
          }
          if (msgStatus) {
            msgStatus.textContent = "¡Copiado al portapapeles!";
            setTimeout(() => { msgStatus.textContent = ""; }, 2500);
          }
        } catch (err) {
          if (msgStatus) msgStatus.textContent = "Error al copiar";
        }
      });
    }
  });
}

if (typeof module !== "undefined") {
  module.exports = { aMarkdown, ITEMS_PRUEBA };
}
