# Genera extension/data/brands.json, extension/data/sites.json y actualiza el manifiesto.
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
import data_base as base
import data_mundo as mundo
import data_locales as locales
from categorias import CATS
from sites_data import S

ROOT = os.path.join(os.path.dirname(__file__), "..", "extension")
import datetime
# Versión de la base = fecha y hora de generación (misma forma que usa el job). Las extensiones usan la base remota
# solo si es más nueva que la incluida, así que la versión nunca debe ir hacia atrás.
VERSION = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H%M")

AMBIG = {x.lower() for x in ["Mi","Poco","Sol","Indio","Victoria","Corona","Modelo","Extra","Crunch","Clear","Scott","Candy","Echo","Ring","Blink",
 "Lara","León","Estrella","Superior","Martini","Boost","Galaxy","Jordan","Coach","Supreme","Mars","Natura","Matrix","Origins","Benefit",
 "Surface","Kraft","Silk","Venus","Bounty","Orbit","Miller","1800","UNO","Fire TV","Fresca","Wonder","Emperador","Mamut","Guerrero",
 "Salvo","Vick","Kirkland","Hoover","Acros","Kindle","Presto!","Mainstays","Equate","Avon","Prada","Chanel","Hermes","Tiffany","Tang","Halls","Kinder","Clight","Ritz","Lala",
 "Theory","GU","Titan","Honor","Vivo","Elite","Swift","Lux","HIT","Sharp","Canon","Siemens","Persil","Wheel",
 # Palabras comunes, nombres propios o títulos de obras: solo cuentan desde el campo «marca» de la página
 "Cero","Simi","Shark","Ninja","Penn","Hardy","Shakespeare","Ender","Foca","Carisma","Babé","Berkley","Fenwick","Avent",
 "Savage Gear","Pflueger","Ugly Stik","Shimano","Klorane","Ducray","Teatrical","Goicoechea","Tumi","Hue","Norelco",
 "Easy","Foy","Advance","Noble","Proto","Hart","Raid","Off!","Duck","Dawn","Fairy","Oster","Tudor","Wenger"]}

def entries(pairs, kind):
    out, seen = [], set()
    for n, gid in pairs:
        strict = n.startswith("!") or n.lower().lstrip("!") in AMBIG
        n = n.lstrip("!")
        assert gid in base.G, f"{kind}: grupo desconocido {gid} ({n})"
        k = n.lower()
        if k in seen: raise SystemExit(f"{kind} duplicada: {n}")
        seen.add(k)
        out.append({"n": n, "g": gid, **({"s": 1} if strict else {})})
    return out

marcas = entries(base.B, "marca")
aerolineas = entries(mundo.AIR, "aerolínea")
for e in S:
    assert e["g"] in base.G, f"sitio con grupo desconocido: {e}"
for gid, grp in base.G.items():
    for k in ("empresa", "controlador", "pais", "tipo", "confianza", "fuente"):
        assert grp.get(k), f"grupo {gid} sin {k}"

# ---- Reputación: hechos con fuente por grupo (id del grupo) o por gestora de fondos («fondo:…»)
REP = json.load(open(os.path.join(os.path.dirname(__file__), "reputacion.json"), encoding="utf-8"))
TEMAS = {"ambiental","laboral","corrupcion","privacidad","competencia","consumidor","derechos_humanos","fiscal","seguridad","gobierno_corporativo"}
ESTADOS = {"alegacion","investigacion","litigio","acuerdo","multa","condena","absuelto","anulado"}
for rid, r in REP.items():
    assert rid in base.G or rid.startswith("fondo:"), f"reputación de id desconocido: {rid}"
    assert r.get("revisado"), rid
    for e in r.get("eventos", []):
        assert e["tema"] in TEMAS and e["estado"] in ESTADOS, (rid, e["titulo"])
        assert e["url"].startswith("https://") and e.get("fuente") and e.get("anio"), (rid, e["titulo"])
        assert len(e["titulo"]) <= 80, (rid, e["titulo"])
    for e in r.get("positivos", []) + r.get("lobbying", []):
        assert e["url"].startswith("https://"), (rid, e)

# ---- Categorías para alternativas locales: cada marca listada debe existir en la base
import unicodedata
def nkw(s):
    s = unicodedata.normalize("NFKD", s.lower())
    return unicodedata.normalize("NFC", "".join(c for c in s if not unicodedata.combining(c))).strip()
known = {m["n"].lower(): m for m in marcas}
categorias = {}
for cid, c in CATS.items():
    lista = [m for m in c["marcas"]] + [m for m, cc in locales.CAT.items() if cc == cid]
    missing = [m for m in lista if m.lower() not in known]
    assert not missing, f"categoría {cid}: marcas que no están en la base: {missing}"
    categorias[cid] = {"label": c["label"], "kw": sorted({nkw(k) for k in c["kw"] if nkw(k)}), "marcas": list(dict.fromkeys(lista))}
for m, cid in locales.CAT.items():
    assert cid in CATS, f"categoría desconocida {cid} ({m})"

brands = {
    "version": VERSION,
    "nota": "Base de la extensión Gina. Confianza: Verificado (fuente consultada con URL), Alta (hecho ampliamente documentado; confirmar en la fuente indicada), Verificar (puede haber cambiado).",
    "grupos": base.G,
    "marcas": marcas,
    "aerolineas": aerolineas,
    "reputacion": REP,
    "categorias": categorias,
}
os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
# ---- Conservar lo que agregó el job del proyecto (marcas, grupos, reputación y alternativas investigadas).
# El job escribe directo en extension/data/brands.json; regenerar desde datagen/ no debe borrarlo.
prev_path = os.path.join(ROOT, "data", "brands.json")
kept = {"grupos": 0, "marcas": 0, "reputacion": 0, "categorias": 0}
if os.path.exists(prev_path):
    prev = json.load(open(prev_path, encoding="utf-8"))
    norm = lambda x: nkw(x)
    for gid, g in prev.get("grupos", {}).items():
        if gid not in brands["grupos"]:
            if g.get("investigado"):   # solo grupos creados por el job; lo que borraste en datagen/ no regresa
                brands["grupos"][gid] = g; kept["grupos"] += 1
        elif g.get("investigado") and g.get("investigado", "") > brands["grupos"][gid].get("investigado", ""):
            brands["grupos"][gid] = g; kept["grupos"] += 1   # revalidado por el job después de la última edición
    names = {norm(m["n"]) for m in brands["marcas"]}
    for m in prev.get("marcas", []):
        if m.get("job") and norm(m["n"]) not in names and m.get("g") in brands["grupos"]:
            brands["marcas"].append(m); names.add(norm(m["n"])); kept["marcas"] += 1
    for rid, r in prev.get("reputacion", {}).items():
        cur = brands["reputacion"].get(rid)
        if "semanal" in str(r.get("origen", "")) and (not cur or str(r.get("revisado", "")) > str(cur.get("revisado", ""))):
            brands["reputacion"][rid] = r; kept["reputacion"] += 1
    for cid, c in prev.get("categorias", {}).items():
        if cid in brands["categorias"]:
            extra = [m for m in c.get("marcas", []) if norm(m) in names and m not in brands["categorias"][cid]["marcas"]]
            brands["categorias"][cid]["marcas"] += extra; kept["categorias"] += len(extra)
    brands["version"] = max(VERSION, str(prev.get("version", "")))  # nunca hacia atrás

# ---- S7: Validación estricta de evidencias para grupos con confianza «Verificado»
import csv, urllib.parse
evidencias_path = os.path.join(os.path.dirname(__file__), "evidencias.csv")
assert os.path.exists(evidencias_path), f"Falta el archivo de evidencias: {evidencias_path}"
evidencias = {}
with open(evidencias_path, encoding="utf-8") as f:
    reader = csv.DictReader(f)
    req_cols = {"grupo_id", "url_final", "nivel_dominio", "cita", "fecha_consulta", "archivo_url", "safe_browsing", "gleif_lei", "gleif_coincide", "factcheck", "aprobado_en_pr"}
    assert req_cols.issubset(set(reader.fieldnames or [])), f"Columnas requeridas en evidencias.csv: {req_cols}"
    for row in reader:
        gid = row.get("grupo_id", "").strip()
        if gid: evidencias[gid] = row

dominios_path = os.path.join(os.path.dirname(__file__), "dominios.json")
assert os.path.exists(dominios_path), f"Falta el archivo de dominios: {dominios_path}"
DOMINIOS = json.load(open(dominios_path, encoding="utf-8"))

def host_level(url):
    host = urllib.parse.urlparse(url).netloc.lower().replace("www.", "")
    for d in DOMINIOS.get("bloqueado", []):
        if host == d or host.endswith("." + d): return "bloqueado"
    for d in DOMINIOS.get("oficial", []):
        if host == d or host.endswith("." + d): return "oficial"
    for d in DOMINIOS.get("prensa_referencia", []):
        if host == d or host.endswith("." + d): return "prensa_referencia"
    return None

for gid, grp in brands["grupos"].items():
    if grp.get("confianza") == "Verificado":
        assert gid in evidencias, f"Grupo verificado '{gid}' ({grp.get('empresa')}) sin fila en evidencias.csv"
        ev = evidencias[gid]
        assert ev.get("url_final") and ev["url_final"].startswith("https://"), f"Grupo '{gid}': url_final no válida en evidencias"
        assert ev.get("cita") and len(ev["cita"].strip()) > 10, f"Grupo '{gid}': cita vacía o incompleta en evidencias"
        assert ev.get("fecha_consulta"), f"Grupo '{gid}': falta fecha_consulta en evidencias"
        assert ev.get("aprobado_en_pr"), f"Grupo '{gid}': falta aprobado_en_pr en evidencias"
        assert ev.get("safe_browsing") == "ok", f"Grupo '{gid}': safe_browsing no es 'ok' ({ev.get('safe_browsing')})"
        assert ev.get("nivel_dominio") in ("oficial", "primaria", "prensa_referencia"), f"Grupo '{gid}': nivel_dominio no válido ({ev.get('nivel_dominio')})"
        assert ev.get("gleif_coincide") in ("si", "na"), f"Grupo '{gid}': conflicto con GLEIF ({ev.get('gleif_coincide')})"
        assert ev.get("factcheck") in ("ok", "na"), f"Grupo '{gid}': factcheck con conflicto ({ev.get('factcheck')})"
        hl = host_level(ev["url_final"])
        assert hl != "bloqueado", f"Grupo '{gid}': dominio bloqueado en evidencias ({ev['url_final']})"
        assert hl in ("oficial", "prensa_referencia"), f"Grupo '{gid}': dominio fuera de dominios.json ({ev['url_final']})"

json.dump(brands, open(prev_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("conservado del job:", kept)
json.dump({"version": VERSION, "sitios": S}, open(os.path.join(ROOT, "data", "sites.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
import shutil
shutil.copyfile(os.path.join(os.path.dirname(__file__), "garantias_pais.json"), os.path.join(ROOT, "data", "garantias_pais.json"))
shutil.copyfile(os.path.join(os.path.dirname(__file__), "normas_pais.json"), os.path.join(ROOT, "data", "normas_pais.json"))

# ---- Proyecto: de dónde descargan todos la base actualizada (gratis, sin claves) y a dónde se sugieren marcas
PROY = json.load(open(os.path.join(os.path.dirname(__file__), "proyecto.json"), encoding="utf-8"))
repo, rama = PROY.get("repo", "").strip(), PROY.get("rama", "main") or "main"
assert not repo or re.fullmatch(r"[A-Za-z0-9-]+/[A-Za-z0-9._-]+", repo), "«repo» debe ser usuario/repositorio"
contacto = PROY.get("contacto", "").strip()
json.dump({
    "nombre": PROY.get("nombre", "Project Gina"), "repo": repo, "contacto": contacto,
    "remoteUrl": f"https://raw.githubusercontent.com/{repo}/{rama}/extension/data/brands.json" if repo else "",
    "issuesUrl": f"https://github.com/{repo}/issues/new" if repo else "",
    "repoUrl": f"https://github.com/{repo}" if repo else ""
}, open(os.path.join(ROOT, "data", "proyecto.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
# El correo de correcciones también aparece en la página de opciones
opt = os.path.join(ROOT, "options", "options.html")
html = open(opt, encoding="utf-8").read()
html = re.sub(r'(<span id="contacto">).*?(</span>)', lambda mm: mm.group(1) + (f'<a href="mailto:{contacto}">{contacto}</a>' if contacto else "el repositorio del proyecto") + mm.group(2), html)
open(opt, "w", encoding="utf-8").write(html)
# Política de privacidad y textos de la tienda: el correo y la URL de la política salen de proyecto.json
if contacto:
    pol = os.path.join(os.path.dirname(__file__), "..", "docs", "privacidad.html")
    t = open(pol, encoding="utf-8").read()
    t = t.replace("CORREO_DE_CONTACTO", contacto)
    t = re.sub(r'href="mailto:[^"]*">[^<]*</a>', f'href="mailto:{contacto}">{contacto}</a>', t)
    open(pol, "w", encoding="utf-8").write(t)
if repo:
    owner, name = repo.split("/")
    ficha = os.path.join(os.path.dirname(__file__), "..", "store", "ficha-tienda.md")
    t = open(ficha, encoding="utf-8").read()
    t = t.replace("PRIVACY_URL", f"https://{owner.lower()}.github.io/{name}/privacidad.html")
    if contacto: t = t.replace("CONTACT_EMAIL", contacto)
    open(ficha, "w", encoding="utf-8").write(t)

# ---- Manifiesto: patrones de coincidencia a partir del registro de sitios
patterns = []
for e in S:
    pat = f"https://*.{e['d']}{e.get('path', '/')}*"
    if pat not in patterns: patterns.append(pat)
mpath = os.path.join(ROOT, "manifest.json")
m = json.load(open(mpath, encoding="utf-8"))
# Nombre y descripción traducibles: inglés por defecto, español para navegadores en español.
MSG = {
  "en": {"name": "Gina: Know Who Your Money Backs", "short": "Gina",
         "desc": "See which company, family, fund or government is behind what you buy, their track record and lobbying. Vote with every dollar.",
         "title": "Gina: who does your money back?"},
  "es": {"name": "Gina: sabe a quién apoya tu dinero", "short": "Gina",
         "desc": "Descubre qué empresa, familia, fondo o Estado está detrás de lo que compras, su historial y su lobbying. Vota con cada compra.",
         "title": "Gina: ¿a quién apoya tu dinero?"},
}
for loc, t in MSG.items():
    assert len(t["name"]) <= 45 and len(t["desc"]) <= 132, (loc, len(t["name"]), len(t["desc"]))
    os.makedirs(os.path.join(ROOT, "_locales", loc), exist_ok=True)
    json.dump({"extName": {"message": t["name"]}, "extShortName": {"message": t["short"]}, "extDescription": {"message": t["desc"]},
               "actionTitle": {"message": t["title"]}},
              open(os.path.join(ROOT, "_locales", loc, "messages.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
m["default_locale"] = "en"
m["name"] = "__MSG_extName__"
m["short_name"] = "__MSG_extShortName__"
m["description"] = "__MSG_extDescription__"
m["version"] = "3.1.0"
m["action"]["default_title"] = "__MSG_actionTitle__"
# Chrome 121+ usa service_worker; Firefox 121+ usa scripts (página de eventos). Ambos con el mismo archivo.
m["background"] = {"service_worker": "src/background.js", "scripts": ["src/matcher.js", "src/reputation.js", "src/ai.js", "src/background.js"]}
m["minimum_chrome_version"] = "121"
m.pop("homepage_url", None)
m["browser_specific_settings"] = {"gecko": {
    "id": "gina@project-gina",  # identificador único en addons.mozilla.org; puedes cambiarlo antes del primer envío
    "strict_min_version": "140.0",  # el consentimiento de datos integrado existe desde Firefox 140
    # Sin IA no se transmite nada. Con IA activada se envían marca y título del producto al proveedor elegido.
    "data_collection_permissions": {"required": ["none"], "optional": ["websiteContent"]}
}}
cs = m["content_scripts"][0]
cs["matches"] = patterns
cs["js"] = ["src/matcher.js", "src/reputation.js", "src/alternativas.js", "src/extractors.js", "src/flights.js", "src/i18n.js", "src/card.js", "src/content.js"]
# En web_accessible_resources Chrome solo admite patrones con ruta «/*».
war = []
for e in S:
    pat = f"https://*.{e['d']}/*"
    if pat not in war: war.append(pat)
m["web_accessible_resources"] = [{"resources": ["data/brands.json", "data/sites.json", "data/proyecto.json"], "matches": war}]
json.dump(m, open(mpath, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

paises = sorted({e["pais"] for e in S})
print("proyecto:", repo or "(sin repositorio: la base solo se actualiza con nuevas versiones)")
print(f"{len(categorias)} categorías · {sum(1 for g in base.G.values() if g['tipo'] in ('Cooperativa','Empleados','Fideicomiso'))} grupos cooperativos/de empleados/fideicomiso · {len(REP)} historiales de reputación · {len(base.G)} grupos · {len(marcas)} marcas · {len(aerolineas)} nombres de aerolíneas · {len(S)} sitios · {len(patterns)} patrones")
print("tipos:", {t: sum(1 for e in S if e['tipo'] == t) for t in ('tienda','agencia','hospedaje','aerolinea')})
print("países:", ", ".join(paises))
