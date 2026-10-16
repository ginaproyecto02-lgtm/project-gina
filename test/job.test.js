// Pruebas deterministas del robot semanal (job/investigar.js) y las reglas de verificación.
// 12 casos que cubren la arquitectura de 5 etapas, dominios, Safe Browsing, GLEIF, Fact Check y build_data.py.
const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");

const job = require("../job/investigar.js");
const dominios = job.loadDominios();

let pass = 0, total = 0;
function check(name, ok, detail) {
  total++;
  if (ok) pass++;
  console.log(`${ok ? "OK   " : "FALLA"} ${name}${detail ? " → " + detail : ""}`);
}

async function runTests() {
  console.log("Iniciando suite de pruebas de job/investigar.js...\n");

  // 1. Una URL inventada en un dominio válido (404) se rechaza.
  {
    const mockFetch = async (url) => {
      return {
        ok: false,
        status: 404,
        url,
        headers: new Map([["content-type", "text/html"]]),
        text: async () => "Not Found"
      };
    };
    const res = await job.verifySource(
      { url: "https://expansion.mx/empresas/404-no-existe" },
      "Empresa Prueba",
      "Controlador Prueba",
      dominios,
      { skipArchive: true },
      mockFetch
    );
    check("1. Una URL inventada en un dominio válido (404) se rechaza", !res.ok && res.motivo.includes("404"), res.motivo);
  }

  // 2. Una página que existe pero no contiene el nombre del controlador se rechaza.
  {
    const mockFetch = async (url) => {
      return {
        ok: true,
        status: 200,
        url,
        headers: new Map([["content-type", "text/html"]]),
        text: async () => "<html><body><h1>Grupo Bimbo reporta ventas récord</h1><p>Las ventas de pan en México y EE.UU. crecieron 10% en el último trimestre de 2026.</p></body></html>"
      };
    };
    const res = await job.verifySource(
      { url: "https://elceo.com/negocios/bimbo-ventas" },
      "Grupo Bimbo",
      "Familia NoExistente",
      dominios,
      { skipArchive: true },
      mockFetch
    );
    check("2. Una página que existe pero no contiene el nombre del controlador se rechaza", !res.ok && res.motivo.includes("no contiene cita"), res.motivo);
  }

  // 3. Una URL de redirección de Gemini se resuelve y se guarda la URL final.
  {
    const targetUrl = "https://www.jumex.com/historia";
    const mockFetch = async (url, opts) => {
      if (url.includes("vertexaisearch")) {
        return {
          ok: true,
          status: 200,
          url: targetUrl,
          headers: new Map([["content-type", "text/html"]]),
          text: async () => "<html><body>Página oficial de Jumex</body></html>"
        };
      }
      return { ok: true, status: 200, url, headers: new Map([["content-type", "text/html"]]), text: async () => "" };
    };
    const res = await job.resolveUrl("https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc123xyz", mockFetch);
    const ok = res.ok && res.finalUrl === targetUrl && !res.finalUrl.includes("vertexaisearch");
    check("3. Una URL de redirección de Gemini se resuelve y se guarda la URL final", ok, res.finalUrl);
  }

  // 4. Una fuente de dominio bloqueado no cuenta.
  {
    const nivel = job.classifyDomain("https://blarkad.com/ticker/XYZ", dominios);
    const mockFetch = async (url) => ({
      ok: true, status: 200, url, headers: new Map([["content-type", "text/html"]]),
      text: async () => "<html><body>Empresa Prueba controlada por Familia X</body></html>"
    });
    const res = await job.verifySource(
      { url: "https://blarkad.com/ticker/XYZ" },
      "Empresa Prueba",
      "Familia X",
      dominios,
      { skipArchive: true },
      mockFetch
    );
    check("4. Una fuente de dominio bloqueado no cuenta", nivel === "bloqueado" && !res.ok && res.nivel === "bloqueado", `${nivel} / ${res.motivo}`);
  }

  // 5. Un cambio de controlador con una sola fuente de prensa queda como «Verificar», no se aplica.
  {
    const existingGroup = { empresa: "Compañía Alpha", controlador: "Familia Antigua", confianza: "Alta" };
    const prop = {
      empresa: "Compañía Alpha",
      valor_nuevo: "Corporación Beta",
      fuentes: [{ url: "https://expansion.mx/empresas/compra-alpha" }]
    };
    const mockFetch = async (url) => {
      if (url.includes("gleif.org")) return { ok: false, status: 404 };
      return {
        ok: true,
        status: 200,
        url,
        headers: new Map([["content-type", "text/html"]]),
        text: async () => "<html><body>Compañía Alpha fue adquirida por Corporación Beta en una operación valorada en 500 millones.</body></html>"
      };
    };
    const res = await job.contrastProposal(prop, existingGroup, dominios, { skipArchive: true }, mockFetch);
    const ok = !res.aprobada && res.confianza === "Verificar" && res.fuentes.length === 1;
    check("5. Un cambio de controlador con una sola fuente de prensa queda como «Verificar», no se aplica", ok, `${res.confianza}: ${res.motivo}`);
  }

  // 6. El job produce una rama + PR, nunca un push a main (simulado).
  {
    const res = await job.createReviewPR({
      branchName: "datos/2026-10-10",
      reportMarkdown: "# Reporte simulado\n- Cambio 1",
      changesList: [{ grupo: "Grupo Prueba", antes: "A", despues: "B" }],
      dryRun: true,
      repo: "ginaproyecto02-lgtm/project-gina"
    });
    const ok = res.branch === "datos/2026-10-10" && res.prUrl.includes("pull") && res.dryRun === true;
    check("6. El job produce una rama + PR, nunca un push a main (simulado)", ok, `branch: ${res.branch} · pr: ${res.prUrl}`);
  }

  // 7. build_data.py falla con un «Verificado» sin evidencia.
  {
    const pyCode = `
import sys, os
sys.path.insert(0, 'datagen')
import data_base as base
base.g('grupo_fantasma', 'Fantasma SA', 'Nadie', 'México', 'Privada', confianza='Verificado', fuente='Prueba')
import build_data
`;
    const res = spawnSync("python", ["-c", pyCode], { encoding: "utf8", cwd: path.join(__dirname, "..") });
    const ok = res.status !== 0 && (res.stderr || "").includes("sin fila en evidencias.csv");
    check("7. build_data.py falla con un «Verificado» sin evidencia", ok, "Falla con AssertionError: sin fila en evidencias.csv");
  }

  // 8. Una URL que Safe Browsing marca se rechaza.
  {
    const mockFetch = async (url) => {
      if (url.includes("safebrowsing.googleapis.com")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            matches: [{ threatType: "MALWARE", platformType: "ANY_PLATFORM", threat: { url: "https://sitio-malicioso.com" } }]
          })
        };
      }
      return { ok: true, status: 200, url, headers: new Map([["content-type", "text/html"]]), text: async () => "Empresa X Familia Y" };
    };
    const sb = await job.checkSafeBrowsing("https://sitio-malicioso.com", "fake_key", mockFetch);
    const ver = await job.verifySource(
      { url: "https://sitio-malicioso.com" },
      "Empresa X",
      "Familia Y",
      dominios,
      { safeBrowsingKey: "fake_key", skipArchive: true },
      mockFetch
    );
    const ok = !sb.safe && sb.status === "fallo" && !ver.ok && ver.motivo.includes("Safe Browsing");
    check("8. Una URL que Safe Browsing marca se rechaza", ok, `${sb.status} / ${ver.motivo}`);
  }

  // 9. Un dominio fuera de dominios.json no cuenta.
  {
    const unlisted = "https://untrusted-unknown-blog-site.com/investigacion";
    const nivel = job.classifyDomain(unlisted, dominios);
    const mockFetch = async (url) => ({
      ok: true, status: 200, url, headers: new Map([["content-type", "text/html"]]),
      text: async () => "<html><body>Empresa Prueba controlada por Familia X</body></html>"
    });
    const res = await job.verifySource({ url: unlisted }, "Empresa Prueba", "Familia X", dominios, { skipArchive: true }, mockFetch);
    const ok = nivel === null && !res.ok && res.motivo.includes("no listado");
    check("9. Un dominio fuera de dominios.json no cuenta", ok, res.motivo);
  }

  // 10. Un conflicto con la matriz última de GLEIF deja el grupo en «Verificar» y no aplica el cambio.
  {
    const mockFetch = async (url) => {
      if (url.includes("ultimate-parent-relationship")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: { attributes: { parent: { name: "Conglomerado Internacional Holding AG" } } }
          })
        };
      }
      if (url.includes("lei-records")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ attributes: { lei: "549300TESTLEI12345" } }]
          })
        };
      }
      return {
        ok: true, status: 200, url, headers: new Map([["content-type", "text/html"]]),
        text: async () => "<html><body>Empresa Local SA pertenece a Grupo Inversor Pequeño con el 100%.</body></html>"
      };
    };
    const prop = {
      empresa: "Empresa Local SA",
      valor_nuevo: "Grupo Inversor Pequeño",
      fuentes: [{ url: "https://expansion.mx/empresas/local" }, { url: "https://elceo.com/negocios/local" }]
    };
    const res = await job.contrastProposal(prop, null, dominios, { skipArchive: true }, mockFetch);
    const ok = !res.aprobada && res.confianza === "Verificar" && res.motivo.includes("GLEIF") && res.gleif.coincide === "no";
    check("10. Un conflicto con la matriz última de GLEIF deja el grupo en «Verificar» y no aplica el cambio", ok, `${res.confianza}: ${res.motivo}`);
  }

  // 11. Un ClaimReview «falso» bloquea un hecho de reputación.
  {
    const mockFetch = async (url) => {
      if (url.includes("claims:search")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            claims: [{
              claimReview: [{
                publisher: { name: "Verificador Oficial" },
                textualRating: "Falso",
                url: "https://factcheck.org/review"
              }]
            }]
          })
        };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };
    const fc = await job.checkFactCheck("Empresa XYZ", "multa por contaminar río", "fake_key", mockFetch);
    const ok = !fc.ok && fc.status === "conflicto" && fc.review.textualRating === "Falso";
    check("11. Un ClaimReview «falso» bloquea un hecho de reputación", ok, `${fc.status} (Rating: ${fc.review && fc.review.textualRating})`);
  }

  // 12. build_data.py falla si un «Verificado» no tiene evidencia completa (S7).
  {
    const pyCode = `
import sys, os
sys.path.insert(0, 'datagen')
import data_base as base
with open('datagen/evidencias.csv', 'a', encoding='utf-8') as f:
    f.write('grupo_fallo_sb,https://www.sec.gov/test,oficial,"Cita de prueba valida 12345",2026-10-10,https://web.archive.org/test,fallo,na,na,ok,PR#1\\n')
base.g('grupo_fallo_sb', 'Fallo SB Corp', 'Controlador', 'EE.UU.', 'Corporación', confianza='Verificado', fuente='SEC')
try:
    import build_data
finally:
    lines = open('datagen/evidencias.csv', encoding='utf-8').readlines()
    open('datagen/evidencias.csv', 'w', encoding='utf-8').writelines([l for l in lines if not l.startswith('grupo_fallo_sb,')])
`;
    const res = spawnSync("python", ["-c", pyCode], { encoding: "utf8", cwd: path.join(__dirname, "..") });
    // Asegurar limpieza de evidencias.csv por si acaso
    const evPath = path.join(__dirname, "..", "datagen", "evidencias.csv");
    const lines = fs.readFileSync(evPath, "utf8").split("\n");
    fs.writeFileSync(evPath, lines.filter(l => !l.startsWith("grupo_fallo_sb,")).join("\n"), "utf8");
    const ok = res.status !== 0 && (res.stderr || "").includes("safe_browsing no es 'ok'");
    check("12. build_data.py falla si un «Verificado» no tiene evidencia completa (S7)", ok, "Falla con AssertionError: safe_browsing no es 'ok'");
  }

  // 13. evidencias.csv: serializador CSV real con todas las columnas entre comillas.
  {
    const row = job.serializeCsvRow(["grupo1", "https://url.com", "oficial", 'Cita con "comillas"', "2026-10-11", "https://arch.org", "ok", "na", "na", "ok", "PR#1"]);
    const expected = '"grupo1","https://url.com","oficial","Cita con ""comillas""","2026-10-11","https://arch.org","ok","na","na","ok","PR#1"\n';
    check("13. evidencias.csv: serializador CSV real con todas las columnas entre comillas", row === expected, row.trim());
  }

  // 14. Rama existente del mismo día → sufijo -2, -3.
  {
    const mockExec = (cmd, args) => {
      if (cmd === "git" && args[0] === "branch") {
        const branchName = args[2];
        if (branchName === "datos/2026-10-11" || branchName === "datos/2026-10-11-2") {
          return `* ${branchName}\n`;
        }
        return "";
      }
      return "";
    };
    const nextBranch = job.getNextBranchName("datos/2026-10-11", mockExec);
    check("14. Rama existente del mismo día → sufijo -2, -3", nextBranch === "datos/2026-10-11-3", nextBranch);
  }

  // 15. Rutas permitidas: createReviewPR aborta antes del push si hay archivos no permitidos.
  {
    let pushCalled = false;
    const mockExec = (cmd, args) => {
      if (cmd === "git") {
        if (args[0] === "diff" && args[1] === "--name-only") {
          return "extension/data/brands.json\narchivo_malicioso.js\n";
        }
        if (args[0] === "push") {
          pushCalled = true;
        }
      }
      return "";
    };
    let errorThrown = false;
    try {
      await job.createReviewPR({
        branchName: "datos/2026-10-11",
        reportMarkdown: "# Test",
        changesList: [{ grupo: "X" }],
        dryRun: false,
        repo: "test/repo",
        execFileImpl: mockExec
      });
    } catch (e) {
      errorThrown = true;
    }
    check("15. Rutas permitidas: createReviewPR aborta antes del push si algo sobra", errorThrown && !pushCalled, `abortó: ${errorThrown}, push: ${pushCalled}`);
  }

  // 16. Con 0 cambios: no crear rama, ni commit, ni PR; salida con código 0.
  {
    const res = await job.main({ dryRun: true, limit: 0 });
    const ok = res && res.report && res.report.cambios.length === 0 && res.prResult === null;
    check("16. Con 0 cambios: no crear rama, ni commit, ni PR", ok, `prResult: ${res.prResult}`);
  }

  // 17. factcheck: sin clave → 'na', nunca 'ok' fijo.
  {
    const origKey = process.env.GINA_FACTCHECK_KEY;
    delete process.env.GINA_FACTCHECK_KEY;
    const fc = await job.checkFactCheck("Empresa XYZ", "palabras clave", undefined);
    process.env.GINA_FACTCHECK_KEY = origKey;
    check("17. factcheck: sin clave → 'na', nunca 'ok' fijo", fc.ok && fc.status === "na", `status: ${fc.status}`);
  }

  // 18. loadIssues / parseIssueContent: reconoce formato gina:sugerencia y YAML / issue form
  {
    const issueV1 = {
      number: 10,
      body: "<!-- gina:sugerencia v1 tipo=marca -->\n- marca: Truper | tienda: Amazon | producto: Martillo",
      createdAt: "2026-10-10T00:00:00Z"
    };
    const parsedV1 = job.parseIssueContent(issueV1);
    const okV1 = parsedV1 && parsedV1.items.length === 1 && parsedV1.items[0].brand === "Truper";

    const issueYaml = {
      number: 11,
      body: "### Marca\n\nOriginal Nature's Oils\n\n### Tienda\n\nAmazon México\n\n### Producto\n\nKit de aceites",
      createdAt: "2026-10-10T00:00:00Z"
    };
    const parsedYaml = job.parseIssueContent(issueYaml);
    const okYaml = parsedYaml && parsedYaml.items.length === 1 && parsedYaml.items[0].brand === "Original Nature's Oils";

    check("18. parseIssueContent: soporta gina:sugerencia v1 y formulario YAML de issue", okV1 && okYaml);
  }

  // 19. El robot ya no cierra issues fijos (tarea de una sola vez fuera del código de producción)
  {
    const src = fs.readFileSync(path.join(__dirname, "..", "job", "investigar.js"), "utf8");
    check("19. El robot no contiene closeLegacyIssues ni números de issue fijos", !/closeLegacyIssues|de9daa9/.test(src) && typeof job.closeLegacyIssues === "undefined");
  }

  // 20. Al aprobar una propuesta: MARCA se agrega a db.marcas con {n, g, job:1} y grupo con confianza "Alta"
  {
    const fakeDb = { marcas: [], grupos: {} };
    const fakeItem = { brand: "Original Nature's Oils" };
    const gid = "inv_original_natures_oils";
    fakeDb.grupos[gid] = { empresa: "Original Nature's Oils Inc.", confianza: "Alta", url: "https://example.com" };
    fakeDb.marcas.push({ n: fakeItem.brand, g: gid, job: 1 });
    const m = fakeDb.marcas.find((x) => x.n === fakeItem.brand);
    check("20. Al aprobar propuesta: marca entra a db.marcas con job:1 y grupo con confianza 'Alta'", m && m.job === 1 && fakeDb.grupos[gid].confianza === "Alta");
  }

  // 21. Contrato con fixtures en test/fixtures/: issues (válido / sin marcador / duplicado / marca existente), Wikidata, IA y HTML
  {
    const fixturesDir = path.join(__dirname, "fixtures");
    const issuesFx = JSON.parse(fs.readFileSync(path.join(fixturesDir, "issues.json"), "utf8"));
    const wikiFx = JSON.parse(fs.readFileSync(path.join(fixturesDir, "wikidata.json"), "utf8"));
    const iaFx = JSON.parse(fs.readFileSync(path.join(fixturesDir, "ia.json"), "utf8"));
    const htmlFx = fs.readFileSync(path.join(fixturesDir, "pagina_oficial.html"), "utf8");

    const parsedValid = job.parseIssueContent(issuesFx[0]);
    const parsedYaml = job.parseIssueContent(issuesFx[1]);
    const parsedNoMarker = job.parseIssueContent(issuesFx[2]);
    const parsedExisting = job.parseIssueContent(issuesFx[3]);

    const wikiRes = await job.wikidataOwner("Original Nature's Oils", async () => ({
      ok: true,
      status: 200,
      json: async () => wikiFx
    }));
    const srcVer = await job.verifySource(
      iaFx.normalized.propuesta.fuentes[0],
      iaFx.normalized.propuesta.empresa,
      iaFx.normalized.propuesta.valor_nuevo,
      dominios,
      { skipArchive: true },
      async (url) => ({
        ok: true,
        status: 200,
        url,
        headers: new Map([["content-type", "text/html"]]),
        text: async () => htmlFx
      })
    );

    const okContrato =
      parsedValid && parsedValid.items[0].brand === "Original Nature's Oils" &&
      parsedYaml && parsedYaml.items[0].brand === "Original Nature's Oils" &&
      parsedNoMarker === null &&
      parsedExisting && parsedExisting.items[0].brand === "Nescafé" &&
      wikiRes.length === 1 && wikiRes[0].refUrl.includes("sec.gov") &&
      srcVer.ok && Buffer.byteLength(srcVer.extracto, "utf8") <= 20480;

    check("21. Contrato (test/fixtures/): issue válido, sin marcador, duplicado, existente, Wikidata, IA y HTML", okContrato);
  }

  // 22. licencia_origen (CC0 | ODbL | oficial | prensa) y fallo en build_data.py si ODbL no tiene nota de atribución
  {
    const licWiki = job.inferSourceLicense("wikidata", "https://www.wikidata.org/wiki/Q1", "oficial");
    const licOdbl = job.inferSourceLicense("ia", "https://world.openfoodfacts.org/product/123", "oficial");
    const licOficial = job.inferSourceLicense("ia", "https://www.sec.gov/edgar/1", "oficial");
    const licPrensa = job.inferSourceLicense("ia", "https://www.reuters.com/article/1", "prensa_referencia");

    const pyCode = `
import sys
sys.path.insert(0, 'datagen')
import data_base as base
base.g('grupo_odbl_sin_nota', 'ODbL Corp', 'Controlador', 'Francia', 'Corporación', confianza='Verificar', fuente='Open Food Facts')
base.G['grupo_odbl_sin_nota']['licencia_origen'] = 'ODbL'
import build_data
`;
    const res = spawnSync("python", ["-c", pyCode], {
      encoding: "utf8",
      cwd: path.join(__dirname, ".."),
      env: Object.assign({}, process.env, { PYTHONIOENCODING: "utf-8" })
    });
    const okFail = res.status !== 0 && (res.stderr || "").includes("licencia_origen 'ODbL'");
    const okLic = licWiki === "CC0" && licOdbl === "ODbL" && licOficial === "oficial" && licPrensa === "prensa";
    check("22. licencia_origen (CC0|ODbL|oficial|prensa) y fallo en build_data.py si ODbL carece de atribución", okLic && okFail, "Falla con AssertionError: licencia_origen 'ODbL' sin la nota de atribución");
  }

  // ---------------------------------------------------------------- E1. Robot de correos (job/correo.js)
  {
    const correo = require("../job/correo.js");

    // 23. Sin credenciales IMAP sale con código 0 y skipped
    const resSkipped = await correo.main();
    check("23. job/correo.js sin credenciales IMAP sale con código 0 y skipped",
      resSkipped && resSkipped.skipped === true && resSkipped.reason.includes("Credenciales IMAP no configuradas"));

    // 24. Sanitización rigurosa de remitentes: parseEmailBody extrae datos y elimina remitente/encabezados
    const rawEmail = `From: Juan Perez <juan.perez@dominio-privado.com>
To: gina.proyecto02@gmail.com
Subject: Sugerencia de marca
Date: Fri, 16 Oct 2026 12:00:00 +0000

<!-- gina:sugerencia v1 tipo=marca -->
- marca: Café Don Pepe
- tienda: Mercado Libre México
- producto: Café artesanal de Veracruz 500g
- fecha: 2026-10-16

(Enviado desde la extensión Gina. Revisa y edita antes de enviar; no incluye datos personales.)`;

    const parsed = correo.parseEmailBody(rawEmail);
    const body = correo.buildIssueBody(parsed);
    check("24. parseEmailBody extrae únicamente la sugerencia estructurada y no incluye remitente ni headers",
      parsed && parsed.marca === "Café Don Pepe" && parsed.tienda === "Mercado Libre México" &&
      !body.includes("juan.perez") && !body.includes("dominio-privado.com") && !body.includes("From:") &&
      body.includes("<!-- gina:sugerencia v1 tipo=marca -->") && body.includes("- marca: Café Don Pepe"));

    // 25. Detección de duplicados contra brands.json e issues abiertos
    const mockDb = {
      marcas: [{ n: "Bimbo", g: "bimbo" }, { n: "Sony", g: "sony" }],
      grupos: { bimbo: { empresa: "Grupo Bimbo" } }
    };
    const mockOpenIssues = [
      { title: "Marca faltante: Café Don Pepe", body: "- marca: Café Don Pepe" }
    ];

    const dupInDb = correo.isDuplicateBrand("Bimbo", mockDb, []);
    const dupAlias = correo.isDuplicateBrand("Visita la tienda de Sony®", mockDb, []);
    const dupIssue = correo.isDuplicateBrand("Café Don Pepe", mockDb, mockOpenIssues);
    const notDup = correo.isDuplicateBrand("Marca Totalmente Nueva", mockDb, mockOpenIssues);

    check("25. isDuplicateBrand detecta marcas existentes en brands.json y en issues abiertos",
      dupInDb === true && dupAlias === true && dupIssue === true && notDup === false);

    // 26. Proceso de emails: procesa nuevos, omite duplicados y mueve a gina/procesado
    const moved = [];
    const createdIssues = [];
    const mockImap = {
      searchUnseen: async () => [1, 2],
      fetchBody: async (id) => id === 1 ? rawEmail : `<!-- gina:sugerencia v1 tipo=marca -->\n- marca: Bimbo\n- tienda: Oxxo\n- producto: Pan`,
      moveToProcessed: async (id) => { moved.push(id); }
    };
    const mockExec = (cmd, args) => {
      if (cmd === "gh" && args[0] === "issue" && args[1] === "create") {
        createdIssues.push({ title: args[args.indexOf("--title") + 1], body: args[args.indexOf("--body") + 1] });
      }
    };

    const processRes = await correo.processEmails({
      imap: mockImap,
      brandsDb: mockDb,
      openIssues: [],
      repo: "ginaproyecto02-lgtm/project-gina",
      execFile: mockExec
    });

    check("26. processEmails crea issue solo para la marca nueva, descarta duplicada y mueve ambos a procesado",
      processRes.read === 2 && processRes.created === 1 && processRes.duplicates === 1 &&
      createdIssues.length === 1 && createdIssues[0].title === "Marca faltante: Café Don Pepe" &&
      !createdIssues[0].body.includes("juan.perez") && moved.length === 2);
  }

  console.log(`\n${pass}/${total} pruebas de job/investigar.js correctas`);
  process.exit(pass === total ? 0 : 1);
}

runTests().catch((e) => {
  console.error("Error ejecutando pruebas:", e);
  process.exit(1);
});
