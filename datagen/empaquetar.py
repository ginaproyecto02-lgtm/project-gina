#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""
Project Gina — Generador de paquetes de salida para tiendas (J7).
Empaqueta:
- dist/gina-chrome-edge-3.3.0.zip (para Chrome Web Store y Microsoft Edge Add-ons)
- dist/gina-firefox-3.3.0.zip (para Mozilla Firefox Add-ons / AMO)
Genera además sus sumas de verificación SHA-256 (.sha256).
"""
import argparse
import json
import os
import sys

# Agregar datagen al path
sys.path.insert(0, os.path.dirname(__file__))
from build_data import empaquetar

def main():
    parser = argparse.ArgumentParser(description="Genera los paquetes de distribución para las tiendas de extensiones.")
    parser.add_argument("--dist", default=None, help="Directorio de salida para los archivos .zip (por defecto ../dist)")
    parser.add_argument("--sugerencias-url", default=None, help="URL del servicio de sugerencias de Google Apps Script (/exec)")
    args = parser.parse_args()

    # Si la variable de entorno está presente y no se especificó argumento, usarla
    sugerencias_url = args.sugerencias_url or os.environ.get("GINA_SUGERENCIAS_URL")

    # Verificar si sugerencias_url en proyecto.json está vacío
    url_en_proyecto = ""
    for cand in [
        os.path.join(os.path.dirname(__file__), "proyecto.json"),
        os.path.join(os.path.dirname(__file__), "..", "extension", "data", "proyecto.json")
    ]:
        if os.path.exists(cand):
            try:
                with open(cand, "r", encoding="utf-8") as pf:
                    data = json.load(pf)
                    url_en_proyecto = (data.get("sugerencias_url") or "").strip()
                if url_en_proyecto:
                    break
            except Exception:
                pass

    if not sugerencias_url and not url_en_proyecto:
        print("[AVISO] sugerencias_url en proyecto.json está vacío (y no se pasó --sugerencias-url ni GINA_SUGERENCIAS_URL): la extensión usará cola local + enlace de respaldo hasta configurar el endpoint de Apps Script.")

    print("Iniciando empaquetado de Gina para tiendas de extensiones...")
    generados = empaquetar(dist_dir=args.dist, sugerencias_url=sugerencias_url)
    print(f"\nEmpaquetado completado con éxito: {len(generados)} paquetes generados.")
    for p, s in generados:
        print(f" - {os.path.basename(p)} (SHA256: {s})")

if __name__ == "__main__":
    main()
