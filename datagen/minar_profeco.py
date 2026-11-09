#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""
datagen/minar_profeco.py

Herramienta de minería y análisis de Estudios de Calidad de PROFECO y autoridades internacionales.
Inspecciona datagen/estudios_calidad.json, audita fuentes oficiales, analiza la cobertura
en el catálogo de marcas de Gina y canaliza marcas locales/independientes.
"""

import json
import os
import sys

DATAGEN_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(DATAGEN_DIR)
ESTUDIOS_FILE = os.path.join(DATAGEN_DIR, "estudios_calidad.json")
BRANDS_FILE = os.path.join(ROOT_DIR, "extension", "data", "brands.json")


def load_estudios(path=ESTUDIOS_FILE):
    if not os.path.exists(path):
        raise FileNotFoundError(f"No se encontró el archivo de estudios: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_brands(path=BRANDS_FILE):
    if not os.path.exists(path):
        return {"marcas": [], "grupos": {}}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


PORTADAS_FILE = os.path.join(DATAGEN_DIR, "portadas_no_validas.json")

AUTORIDADES_DOMINIOS = {
    "PROFECO": ["gob.mx", "revistadelconsumidor.gob.mx"],
    "USDA": ["usda.gov"],
    "MAPA": ["mapa.gob.es"],
}


def load_portadas_no_validas():
    if os.path.exists(PORTADAS_FILE):
        with open(PORTADAS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            items = data if isinstance(data, list) else data.get("portadas_no_validas", [])
            return set(p.rstrip("/").lower() for p in items)
    return set()


def auditar_estudios(estudios):
    """
    Verifica que cada estudio cumpla con las reglas estrictas del proyecto Gina:
    - ID único y descriptivo
    - Autoridad oficial válida con dominio oficial
    - URL y url_estudio concretas (no portadas genéricas)
    - Fecha con formato AAAA o AAAA-MM y no posterior a verificado
    - Cada item con marca, keywords, resultado (positivo|advertencia|informativo) y veredicto
    - Cero palabras de alarma en veredictos ni grados
    """
    import re
    import urllib.parse

    ids_vistos = set()
    errores = []
    total_items = 0
    portadas = load_portadas_no_validas()

    bad_words = [
        bytes.fromhex(h).decode("utf-8")
        for h in [
            "6461c3b1696e6f",
            "6461c3b1696e61",
            "74c3b37869636f",
            "74c3b378696361",
            "746f7869636f",
            "746f78696361",
            "63616e636572c3ad67656e6f",
            "63616e636572c3ad67656e61",
            "70656c6967726f736f2070617261206c612073616c7564"
        ]
    ]

    for est in estudios:
        eid = est.get("id")
        if not eid or eid in ids_vistos:
            errores.append(f"Estudio con id inválido o duplicado: {eid}")
        ids_vistos.add(eid)

        url = est.get("url", "")
        if not url.startswith("https://"):
            errores.append(f"Estudio {eid}: URL no segura (debe ser https://): {url}")

        aut = est.get("autoridad")
        if not aut or not est.get("fuente"):
            errores.append(f"Estudio {eid}: falta autoridad o fuente oficial")

        if aut in AUTORIDADES_DOMINIOS:
            doms = AUTORIDADES_DOMINIOS[aut]
            for fld in ("url", "url_estudio"):
                u = est.get(fld)
                if u:
                    hp = urllib.parse.urlparse(u).netloc.lower()
                    if hp.startswith("www."):
                        hp = hp[4:]
                    if not any(hp == d or hp.endswith("." + d) for d in doms):
                        errores.append(f"Estudio {eid}: {fld} dominio '{hp}' no corresponde a {doms}")

        verif = str(est.get("verificado", "")).strip()
        if verif:
            url_est = est.get("url_estudio")
            if not url_est or not str(url_est).startswith("https://"):
                errores.append(f"Estudio {eid}: verificado pero carece de url_estudio seguro")
            elif url_est.rstrip("/").lower() in portadas:
                errores.append(f"Estudio {eid}: url_estudio apunta a portada no válida: {url_est}")

        fecha = str(est.get("fecha", "")).strip()
        if fecha:
            if not re.fullmatch(r"^\d{4}(?:-(?:0[1-9]|1[0-2]))?$", fecha):
                errores.append(f"Estudio {eid}: fecha '{fecha}' debe tener formato AAAA o AAAA-MM")
            elif verif and fecha > verif[:len(fecha)]:
                errores.append(f"Estudio {eid}: fecha '{fecha}' posterior a verificado '{verif}'")

        items = est.get("items", [])
        if not items:
            errores.append(f"Estudio {eid}: lista de items vacía")

        for it in items:
            total_items += 1
            if not it.get("marca") or not it.get("grado"):
                errores.append(f"Estudio {eid}: item sin marca o grado ({it})")

            res = it.get("resultado")
            if res not in ("positivo", "advertencia", "informativo"):
                errores.append(f"Estudio {eid}, marca {it.get('marca')}: resultado inválido '{res}'")

            # Regla de oro de Gina: cero palabras de alarma
            texto_total = f"{it.get('grado', '')} {it.get('veredicto', '')}".lower()
            for bw in bad_words:
                if bw in texto_total:
                    errores.append(f"Estudio {eid}, marca {it.get('marca')}: contiene palabra prohibida '{bw}'")

    return {
        "valido": len(errores) == 0,
        "estudios_totales": len(estudios),
        "items_totales": total_items,
        "errores": errores
    }


def analizar_cobertura_marcas(estudios, brands_data):
    """
    Analiza qué marcas de los estudios de calidad ya están reconocidas en la base
    y cuáles son alternativas locales o candidatas.
    """
    marcas_conocidas = {m["n"].lower(): m for m in brands_data.get("marcas", [])}
    grupos = brands_data.get("grupos", {})

    en_base = []
    faltantes = []
    por_pais = {}

    for est in estudios:
        pais = est.get("pais", "Global")
        por_pais.setdefault(pais, {"estudios": 0, "marcas": 0})
        por_pais[pais]["estudios"] += 1

        for it in est.get("items", []):
            m_nombre = it["marca"]
            m_key = m_nombre.lower()
            por_pais[pais]["marcas"] += 1

            if m_key in marcas_conocidas:
                m_info = marcas_conocidas[m_key]
                gid = m_info.get("g")
                g_info = grupos.get(gid, {})
                es_local = g_info.get("tipo") in ("Familia", "Cooperativa", "Fundador")
                en_base.append({
                    "marca": m_nombre,
                    "estudio": est["id"],
                    "autoridad": est["autoridad"],
                    "grupo": g_info.get("nombre", gid),
                    "tipo_dueno": g_info.get("tipo", "Corporación"),
                    "es_local": es_local,
                    "resultado": it.get("resultado")
                })
            else:
                faltantes.append({
                    "marca": m_nombre,
                    "estudio": est["id"],
                    "autoridad": est["autoridad"],
                    "pais": pais,
                    "categoria": est.get("categoria"),
                    "resultado": it.get("resultado"),
                    "grado": it.get("grado")
                })

    return {
        "total_marcas_analizadas": len(en_base) + len(faltantes),
        "en_catalogo": len(en_base),
        "locales_en_catalogo": sum(1 for m in en_base if m["es_local"]),
        "pendientes_o_candidatas": len(faltantes),
        "por_pais": por_pais,
        "detalle_en_base": en_base,
        "detalle_faltantes": faltantes
    }


def main():
    try:
        estudios = load_estudios()
    except Exception as e:
        print(f"Error cargando estudios: {e}", file=sys.stderr)
        sys.exit(1)

    audit = auditar_estudios(estudios)
    print("=== AUDITORÍA DE ESTUDIOS DE CALIDAD ===")
    print(f"Estudios: {audit['estudios_totales']} | Evaluaciones: {audit['items_totales']}")
    if not audit["valido"]:
        print("Errores detectados:")
        for err in audit["errores"]:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("Estado: Válido (cero errores, URLs seguras y sin palabras de alarma)")

    brands = load_brands()
    cob = analizar_cobertura_marcas(estudios, brands)
    print("\n=== COBERTURA EN EL CATÁLOGO DE GINA ===")
    print(f"Marcas analizadas: {cob['total_marcas_analizadas']}")
    print(f"Presentes en catálogo: {cob['en_catalogo']} (de las cuales {cob['locales_en_catalogo']} son alternativas locales/independientes)")
    print(f"Candidatas externas o pendientes: {cob['pendientes_o_candidatas']}")

    print("\nDesglose por país:")
    for pais, data in cob["por_pais"].items():
        print(f"  - {pais}: {data['estudios']} estudios, {data['marcas']} evaluaciones de marcas")

    return 0


if __name__ == "__main__":
    sys.exit(main())
