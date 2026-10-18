// SPDX-License-Identifier: MIT
// Pruebas unitarias de servicios/sugerencias/Code.gs (Apps Script) con mocks de Google Apps Script.
"use strict";

const path = require("path");

let pass = 0, total = 0;
function check(name, ok, detail) {
  total++;
  if (ok) pass++;
  console.log(`${ok ? "OK   " : "FALLA"} ${name}${detail && !ok ? " → " + detail : ""}`);
}

function createMockEnvironment() {
  const cacheStore = {};
  const propsStore = {
    SHEET_ID: "mock-sheet-id",
    ROBOT_TOKEN: "secreto-robot-12345"
  };

  const sheetData = [
    ["ID", "Fecha", "Tipo", "Marca", "Tienda", "Producto", "País", "Ext", "Veces", "Estado"]
  ];

  const sheetMock = {
    getLastRow: () => sheetData.length,
    getRange: (startRow, startCol, numRows, numCols) => {
      const nRows = numRows != null ? numRows : 1;
      const nCols = numCols != null ? numCols : 1;
      return {
        getValues: () => {
          const res = [];
          for (let r = 0; r < nRows; r++) {
            const rowIndex = (startRow - 1) + r;
            const row = sheetData[rowIndex] || [];
            const slice = [];
            for (let c = 0; c < nCols; c++) {
              const colIndex = (startCol - 1) + c;
              slice.push(row[colIndex]);
            }
            res.push(slice);
          }
          return res;
        },
        setValue: (val) => {
          if (nRows === 1 && nCols === 1) {
            const rowIndex = startRow - 1;
            const colIndex = startCol - 1;
            if (sheetData[rowIndex]) {
              sheetData[rowIndex][colIndex] = val;
            }
          }
        }
      };
    },
    appendRow: (rowArr) => {
      sheetData.push(rowArr.slice());
    },
    deleteRow: (n) => { sheetData.splice(n - 1, 1); }
  };

  const ssMock = {
    getActiveSheet: () => sheetMock
  };

  const lockMock = {
    tryLock: () => true,
    releaseLock: () => {}
  };

  let uuidCounter = 1;

  global.ContentService = {
    MimeType: { JSON: "application/json" },
    createTextOutput: (str) => ({
      raw: str,
      json: JSON.parse(str),
      setMimeType: () => {}
    })
  };

  global.CacheService = {
    getScriptCache: () => ({
      get: (k) => cacheStore[k] || null,
      put: (k, v) => { cacheStore[k] = String(v); }
    })
  };

  global.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (k) => propsStore[k] || null,
      setProperty: (k, v) => { propsStore[k] = String(v); }
    })
  };

  global.LockService = {
    getScriptLock: () => lockMock
  };

  global.SpreadsheetApp = {
    openById: (id) => {
      if (id === propsStore.SHEET_ID) return ssMock;
      throw new Error("Sheet not found");
    }
  };

  global.Utilities = {
    getUuid: () => "uuid-" + (uuidCounter++)
  };

  const code = require(path.join(__dirname, "..", "servicios", "sugerencias", "Code.gs"));
  return { code, sheetData, cacheStore, propsStore };
}

(async () => {
  const validPayload = {
    v: 1,
    tipo: "marca",
    marca: "Café Orgánico de la Sierra",
    tienda: "tienda.example.com",
    producto: "Bolsa de grano 500g",
    pais: "MX",
    ext: "3.2.0",
    inst: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
  };

  // 1. Esquema: payload válido
  {
    const { code } = createMockEnvironment();
    const res = code.doPost({ postData: { contents: JSON.stringify(validPayload) } });
    check("doPost: payload válido retorna ok:true", res.json.ok === true, JSON.stringify(res.json));
  }

  // 2. Esquema: campo extra -> rechazo
  {
    const { code } = createMockEnvironment();
    const withExtra = Object.assign({}, validPayload, { campo_extra: "malicioso" });
    const res = code.doPost({ postData: { contents: JSON.stringify(withExtra) } });
    check("doPost: campo extra es rechazado", res.json.ok === false && res.json.e === "esquema", JSON.stringify(res.json));
  }

  // 3. Esquema: > 2 KB -> rechazo
  {
    const { code } = createMockEnvironment();
    const bigString = "x".repeat(2500);
    const res = code.doPost({ postData: { contents: bigString } });
    check("doPost: petición mayor a 2 KB es rechazada", res.json.ok === false && res.json.e === "tamano_excedido", JSON.stringify(res.json));
  }

  // 4. Marca maliciosa (<script>, @usuario, ](http, {{) -> rechazo
  {
    const badBrands = [
      "Marca <script>alert(1)</script>",
      "@usuario_mencion",
      "Marca [link](http://evil.com)",
      "Marca {{constructor}}"
    ];
    for (const b of badBrands) {
      const { code } = createMockEnvironment();
      const p = Object.assign({}, validPayload, { marca: b });
      const res = code.doPost({ postData: { contents: JSON.stringify(p) } });
      check(`doPost: marca peligrosa rechazada (${b.slice(0, 20)})`, res.json.ok === false && res.json.e === "marca_invalida", JSON.stringify(res.json));
    }
  }

  // 5. Límites: sexto envío en una hora -> rechazo
  {
    const { code } = createMockEnvironment();
    let lastRes;
    for (let i = 1; i <= 6; i++) {
      const p = Object.assign({}, validPayload, { marca: `Marca ${i}` });
      lastRes = code.doPost({ postData: { contents: JSON.stringify(p) } });
    }
    check("Límites: sexto envío en 1 hora del mismo inst es rechazado", lastRes.json.ok === false && lastRes.json.e === "limite_hora", JSON.stringify(lastRes.json));
  }

  // 6. Límites: tope diario (> 300) -> rechazo
  {
    const { code, propsStore } = createMockEnvironment();
    const today = new Date().toISOString().slice(0, 10);
    propsStore.DAILY = JSON.stringify({ d: today, n: 300 });
    const res = code.doPost({ postData: { contents: JSON.stringify(validPayload) } });
    check("Límites: tope diario de 300 sugerencias alcanzado -> rechazo", res.json.ok === false && res.json.e === "limite_dia", JSON.stringify(res.json));
  }

  // 7. Deduplicación: dos envíos de la misma marca -> suma 1 en veces
  {
    const { code, sheetData } = createMockEnvironment();
    const res1 = code.doPost({ postData: { contents: JSON.stringify(validPayload) } });
    const payload2 = Object.assign({}, validPayload, { inst: "b1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5e" });
    const res2 = code.doPost({ postData: { contents: JSON.stringify(payload2) } });

    const rows = sheetData.slice(1);
    check("Deduplicación: dos envíos de la misma marca mantienen 1 sola fila con veces = 2",
      res1.json.ok === true && res2.json.ok === true && rows.length === 1 && rows[0][8] === 2,
      `Filas: ${rows.length}, veces: ${rows[0] ? rows[0][8] : "N/A"}`);
  }

  // 8. doGet: sin token o token incorrecto -> 404 lógico
  {
    const { code } = createMockEnvironment();
    const resNoToken = code.doGet({});
    const resBadToken = code.doGet({ parameter: { token: "token-falso" } });
    check("doGet: sin token o con token incorrecto responde error",
      resNoToken.json.ok === false && resBadToken.json.ok === false && resBadToken.json.e === "no_encontrado");
  }

  // 9. doGet: con token válido -> lista pendientes y nunca devuelve inst
  {
    const { code } = createMockEnvironment();
    code.doPost({ postData: { contents: JSON.stringify(validPayload) } });
    const res = code.doGet({ parameter: { token: "secreto-robot-12345" } });
    const filas = (res.json && res.json.filas) || [];
    const hasInst = filas.some((f) => Object.prototype.hasOwnProperty.call(f, "inst") || f.inst !== undefined);
    check("doGet: con token válido devuelve pendientes sin campo inst",
      res.json.ok === true && filas.length === 1 && filas[0].marca === validPayload.marca && !hasInst,
      JSON.stringify(filas));
  }

  // 10. doGet con op=ack -> marca como procesado
  {
    const { code, sheetData } = createMockEnvironment();
    code.doPost({ postData: { contents: JSON.stringify(validPayload) } });
    const getRes = code.doGet({ parameter: { token: "secreto-robot-12345" } });
    const id = getRes.json.filas[0].id;

    const ackRes = code.doGet({ parameter: { token: "secreto-robot-12345", op: "ack", ids: id } });
    const getResAfter = code.doGet({ parameter: { token: "secreto-robot-12345" } });

    check("doGet op=ack: marca la fila como procesada y ya no sale en pendientes",
      ackRes.json.ok === true && ackRes.json.procesados === 1 && getResAfter.json.filas.length === 0 && sheetData[1][9] === "procesado");
  }

  // 11. Tope diario: vive en PropertiesService (CacheService expira a las 6 h) y se reinicia al cambiar de día
  {
    const { code, propsStore } = createMockEnvironment();
    propsStore.DAILY = JSON.stringify({ d: "2000-01-01", n: 300 });
    const res = code.doPost({ postData: { contents: JSON.stringify(validPayload) } });
    const daily = JSON.parse(propsStore.DAILY);
    check("Tope diario: se guarda en PropertiesService y se reinicia en un día nuevo",
      res.json.ok === true && daily.n === 1 && daily.d === new Date().toISOString().slice(0, 10), propsStore.DAILY);
  }

  // 12. Inyección de fórmulas en la hoja: nada se guarda como fórmula
  {
    const { code, sheetData } = createMockEnvironment();
    const p = Object.assign({}, validPayload, { producto: '=IMPORTXML("evil.example/x","//a")' });
    const res = code.doPost({ postData: { contents: JSON.stringify(p) } });
    const row = sheetData[1] || [];
    const formula = row.some((v) => typeof v === "string" && /^[=+\-@]/.test(v));
    check("Hoja: un producto que empieza con «=» se guarda como texto, no como fórmula",
      res.json.ok === true && !formula && String(row[5]).startsWith("'="), JSON.stringify(row));
  }

  // 13. ext y país con formato estricto
  {
    const bad = [{ ext: "=1+1" }, { ext: "3.2.0 beta" }, { pais: "=A1" }, { pais: "@MX" }, { pais: "M".repeat(21) }];
    for (const b of bad) {
      const { code, sheetData } = createMockEnvironment();
      const res = code.doPost({ postData: { contents: JSON.stringify(Object.assign({}, validPayload, b)) } });
      check(`doPost: formato inválido rechazado (${JSON.stringify(b).slice(0, 30)})`, res.json.ok === false && sheetData.length === 1, JSON.stringify(res.json));
    }
    const { code } = createMockEnvironment();
    const res = code.doPost({ postData: { contents: JSON.stringify(Object.assign({}, validPayload, { pais: "Reino Unido" })) } });
    check("doPost: país con nombre largo («Reino Unido») se acepta", res.json.ok === true, JSON.stringify(res.json));
  }

  // 14. Contrato con la extensión: cada tienda de sites.json (dominio + país tal como lo manda la tarjeta) es aceptada
  {
    const sites = require(path.join(__dirname, "..", "extension", "data", "sites.json")).sitios || [];
    const lista = Array.isArray(sites) ? sites : Object.values(sites);
    const rechazadas = [];
    for (const st of lista) {
      if (!st || !st.d) continue;
      const { code } = createMockEnvironment();
      const p = Object.assign({}, validPayload, { tienda: String(st.d).replace(/^www\./, ""), pais: String(st.pais || "MX").slice(0, 20) });
      const res = code.doPost({ postData: { contents: JSON.stringify(p) } });
      if (res.json.ok !== true) rechazadas.push(`${st.d}/${st.pais}: ${res.json.e}`);
    }
    check(`Contrato: las ${lista.length} tiendas de sites.json pasan la validación del servicio`, lista.length > 100 && rechazadas.length === 0, rechazadas.slice(0, 5).join("; "));
    const { code } = createMockEnvironment();
    const res = code.doPost({ postData: { contents: JSON.stringify(Object.assign({}, validPayload, { tienda: "amazon méxico" })) } });
    check("Contrato: un nombre de tienda («Amazon México») en vez de dominio se rechaza", res.json.ok === false && res.json.e === "tienda_invalida");
  }

  // 15. Filas escritas a mano (sin id ni estado) cuentan como pendientes y reciben id
  {
    const { code, sheetData } = createMockEnvironment();
    sheetData.push(["", "", "", "Marca Manual", "", "", "", "", "", ""]);
    sheetData.push(["", "", "", "", "", "", "", "", "", ""]); // fila vacía: se ignora
    const res = code.doGet({ parameter: { token: "secreto-robot-12345" } });
    const f = (res.json.filas || [])[0];
    check("doGet: una fila escrita a mano sin estado es pendiente, recibe id y tipo «marca»",
      res.json.filas.length === 1 && f.marca === "Marca Manual" && f.tipo === "marca" && f.id && sheetData[1][0] === f.id, JSON.stringify(res.json));
  }

  // 16. op=purge borra solo las filas «procesado»
  {
    const { code, sheetData } = createMockEnvironment();
    sheetData.push(["a", "", "marca", "Uno", "", "", "", "", 1, "procesado"]);
    sheetData.push(["b", "", "marca", "Dos", "", "", "", "", 1, "pendiente"]);
    sheetData.push(["c", "", "marca", "Tres", "", "", "", "", 1, "Procesado"]);
    sheetData.push(["d", "", "marca", "Cuatro", "", "", "", "", 1, ""]);
    const res = code.doGet({ parameter: { token: "secreto-robot-12345", op: "purge" } });
    const restantes = sheetData.slice(1).map((r) => r[3]);
    check("doGet op=purge: borra las filas «procesado» y deja las pendientes y sin estado",
      res.json.ok === true && res.json.borradas === 2 && JSON.stringify(restantes) === JSON.stringify(["Dos", "Cuatro"]) && sheetData[0][0] === "ID", JSON.stringify(restantes));
    const bad = code.doGet({ parameter: { token: "malo", op: "purge" } });
    check("doGet op=purge sin token válido no borra nada", bad.json.ok === false && sheetData.length === 3);
  }

  console.log(`\n${pass}/${total} pruebas de Apps Script sugerencias correctas`);
  process.exit(pass === total ? 0 : 1);
})();
