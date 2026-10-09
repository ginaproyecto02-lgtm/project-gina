import asyncio, json, threading, os, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from playwright.async_api import async_playwright

EXT = "/home/claude/ext/extension"
OUT = "/mnt/user-data/outputs"
PROFILE = "/tmp/claude-0/pw-prof-e2e"

# ---- Servidor de IA simulado (compatible con OpenAI), con CORS
CALLS = []
class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        CALLS.append(body)
        user = body["messages"][-1]["content"]
        ans = {"conocida": True, "marca": "Truper", "grupo_id": None, "empresa": "Truper S.A. de C.V.", "controlador": "Familia fundadora (México)",
               "pais": "México", "tipo": "Familia", "fondos": "", "gobierno": "", "nota": "", "certeza": "media"} if "Truper" in user else {"ok": True}
        out = json.dumps({"choices": [{"message": {"content": json.dumps(ans, ensure_ascii=False)}}], "usage": {"prompt_tokens": 900, "completion_tokens": 60}}).encode()
        self.send_response(200); self._cors(); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(out)
    def log_message(self, *a): pass
srv = HTTPServer(("127.0.0.1", 0), H)
PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()

def ld(o): return '<script type="application/ld+json">' + json.dumps(o, ensure_ascii=False) + "</script>"
STYLE = "<style>body{font-family:Arial;padding:40px;max-width:640px} .r{border:1px solid #ddd;border-radius:8px;padding:10px;margin:8px 0}</style>"
PAGES = {
  "https://www.liverpool.com.mx/tienda/pdp/pantalla-samsung-55/1144": STYLE + "<h1>Pantalla Samsung Crystal UHD 55\"</h1><p>$9,999</p>" + ld({"@type": "Product", "name": "Pantalla Samsung", "brand": {"@type": "Brand", "name": "Samsung"}}),
  "https://www.google.com.mx/travel/flights/search?tfs=mex-las": STYLE + "<h1>Vuelos de Ciudad de México a Las Vegas</h1>" +
      "".join(f'<div class="r"><b>{t}</b> · {a}</div>' for t, a in [("07:10 – 09:05", "<span>Aeroméxico</span>"), ("08:30 – 10:20", "<span>Volaris</span>"),
      ("11:45 – 13:40", "<span>Viva Aerobus</span>"), ("15:00 – 19:50", "<span>American</span>"), ("18:20 – 20:15", "<span>Aeroméxico</span>")]),
  "https://www.aeromexico.com/es-mx": STYLE + "<h1>Reserva tu vuelo</h1><p>Vuelos en código compartido con Delta Air Lines.</p>",
  "https://www.airbnb.mx/rooms/48271": STYLE + "<h1>Departamento cerca del Strip, Las Vegas</h1>",
  "https://www.coupang.com/vp/products/7781": STYLE + "<h1>농심 신라면 멀티팩 5개입</h1>" + ld({"@type": "Product", "name": "농심 신라면"}),
  "https://www.amazon.com.mx/dp/B0TRUPER1": STYLE + "<span id='productTitle' style='font-size:22px'>Martillo de uña 16 oz mango de fibra</span><br><a id='bylineInfo'>Visita la tienda de Truper</a>",
}

async def main():
    os.system(f"rm -rf {PROFILE}")
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(PROFILE, headless=True, channel="chromium",
            args=[f"--disable-extensions-except={EXT}", f"--load-extension={EXT}"], viewport={"width": 1100, "height": 760})
        async def handler(route):
            u = route.request.url
            if u in PAGES: await route.fulfill(status=200, content_type="text/html; charset=utf-8", body=PAGES[u])
            elif u.startswith("chrome-extension:") or u.startswith("http://127.0.0.1"): await route.continue_()
            else: await route.abort()
        await ctx.route("**/*", handler)
        sw = ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event("serviceworker")
        ext_id = sw.url.split("/")[2]
        errors = []
        results = {}
        for i, u in enumerate([k for k in PAGES if "amazon" not in k]):
            pg = await ctx.new_page()
            pg.on("pageerror", lambda e: errors.append(str(e)))
            await pg.goto(u); await pg.wait_for_timeout(2500)
            txt = await pg.evaluate("() => { const h=document.getElementById('gina-tarjeta'); return h ? h.shadowRoot.querySelector('.body').innerText.replace(/\\s+/g,' ') : 'SIN TARJETA' }")
            results[u] = txt
            print(u.split("/")[2], "→", txt[:170])
            await pg.screenshot(path=f"{OUT}/vista_{i+1}_{u.split('/')[2].replace('www.','').split('.')[0]}.png")
            await pg.close()

        # ---- IA: configurar proveedor compatible con OpenAI apuntando al servidor simulado
        opt = await ctx.new_page()
        opt.on("pageerror", lambda e: errors.append("opciones: " + str(e)))
        await opt.goto(f"chrome-extension://{ext_id}/options/options.html")
        await opt.wait_for_timeout(800)
        await opt.evaluate("""(port) => chrome.storage.local.set({ settings: { aiEnabled: true, dailyLimit: 50, cacheDays: 90,
            classify: { provider: 'openai', key: 'test-key', model: 'modelo-pequeno', base: 'http://127.0.0.1:' + port + '/v1' },
            research: { provider: 'anthropic', key: '', model: 'claude-opus-5-5', base: '' }, jobEnabled: false, weeklyLimit: 25, revalidateLimit: 3, remoteUrl: '' } })""", PORT)
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(str(e)))
        u = "https://www.amazon.com.mx/dp/B0TRUPER1"
        await pg.goto(u); await pg.wait_for_timeout(3500)
        txt = await pg.evaluate("() => { const h=document.getElementById('gina-tarjeta'); return h ? h.shadowRoot.querySelector('.body').innerText.replace(/\\s+/g,' ') : 'SIN TARJETA' }")
        results[u] = txt
        print("amazon (IA) →", txt[:200])
        await pg.screenshot(path=f"{OUT}/vista_6_amazon_ia.png")
        # Opciones con la memoria resultante
        await opt.reload(); await opt.wait_for_timeout(1200)
        await opt.screenshot(path=f"{OUT}/opciones.png", full_page=True)
        pend = await opt.evaluate("() => chrome.storage.local.get(['pending','aiCache']).then(r => ({p: Object.keys(r.pending||{}), c: Object.keys(r.aiCache||{})}))")
        print("memoria:", pend)
        # Popup (como pestaña) con búsqueda
        pop = await ctx.new_page()
        pop.on("pageerror", lambda e: errors.append("popup: " + str(e)))
        await pop.set_viewport_size({"width": 380, "height": 640})
        await pop.goto(f"chrome-extension://{ext_id}/popup/popup.html")
        await pop.wait_for_timeout(700)
        await pop.click("nav button[data-tab=search]")
        await pop.fill("#q", "aeromex")
        await pop.wait_for_timeout(300)
        ptxt = await pop.inner_text("#searchOut")
        print("popup búsqueda →", ptxt.replace("\n", " ")[:160])
        await pop.screenshot(path=f"{OUT}/popup_busqueda.png")
        print("errores de página:", errors or "ninguno")
        print("llamadas a la IA:", len(CALLS))
        ok = (all(v != "SIN TARJETA" for v in results.values()) and "Truper S.A. de C.V." in results[u] and "Prosus" not in results[u]
              and "Grupo Aeroméxico" in results["https://www.google.com.mx/travel/flights/search?tfs=mex-las"] and not errors and len(CALLS) == 1)
        print("RESULTADO:", "OK" if ok else "FALLA")
        await ctx.close()
        sys.exit(0 if ok else 1)
asyncio.run(main())
