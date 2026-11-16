#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""
datagen/muestra_auditoria.py
Toma 50 empresas al azar con semilla reproducible (--semilla AAAA-MM-DD) para la auditoría de datos (Puerta 2).
Estratifica: 30 de México y 20 del resto del mundo; al menos 10 con confianza «Alta».
Escribe auditoria/muestra-AAAA-MM-DD.md.
No toca la red ni los datos de datagen/.
"""

import argparse
import datetime
import json
import os
import random
import sys

def generar_muestra(semilla, root_dir=None):
    if root_dir is None:
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    brands_path = os.path.join(root_dir, "extension", "data", "brands.json")
    assert os.path.exists(brands_path), f"No se encontró brands.json en: {brands_path}"

    with open(brands_path, "r", encoding="utf-8") as f:
        db = json.load(f)

    grupos = db.get("grupos", {})
    marcas = db.get("marcas", [])

    # Mapeo de marcas por id de grupo
    marcas_por_grupo = {}
    for m in marcas:
        gid = m.get("g")
        if gid:
            marcas_por_grupo.setdefault(gid, []).append(m.get("n", ""))

    # Ordenar grupos para determinismo absoluto independiente del orden de iteración del dict
    todos_grupos = []
    for gid, g in grupos.items():
        entry = dict(g)
        entry["id"] = gid
        entry["marcas_lista"] = marcas_por_grupo.get(gid, [])
        todos_grupos.append(entry)
    todos_grupos.sort(key=lambda x: (x.get("pais", ""), x.get("empresa", ""), x["id"]))

    mx_all = [g for g in todos_grupos if g.get("pais") == "México"]
    rest_all = [g for g in todos_grupos if g.get("pais") != "México"]

    assert len(mx_all) >= 30, f"Se requieren al menos 30 empresas de México, encontradas: {len(mx_all)}"
    assert len(rest_all) >= 20, f"Se requieren al menos 20 empresas del resto, encontradas: {len(rest_all)}"

    # PRNG determinista con la semilla
    rng = random.Random(semilla)

    # Muestreo estratificado: 30 de México y 20 del resto
    muestra_mx = rng.sample(mx_all, 30)
    muestra_rest = rng.sample(rest_all, 20)

    # Asegurar que haya al menos 10 con confianza Alta en total
    total_alta = sum(1 for g in (muestra_mx + muestra_rest) if g.get("confianza") == "Alta")
    if total_alta < 10:
        faltan = 10 - total_alta
        disponibles_alta_mx = [g for g in mx_all if g.get("confianza") == "Alta" and g not in muestra_mx]
        disponibles_alta_rest = [g for g in rest_all if g.get("confianza") == "Alta" and g not in muestra_rest]

        # Reemplazar elementos no-Alta en muestra_mx si hay altas disponibles en MX
        for i, g in enumerate(muestra_mx):
            if faltan <= 0 or not disponibles_alta_mx:
                break
            if g.get("confianza") != "Alta":
                muestra_mx[i] = disponibles_alta_mx.pop(0)
                faltan -= 1

        # Reemplazar elementos no-Alta en muestra_rest si aún faltan
        for i, g in enumerate(muestra_rest):
            if faltan <= 0 or not disponibles_alta_rest:
                break
            if g.get("confianza") != "Alta":
                muestra_rest[i] = disponibles_alta_rest.pop(0)
                faltan -= 1

    muestra = muestra_mx + muestra_rest
    total_alta = sum(1 for g in muestra if g.get("confianza") == "Alta")
    assert len(muestra_mx) == 30, f"Se esperaban 30 de México, obtenidos: {len(muestra_mx)}"
    assert len(muestra_rest) == 20, f"Se esperaban 20 del resto, obtenidos: {len(muestra_rest)}"
    assert len(muestra) == 50, f"Se esperaban 50 en total, obtenidos: {len(muestra)}"
    assert total_alta >= 10, f"Se requerían al menos 10 con confianza Alta, obtenidos: {total_alta}"

    # Ordenar muestra para presentación legible: México primero, luego alfabético
    muestra.sort(key=lambda x: (0 if x.get("pais") == "México" else 1, x.get("empresa", "")))

    # Generar Markdown
    lineas = [
        f"# Muestra para auditoría de datos — Puerta 2",
        "",
        f"- **Fecha de muestra / Semilla:** `{semilla}`",
        f"- **Tamaño total:** 50 empresas",
        f"- **Estratificación:** 30 México, 20 Resto del mundo",
        f"- **Empresas con confianza «Alta»:** {total_alta} (mínimo requerido: 10)",
        "",
        "| Empresa | Marcas | Controlador | Confianza | Fuente | URL | Correcto (sí/no) · nota del validador |",
        "|---|---|---|---|---|---|---|"
    ]

    for g in muestra:
        empresa = g.get("empresa", "").replace("|", "\\|")
        marcas_str = ", ".join(g.get("marcas_lista", [])[:5])
        if len(g.get("marcas_lista", [])) > 5:
            marcas_str += f" (+{len(g['marcas_lista']) - 5} más)"
        marcas_str = marcas_str.replace("|", "\\|")
        controlador = g.get("controlador", g.get("tipo", "")).replace("|", "\\|")
        confianza = g.get("confianza", "").replace("|", "\\|")
        fuente = g.get("fuente", "").replace("|", "\\|")
        url = g.get("url", "").replace("|", "\\|")
        url_md = f"[{url[:35]}...]({url})" if len(url) > 35 else f"[{url}]({url})" if url else "—"

        lineas.append(f"| {empresa} | {marcas_str} | {controlador} | {confianza} | {fuente} | {url_md} | |")

    lineas.append("")
    contenido = "\n".join(lineas)

    # Guardar archivo
    auditoria_dir = os.path.join(root_dir, "auditoria")
    os.makedirs(auditoria_dir, exist_ok=True)
    out_file = os.path.join(auditoria_dir, f"muestra-{semilla}.md")
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(contenido)

    return out_file, total_alta

def main():
    parser = argparse.ArgumentParser(description="Genera muestra estratificada para auditoría de datos.")
    parser.add_argument("--semilla", default=None, help="Semilla en formato AAAA-MM-DD (por defecto, fecha de hoy)")
    args = parser.parse_args()

    semilla = args.semilla
    if not semilla:
        semilla = datetime.date.today().strftime("%Y-%m-%d")

    out_file, total_alta = generar_muestra(semilla)
    print(f"Muestra generada exitosamente:")
    print(f"  Archivo: {out_file}")
    print(f"  Semilla: {semilla}")
    print(f"  Total empresas: 50 (30 MX, 20 Resto)")
    print(f"  Empresas Alta confianza: {total_alta}")

if __name__ == "__main__":
    main()
