// SPDX-License-Identifier: MIT
// Pruebas del robot de sugerencias (job/sugerencias.js)
"use strict";

const robot = require("../job/sugerencias.js");

let pass = 0, total = 0;
function check(name, ok, detail) {
  total++;
  if (ok) pass++;
  console.log(`${ok ? "OK   " : "FALLA"} ${name}${detail && !ok ? " → " + detail : ""}`);
}

(async () => {
  // 1. Sin token sale con código 0 y skipped: true
  {
    delete process.env.GINA_SUGERENCIAS_TOKEN;
    const res = await robot.main();
    check("Robot sugerencias: sin token sale con skipped:true", res && res.skipped === true);
  }

  // 2. Proceso de sugerencias: marcas nuevas, duplicadas, veces >= 3 y ack solo de lo procesado
  {
    const mockDb = {
      marcas: [{ n: "Bimbo", g: "bimbo" }],
      grupos: { bimbo: { empresa: "Grupo Bimbo" } }
    };

    const mockFilas = [
      { id: "1", tipo: "marca", marca: "Bimbo", tienda: "tienda.com", producto: "Pan", veces: 1 }, // Duplicado en DB
      { id: "2", tipo: "marca", marca: "Jabones Artesanales Zazil", tienda: "tienda.com", producto: "Jabón 100g", veces: 1 }, // Nueva
      { id: "3", tipo: "marca", marca: "Café de Altura", tienda: "tienda.com", producto: "Café 1kg", veces: 4 }, // Nueva y pedida por varios
      { id: "4", tipo: "marca", marca: "<script>bad</script>", tienda: "tienda.com", producto: "x", veces: 1 } // Inválida
    ];

    let ackedIds = [];
    const mockFetch = async (url) => {
      if (url.includes("op=ack")) {
        const u = new URL(url);
        const ids = u.searchParams.get("ids").split(",");
        ackedIds = ids;
        return { ok: true, status: 200, json: async () => ({ ok: true, procesados: ids.length }) };
      }
      return { ok: true, status: 200, json: async () => ({ ok: true, filas: mockFilas }) };
    };

    const createdIssues = [];
    const mockExec = (cmd, args) => {
      if (cmd === "gh" && args[0] === "issue" && args[1] === "create") {
        const titleIdx = args.indexOf("--title");
        const labels = [];
        for (let i = 0; i < args.length; i++) {
          if (args[i] === "--label") labels.push(args[i + 1]);
        }
        createdIssues.push({ title: args[titleIdx + 1], labels });
      }
    };

    const res = await robot.processSuggestions({
      url: "https://script.google.com/macros/s/test/exec",
      token: "secret",
      brandsDb: mockDb,
      issues: [],
      repo: "test/repo",
      execFile: mockExec,
      fetchImpl: mockFetch
    });

    check("Robot: lee 4 filas, crea 2 issues, 1 duplicado y 1 inválido",
      res.read === 4 && res.created === 2 && res.duplicates === 1 && res.invalid === 1,
      JSON.stringify(res));

    check("Robot: marca existente (Bimbo) es duplicado sin issue",
      !createdIssues.some((c) => c.title.includes("Bimbo")));

    check("Robot: marca con veces >= 3 lleva etiqueta 'pedida-por-varios'",
      createdIssues.some((c) => c.title.includes("Café de Altura") && c.labels.includes("pedida-por-varios") && c.labels.includes("sugerencia")));

    check("Robot: ack solo de lo procesado (las 4 filas fueron procesadas: 2 creadas + 1 dup + 1 inválida)",
      ackedIds.length === 4 && ackedIds.includes("1") && ackedIds.includes("2") && ackedIds.includes("3") && ackedIds.includes("4"));
  }

  // 3. Tope por ejecución: las filas que superan el tope NO se ackan y quedan para la próxima
  {
    const mockDb = { marcas: [], grupos: {} };
    const manyFilas = Array.from({ length: 30 }, (_, i) => ({
      id: "id_" + i,
      tipo: "marca",
      marca: "Marca " + i,
      tienda: "tienda.com",
      producto: "Prod",
      veces: 1
    }));

    let ackedIds = [];
    const mockFetch = async (url) => {
      if (url.includes("op=ack")) {
        const u = new URL(url);
        ackedIds = u.searchParams.get("ids").split(",");
        return { ok: true, status: 200, json: async () => ({ ok: true, procesados: ackedIds.length }) };
      }
      return { ok: true, status: 200, json: async () => ({ ok: true, filas: manyFilas }) };
    };

    const created = [];
    const res = await robot.processSuggestions({
      url: "https://script.google.com/macros/s/test/exec",
      token: "secret",
      brandsDb: mockDb,
      issues: [],
      repo: "test/repo",
      max: 25,
      execFile: (cmd, args) => { if (args[1] === "create") created.push(args[args.indexOf("--title") + 1]); },
      fetchImpl: mockFetch
    });

    check("Robot: tope de 25 issues por ejecución", created.length === 25 && res.created === 25 && res.skipped === 5);
    check("Robot: ack solo de las 25 procesadas, las 5 restantes no se confirman", ackedIds.length === 25 && !ackedIds.includes("id_25"));
  }

  console.log(`\n${pass}/${total} pruebas del robot sugerencias correctas`);
  process.exit(pass === total ? 0 : 1);
})();
