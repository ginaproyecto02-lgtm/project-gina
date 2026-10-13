#!/usr/bin/env python3
"""
Biblioteca de fuentes verificadas de Project Gina (P2.14).
Lee los archivos JSON de datagen/fuentes/<grupo_id>-<hash8>.json y construye
el índice SQLite FTS5 en datagen/indice_fuentes.sqlite (artefacto de CI, no versionado).

Uso:
  python3 datagen/indice_fuentes.py              # Construye/actualiza el índice FTS5
  python3 datagen/indice_fuentes.py --query X    # Consulta fuentes que coincidan con X (salida JSON)
"""
import argparse
import csv
import hashlib
import json
import os
import re
import sqlite3
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
FUENTES_DIR = os.path.join(DIR, "fuentes")
DB_PATH = os.path.join(DIR, "indice_fuentes.sqlite")
EVIDENCIAS_CSV = os.path.join(DIR, "evidencias.csv")
BRANDS_JSON = os.path.join(DIR, "..", "extension", "data", "brands.json")


def hash8(text):
    return hashlib.sha256(str(text).encode("utf-8")).hexdigest()[:8]


def sync_from_evidencias():
    os.makedirs(FUENTES_DIR, exist_ok=True)
    if not os.path.exists(EVIDENCIAS_CSV):
        return

    grupos = {}
    if os.path.exists(BRANDS_JSON):
        try:
            with open(BRANDS_JSON, encoding="utf-8") as bf:
                grupos = json.load(bf).get("grupos", {})
        except Exception:
            pass

    with open(EVIDENCIAS_CSV, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            gid = (row.get("grupo_id") or "").strip()
            url_final = (row.get("url_final") or "").strip()
            if not gid or not url_final:
                continue
            h8 = hash8(url_final)
            fname = f"{gid}-{h8}.json"
            fpath = os.path.join(FUENTES_DIR, fname)
            if not os.path.exists(fpath):
                grp = grupos.get(gid, {})
                cita = (row.get("cita") or "").strip()
                extracto = cita[:20480]
                payload = {
                    "grupo_id": gid,
                    "empresa": grp.get("empresa", gid),
                    "controlador": grp.get("controlador", ""),
                    "pais": grp.get("pais", ""),
                    "tipo": grp.get("tipo", ""),
                    "url_final": url_final,
                    "archivo_url": (row.get("archivo_url") or "").strip(),
                    "fecha": (row.get("fecha_consulta") or "").strip(),
                    "cita": cita,
                    "extracto": extracto
                }
                with open(fpath, "w", encoding="utf-8") as out:
                    json.dump(payload, out, ensure_ascii=False, indent=2)


def build_index(db_path=DB_PATH, fuentes_dir=FUENTES_DIR):
    os.makedirs(fuentes_dir, exist_ok=True)
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
        CREATE VIRTUAL TABLE fuentes_fts USING fts5(
            archivo,
            grupo_id,
            empresa,
            controlador,
            pais,
            tipo,
            url_final,
            archivo_url,
            fecha,
            cita,
            extracto
        )
    """)

    count = 0
    for fname in sorted(os.listdir(fuentes_dir)):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(fuentes_dir, fname)
        try:
            with open(fpath, encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            continue

        gid = data.get("grupo_id") or fname.split("-")[0]
        extracto = str(data.get("extracto") or data.get("cita") or "")[:20480]
        cur.execute(
            """
            INSERT INTO fuentes_fts (
                archivo, grupo_id, empresa, controlador, pais, tipo,
                url_final, archivo_url, fecha, cita, extracto
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                fname,
                str(gid),
                str(data.get("empresa") or ""),
                str(data.get("controlador") or ""),
                str(data.get("pais") or ""),
                str(data.get("tipo") or ""),
                str(data.get("url_final") or ""),
                str(data.get("archivo_url") or ""),
                str(data.get("fecha") or ""),
                str(data.get("cita") or ""),
                extracto
            )
        )
        count += 1

    conn.commit()
    conn.close()
    return count


def query_index(term, db_path=DB_PATH, fuentes_dir=FUENTES_DIR):
    if not os.path.exists(db_path):
        build_index(db_path, fuentes_dir)

    clean_tokens = re.findall(r"[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ]+", str(term))
    if not clean_tokens:
        return []

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    fts_query = " OR ".join(f'"{t}"' for t in clean_tokens)
    rows = []
    try:
        cur.execute(
            "SELECT * FROM fuentes_fts WHERE fuentes_fts MATCH ? LIMIT 10",
            (fts_query,)
        )
        rows = [dict(r) for r in cur.fetchall()]
    except Exception:
        pass

    conn.close()
    return rows


def main():
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    parser = argparse.ArgumentParser(description="Índice SQLite FTS5 de fuentes verificadas")
    parser.add_argument("--query", "-q", help="Término de búsqueda en el índice")
    parser.add_argument("--db", default=DB_PATH, help="Ruta del archivo SQLite")
    parser.add_argument("--dir", default=FUENTES_DIR, help="Directorio de fuentes JSON")
    parser.add_argument("--no-sync", action="store_true", help="No sincronizar desde evidencias.csv")
    args = parser.parse_args()

    if not args.no_sync and args.dir == FUENTES_DIR:
        sync_from_evidencias()

    if args.query:
        res = query_index(args.query, args.db, args.dir)
        print(json.dumps(res, ensure_ascii=False))
    else:
        n = build_index(args.db, args.dir)
        print(f"Índice FTS5 generado en {args.db} con {n} fuentes.")


if __name__ == "__main__":
    main()
