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

    print("Iniciando empaquetado de Gina para tiendas de extensiones...")
    generados = empaquetar(dist_dir=args.dist, sugerencias_url=sugerencias_url)
    print(f"\nEmpaquetado completado con éxito: {len(generados)} paquetes generados.")
    for p, s in generados:
        print(f" - {os.path.basename(p)} (SHA256: {s})")

if __name__ == "__main__":
    main()
