// SPDX-License-Identifier: MIT
// Pruebas de funciones de sugerencias (job/sugerencias_comun.js)
"use strict";

const comun = require("../job/sugerencias_comun.js");
const { plausibleBrand, sanitize, buildIssueBody, isDuplicateBrand, safeText } = comun;

let pass = 0, total = 0;
function check(name, ok, detail) {
  total++;
  if (ok) pass++;
  console.log(`${ok ? "OK   " : "FALLA"} ${name}${detail && !ok ? " → " + detail : ""}`);
}

(async () => {
  // 1. plausibleBrand: acepta marcas limpias
  check("plausibleBrand: acepta marcas válidas con acentos, espacios y signos",
    plausibleBrand("Café Don Pepe") &&
    plausibleBrand("L'Oréal") &&
    plausibleBrand("Ben & Jerry's") &&
    plausibleBrand("3M") &&
    plausibleBrand("M&M's"));

  // 2. plausibleBrand: rechaza XSS, inyecciones HTML, markdown, URLs y menciones
  check("plausibleBrand: rechaza XSS, HTML, markdown, URLs y menciones",
    !plausibleBrand("<script>alert(1)</script>") &&
    !plausibleBrand("@everyone") &&
    !plausibleBrand("[link](https://evil.example)") &&
    !plausibleBrand("javascript:alert(1)") &&
    !plausibleBrand("Marca ${process.env}") &&
    !plausibleBrand("Marca {{7*7}}"));

  // 3. sanitize: estructura y valida marcas saneando tienda, producto y fecha
  {
    const raw = {
      tipo: "marca",
      marca: "  Jabón Zazil  ",
      tienda: "Amazon México <!-- comentario -->",
      producto: "Jabón artesanal 100g [link](http://evil.com)",
      fecha: "2026-10-23"
    };
    const s = sanitize(raw);
    check("sanitize: estructura y valida marcas saneando tienda, producto y fecha",
      s && s.tipo === "marca" && s.marca === "Jabón Zazil" &&
      !s.tienda.includes("<!--") && !s.producto.includes("[link]") &&
      s.fecha === "2026-10-23");
  }

  // 4. sanitize: estructura alternativas con categoría, país, dueño y fuente segura
  {
    const raw = {
      tipo: "alternativa",
      marca: "Café Ñandú",
      categoria: "Café",
      pais: "México",
      dueno: "Cooperativa de Productores",
      fuente: "https://cooperativa.example/quienes-somos"
    };
    const s = sanitize(raw);
    check("sanitize: estructura alternativas con categoría, país, dueño y fuente segura",
      s && s.tipo === "alternativa" && s.marca === "Café Ñandú" &&
      s.dueno === "Cooperativa de Productores" &&
      s.fuente === "https://cooperativa.example/quienes-somos");
  }

  // 5. sanitize: descarta marcas no plausibles retornando null
  check("sanitize: descarta marcas no plausibles retornando null",
    sanitize({ tipo: "marca", marca: "<script>bad()</script>" }) === null &&
    sanitize(null) === null);

  // 6. isDuplicateBrand: detecta marcas existentes en brands.json y en issues abiertos
  {
    const mockDb = {
      marcas: [{ n: "Bimbo", g: "bimbo" }],
      grupos: { bimbo: { empresa: "Grupo Bimbo" } }
    };
    const mockIssues = [
      { title: "Marca faltante: Marinela", body: "Galletas" }
    ];
    check("isDuplicateBrand: detecta marcas existentes en brands.json y en issues abiertos",
      isDuplicateBrand("Bimbo", mockDb, []) === true &&
      isDuplicateBrand("Marinela", mockDb, mockIssues) === true &&
      isDuplicateBrand("Marca Nueva Desconocida", mockDb, mockIssues) === false);
  }

  // 7. buildIssueBody: genera el formato <!-- gina:sugerencia v1 --> con campos delimitados
  {
    const body = buildIssueBody({
      tipo: "marca",
      marca: "Café Don Pepe",
      tienda: "Amazon",
      producto: "Café 500g",
      fecha: "2026-10-23"
    });
    check("buildIssueBody: genera el formato <!-- gina:sugerencia v1 --> con campos delimitados",
      body.includes("<!-- gina:sugerencia v1 tipo=marca -->") &&
      body.includes("- marca: Café Don Pepe | tienda: Amazon | producto: Café 500g | fecha: 2026-10-23"));
  }

  console.log(`\n${pass}/${total} pruebas de sugerencias comunes correctas`);
  process.exit(pass === total ? 0 : 1);
})();
