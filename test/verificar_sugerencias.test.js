// SPDX-License-Identifier: MIT
// Project Gina — Pruebas unitarias de job/verificar_sugerencias.js.
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { verificar, URL_FORMAT, getRepoCodeVersion } = require("../job/verificar_sugerencias.js");

let pass = 0;
let total = 0;

function check(desc, cond, extra) {
  total++;
  if (cond) {
    pass++;
    console.log(`OK    ${desc}`);
  } else {
    console.error(`FAIL  ${desc}${extra ? " -> " + extra : ""}`);
  }
}

(async () => {
  const validUrl = "https://script.google.com/macros/s/AKfycbxTest1234567890abcdefghijklmnopqrstuvwxyz/exec";
  const validToken = "secreto-robot-12345";
  const expectedVersion = getRepoCodeVersion();

  // Helper para crear entorno temporal de proyecto.json
  const createTempProject = (sugerencias_url = "") => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gina-test-verif-"));
    const datagenDir = path.join(tmpDir, "datagen");
    fs.mkdirSync(datagenDir, { recursive: true });
    fs.writeFileSync(path.join(datagenDir, "proyecto.json"), JSON.stringify({ sugerencias_url }));
    return tmpDir;
  };

  // Mock fetch con respuestas configurables
  const createMockFetch = (options = {}) => {
    return async (url, init = {}) => {
      const urlStr = String(url);
      const method = (init.method || "GET").toUpperCase();

      if (options.networkError) {
        throw new Error("Conexión rechazada (ECONNREFUSED)");
      }

      if (method === "GET") {
        if (urlStr.includes("op=version")) {
          if (options.versionError) throw new Error("Error en op=version");
          if (options.versionMismatch) {
            return {
              status: 200,
              json: async () => ({ ok: true, version: "2020-01-01", hoja: 10 }),
              text: async () => JSON.stringify({ ok: true, version: "2020-01-01", hoja: 10 })
            };
          }
          return {
            status: 200,
            json: async () => ({ ok: true, version: expectedVersion, hoja: options.sheetRows != null ? options.sheetRows : 5 }),
            text: async () => JSON.stringify({ ok: true, version: expectedVersion, hoja: options.sheetRows != null ? options.sheetRows : 5 })
          };
        }

        // GET ?token=...
        if (options.badToken) {
          return {
            status: 200,
            json: async () => ({ ok: false, e: "no_encontrado" }),
            text: async () => JSON.stringify({ ok: false, e: "no_encontrado" })
          };
        }
        if (options.httpError) {
          return {
            status: 403,
            json: async () => ({ error: "forbidden" }),
            text: async () => "Forbidden"
          };
        }
        return {
          status: 200,
          json: async () => ({ ok: true, filas: new Array(options.pendingCount || 3).fill(["id", "2026-10-22", "marca", "X", "tienda.com", "P", "MX", "3.2.0", 1, "pendiente"]) }),
          text: async () => JSON.stringify({ ok: true, filas: new Array(options.pendingCount || 3).fill(["id", "2026-10-22", "marca", "X", "tienda.com", "P", "MX", "3.2.0", 1, "pendiente"]) })
        };
      }

      if (method === "POST") {
        if (options.postNetworkError) throw new Error("Error de red en POST");
        if (options.postReject) {
          return {
            status: 200,
            json: async () => ({ ok: false, e: "esquema" }),
            text: async () => JSON.stringify({ ok: false, e: "esquema" })
          };
        }
        const body = JSON.parse(init.body || "{}");
        if (body.tipo === "prueba") {
          return {
            status: 200,
            json: async () => ({ ok: true, prueba: true }),
            text: async () => JSON.stringify({ ok: true, prueba: true })
          };
        }
        return {
          status: 200,
          json: async () => ({ ok: true }),
          text: async () => JSON.stringify({ ok: true })
        };
      }

      return { status: 404, json: async () => ({}), text: async () => "{}" };
    };
  };

  // 1. Paso 1: URL inválida (✘)
  {
    const res = await verificar({ url: "https://ejemplo.com/otro/endpoint", token: validToken, fetchImpl: createMockFetch() });
    check("1. URL inválida falla en paso 1 con instrucción clara",
      res.ok === false && res.checks.length === 1 && res.checks[0].ok === false && /format/i.test(res.checks[0].titulo));
  }

  // 2. Paso 1: URL válida (✔)
  {
    const res = await verificar({ url: validUrl, token: "", fetchImpl: createMockFetch() });
    check("2. URL válida pasa paso 1",
      res.checks[0].ok === true && res.checks[0].paso === 1);
  }

  // 3. Paso 2: Token ausente (✘)
  {
    const res = await verificar({ url: validUrl, token: "", fetchImpl: createMockFetch() });
    check("3. Token ausente falla en paso 2 con instrucción clara",
      res.ok === false && res.checks.length === 2 && res.checks[1].ok === false && res.checks[1].paso === 2);
  }

  // 4. Paso 2: Token incorrecto / rechazado (✘)
  {
    const res = await verificar({ url: validUrl, token: "token-malo", fetchImpl: createMockFetch({ badToken: true }) });
    check("4. Token no coincidente falla con aviso de ROBOT_TOKEN",
      res.ok === false && res.checks[1].ok === false && /ROBOT_TOKEN/i.test(res.checks[1].accion));
  }

  // 5. Paso 2: Error de red (✘)
  {
    const res = await verificar({ url: validUrl, token: validToken, fetchImpl: createMockFetch({ networkError: true }) });
    check("5. Error de red falla en paso 2",
      res.ok === false && res.checks[1].ok === false && /ECONNREFUSED/i.test(res.checks[1].detalle));
  }

  // 6. Paso 3: Versión no coincide (✘)
  {
    const tmpDir = createTempProject(validUrl);
    const res = await verificar({ url: validUrl, token: validToken, fetchImpl: createMockFetch({ versionMismatch: true }), rootDir: tmpDir });
    check("6. Versión vieja de Code.gs falla en paso 3 indicando desplegar 'Nueva versión'",
      res.ok === false && res.checks[2].ok === false && res.checks[2].paso === 3 && /Nueva versión/i.test(res.checks[2].accion));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // 7. Paso 3: Error de red consultando versión (✘)
  {
    const tmpDir = createTempProject(validUrl);
    const res = await verificar({ url: validUrl, token: validToken, fetchImpl: createMockFetch({ versionError: true }), rootDir: tmpDir });
    check("7. Error consultando versión marca paso 3 como fallo",
      res.ok === false && res.checks[2].ok === false && res.checks[2].paso === 3);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // 8. Paso 4: POST tipo prueba rechazado (✘)
  {
    const tmpDir = createTempProject(validUrl);
    const res = await verificar({ url: validUrl, token: validToken, fetchImpl: createMockFetch({ postReject: true }), rootDir: tmpDir });
    check("8. POST rechazado falla en paso 4 con código de error",
      res.ok === false && res.checks[3].ok === false && res.checks[3].paso === 4 && /esquema/i.test(res.checks[3].detalle));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // 9. Paso 4: Error de red en POST (✘)
  {
    const tmpDir = createTempProject(validUrl);
    const res = await verificar({ url: validUrl, token: validToken, fetchImpl: createMockFetch({ postNetworkError: true }), rootDir: tmpDir });
    check("9. Error de red en POST falla en paso 4 indicando permisos",
      res.ok === false && res.checks[3].ok === false && /Cualquier usuario/i.test(res.checks[3].accion));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // 10. Paso 5: Conteo de pendientes reportado (✔)
  {
    const tmpDir = createTempProject(validUrl);
    const res = await verificar({ url: validUrl, token: validToken, fetchImpl: createMockFetch({ pendingCount: 7 }), rootDir: tmpDir });
    check("10. Conteo de pendientes reporta 7 sugerencias pendientes",
      res.checks[4].ok === true && res.checks[4].paso === 5 && res.checks[4].detalle.includes("7 sugerencia(s)"));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // 11. Paso 6: datagen/proyecto.json vacío (✘)
  {
    const tmpDir = createTempProject("");
    const res = await verificar({ url: validUrl, token: validToken, fetchImpl: createMockFetch(), rootDir: tmpDir });
    check("11. proyecto.json sin URL falla en paso 6 indicando actualizarlo",
      res.ok === false && res.checks[5].ok === false && res.checks[5].paso === 6 && /build_data\.py/i.test(res.checks[5].accion));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // 12. Paso 6: datagen/proyecto.json con URL diferente (✘)
  {
    const tmpDir = createTempProject("https://script.google.com/macros/s/AKfycbxOtraUrlDistinta12345/exec");
    const res = await verificar({ url: validUrl, token: validToken, fetchImpl: createMockFetch(), rootDir: tmpDir });
    check("12. proyecto.json con otra URL falla en paso 6 indicando discrepancia",
      res.ok === false && res.checks[5].ok === false && /otra URL/i.test(res.checks[5].detalle));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // 13. Caso exitoso completo: todos los pasos en verde (✔)
  {
    const tmpDir = createTempProject(validUrl);
    const res = await verificar({ url: validUrl, token: validToken, fetchImpl: createMockFetch({ pendingCount: 4 }), rootDir: tmpDir });
    check("13. Caso exitoso: los 6 pasos resultan en ✔ y ok: true",
      res.ok === true && res.checks.length === 6 && res.checks.every((c) => c.ok === true),
      JSON.stringify(res.checks.map((c) => ({ paso: c.paso, ok: c.ok }))));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log(`\n${pass}/${total} pruebas de verificación de sugerencias correctas`);
  process.exit(pass === total ? 0 : 1);
})();
