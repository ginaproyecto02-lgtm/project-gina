#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Project Gina — Verificación de conexión de sugerencias con Google Apps Script.
// Uso: node job/verificar_sugerencias.js --url https://script.google.com/macros/s/XXXX/exec
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CODE_GS_PATH = path.join(ROOT, "servicios", "sugerencias", "Code.gs");
const PROY_PATH = path.join(ROOT, "datagen", "proyecto.json");

function getRepoCodeVersion() {
  try {
    const code = require(CODE_GS_PATH);
    if (code && code.CODE_VERSION) return code.CODE_VERSION;
  } catch (_) {}
  const content = fs.readFileSync(CODE_GS_PATH, "utf8");
  const m = content.match(/var\s+CODE_VERSION\s*=\s*["']([^"']+)["']/);
  return m ? m[1] : "2026-10-22";
}

const URL_FORMAT = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/;

async function verificar({ url, token, fetchImpl = fetch, rootDir = ROOT }) {
  const codeVersion = getRepoCodeVersion();
  const checks = [];

  // 1. Formato de URL
  const urlValida = typeof url === "string" && URL_FORMAT.test(url.trim());
  if (!urlValida) {
    checks.push({
      paso: 1,
      titulo: "Formato de URL de la aplicación web",
      ok: false,
      detalle: `URL inválida: '${url || ""}'`,
      accion: "La URL debe tener el formato https://script.google.com/macros/s/.../exec (obtenida al Implementar como Aplicación web en Apps Script)."
    });
    return { ok: false, checks };
  }
  checks.push({
    paso: 1,
    titulo: "Formato de URL de la aplicación web",
    ok: true,
    detalle: "Formato correcto (/exec de Apps Script)"
  });

  if (!token) {
    checks.push({
      paso: 2,
      titulo: "Autenticación con ROBOT_TOKEN",
      ok: false,
      detalle: "Token no proporcionado",
      accion: "Define la variable de entorno GINA_SUGERENCIAS_TOKEN o ingrésala cuando el script la solicite."
    });
    return { ok: false, checks };
  }

  // 2. GET ?token=... responde ok:true
  let listData = null;
  try {
    const res = await fetchImpl(`${url}?token=${encodeURIComponent(token)}`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    const text = await res.text();
    try {
      listData = JSON.parse(text);
    } catch (_) {
      listData = null;
    }

    if (listData && listData.ok === true) {
      checks.push({
        paso: 2,
        titulo: "Autenticación y acceso a la hoja",
        ok: true,
        detalle: "Conexión exitosa, el token coincide con ROBOT_TOKEN"
      });
    } else {
      const errCode = (listData && listData.e) || `HTTP ${res.status}`;
      const accion = errCode === "no_encontrado"
        ? "el token no coincide con ROBOT_TOKEN (revisa las propiedades del proyecto en Configuración del Apps Script)"
        : "la URL no es la de la aplicación web o la hoja no está vinculada correctamente";
      checks.push({
        paso: 2,
        titulo: "Autenticación y acceso a la hoja",
        ok: false,
        detalle: `Fallo al autenticar: ${errCode}`,
        accion
      });
      return { ok: false, checks };
    }
  } catch (err) {
    checks.push({
      paso: 2,
      titulo: "Autenticación y acceso a la hoja",
      ok: false,
      detalle: `Error de red: ${err.message}`,
      accion: "Verifica tu conexión a internet y que la URL sea accesible públicamente."
    });
    return { ok: false, checks };
  }

  // 3. op=version es igual a CODE_VERSION del repo
  try {
    const resVer = await fetchImpl(`${url}?token=${encodeURIComponent(token)}&op=version`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    const verData = await resVer.json();
    if (verData && verData.ok === true && verData.version === codeVersion) {
      checks.push({
        paso: 3,
        titulo: "Versión del código en Apps Script",
        ok: true,
        detalle: `Versión coincidente (${verData.version}), total de filas en hoja: ${verData.hoja != null ? verData.hoja : "—"}`
      });
    } else {
      const vRemota = (verData && verData.version) || "desconocida / sin op=version";
      checks.push({
        paso: 3,
        titulo: "Versión del código en Apps Script",
        ok: false,
        detalle: `Versión remota: '${vRemota}' vs repo: '${codeVersion}'`,
        accion: "Pega de nuevo servicios/sugerencias/Code.gs en el Apps Script y publica una versión nueva: Implementar → Gestionar implementaciones → lápiz → Versión: Nueva versión."
      });
    }
  } catch (err) {
    checks.push({
      paso: 3,
      titulo: "Versión del código en Apps Script",
      ok: false,
      detalle: `Error consultando versión: ${err.message}`,
      accion: "Pega de nuevo servicios/sugerencias/Code.gs en el Apps Script y publica una versión nueva: Implementar → Gestionar implementaciones → lápiz → Versión: Nueva versión."
    });
  }

  // 4. POST tipo='prueba' responde ok:true
  try {
    const pruebaPayload = {
      v: 1,
      tipo: "prueba",
      marca: "Prueba Conexión Gina",
      tienda: "amazon.com.mx",
      producto: "Diagnóstico",
      pais: "MX",
      ext: "3.2.0",
      inst: "00000000-0000-4000-8000-000000000000"
    };
    const resPost = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(pruebaPayload)
    });
    const postData = await resPost.json();
    if (postData && postData.ok === true && postData.prueba === true) {
      checks.push({
        paso: 4,
        titulo: "Ruta de escritura POST (tipo prueba)",
        ok: true,
        detalle: "Aceptado correctamente sin ensuciar la hoja ni gastar cuota"
      });
    } else {
      checks.push({
        paso: 4,
        titulo: "Ruta de escritura POST (tipo prueba)",
        ok: false,
        detalle: `Rechazado con código: ${(postData && postData.e) || "error"}`,
        accion: "Revisa los registros de ejecución de Apps Script (Menú Ejecuciones)."
      });
    }
  } catch (err) {
    checks.push({
      paso: 4,
      titulo: "Ruta de escritura POST (tipo prueba)",
      ok: false,
      detalle: `Error en petición POST: ${err.message}`,
      accion: "Revisa permisos de implementación de Apps Script (debe permitir acceso a 'Cualquier usuario')."
    });
  }

  // 5. Filas pendientes
  const numPendientes = (listData && Array.isArray(listData.filas)) ? listData.filas.length : 0;
  checks.push({
    paso: 5,
    titulo: "Sugerencias pendientes en la hoja",
    ok: true,
    detalle: `${numPendientes} sugerencia(s) pendiente(s) por procesar`
  });

  // 6. Configuración en datagen/proyecto.json
  const pPath = path.join(rootDir, "datagen", "proyecto.json");
  let urlEnProyecto = "";
  try {
    const pj = JSON.parse(fs.readFileSync(pPath, "utf8"));
    urlEnProyecto = (pj.sugerencias_url || "").trim();
  } catch (_) {}

  if (urlEnProyecto === url.trim()) {
    checks.push({
      paso: 6,
      titulo: "Configuración en datagen/proyecto.json",
      ok: true,
      detalle: "sugerencias_url configurada para la extensión local"
    });
  } else {
    checks.push({
      paso: 6,
      titulo: "Configuración en datagen/proyecto.json",
      ok: false,
      detalle: urlEnProyecto ? `Tiene otra URL configurada (${urlEnProyecto.slice(0, 35)}...)` : "sugerencias_url está vacío",
      accion: "falta ponerla para la extensión cargada desde la carpeta: colócala en datagen/proyecto.json y corre 'python3 datagen/build_data.py'."
    });
  }

  const allOk = checks.every((c) => c.ok);
  return { ok: allOk, checks };
}

function promptHidden(question) {
  return new Promise((resolve) => {
    if (process.env.GINA_SUGERENCIAS_TOKEN) {
      return resolve(process.env.GINA_SUGERENCIAS_TOKEN.trim());
    }
    const readline = require("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (process.stdin.isTTY) {
      process.stdout.write(question);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      let buf = "";
      const onData = (ch) => {
        const c = String(ch);
        if (c === "\n" || c === "\r" || c === "\u0004") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          rl.close();
          resolve(buf.trim());
        } else if (c === "\u0003") {
          process.exit(1);
        } else if (c === "\u0008" || c === "\x7f") {
          buf = buf.slice(0, -1);
        } else {
          buf += c;
        }
      };
      process.stdin.on("data", onData);
    } else {
      rl.question(question, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    }
  });
}

async function main(argv = process.argv.slice(2)) {
  let url = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--url" && argv[i + 1]) {
      url = argv[i + 1].trim();
      break;
    }
  }

  if (!url) {
    console.log("Uso: node job/verificar_sugerencias.js --url https://script.google.com/macros/s/XXXX/exec");
    console.log("Nota: El token secreto se lee de la variable GINA_SUGERENCIAS_TOKEN o se solicita por consola.");
    process.exit(1);
  }

  const token = await promptHidden("Introduce GINA_SUGERENCIAS_TOKEN (se ocultará la escritura): ");
  console.log(`\nVerificando conexión con: ${url}\n`);

  const { ok, checks } = await verificar({ url, token });

  for (const c of checks) {
    const icono = c.ok ? "✔" : "✘";
    console.log(`${icono} ${c.paso}. ${c.titulo}: ${c.detalle}`);
    if (!c.ok && c.accion) {
      console.log(`   ➔ Acción requerida: ${c.accion}`);
    }
  }

  console.log("\n" + (ok ? "¡Todas las comprobaciones fueron exitosas!" : "Se detectaron problemas. Corrige las acciones indicadas arriba."));
  process.exit(ok ? 0 : 1);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Error inesperado:", err);
    process.exit(1);
  });
}

module.exports = {
  verificar,
  URL_FORMAT,
  getRepoCodeVersion
};
