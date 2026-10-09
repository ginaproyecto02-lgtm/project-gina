# Capturas 1280x800 para las fichas de las tiendas (Chrome, Edge, Firefox).
# Usa páginas de demostración neutrales (no imitan el diseño de ninguna tienda) y la extensión real cargada en Chromium.
import asyncio, json, threading, os
from http.server import BaseHTTPRequestHandler, HTTPServer
from playwright.async_api import async_playwright

EXT = "/home/claude/ext/extension"
OUT = "/home/claude/ext/store/imagenes"
PROFILE = "/tmp/claude-0/pw-prof-capturas"

class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*"); self.send_header("Access-Control-Allow-Headers", "*"); self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    def do_OPTIONS(self): self.send_response(204); self._cors(); self.end_headers()
    def do_POST(self):
        self.rfile.read(int(self.headers["Content-Length"]))
        ans = {"conocida": True, "marca": "Truper", "grupo_id": None, "empresa": "Truper S.A. de C.V.", "controlador": "Familia fundadora (empresa privada mexicana)",
               "pais": "México", "tipo": "Familia", "fondos": "", "gobierno": "", "nota": "", "certeza": "media"}
        out = json.dumps({"choices": [{"message": {"content": json.dumps(ans, ensure_ascii=False)}}], "usage": {"prompt_tokens": 900, "completion_tokens": 60}}).encode()
        self.send_response(200); self._cors(); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(out)
    def log_message(self, *a): pass
srv = HTTPServer(("127.0.0.1", 0), H); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()

def ld(o): return '<script type="application/ld+json">' + json.dumps(o, ensure_ascii=False) + "</script>"
CSS = """<style>
body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#f5f6f8;color:#1c2233}
.cap{background:#1f2a44;color:#fff;padding:18px 40px;font-size:22px;font-weight:700}
.cap span{color:#c9a227}
.wrap{display:flex;gap:40px;padding:36px 40px}
.img{width:420px;height:420px;border-radius:12px;background:linear-gradient(135deg,#dfe4ee,#c7cfde);display:flex;align-items:center;justify-content:center;font-size:90px}
.info h1{font-size:30px;margin:0 0 10px;max-width:420px}
.price{font-size:32px;font-weight:700;margin:16px 0}
.btn{display:inline-block;background:#3a4a6b;color:#fff;padding:12px 26px;border-radius:8px;margin-top:10px}
.muted{color:#6a7386}
.list{padding:24px 40px;max-width:640px}
.r{background:#fff;border:1px solid #dde2ea;border-radius:10px;padding:14px 18px;margin:10px 0;display:flex;justify-content:space-between;font-size:17px}
</style>"""
def page(cap, body): return CSS + f'<div class="cap">{cap}</div>' + body
PRODUCT = page('Prefer local? <span>Co-op and family-owned alternatives</span> for what you buy',
  '<div class="wrap"><div class="img">🥛</div><div class="info"><div class="muted">Sample product page</div><h1>Great Value Whole Milk, 1 gal</h1>'
  '<div class="muted">Brand: Great Value</div><div class="price">$3.48</div><div class="btn">Add to cart</div></div></div>'
  + ld({"@type": "Product", "name": "Great Value Whole Milk", "brand": {"@type": "Brand", "name": "Great Value"}}))
REP = page('A <span>sourced track record</span>: fines, lawsuits and lobbying, scored openly',
  '<div class="wrap"><div class="img">📱</div><div class="info"><div class="muted">Sample product page</div><h1>iPhone 17 Pro 256 GB</h1>'
  '<div class="muted">Brand: Apple</div><div class="price">$1,099</div><div class="btn">Add to cart</div></div></div>'
  + ld({"@type": "Product", "name": "iPhone 17 Pro", "brand": {"@type": "Brand", "name": "Apple"}}))
FLIGHTS = page('On flight searches, <span>who controls each airline</span>',
  '<div class="list"><div class="muted">Resultados de ejemplo · Ciudad de México → Las Vegas</div>' +
  "".join(f'<div class="r"><b>{t}</b><span>{a}</span><b>{p}</b></div>' for t, a, p in [
    ("07:10 – 09:05", "<span>Aeroméxico</span>", "$4,820"), ("08:30 – 10:20", "<span>Volaris</span>", "$3,190"),
    ("11:45 – 13:40", "<span>Viva Aerobus</span>", "$2,990"), ("15:00 – 19:50", "<span>American</span>", "$5,410"), ("18:20 – 20:15", "<span>Aeroméxico</span>", "$4,350")]) + "</div>")
AI = page('New brand? <span>AI classifies it</span>; weekly research confirms it with sources',
  '<div class="wrap"><div class="img">🔨</div><div class="info"><div class="muted">Sample product page</div><h1>Claw hammer 16 oz, fiberglass handle</h1>'
  '<a id="bylineInfo">Visit the Truper Store</a><div class="price">$12.99</div><div class="btn">Add to cart</div></div></div>')
SHOTS = [
  ("1-producto", "https://www.walmart.com/ip/Great-Value-Milk/10450114", PRODUCT, False, "alt"),
  ("2-reputacion", "https://www.bestbuy.com/site/iphone/6600.p", REP, False, "open"),
  ("3-vuelos", "https://www.google.com/travel/flights/search?tfs=demo", FLIGHTS, False, False),
  ("4-marca-nueva-ia", "https://www.amazon.com/dp/B0DEMO0001", AI, True, False),
]

async def main():
    os.system(f"rm -rf {PROFILE} {OUT}/captura-*.png")
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(PROFILE, headless=True, channel="chromium",
            args=[f"--disable-extensions-except={EXT}", f"--load-extension={EXT}"], viewport={"width": 1280, "height": 800})
        pages = {u: html for _, u, html, _, _ in SHOTS}
        async def handler(route):
            u = route.request.url
            if u in pages: await route.fulfill(status=200, content_type="text/html; charset=utf-8", body=pages[u])
            elif u.startswith("chrome-extension:") or u.startswith("http://127.0.0.1"): await route.continue_()
            else: await route.abort()
        await ctx.route("**/*", handler)
        sw = ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event("serviceworker")
        ext_id = sw.url.split("/")[2]
        opt = await ctx.new_page()
        await opt.goto(f"chrome-extension://{ext_id}/options/options.html")
        await opt.evaluate("() => chrome.storage.local.set({ settings: { values: { laboral: 2, privacidad: 2, ambiental: 2 }, showLobbying: true } })")
        for name, u, _, needs_ai, expand in SHOTS:
            if needs_ai:
                await opt.evaluate("""(port) => chrome.storage.local.set({ settings: { aiEnabled: true, dailyLimit: 100, cacheDays: 90, values: { laboral: 2, privacidad: 2, ambiental: 2 }, showLobbying: true,
                    classify: { provider: 'anthropic', key: 'demo', model: 'claude-haiku-5-5', base: '' },
                    research: { provider: 'anthropic', key: '', model: 'claude-opus-5-5', base: '' }, jobEnabled: true, weeklyLimit: 25, revalidateLimit: 3, remoteUrl: '' } })""", PORT)
                # Para la captura, la consulta se dirige al servidor simulado (compatible con OpenAI)
                await opt.evaluate("(port) => chrome.storage.local.get('settings').then(r => { r.settings.classify = { provider: 'openai', key: 'demo', model: 'claude-haiku-5-5', base: 'http://127.0.0.1:' + port + '/v1' }; return chrome.storage.local.set(r); })", PORT)
            pg = await ctx.new_page()
            await pg.goto(u); await pg.wait_for_timeout(3000)
            # Desplaza la tarjeta hasta la reputación (y la abre) para que se vea en la captura
            await pg.evaluate("""(expand) => { const h = document.getElementById('gina-tarjeta'); if (!h) return; const r = h.shadowRoot;
              const b = r.querySelector('.body'); const alt = r.querySelector('.alt'); const rep = r.querySelector('.rep');
              if (expand === 'alt' && b && alt) { b.scrollTop = alt.offsetTop - b.offsetTop - 140; return; }
              if (expand === 'open') { const d = rep && rep.querySelector('details.more'); if (d) d.open = true; }
              if (b && rep) b.scrollTop = rep.offsetTop - b.offsetTop - (expand === 'open' ? 8 : 150); }""", expand)
            await pg.wait_for_timeout(300)
            await pg.screenshot(path=f"{OUT}/captura-{name}.png")
            await pg.close()
        # Opciones con la configuración de las dos claves (la de clasificación vuelve a mostrarse como Claude Haiku)
        await opt.evaluate("() => chrome.storage.local.get('settings').then(r => { r.settings.classify = { provider: 'anthropic', key: 'sk-ant-demo', model: 'claude-haiku-5-5', base: '' }; r.settings.research.key = 'sk-ant-demo-2'; return chrome.storage.local.set(r); })")
        await opt.reload(); await opt.wait_for_timeout(1200)
        await opt.screenshot(path=f"{OUT}/captura-5-opciones.png")
        await ctx.close()
    print("ok")
asyncio.run(main())
