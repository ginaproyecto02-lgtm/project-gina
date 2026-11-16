#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""
store/capturas.py
Regenera y valida las 5 capturas oficiales de 1280x800 para las tiendas de extensiones.
Invoca test/generate_capturas.js y verifica que las 5 capturas cumplan las dimensiones requeridas.
"""

import os
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "store", "imagenes")

def verificar_png(ruta, ancho_esperado, alto_esperado):
    if not os.path.exists(ruta):
        return False, f"No existe {ruta}"
    with open(ruta, "rb") as f:
        head = f.read(24)
    if len(head) < 24 or head[:8] != b"\x89PNG\r\n\x1a\n":
        return False, "Firma PNG inválida"
    w = int.from_bytes(head[16:20], "big")
    h = int.from_bytes(head[20:24], "big")
    if w != ancho_esperado or h != alto_esperado:
        return False, f"Dimensiones {w}x{h} distintas a {ancho_esperado}x{alto_esperado}"
    return True, f"{w}x{h} OK"

def main():
    print("Verificando / generando capturas...")
    script_node = os.path.join(ROOT, "test", "generate_capturas.js")
    if os.path.exists(script_node):
        res = subprocess.run(["node", script_node], cwd=ROOT)
        if res.returncode != 0:
            print("Aviso: generate_capturas.js terminó con código", res.returncode)

    capturas = [
        ("captura-1-producto.png", 1280, 800),
        ("captura-2-comparador.png", 1280, 800),
        ("captura-3-reputacion.png", 1280, 800),
        ("captura-4-sugerir.png", 1280, 800),
        ("captura-5-opciones.png", 1280, 800),
        ("icono-128.png", 128, 128),
        ("promo-pequeno-440x280.png", 440, 280),
    ]

    errores = []
    for f, w, h in capturas:
        ok, msg = verificar_png(os.path.join(OUT, f), w, h)
        print(f" - {f}: {msg}")
        if not ok:
            errores.append(f"{f}: {msg}")

    if errores:
        print(f"Falla de validación en {len(errores)} imágenes:")
        for e in errores:
            print("  *", e)
        sys.exit(1)

    print("Todas las imágenes de la tienda verificadas con éxito.")

if __name__ == "__main__":
    main()
