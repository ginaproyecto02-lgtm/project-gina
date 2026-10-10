// Generación de capturas y vistas previas de las 4 tiendas:
// 1. Nutella en Amazon MX
// 2. Ariel en Walmart MX
// 3. Audífonos Philips en Mercado Libre
// 4. Pantalla Samsung en Liverpool
// Tanto cerrada como abierta.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { JSDOM } = require("jsdom");
const puppeteer = require("puppeteer-core");

const EXT = path.join(__dirname, "..", "extension");
const OUT = path.join(__dirname, "..", "store", "imagenes");
const PREVIEWS_DIR = path.join(__dirname, "..", "store", "previews");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(PREVIEWS_DIR)) fs.mkdirSync(PREVIEWS_DIR, { recursive: true });

const db = JSON.parse(fs.readFileSync(path.join(EXT, "data/brands.json"), "utf8"));
const registry = JSON.parse(fs.readFileSync(path.join(EXT, "data/sites.json"), "utf8"));

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function ld(o) {
  return `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
}

const BASE_PAGE_CSS = `
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f3f5f8; color: #111; }
.top-nav { background: #131921; color: #fff; padding: 14px 32px; font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: space-between; }
.top-nav.walmart { background: #0071dc; }
.top-nav.meli { background: #ffe600; color: #333; }
.top-nav.liverpool { background: #e10098; }
.container { max-width: 1100px; margin: 30px auto; padding: 24px; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.06); display: flex; gap: 40px; }
.prod-img { width: 360px; height: 360px; background: linear-gradient(135deg, #eef2f7, #dce4ee); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 80px; flex-shrink: 0; }
.prod-info { flex: 1; display: flex; flex-direction: column; gap: 12px; }
.prod-title { font-size: 24px; font-weight: 700; line-height: 1.3; margin: 0; }
.prod-brand { font-size: 14px; color: #007185; text-decoration: none; }
.rating-line { font-size: 14px; color: #555; }
.prod-price { font-size: 28px; font-weight: 700; color: #b12704; margin-top: 8px; }
.seller-box { background: #f8f9fa; border: 1px solid #e2e6ea; border-radius: 8px; padding: 14px; font-size: 13px; margin-top: 10px; line-height: 1.5; }
.seller-box b { color: #111; }
.buy-btn { background: #ffd814; border: 1px solid #fcd200; border-radius: 20px; padding: 10px 24px; font-weight: 600; cursor: pointer; width: fit-content; margin-top: 8px; }
`;

const SCENARIOS = [
  {
    id: "1-nutella-amazon",
    name: "Nutella en Amazon MX",
    url: "https://www.amazon.com.mx/dp/B0NUTELLA650",
    openSection: "rel", // Abre Confiabilidad
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_PAGE_CSS}</style></head><body>
      <div class="top-nav">amazon.com.mx <span>México</span></div>
      <div class="container">
        <div class="prod-img">🌰</div>
        <div class="prod-info">
          <a class="prod-brand" id="bylineInfo">Visita la tienda de Ferrero</a>
          <h1 class="prod-title" id="productTitle">Nutella Crema de Avellanas con Cacao, 650 g</h1>
          <div class="rating-line">⭐ 4.8 de 5 estrellas (12,850 calificaciones)</div>
          <div class="prod-price">$119.00</div>
          <div class="seller-box">
            <div><b>Vendido y enviado por:</b> Amazon México</div>
            <div><b>Entrega:</b> Envío gratis con Amazon Prime</div>
            <div><b>Devolución:</b> Política de devolución de 30 días de Amazon</div>
          </div>
          <button class="buy-btn">Agregar al carrito</button>
        </div>
      </div>
      ${ld({ "@type": "Product", name: "Nutella Crema de Avellanas con Cacao, 650 g", brand: "Ferrero", aggregateRating: { ratingValue: 4.8, reviewCount: 12850 } })}
    </body></html>`
  },
  {
    id: "2-ariel-walmart",
    name: "Ariel en Walmart MX",
    url: "https://www.walmart.com.mx/ip/detergente/00750",
    openSection: "mkt", // Abre Mercado y alternativas
    opts: { values: { seguridad: 2 } }, // Dispara alerta de valor
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_PAGE_CSS}</style></head><body>
      <div class="top-nav walmart">Walmart México <span>Supermercado</span></div>
      <div class="container">
        <div class="prod-img">🧴</div>
        <div class="prod-info">
          <span class="prod-brand">Marca: Ariel</span>
          <h1 class="prod-title">Detergente Líquido Ariel Doble Poder Concentrado 4 L</h1>
          <div class="rating-line">⭐ 4.7 de 5 estrellas (5,420 calificaciones)</div>
          <div class="prod-price">$185.00</div>
          <div class="seller-box">
            <div><b>Vendido y enviado por:</b> Walmart México</div>
            <div><b>Garantía:</b> 30 días con Walmart</div>
          </div>
          <button class="buy-btn" style="background:#0071dc;color:#fff;border-color:#0071dc;">Agregar al carrito</button>
        </div>
      </div>
      ${ld({ "@type": "Product", name: "Detergente Líquido Ariel Doble Poder Concentrado 4 L", brand: "Ariel", aggregateRating: { ratingValue: 4.7, reviewCount: 5420 } })}
    </body></html>`
  },
  {
    id: "3-philips-mercadolibre",
    name: "Audífonos Philips en Mercado Libre",
    url: "https://articulo.mercadolibre.com.mx/MLM-PHILIPS-TAH4205",
    openSection: "mkt", // Abre Mercado y alternativas (audio_electronica)
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_PAGE_CSS}</style></head><body>
      <div class="top-nav meli">Mercado Libre <span>México</span></div>
      <div class="container">
        <div class="prod-img">🎧</div>
        <div class="prod-info">
          <span style="font-size:12px;color:#00a650;font-weight:700;">MÁS VENDIDO · 1º en Audífonos Inalámbricos</span>
          <h1 class="prod-title ui-pdp-title">Audífonos Inalámbricos Philips TAH4205 Bluetooth con Micrófono</h1>
          <div class="rating-line">⭐ 4.6 (8,910 opiniones)</div>
          <div class="prod-price">$699.00</div>
          <div class="seller-box">
            <div><b>Tienda Oficial:</b> Philips Audio México</div>
            <div><b>Envío:</b> ⚡ FULL · Llega gratis mañana</div>
            <div><b>Garantía:</b> 12 meses de garantía de fábrica</div>
          </div>
          <button class="buy-btn" style="background:#3483fa;color:#fff;border-color:#3483fa;">Comprar ahora</button>
        </div>
      </div>
      <table><tr class="andes-table__row"><th class="andes-table__header">Marca</th><td class="andes-table__column">Philips</td></tr></table>
      ${ld({ "@type": "Product", name: "Audífonos Inalámbricos Philips TAH4205 Bluetooth", brand: "Philips", aggregateRating: { ratingValue: 4.6, reviewCount: 8910 } })}
    </body></html>`
  },
  {
    id: "4-samsung-liverpool",
    name: "Pantalla Samsung en Liverpool",
    url: "https://www.liverpool.com.mx/tienda/pdp/pantalla-samsung-55/1000",
    openSection: "own", // Abre ¿A quién le compras?
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_PAGE_CSS}</style></head><body>
      <div class="top-nav liverpool">Liverpool <span>Es parte de mi vida</span></div>
      <div class="container">
        <div class="prod-img">📺</div>
        <div class="prod-info">
          <span class="prod-brand">Samsung</span>
          <h1 class="prod-title">Pantalla Smart TV Samsung 55 Pulgadas Crystal UHD 4K UN55DU7000FXZX</h1>
          <div class="rating-line">⭐ 4.9 de 5 (1,430 calificaciones)</div>
          <div class="prod-price">$8,499.00</div>
          <div class="seller-box">
            <div><b>Vendido por:</b> Liverpool</div>
            <div><b>Envío:</b> Gratis a todo México</div>
            <div><b>Garantía:</b> 1 año con fabricante y garantía Liverpool</div>
          </div>
          <button class="buy-btn" style="background:#e10098;color:#fff;border-color:#e10098;">Comprar ahora</button>
        </div>
      </div>
      ${ld({ "@type": "Product", name: "Pantalla Smart TV Samsung 55 Pulgadas Crystal UHD 4K", brand: "Samsung", aggregateRating: { ratingValue: 4.9, reviewCount: 1430 } })}
    </body></html>`
  }
];

function generateRenderedHtml(scenario, openSection) {
  const dom = new JSDOM(scenario.html, { url: scenario.url, runScripts: "outside-only" });
  const w = dom.window;

  for (const f of ["src/matcher.js", "src/reputation.js", "src/alternativas.js", "src/extractors.js", "src/flights.js", "src/i18n.js", "src/card.js"]) {
    vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), dom.getInternalVMContext());
  }
  if (w.QED.I18N) w.QED.I18N.setLang("es");

  const QED = w.QED;
  const u = new URL(scenario.url);
  const index = QED.buildIndex(db, [], {}, {});
  const entry = QED.siteInfo(registry, u.hostname, u.pathname);
  const data = QED.extract(w.document, u.hostname);
  const r = QED.match(index, data.candidates, data.title);
  r.store = entry && entry.tipo === "tienda" ? { nombre: entry.nombre, group: index.groups[entry.g], id: entry.g, entry, modelo: entry.modelo, pais: entry.pais } : null;

  const prep = QED.ALT.prepare(db, index);
  const cat = entry && entry.tipo === "tienda" ? QED.ALT.category(prep, r.found ? r.brand : r.brandText, data.title) : null;
  if (cat) {
    const otherBrands = r.group && r.group.id ? QED.ALT.otherBrandsOfSameOwner(prep, r.group.id, r.found ? r.brand : r.brandText, 6) : [];
    const dominant = QED.ALT.categoryDominantBrands(prep, cat, 4);
    r.alternativas = {
      cat,
      label: prep.cats[cat].label,
      pais: entry.pais,
      items: QED.ALT.suggest(prep, cat, entry.pais, r.group && r.group.id, null, 3),
      otherBrands,
      dominant,
      actualEsLocal: !!(r.group && QED.ALT.INDEP[r.group.tipo] && QED.ALT.countries(r.group.pais).includes(entry.pais))
    };
  }
  if (QED.evaluateReliability) {
    r.reliabilityEval = QED.evaluateReliability(data.reliability, r.group, cat, data.title, entry ? entry.pais : "México", entry);
  }

  const cardOpts = Object.assign({}, scenario.opts || {});
  QED.showCard(r, cardOpts);

  // Manipular shadowRoot para el estado de sección
  const host = w.document.getElementById("gina-tarjeta");
  if (host && host.shadowRoot) {
    const shadow = host.shadowRoot;
    if (openSection) {
      const btn = shadow.querySelector(`.sec-btn[data-sec="${openSection}"]`);
      const body = shadow.getElementById(`sec-${openSection}-body`);
      if (btn && body) {
        btn.setAttribute("aria-expanded", "true");
        body.removeAttribute("hidden");
        const arr = btn.querySelector(".sec-arr");
        if (arr) arr.style.transform = "rotate(180deg)";
      }
    }
    // Para que se renderice autónomamente sin Shadow DOM en navegadores de captura estática
    const shadowHtml = shadow.innerHTML;
    host.innerHTML = `<div class="gina-shadow-container">${shadowHtml}</div>`;
  }

  return dom.serialize();
}

async function captureAll() {
  console.log("Iniciando captura de pantallas con Puppeteer...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1280,800"]
  });

  try {
    for (const sc of SCENARIOS) {
      console.log(`\nGenerando escenario: ${sc.name}...`);
      
      // 1. Cerrada
      const htmlClosed = generateRenderedHtml(sc, null);
      const fileClosed = path.join(PREVIEWS_DIR, `${sc.id}-cerrada.html`);
      fs.writeFileSync(fileClosed, htmlClosed, "utf8");

      const pageClosed = await browser.newPage();
      await pageClosed.setViewport({ width: 1280, height: 800 });
      await pageClosed.goto("file://" + fileClosed.replace(/\\/g, "/"), { waitUntil: "networkidle0" });
      const imgClosedPath = path.join(OUT, `captura-${sc.id}-cerrada.png`);
      await pageClosed.screenshot({ path: imgClosedPath });
      await pageClosed.close();
      console.log(`✔ Captura cerrada guardada en ${imgClosedPath}`);

      // 2. Abierta
      const htmlOpen = generateRenderedHtml(sc, sc.openSection);
      const fileOpen = path.join(PREVIEWS_DIR, `${sc.id}-abierta.html`);
      fs.writeFileSync(fileOpen, htmlOpen, "utf8");

      const pageOpen = await browser.newPage();
      await pageOpen.setViewport({ width: 1280, height: 800 });
      await pageOpen.goto("file://" + fileOpen.replace(/\\/g, "/"), { waitUntil: "networkidle0" });
      const imgOpenPath = path.join(OUT, `captura-${sc.id}-abierta.png`);
      await pageOpen.screenshot({ path: imgOpenPath });
      await pageOpen.close();
      console.log(`✔ Captura abierta guardada en ${imgOpenPath}`);
    }

    // Actualizar también las capturas de tienda estándar (captura-1-producto.png, etc.)
    fs.copyFileSync(path.join(OUT, "captura-1-nutella-amazon-abierta.png"), path.join(OUT, "captura-1-producto.png"));
    fs.copyFileSync(path.join(OUT, "captura-4-samsung-liverpool-abierta.png"), path.join(OUT, "captura-2-reputacion.png"));

    console.log("\n¡Todas las capturas generadas con éxito!");
  } finally {
    await browser.close();
  }
}

captureAll().catch((err) => {
  console.error("Error al generar capturas:", err);
  process.exit(1);
});
