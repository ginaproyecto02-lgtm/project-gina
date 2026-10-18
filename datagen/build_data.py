# Genera extension/data/brands.json, extension/data/sites.json y actualiza el manifiesto.
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
import data_base as base
import data_mundo as mundo
import data_locales as locales
import data_candidatas  # noqa: F401  (marcas candidatas por tema; agrega grupos y marcas a data_base)
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
    for item in pairs:
        if isinstance(item, dict):
            n = item["n"]
            gid = item["g"]
            extra = {k: v for k, v in item.items() if k not in ("n", "g", "s")}
            strict = item.get("s", False) or n.startswith("!") or n.lower().lstrip("!") in AMBIG
        else:
            n, gid = item[0], item[1]
            extra = item[2] if len(item) > 2 and isinstance(item[2], dict) else {}
            strict = n.startswith("!") or n.lower().lstrip("!") in AMBIG
        n = n.lstrip("!")
        assert gid in base.G, f"{kind}: grupo desconocido {gid} ({n})"
        k = n.lower()
        if k in seen: raise SystemExit(f"{kind} duplicada: {n}")
        seen.add(k)
        entry = {"n": n, "g": gid, **extra}
        if strict: entry["s"] = 1
        out.append(entry)
    return out

marcas = entries(base.B, "marca")
aerolineas = entries(mundo.AIR, "aerolínea")

sitios_path = os.path.join(os.path.dirname(__file__), "sitios_oficiales.json")
if os.path.exists(sitios_path):
    sitios_data = json.load(open(sitios_path, encoding="utf-8"))
    for gid, s in sitios_data.get("grupos", {}).items():
        if gid in base.G:
            for k in ("sitio_oficial", "busqueda_oficial", "paises", "fuente", "verificado"):
                if k in s: base.G[gid][k] = s[k]
    marcas_map = {m["n"].lower(): m for m in marcas}
    for mname, s in sitios_data.get("marcas", {}).items():
        m_entry = marcas_map.get(mname.lower())
        if m_entry:
            for k in ("sitio_oficial", "busqueda_oficial", "paises", "fuente", "verificado"):
                if k in s: m_entry[k] = s[k]

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
    categorias[cid] = {
        "label": c["label"],
        "kw": sorted({nkw(k) for k in c["kw"] if nkw(k)}),
        "excluye": sorted({nkw(k) for k in c.get("excluye", []) if nkw(k)}),
        "subcats": c.get("subcats", {}),
        "marcas": list(dict.fromkeys(lista))
    }
for m, cid in locales.CAT.items():
    assert cid in CATS, f"categoría desconocida {cid} ({m})"

cat_tienda_path = os.path.join(os.path.dirname(__file__), "categorias_tienda.json")
categorias_tienda = json.load(open(cat_tienda_path, encoding="utf-8")) if os.path.exists(cat_tienda_path) else {}

dominios_path = os.path.join(os.path.dirname(__file__), "dominios.json")
assert os.path.exists(dominios_path), f"Falta el archivo de dominios: {dominios_path}"
DOMINIOS = json.load(open(dominios_path, encoding="utf-8"))

aditivos_path = os.path.join(os.path.dirname(__file__), "aditivos.json")
ADITIVOS = json.load(open(aditivos_path, encoding="utf-8")) if os.path.exists(aditivos_path) else []

alertas_path = os.path.join(os.path.dirname(__file__), "alertas.json")
ALERTAS = json.load(open(alertas_path, encoding="utf-8")) if os.path.exists(alertas_path) else []

# ---- Rastreadores de precio (solo enlaces verificados) y tiendas para «Buscar en otra tienda»
RASTREADORES = json.load(open(os.path.join(os.path.dirname(__file__), "rastreadores.json"), encoding="utf-8"))["rastreadores"]
for r in RASTREADORES:
    assert r.get("nombre") and r.get("verificado"), f"rastreador sin nombre o fecha de verificación: {r}"
    if not r.get("excluido"):
        assert r.get("fuente") and r.get("dominios"), f"rastreador {r['nombre']}: falta fuente o dominios"
        for d, u in r["dominios"].items():
            assert u.startswith("https://"), f"rastreador {r['nombre']} ({d}): URL no https"
TIENDAS_COMPARAR = json.load(open(os.path.join(os.path.dirname(__file__), "tiendas_comparar.json"), encoding="utf-8"))["tiendas"]
_sitios_pais = {}
for e in S:
    _sitios_pais.setdefault(e["pais"], set()).add(e["d"])
for pais, lst in TIENDAS_COMPARAR.items():
    for t in lst:
        assert t["url_busqueda"].startswith("https://") and "{q}" in t["url_busqueda"], f"tiendas_comparar {pais}: URL inválida {t}"
        assert t["dominio"] in _sitios_pais.get(pais, set()), f"tiendas_comparar {pais}: {t['dominio']} no está en sites_data.py de ese país"

# ---- Canal y marcas propias: «descuento» es un formato de tienda, no un tipo de dueño
CANALES = {"descuento", "conveniencia", "departamental", "supermercado"}
for gid, grp in base.G.items():
    assert grp["tipo"] not in ("Hard discount", "hard_discount", "Marca propia"), f"grupo {gid}: «{grp['tipo']}» no es un tipo de dueño (usa canal o marca_propia)"
    if grp.get("canal"):
        assert grp["canal"] in CANALES, f"grupo {gid}: canal desconocido {grp['canal']}"
    if grp.get("marca_propia"):
        assert grp.get("url", "").startswith("https://") and grp.get("fuente"), f"grupo {gid}: marca propia sin fuente"
        assert grp.get("paises_venta"), f"grupo {gid}: marca propia sin paises_venta"

brands = {
    "version": VERSION,
    "licencia": "CC BY 4.0",
    "atribucion": "Datos de Project Gina (github.com/ginaproyecto02-lgtm/project-gina)",
    "nota": "Base de la extensión Gina. Confianza: Verificado (fuente consultada con URL), Alta (hecho ampliamente documentado; confirmar en la fuente indicada), Verificar (puede haber cambiado).",
    "grupos": base.G,
    "marcas": marcas,
    "aerolineas": aerolineas,
    "reputacion": REP,
    "categorias": categorias,
    "categorias_tienda": categorias_tienda,
    "dominios": DOMINIOS,
    "aditivos": ADITIVOS,
    "alertas": ALERTAS,
    "rastreadores": RASTREADORES,
    "tiendas_comparar": TIENDAS_COMPARAR,
}
os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
# ---- Validación de licencia_origen (CC0 | ODbL | oficial | prensa) y atribución obligatoria para ODbL
VALID_LICENCIAS_ORIGEN = {"CC0", "ODbL", "oficial", "prensa"}
def validate_odbl_attribution(obj, context="datos"):
    if isinstance(obj, dict):
        lic = obj.get("licencia_origen")
        if lic is not None:
            assert lic in VALID_LICENCIAS_ORIGEN, f"{context}: licencia_origen no válida '{lic}'"
            if lic == "ODbL":
                nota_txt = " ".join(
                    str(obj.get(k, "")) for k in ("atribucion", "nota", "nota_atribucion")
                ).lower()
                assert "open food facts" in nota_txt and "odbl" in nota_txt, (
                    f"{context}: dato con licencia_origen 'ODbL' sin la nota de atribución correspondiente "
                    f"('Datos de Open Food Facts (ODbL)')"
                )
        for k, v in obj.items():
            validate_odbl_attribution(v, f"{context}.{k}")
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            validate_odbl_attribution(item, f"{context}[{i}]")

# ---- Conservar lo que agregó el job del proyecto (marcas, grupos, reputación y alternativas investigadas).
# El job escribe directo en extension/data/brands.json; regenerar desde datagen/ no debe borrarlo.
prev_path = os.path.join(ROOT, "data", "brands.json")
kept = {"grupos": 0, "marcas": 0, "reputacion": 0, "categorias": 0}
if os.path.exists(prev_path):
    prev = json.load(open(prev_path, encoding="utf-8"))
    validate_odbl_attribution(prev, "brands.json(prev)")
    norm = lambda x: nkw(x)
    for gid, g in prev.get("grupos", {}).items():
        if gid not in brands["grupos"]:
            if g.get("investigado"):   # solo grupos creados por el job; lo que borraste en datagen/ no regresa
                brands["grupos"][gid] = g; kept["grupos"] += 1
        elif g.get("investigado") and g.get("investigado", "") > brands["grupos"][gid].get("investigado", ""):
            brands["grupos"][gid] = g; kept["grupos"] += 1   # revalidado por el job después de la última edición
        if gid in brands["grupos"]:
            for f in ("sitio_oficial", "busqueda_oficial", "paises", "verificado"):
                if f in g and f not in brands["grupos"][gid]:
                    brands["grupos"][gid][f] = g[f]
    names = {norm(m["n"]) for m in brands["marcas"]}
    prev_marcas_by_name = {norm(m["n"]): m for m in prev.get("marcas", [])}
    for m in brands["marcas"]:
        pm = prev_marcas_by_name.get(norm(m["n"]))
        if pm:
            for f in ("sitio_oficial", "busqueda_oficial", "paises", "fuente", "verificado"):
                if f in pm and f not in m:
                    m[f] = pm[f]
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

validate_odbl_attribution(brands, "brands")
fuentes_dir = os.path.join(os.path.dirname(__file__), "fuentes")
if os.path.exists(fuentes_dir):
    for fn in sorted(os.listdir(fuentes_dir)):
        if fn.endswith(".json"):
            validate_odbl_attribution(json.load(open(os.path.join(fuentes_dir, fn), encoding="utf-8")), f"fuentes/{fn}")

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
    ev = evidencias.get(gid)
    if ev and ev.get("aprobado_en_pr") and not grp.get("revalidacion_fallida"):
        pr_val = str(ev["aprobado_en_pr"]).strip().lstrip("#")
        if pr_val.isdigit():
            grp["confianza"] = "Verificado"

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

for gid, grp in brands["grupos"].items():
    fuente = grp.get("fuente", "")
    assert "Conocimiento del modelo" not in fuente, f"Grupo '{gid}' tiene 'Conocimiento del modelo'"
    if grp.get("confianza") in ("Alta", "Verificado"):
        assert grp.get("url") and grp["url"].startswith("https://"), f"Grupo '{gid}' con confianza {grp.get('confianza')} sin URL válida"

# ---- E3: Validación estricta de sitios oficiales y buscadores
def validate_sitios_oficiales(obj, context="datos"):
    sitio = obj.get("sitio_oficial")
    busqueda = obj.get("busqueda_oficial")
    if sitio is not None or busqueda is not None:
        assert sitio and isinstance(sitio, str) and sitio.startswith("https://"), (
            f"{context}: sitio_oficial debe comenzar con 'https://', obtenido: '{sitio}'"
        )
        assert obj.get("verificado"), f"{context}: falta fecha de verificación para sitio oficial"
        assert obj.get("fuente"), f"{context}: falta fuente para sitio oficial"
        if busqueda is not None:
            assert isinstance(busqueda, str) and busqueda.startswith("https://"), (
                f"{context}: busqueda_oficial debe comenzar con 'https://', obtenido: '{busqueda}'"
            )
            assert "{q}" in busqueda, (
                f"{context}: busqueda_oficial debe contener '{{q}}', obtenido: '{busqueda}'"
            )

for gid, grp in brands["grupos"].items():
    validate_sitios_oficiales(grp, f"grupo '{gid}'")
for m in brands["marcas"]:
    validate_sitios_oficiales(m, f"marca '{m.get('n')}'")

json.dump(brands, open(prev_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("conservado del job:", kept)
json.dump({"version": VERSION, "sitios": S}, open(os.path.join(ROOT, "data", "sites.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
import shutil
shutil.copyfile(os.path.join(os.path.dirname(__file__), "garantias_pais.json"), os.path.join(ROOT, "data", "garantias_pais.json"))
shutil.copyfile(os.path.join(os.path.dirname(__file__), "normas_pais.json"), os.path.join(ROOT, "data", "normas_pais.json"))
if os.path.exists(cat_tienda_path):
    shutil.copyfile(cat_tienda_path, os.path.join(ROOT, "data", "categorias_tienda.json"))
if os.path.exists(dominios_path):
    shutil.copyfile(dominios_path, os.path.join(ROOT, "data", "dominios.json"))
if os.path.exists(aditivos_path):
    shutil.copyfile(aditivos_path, os.path.join(ROOT, "data", "aditivos.json"))
if os.path.exists(alertas_path):
    shutil.copyfile(alertas_path, os.path.join(ROOT, "data", "alertas.json"))

# ---- Proyecto: de dónde descargan todos la base actualizada (gratis, sin claves) y a dónde se sugieren marcas
PROY = json.load(open(os.path.join(os.path.dirname(__file__), "proyecto.json"), encoding="utf-8"))
repo, rama = PROY.get("repo", "").strip(), PROY.get("rama", "main") or "main"
assert not repo or re.fullmatch(r"[A-Za-z0-9-]+/[A-Za-z0-9._-]+", repo), "«repo» debe ser usuario/repositorio"
contacto = PROY.get("contacto", "").strip()
sugerencias_url = PROY.get("sugerencias_url", "").strip()
if sugerencias_url:
    assert re.match(r"^https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec$", sugerencias_url), (
        f"sugerencias_url debe ser 'https://script.google.com/macros/s/.../exec', obtenido: {sugerencias_url}"
    )
json.dump({
    "nombre": PROY.get("nombre", "Project Gina"), "repo": repo, "contacto": contacto,
    "sugerencias_url": sugerencias_url,
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
m["version"] = "3.2.0"
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
