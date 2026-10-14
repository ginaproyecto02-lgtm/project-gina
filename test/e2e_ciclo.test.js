// Pruebas de contrato y de punta a punta (E2E) del ciclo completo de sugerencias y del robot (P0 → P1 → P2).
// Usa un repositorio git temporal real (git init + remoto bare), gh simulado en el PATH e IA simulada.
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const FIXTURES = path.join(__dirname, "fixtures");
const job = require("../job/investigar.js");
const QED = globalThis.QED;

const issuesFixture = JSON.parse(fs.readFileSync(path.join(FIXTURES, "issues.json"), "utf8"));
const wikidataFixture = JSON.parse(fs.readFileSync(path.join(FIXTURES, "wikidata.json"), "utf8"));
const iaFixture = JSON.parse(fs.readFileSync(path.join(FIXTURES, "ia.json"), "utf8"));
const htmlOficialFixture = fs.readFileSync(path.join(FIXTURES, "pagina_oficial.html"), "utf8");
const dominiosBase = JSON.parse(fs.readFileSync(path.join(ROOT, "datagen", "dominios.json"), "utf8"));
const fullBrandsBase = JSON.parse(fs.readFileSync(path.join(ROOT, "extension", "data", "brands.json"), "utf8"));

let pass = 0, total = 0;
function check(name, ok, detail) {
  total++;
  if (ok) pass++;
  console.log(`${ok ? "OK   " : "FALLA"} ${name}${detail ? " → " + detail : ""}`);
}

// Crea un entorno aislado con git init, remoto bare origin y ejecutable gh simulado en PATH
function createTempGitEnv() {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "gina-e2e-"));
  const remoteDir = path.join(baseDir, "remote.git");
  const repoDir = path.join(baseDir, "repo");
  const binDir = path.join(baseDir, "bin");
  const ghLogFile = path.join(baseDir, "gh_calls.json");
  const issuesFile = path.join(baseDir, "open_issues.json");

  fs.mkdirSync(remoteDir, { recursive: true });
  fs.mkdirSync(repoDir, { recursive: true });
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(ghLogFile, "[]", "utf8");
  fs.writeFileSync(issuesFile, "[]", "utf8");

  // Script Node para simular gh en PATH
  const ghJsPath = path.join(binDir, "gh.js");
  const ghJsCode = `#!/usr/bin/env node
"use strict";
const fs = require("fs");
const args = process.argv.slice(2);
const logFile = process.env.FAKE_GH_LOG;
const issuesFile = process.env.FAKE_GH_ISSUES;

let log = [];
try { log = JSON.parse(fs.readFileSync(logFile, "utf8")); } catch (_) {}

const entry = { cmd: "gh", args };
const bodyFileIdx = args.indexOf("--body-file");
if (bodyFileIdx >= 0 && args[bodyFileIdx + 1]) {
  try {
    entry.bodyFileContent = fs.readFileSync(args[bodyFileIdx + 1], "utf8");
  } catch (e) {
    entry.bodyFileError = e.message;
  }
}
log.push(entry);
if (logFile) fs.writeFileSync(logFile, JSON.stringify(log, null, 2), "utf8");

if (args[0] === "issue" && args[1] === "list") {
  const content = issuesFile && fs.existsSync(issuesFile) ? fs.readFileSync(issuesFile, "utf8") : "[]";
  if (args.includes("--jq")) {
    const arr = JSON.parse(content || "[]");
    process.stdout.write(arr.length ? String(arr[0].number) : "");
  } else {
    process.stdout.write(content);
  }
  process.exit(0);
}
if (args[0] === "pr" && args[1] === "list") {
  process.stdout.write("[]");
  process.exit(0);
}
if (args[0] === "pr" && args[1] === "create") {
  process.stdout.write("https://github.com/ginaproyecto02-lgtm/project-gina/pull/42\\n");
  process.exit(0);
}
if (args[0] === "issue" && args[1] === "create") {
  process.stdout.write("https://github.com/ginaproyecto02-lgtm/project-gina/issues/999\\n");
  process.exit(0);
}
process.exit(0);
`;
  fs.writeFileSync(ghJsPath, ghJsCode, "utf8");

  // Ejecutable Unix (bin/gh) + shim Windows (bin/gh.cmd y bin/gh.js detectado por defaultExecFile)
  const ghUnixPath = path.join(binDir, "gh");
  fs.writeFileSync(ghUnixPath, ghJsCode, { encoding: "utf8", mode: 0o755 });
  try { fs.chmodSync(ghUnixPath, 0o755); } catch (_) {}
  const ghCmdPath = path.join(binDir, "gh.cmd");
  fs.writeFileSync(ghCmdPath, `@echo off\r\n"${process.execPath}" "%~dp0gh.js" %*\r\n`, "utf8");

  // Inicializar remoto bare y repo de trabajo con rama main
  execFileSync("git", ["init", "--bare", remoteDir], { stdio: "ignore" });
  execFileSync("git", ["init", repoDir], { stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "gina-test"], { cwd: repoDir });
  execFileSync("git", ["config", "user.email", "gina-test@example.com"], { cwd: repoDir });
  execFileSync("git", ["checkout", "-b", "main"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoDir });

  // Escribir archivos base del repo temporal
  fs.mkdirSync(path.join(repoDir, "extension", "data"), { recursive: true });
  fs.mkdirSync(path.join(repoDir, "datagen", "fuentes"), { recursive: true });
  fs.mkdirSync(path.join(repoDir, "job", "reportes"), { recursive: true });

  const minimalBrands = {
    version: "2026-10-10T0000",
    nota: fullBrandsBase.nota,
    grupos: {
      nestle: fullBrandsBase.grupos.nestle
    },
    marcas: [
      { n: "Nescafé", g: "nestle" }
    ],
    aerolineas: [],
    reputacion: {},
    categorias: {},
    dominios: dominiosBase
  };

  fs.writeFileSync(path.join(repoDir, "extension", "data", "brands.json"), JSON.stringify(minimalBrands, null, 1), "utf8");
  fs.writeFileSync(path.join(repoDir, "datagen", "dominios.json"), JSON.stringify(dominiosBase, null, 2), "utf8");
  fs.writeFileSync(
    path.join(repoDir, "datagen", "evidencias.csv"),
    '"grupo_id","url_final","nivel_dominio","cita","fecha_consulta","archivo_url","safe_browsing","gleif_lei","gleif_coincide","factcheck","aprobado_en_pr"\n',
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoDir, "job", "estado.json"),
    JSON.stringify({ marcas: {}, revalidados: {}, ultimoRun: null, legacyClosed: true, rechazosAltosSeguidos: 0 }, null, 2),
    "utf8"
  );
  fs.writeFileSync(path.join(repoDir, ".gitignore"), "datagen/indice_fuentes.sqlite\n*.sqlite\n", "utf8");

  execFileSync("git", ["add", "."], { cwd: repoDir });
  execFileSync("git", ["commit", "-m", "init main"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoDir, stdio: "ignore" });

  const readGhLog = () => JSON.parse(fs.readFileSync(ghLogFile, "utf8"));
  const setOpenIssues = (arr) => fs.writeFileSync(issuesFile, JSON.stringify(arr, null, 2), "utf8");

  return { baseDir, repoDir, remoteDir, binDir, ghLogFile, issuesFile, readGhLog, setOpenIssues };
}

async function runAll() {
  console.log("Iniciando suite de contrato y punta a punta (test/e2e_ciclo.test.js)...\n");

  const origPath = process.env.PATH;
  const origGhLog = process.env.FAKE_GH_LOG;
  const origGhIssues = process.env.FAKE_GH_ISSUES;

  // =========================================================================
  // 1. CONTRATO: Issue válido / sin marcador / duplicado / marca existente
  // =========================================================================
  {
    const env = createTempGitEnv();
    process.env.PATH = env.binDir + path.delimiter + origPath;
    process.env.FAKE_GH_LOG = env.ghLogFile;
    process.env.FAKE_GH_ISSUES = env.issuesFile;
    env.setOpenIssues(issuesFixture);

    // Verificar parseIssueContent directamente con los 4 casos del fixture
    const pValid = job.parseIssueContent(issuesFixture[0]);      // #101 con marcador gina:sugerencia
    const pYamlDup = job.parseIssueContent(issuesFixture[1]);    // #102 plantilla YAML sin marcador HTML
    const pNoMarker = job.parseIssueContent(issuesFixture[2]);   // #103 bug sin marcador ni marca
    const pExisting = job.parseIssueContent(issuesFixture[3]);   // #104 Nescafé (marca existente)

    check(
      "Contrato 1a: Issue válido (#101), YAML sin marcador (#102), issue ajeno sin marcador (#103 → null) y marca existente (#104)",
      pValid && pValid.items[0].brand === "Original Nature's Oils" &&
      pYamlDup && pYamlDup.items[0].brand === "Original Nature's Oils" &&
      pNoMarker === null &&
      pExisting && pExisting.items[0].brand === "Nescafé"
    );

    const mockFetch = async (url) => {
      if (url.includes("wikidata.org")) return { ok: true, status: 200, json: async () => ({ results: { bindings: [] } }) };
      if (url.includes("gleif.org")) return { ok: false, status: 404 };
      if (url.includes("sec.gov")) {
        return {
          ok: true,
          status: 200,
          url: "https://www.sec.gov/Archives/edgar/data/original-natures-oils.html",
          headers: new Map([["content-type", "text/html"]]),
          text: async () => htmlOficialFixture
        };
      }
      return { ok: true, status: 200, url, headers: new Map([["content-type", "text/html"]]), text: async () => "" };
    };

    const res = await job.main({
      rootDir: env.repoDir,
      apiKey: "fake-key",
      force: true,
      skipArchive: true,
      fetchImpl: mockFetch,
      aiResearchImpl: async () => iaFixture
    });

    const ghCalls = env.readGhLog();
    const dupComment = ghCalls.find((c) => c.args[0] === "issue" && c.args[1] === "comment" && c.args[2] === "102");
    const dupClose = ghCalls.find((c) => c.args[0] === "issue" && c.args[1] === "close" && c.args[2] === "102");
    const existComment = ghCalls.find((c) => c.args[0] === "issue" && c.args[1] === "comment" && c.args[2] === "104");
    const existClose = ghCalls.find((c) => c.args[0] === "issue" && c.args[1] === "close" && c.args[2] === "104");

    check(
      "Contrato 1b: Issue duplicado (#102) recibe comentario «Duplicada de #101» y se cierra",
      !!(dupComment && dupComment.args.includes("Duplicada de #101") && dupClose),
      dupComment && dupComment.args.join(" ")
    );
    check(
      "Contrato 1c: Marca existente (#104 Nescafé) recibe «Ya está en la base (grupo Nestlé…)» y se cierra",
      !!(existComment && existComment.args.some((a) => a.includes("Ya está en la base (grupo Nestlé")) && existClose),
      existComment && existComment.args.join(" ")
    );

    // =========================================================================
    // 2. E2E CAMINO DORADO: "Original Nature's Oils"
    // =========================================================================
    const branch = res.prResult && res.prResult.branch;
    const prCreateCall = ghCalls.find((c) => c.args[0] === "pr" && c.args[1] === "create");
    const propComment101 = ghCalls.find((c) => c.args[0] === "issue" && c.args[1] === "comment" && c.args[2] === "101");

    // Verificar en la rama creada dentro del repositorio git temporal
    execFileSync("git", ["checkout", branch], { cwd: env.repoDir, stdio: "ignore" });
    const branchBrands = JSON.parse(fs.readFileSync(path.join(env.repoDir, "extension", "data", "brands.json"), "utf8"));
    const branchEvidencias = fs.readFileSync(path.join(env.repoDir, "datagen", "evidencias.csv"), "utf8");
    const fuentesFiles = fs.readdirSync(path.join(env.repoDir, "datagen", "fuentes")).filter((f) => f.endsWith(".json"));
    const reportFiles = fs.readdirSync(path.join(env.repoDir, "job", "reportes")).filter((f) => f.endsWith(".md"));

    const addedBrand = branchBrands.marcas.find((m) => m.n === "Original Nature's Oils");
    const addedGroup = addedBrand && branchBrands.grupos[addedBrand.g];
    const fuenteJson = fuentesFiles.length > 0
      ? JSON.parse(fs.readFileSync(path.join(env.repoDir, "datagen", "fuentes", fuentesFiles[0]), "utf8"))
      : null;

    check(
      "E2E Camino dorado 2a: Rama datos/… contiene brands.json (marca→grupo con job:1 y confianza Alta), evidencias.csv, fuentes/ y reporte",
      !!(branch && branch.startsWith("datos/") &&
         addedBrand && addedBrand.job === 1 &&
         addedGroup && addedGroup.confianza === "Alta" &&
         branchEvidencias.includes(addedBrand.g) &&
         fuenteJson && fuenteJson.url_final.includes("sec.gov") && Buffer.byteLength(fuenteJson.extracto, "utf8") <= 20480 &&
         reportFiles.length === 1),
      `rama: ${branch}, marca: ${addedBrand && addedBrand.n} → ${addedBrand && addedBrand.g}, fuente: ${fuentesFiles[0]}`
    );

    check(
      "E2E Camino dorado 2b: PR creado con --body-file e incluye «Closes #101»; issue #101 recibe «Propuesta en PR #42»",
      !!(prCreateCall && prCreateCall.args.includes("--body-file") &&
         prCreateCall.bodyFileContent && prCreateCall.bodyFileContent.includes("Closes #101") &&
         propComment101 && propComment101.args.some((a) => a.includes("Propuesta en PR #42"))),
      propComment101 && propComment101.args[propComment101.args.length - 1]
    );

    // Simular merge del PR humano (#42) y verificar que build_data.py sube confianza a Verificado y matcher reconoce la marca
    const mainBrandsPath = path.join(ROOT, "extension", "data", "brands.json");
    const mainEvPath = path.join(ROOT, "datagen", "evidencias.csv");
    const backupBrands = fs.readFileSync(mainBrandsPath, "utf8");
    const backupEv = fs.readFileSync(mainEvPath, "utf8");
    try {
      const mergedBrands = JSON.parse(backupBrands);
      mergedBrands.grupos[addedBrand.g] = addedGroup;
      mergedBrands.marcas.push(addedBrand);
      fs.writeFileSync(mainBrandsPath, JSON.stringify(mergedBrands, null, 1), "utf8");

      const newEvRow = branchEvidencias.trim().split("\n").pop().replace(/"datos\/[^"]+"$/, '"#42"');
      fs.writeFileSync(mainEvPath, backupEv.trimEnd() + "\n" + newEvRow + "\n", "utf8");

      const buildRes = spawnSync("python", ["datagen/build_data.py"], { cwd: ROOT, encoding: "utf8" });
      const builtBrands = JSON.parse(fs.readFileSync(mainBrandsPath, "utf8"));
      const verifiedGroup = builtBrands.grupos[addedBrand.g];
      const idx = QED.buildIndex(builtBrands, [], {}, {});
      const matchRes = QED.match(idx, [{ text: "Original Nature's Oils", source: "brand" }], "ORIGINAL NATURE'S OILS Kit de 5 aceites esenciales Árbol de Té");

      check(
        "E2E Camino dorado 2c: Tras merge (#42), build_data.py pasa, sube confianza a «Verificado» y matcher reconoce «Original Nature's Oils»",
        buildRes.status === 0 && verifiedGroup && verifiedGroup.confianza === "Verificado" && matchRes.found && matchRes.group.empresa === "Original Nature's Oils LLC",
        `build_data exit=${buildRes.status}, confianza=${verifiedGroup && verifiedGroup.confianza}, matcher=${matchRes.found && matchRes.brand}`
      );
    } finally {
      fs.writeFileSync(mainBrandsPath, backupBrands, "utf8");
      fs.writeFileSync(mainEvPath, backupEv, "utf8");
    }
  }

  // =========================================================================
  // 3. E2E: 0 propuestas → sin rama ni PR; código 0
  // =========================================================================
  {
    const env = createTempGitEnv();
    process.env.PATH = env.binDir + path.delimiter + origPath;
    process.env.FAKE_GH_LOG = env.ghLogFile;
    process.env.FAKE_GH_ISSUES = env.issuesFile;
    env.setOpenIssues([]);

    const res = await job.main({
      rootDir: env.repoDir,
      apiKey: "fake-key",
      force: true,
      skipArchive: true
    });
    const branchesOut = execFileSync("git", ["branch", "-a"], { cwd: env.repoDir, encoding: "utf8" });
    const ghCalls = env.readGhLog();
    const prCreated = ghCalls.some((c) => c.args[0] === "pr" && c.args[1] === "create");

    check(
      "E2E 3: 0 propuestas → sin rama datos/ ni PR; salida limpia",
      res.prResult === null && res.report.cambios.length === 0 && !branchesOut.includes("datos/") && !prCreated,
      `ramas: ${branchesOut.trim().replace(/\s+/g, " ")}`
    );
  }

  // =========================================================================
  // 4. E2E: Sin clave de IA → resuelve por Wikidata; no falla
  // =========================================================================
  {
    const env = createTempGitEnv();
    process.env.PATH = env.binDir + path.delimiter + origPath;
    process.env.FAKE_GH_LOG = env.ghLogFile;
    process.env.FAKE_GH_ISSUES = env.issuesFile;
    env.setOpenIssues([issuesFixture[0]]); // #101 Original Nature's Oils

    const mockFetch = async (url) => {
      if (url.includes("wikidata.org")) {
        return { ok: true, status: 200, json: async () => wikidataFixture };
      }
      if (url.includes("gleif.org")) return { ok: false, status: 404 };
      if (url.includes("sec.gov")) {
        return {
          ok: true,
          status: 200,
          url: "https://www.sec.gov/Archives/edgar/data/original-natures-oils.html",
          headers: new Map([["content-type", "text/html"]]),
          text: async () => htmlOficialFixture
        };
      }
      return { ok: true, status: 200, url, headers: new Map([["content-type", "text/html"]]), text: async () => "" };
    };

    const res = await job.main({
      rootDir: env.repoDir,
      apiKey: "", // Sin clave de IA
      force: true,
      skipArchive: true,
      fetchImpl: mockFetch
    });

    check(
      "E2E 4: Sin clave de IA → resuelve por Wikidata con referencia; 0 llamadas a IA y no falla",
      res.report.cambios.length === 1 &&
      res.report.metricas.resueltasPor.wikidata === 1 &&
      res.report.metricas.llamadasIA === 0 &&
      res.prResult && res.prResult.branch.startsWith("datos/"),
      `resueltasPor.wikidata=${res.report.metricas.resueltasPor.wikidata}, llamadasIA=${res.report.metricas.llamadasIA}`
    );
  }

  // =========================================================================
  // 5. E2E: Cita con ` y $(touch /tmp/pwned) → archivo no se crea; PR contiene texto literal
  // =========================================================================
  {
    const env = createTempGitEnv();
    process.env.PATH = env.binDir + path.delimiter + origPath;
    process.env.FAKE_GH_LOG = env.ghLogFile;
    process.env.FAKE_GH_ISSUES = env.issuesFile;
    env.setOpenIssues([issuesFixture[0]]);

    const pwnedTmp = "/tmp/pwned";
    const pwnedLocal = path.join(env.baseDir, "pwned");
    try { if (fs.existsSync(pwnedTmp)) fs.unlinkSync(pwnedTmp); } catch (_) {}
    try { if (fs.existsSync(pwnedLocal)) fs.unlinkSync(pwnedLocal); } catch (_) {}

    const maliciousHtml = `<!DOCTYPE html><html><body><p>Original Nature's Oils LLC es controlada al 100% por su familia fundadora \`inyeccion\` $(touch /tmp/pwned) $(touch "${pwnedLocal}").</p></body></html>`;

    const mockFetch = async (url) => {
      if (url.includes("wikidata.org")) return { ok: true, status: 200, json: async () => wikidataFixture };
      if (url.includes("gleif.org")) return { ok: false, status: 404 };
      return {
        ok: true,
        status: 200,
        url: "https://www.sec.gov/Archives/edgar/data/original-natures-oils.html",
        headers: new Map([["content-type", "text/html"]]),
        text: async () => maliciousHtml
      };
    };

    await job.main({
      rootDir: env.repoDir,
      apiKey: "",
      force: true,
      skipArchive: true,
      fetchImpl: mockFetch
    });

    const ghCalls = env.readGhLog();
    const prCall = ghCalls.find((c) => c.args[0] === "pr" && c.args[1] === "create");
    const pwnedCreated = fs.existsSync(pwnedTmp) || fs.existsSync(pwnedLocal);
    const bodyHasLiteral = prCall && prCall.bodyFileContent &&
      prCall.bodyFileContent.includes("`inyeccion`") &&
      prCall.bodyFileContent.includes("$(touch /tmp/pwned)");

    check(
      "E2E 5: Cita con ` y $(touch /tmp/pwned) → el archivo no se crea y el PR contiene el texto literal",
      !pwnedCreated && !!bodyHasLiteral,
      `pwnedCreated=${pwnedCreated}, literalEnPR=${!!bodyHasLiteral}`
    );
  }

  // =========================================================================
  // 6. E2E: Archivo fuera de la lista blanca → abortar antes del push
  // =========================================================================
  {
    const env = createTempGitEnv();
    process.env.PATH = env.binDir + path.delimiter + origPath;
    process.env.FAKE_GH_LOG = env.ghLogFile;
    process.env.FAKE_GH_ISSUES = env.issuesFile;

    // Registrar todas las llamadas a git y gh
    const cmdCalls = [];
    const customExec = (cmd, args, opts) => {
      cmdCalls.push({ cmd, args });
      return execFileSync(cmd === "gh" ? process.execPath : cmd, cmd === "gh" ? [path.join(env.binDir, "gh.js"), ...args] : args, opts);
    };

    // Modificar y preparar (git add) un archivo fuera de la lista blanca en el repo temporal
    const forbiddenPath = path.join(env.repoDir, "intruso.js");
    fs.writeFileSync(forbiddenPath, "console.log('no permitido');\n", "utf8");
    execFileSync("git", ["add", "intruso.js"], { cwd: env.repoDir });

    let aborted = false;
    try {
      await job.createReviewPR({
        branchName: "datos/2026-10-12",
        reportMarkdown: "# Reporte",
        changesList: [{ grupo: "Test" }],
        dryRun: false,
        repo: "ginaproyecto02-lgtm/project-gina",
        execFileImpl: customExec,
        rootDir: env.repoDir
      });
    } catch (e) {
      aborted = e.message.includes("Rutas no permitidas");
    }

    const pushCalls = cmdCalls.filter((c) => c.cmd === "git" && c.args[0] === "push");
    const prCalls = cmdCalls.filter((c) => c.cmd === "gh" && c.args[0] === "pr" && c.args[1] === "create");

    check(
      "E2E 6: Archivo fuera de la lista blanca → aborta antes del push (0 git push y 0 gh pr create)",
      aborted && pushCalls.length === 0 && prCalls.length === 0,
      `aborted=${aborted}, pushCalls=${pushCalls.length}, prCalls=${prCalls.length}`
    );
  }

  // =========================================================================
  // 7. E2E: Rama del mismo día existente → datos/AAAA-MM-DD-2
  // =========================================================================
  {
    const env = createTempGitEnv();
    process.env.PATH = env.binDir + path.delimiter + origPath;
    process.env.FAKE_GH_LOG = env.ghLogFile;
    process.env.FAKE_GH_ISSUES = env.issuesFile;
    env.setOpenIssues([issuesFixture[0]]);

    const todayStr = new Date().toISOString().slice(0, 10);
    // Crear previamente la rama datos/AAAA-MM-DD en el repositorio git temporal
    execFileSync("git", ["branch", `datos/${todayStr}`], { cwd: env.repoDir });

    const mockFetch = async (url) => {
      if (url.includes("wikidata.org")) return { ok: true, status: 200, json: async () => wikidataFixture };
      if (url.includes("gleif.org")) return { ok: false, status: 404 };
      return {
        ok: true,
        status: 200,
        url: "https://www.sec.gov/Archives/edgar/data/original-natures-oils.html",
        headers: new Map([["content-type", "text/html"]]),
        text: async () => htmlOficialFixture
      };
    };

    const res = await job.main({
      rootDir: env.repoDir,
      apiKey: "",
      force: true,
      skipArchive: true,
      fetchImpl: mockFetch
    });

    const expectedBranch = `datos/${todayStr}-2`;
    check(
      "E2E 7: Rama del mismo día existente → crea datos/AAAA-MM-DD-2",
      res.prResult && res.prResult.branch === expectedBranch,
      `rama creada: ${res.prResult && res.prResult.branch}`
    );
  }

  // =========================================================================
  // 8. E2E: Fuente en la biblioteca de menos de 12 meses → 0 llamadas a la IA
  // =========================================================================
  {
    const env = createTempGitEnv();
    process.env.PATH = env.binDir + path.delimiter + origPath;
    process.env.FAKE_GH_LOG = env.ghLogFile;
    process.env.FAKE_GH_ISSUES = env.issuesFile;
    env.setOpenIssues([issuesFixture[0]]);

    // Poblar datagen/fuentes/ con una evidencia verificada de hace 10 días (< 12 meses)
    const recentDate = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
    const urlFinal = "https://www.sec.gov/Archives/edgar/data/original-natures-oils.html";
    const h8 = job.hash8(urlFinal);
    const fuentePath = path.join(env.repoDir, "datagen", "fuentes", `inv_original_natures_oils_llc-${h8}.json`);
    fs.writeFileSync(fuentePath, JSON.stringify({
      grupo_id: "inv_original_natures_oils_llc",
      empresa: "Original Nature's Oils LLC",
      controlador: "Original Nature's Oils LLC (Familia fundadora 100%)",
      pais: "EE.UU.",
      tipo: "Familia",
      url_final: urlFinal,
      archivo_url: `https://web.archive.org/web/${urlFinal}`,
      fecha: recentDate,
      cita: "Original Nature's Oils LLC es propietaria de la marca Original Nature's Oils y es controlada al 100% por su familia fundadora en EE.UU.",
      extracto: "Según el informe anual presentado ante la autoridad, Original Nature's Oils LLC es propietaria de la marca Original Nature's Oils y es controlada al 100% por su familia fundadora en EE.UU."
    }, null, 2), "utf8");

    // Construir el índice SQLite FTS5 con datagen/indice_fuentes.py
    const indiceDb = path.join(env.repoDir, "datagen", "indice_fuentes.sqlite");
    spawnSync("python", [
      path.join(ROOT, "datagen", "indice_fuentes.py"),
      "--no-sync",
      "--db", indiceDb,
      "--dir", path.join(env.repoDir, "datagen", "fuentes")
    ], { encoding: "utf8" });

    execFileSync("git", ["add", "datagen/fuentes"], { cwd: env.repoDir });
    execFileSync("git", ["commit", "-m", "seed fuente reciente"], { cwd: env.repoDir, stdio: "ignore" });

    let aiCalls = 0;
    const res = await job.main({
      rootDir: env.repoDir,
      apiKey: "fake-key-should-not-be-used",
      force: true,
      skipArchive: true,
      fetchImpl: async (url) => {
        if (url.includes("gleif.org")) return { ok: false, status: 404 };
        return {
          ok: true,
          status: 200,
          url: urlFinal,
          headers: new Map([["content-type", "text/html"]]),
          text: async () => htmlOficialFixture
        };
      },
      aiResearchImpl: async () => {
        aiCalls++;
        return iaFixture;
      }
    });

    check(
      "E2E 8: Fuente en la biblioteca de menos de 12 meses → 0 llamadas a la IA y resuelta por biblioteca",
      aiCalls === 0 && res.report.metricas.llamadasIA === 0 && res.report.metricas.resueltasPor.biblioteca === 1 && res.report.cambios.length === 1,
      `aiCalls=${aiCalls}, resueltasPor.biblioteca=${res.report.metricas.resueltasPor.biblioteca}`
    );
  }

  // =========================================================================
  // 9. E2E: >50% de rechazos dos ejecuciones seguidas → abre issue "Revisar el robot"
  // =========================================================================
  {
    const env = createTempGitEnv();
    process.env.PATH = env.binDir + path.delimiter + origPath;
    process.env.FAKE_GH_LOG = env.ghLogFile;
    process.env.FAKE_GH_ISSUES = env.issuesFile;
    env.setOpenIssues([issuesFixture[0]]);

    const failingFetch = async () => ({ ok: false, status: 404 });

    // Ejecución 1 con 100% rechazo
    await job.main({
      rootDir: env.repoDir,
      apiKey: "",
      force: true,
      skipArchive: true,
      fetchImpl: failingFetch
    });

    // Ejecución 2 seguida con 100% rechazo
    const res2 = await job.main({
      rootDir: env.repoDir,
      apiKey: "",
      force: true,
      skipArchive: true,
      fetchImpl: failingFetch
    });

    const ghCalls = env.readGhLog();
    const alertIssue = ghCalls.find((c) => c.args[0] === "issue" && c.args[1] === "create" && c.args.includes("Revisar el robot"));
    check(
      "E2E 9: >50% de rechazos dos ejecuciones seguidas → abre el issue «Revisar el robot»",
      res2.report.alertaRobot === true && !!alertIssue,
      alertIssue && alertIssue.args.join(" ")
    );
  }

  // =========================================================================
  // D5. Ciclo: estado versionado limpio, frecuencia, revalidación y alarma de falla
  // =========================================================================
  {
    const estado = JSON.parse(fs.readFileSync(path.join(ROOT, "job", "estado.json"), "utf8"));
    check("D5 a: job/estado.json versionado en main tiene ultimoRun = null (una corrida local no bloquea el lunes)",
      estado.ultimoRun === null || estado.ultimoRun === undefined, `ultimoRun=${estado.ultimoRun}`);
  }

  {
    const env = createTempGitEnv();
    process.env.PATH = env.binDir + path.delimiter + origPath;
    process.env.FAKE_GH_LOG = env.ghLogFile;
    process.env.FAKE_GH_ISSUES = env.issuesFile;
    env.setOpenIssues([]);
    const statePath = path.join(env.repoDir, "job", "estado.json");
    const DAY = 86400000;

    fs.writeFileSync(statePath, JSON.stringify({ marcas: {}, revalidados: {}, ultimoRun: new Date(Date.now() - 7 * DAY).toISOString() }), "utf8");
    const corre = await job.main({ rootDir: env.repoDir, apiKey: "", force: false, everyDays: 6, skipArchive: true });
    fs.writeFileSync(statePath, JSON.stringify({ marcas: {}, revalidados: {}, ultimoRun: new Date(Date.now() - 3 * DAY).toISOString() }), "utf8");
    const salta = await job.main({ rootDir: env.repoDir, apiKey: "", force: false, everyDays: 6, skipArchive: true });
    check("D5 b: run por schedule con estado de hace 7 días y EVERY_DAYS=6 → corre; con estado de hace 3 días → se omite",
      Array.isArray(corre.report.revalidadas) && salta.report.revalidadas === undefined);
  }

  {
    const env = createTempGitEnv();
    process.env.PATH = env.binDir + path.delimiter + origPath;
    process.env.FAKE_GH_LOG = env.ghLogFile;
    process.env.FAKE_GH_ISSUES = env.issuesFile;
    env.setOpenIssues([]);
    // Dos evidencias: una cuya URL ahora da 404 y otra que sigue abriendo con la cita.
    const brandsPath = path.join(env.repoDir, "extension", "data", "brands.json");
    const b = JSON.parse(fs.readFileSync(brandsPath, "utf8"));
    b.grupos.nestle.confianza = "Alta";
    b.grupos.vigente = Object.assign({}, b.grupos.nestle, { empresa: "Empresa Vigente", confianza: "Alta" });
    fs.writeFileSync(brandsPath, JSON.stringify(b, null, 1), "utf8");
    const evPath = path.join(env.repoDir, "datagen", "evidencias.csv");
    fs.appendFileSync(evPath,
      '"nestle","https://www.nestle.com/investors/annual-report","oficial","Nestlé S.A. no tiene accionista de control según su informe anual.","2025-01-10","","ok","na","na","na","#1"\n' +
      '"vigente","https://www.ejemplo-oficial.com/gobierno","oficial","La empresa vigente es propiedad de la familia Ejemplo desde 1950.","2025-06-01","","ok","na","na","na","#2"\n', "utf8");
    execFileSync("git", ["add", "."], { cwd: env.repoDir });
    execFileSync("git", ["commit", "-m", "evidencias de prueba"], { cwd: env.repoDir, stdio: "ignore" });

    const fetch404 = async (url) => {
      if (url.includes("nestle.com")) return { ok: false, status: 404, url, headers: new Map([["content-type", "text/html"]]), text: async () => "" };
      if (url.includes("ejemplo-oficial.com")) return { ok: true, status: 200, url, headers: new Map([["content-type", "text/html"]]), text: async () => "<p>La empresa vigente es propiedad de la familia Ejemplo desde 1950.</p>" };
      return { ok: false, status: 404, url, headers: new Map(), text: async () => "" };
    };
    const res = await job.main({ rootDir: env.repoDir, apiKey: "", force: true, revalidate: 5, skipArchive: true, fetchImpl: fetch404 });
    const ghCalls = env.readGhLog();
    const pr = ghCalls.find((c) => c.args[0] === "pr" && c.args[1] === "create");
    let rama = null;
    if (res.prResult && res.prResult.branch) {
      execFileSync("git", ["checkout", res.prResult.branch], { cwd: env.repoDir, stdio: "ignore" });
      rama = JSON.parse(fs.readFileSync(brandsPath, "utf8"));
    }
    check("D5 c: revalidación con una URL que ahora da 404 → el grupo pasa a «Verificar» con nota y va al PR; la fuente vigente no cambia",
      !!(pr && rama && rama.grupos.nestle.confianza === "Verificar" && /Fuente ya no disponible/.test(rama.grupos.nestle.nota) &&
         rama.grupos.vigente.confianza === "Alta" && res.report.revalidadas.includes("Empresa Vigente")),
      rama ? `nestle=${rama.grupos.nestle.confianza}` : "sin PR");
  }

  {
    // Alarma: se ejecuta el script del paso «Avisar si el robot falló» con gh simulado.
    const env = createTempGitEnv();
    const wf = fs.readFileSync(path.join(ROOT, ".github", "workflows", "investigacion-semanal.yml"), "utf8");
    const m = wf.match(/- name: Avisar si el robot falló\n\s+if: failure\(\)[\s\S]*?run: \|\n([\s\S]*)$/);
    const script = m ? m[1].split("\n").map((l) => l.replace(/^ {10}/, "")).join("\n") : "";
    const runEnv = Object.assign({}, process.env, {
      PATH: env.binDir + path.delimiter + origPath,
      FAKE_GH_LOG: env.ghLogFile,
      FAKE_GH_ISSUES: env.issuesFile,
      GITHUB_REPOSITORY: "ginaproyecto02-lgtm/project-gina",
      RUN_URL: "https://github.com/ginaproyecto02-lgtm/project-gina/actions/runs/1"
    });
    env.setOpenIssues([]);
    const r = spawnSync("bash", ["-c", script], { env: runEnv, encoding: "utf8" });
    const created = env.readGhLog().find((c) => c.args[0] === "issue" && c.args[1] === "create" && c.args.includes("Robot de investigación falló"));
    check("D5 d: un fallo del robot → el paso if: failure() crea el issue «Robot de investigación falló» con el enlace a la ejecución",
      !!m && r.status === 0 && !!created && created.args.some((a) => a.includes("/actions/runs/1")), r.stderr && r.stderr.slice(0, 120));
  }

  {
    // Tras fusionar el PR de revalidación, build_data.py conserva «Verificar» (no la vuelve a subir con la evidencia vieja).
    const mainBrandsPath = path.join(ROOT, "extension", "data", "brands.json");
    const sitesPath = path.join(ROOT, "extension", "data", "sites.json");
    const backup = fs.readFileSync(mainBrandsPath, "utf8");
    const backupSites = fs.readFileSync(sitesPath, "utf8");
    try {
      const b = JSON.parse(backup);
      b.grupos.herdez = Object.assign({}, b.grupos.herdez, { confianza: "Verificar", revalidacion_fallida: "2026-10-13", investigado: "2099-01-01T00:00:00.000Z", nota: "Fuente ya no disponible (2026-10-13)" });
      fs.writeFileSync(mainBrandsPath, JSON.stringify(b, null, 1), "utf8");
      const r = spawnSync("python3", ["datagen/build_data.py"], { cwd: ROOT, encoding: "utf8" });
      const built = JSON.parse(fs.readFileSync(mainBrandsPath, "utf8"));
      check("D5 e: tras fusionar, build_data.py conserva «Verificar» aunque la evidencia vieja tenga PR aprobado",
        r.status === 0 && built.grupos.herdez.confianza === "Verificar", `exit=${r.status} ${built.grupos.herdez.confianza} ${(r.stderr || "").slice(-200)}`);
    } finally {
      fs.writeFileSync(mainBrandsPath, backup, "utf8");
      fs.writeFileSync(sitesPath, backupSites, "utf8");
    }
  }

  process.env.PATH = origPath;
  process.env.FAKE_GH_LOG = origGhLog;
  process.env.FAKE_GH_ISSUES = origGhIssues;

  console.log(`\n${pass}/${total} pruebas de ciclo E2E correctas`);
  process.exit(pass === total ? 0 : 1);
}

runAll().catch((e) => {
  console.error("Error en e2e_ciclo.test.js:", e);
  process.exit(1);
});
