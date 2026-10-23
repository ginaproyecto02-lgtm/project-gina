// SPDX-License-Identifier: MIT
// Project Gina — Receptor y despachador de sugerencias en Apps Script (Google Drive / Sheets).
// Se ejecuta con la identidad de la cuenta gina.proyecto02@gmail.com como Web App.

var CODE_VERSION = "2026-10-22";
var SCHEMA_KEYS = ["v", "tipo", "marca", "tienda", "producto", "pais", "ext", "inst"];
var BRAND_OK = /^[\p{L}\p{N}][\p{L}\p{N}\p{M} &'’.,+\-/()]{0,79}$/u;
var DANGER = /<|>|`|\]\(|!\[|:\/\/|javascript:|data:|@\w|\{\{|\$\{/i;
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var EXT_RE = /^\d{1,4}(\.\d{1,4}){0,3}$/;
var PAIS_RE = /^[\p{L}][\p{L} .]{0,19}$/u;
var DAILY_MAX = 300;
var DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

function plausibleBrand(s) {
  var v = String(s || "").trim();
  return BRAND_OK.test(v) && !DANGER.test(v);
}

function safeText(s, n) {
  return String(s || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/<!--|-->|[<>`|]/g, " ")
    .replace(/!\[|\]\(|\[|\]/g, " ")
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S*/gi, " ")
    .replace(/javascript:|data:/gi, " ")
    .replace(/@(?=\w)/g, "")
    .replace(/#(?=\d)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);
}

// Sheets interpreta como fórmula todo lo que empieza con = + - @ (p. ej. =IMPORTXML("sitio.com",…)).
// Un apóstrofo inicial lo guarda como texto literal.
function cell(s) {
  var v = String(s == null ? "" : s);
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

// Contador diario en PropertiesService: CacheService expira como máximo a las 6 h, así que no sirve para un tope por día.
function readDaily(props, today) {
  try {
    var o = JSON.parse(props.getProperty("DAILY") || "{}");
    return o && o.d === today ? (parseInt(o.n, 10) || 0) : 0;
  } catch (_) { return 0; }
}

// La hoja: la del SHEET_ID de las propiedades o, si el script se creó desde la hoja
// (Extensiones → Apps Script), la hoja a la que está ligado. Siempre la primera pestaña.
function openSheet(props) {
  var sheetId = props.getProperty("SHEET_ID");
  var ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return null;
  return ss.getSheets ? ss.getSheets()[0] : ss.getActiveSheet();
}

// Pendiente = estado vacío o «pendiente» (también filas escritas a mano en la hoja).
function isPending(estado) {
  var v = String(estado || "").trim().toLowerCase();
  return v === "" || v === "pendiente";
}

function constantTimeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  var lenA = a.length;
  var lenB = b.length;
  var mismatch = (lenA === lenB) ? 0 : 1;
  var maxLen = Math.max(lenA, lenB);
  for (var i = 0; i < maxLen; i++) {
    var charA = (i < lenA) ? a.charCodeAt(i) : 0;
    var charB = (i < lenB) ? b.charCodeAt(i) : 0;
    mismatch |= (charA ^ charB);
  }
  return mismatch === 0;
}

function jsonResponse(obj, status) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, e: "sin_datos" });
    }

    var raw = e.postData.contents;
    if (typeof raw !== "string" || raw.length > 2048) {
      return jsonResponse({ ok: false, e: "tamano_excedido" });
    }

    var data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      return jsonResponse({ ok: false, e: "json_invalido" });
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return jsonResponse({ ok: false, e: "esquema" });
    }

    var keys = Object.keys(data);
    if (keys.length !== SCHEMA_KEYS.length) {
      return jsonResponse({ ok: false, e: "esquema" });
    }
    for (var i = 0; i < SCHEMA_KEYS.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(data, SCHEMA_KEYS[i])) {
        return jsonResponse({ ok: false, e: "esquema" });
      }
    }

    if (data.v !== 1) return jsonResponse({ ok: false, e: "version" });
    if (data.tipo !== "marca" && data.tipo !== "alternativa" && data.tipo !== "prueba") return jsonResponse({ ok: false, e: "tipo" });
    if (typeof data.marca !== "string" || !data.marca || data.marca.length > 80) return jsonResponse({ ok: false, e: "marca" });
    if (!plausibleBrand(data.marca)) return jsonResponse({ ok: false, e: "marca_invalida" });
    // La tienda es opcional (vacía en alternativas o si no se pudo saber el dominio); si viene, debe ser un dominio.
    if (typeof data.tienda !== "string" || data.tienda.length > 120 || (data.tienda.trim() !== "" && !DOMAIN_RE.test(data.tienda.trim()))) {
      return jsonResponse({ ok: false, e: "tienda_invalida" });
    }
    if (typeof data.producto !== "string" || data.producto.length > 200) return jsonResponse({ ok: false, e: "producto" });
    if (typeof data.pais !== "string" || !PAIS_RE.test(data.pais)) return jsonResponse({ ok: false, e: "pais" });
    if (typeof data.ext !== "string" || !EXT_RE.test(data.ext)) return jsonResponse({ ok: false, e: "ext" });
    if (typeof data.inst !== "string" || !UUID_RE.test(data.inst)) return jsonResponse({ ok: false, e: "inst_invalido" });

    // Tipo prueba: pasa validaciones de esquema y datos sin escribir en la hoja ni contar cuotas
    if (data.tipo === "prueba") {
      return jsonResponse({ ok: true, prueba: true });
    }

    // Límites de tasa con CacheService
    var cache = CacheService.getScriptCache();
    var instKey = "inst:" + data.inst.toLowerCase();
    var instCount = parseInt(cache.get(instKey) || "0", 10);
    if (instCount >= 5) {
      return jsonResponse({ ok: false, e: "limite_hora" });
    }

    var today = new Date().toISOString().slice(0, 10);
    var props = PropertiesService.getScriptProperties();

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) {
      return jsonResponse({ ok: false, e: "bloqueo" });
    }

    try {
      // Re-verificar tras obtener el bloqueo
      instCount = parseInt(cache.get(instKey) || "0", 10);
      if (instCount >= 5) return jsonResponse({ ok: false, e: "limite_hora" });
      var dayCount = readDaily(props, today);
      if (dayCount >= DAILY_MAX) return jsonResponse({ ok: false, e: "limite_dia" });

      var sheet = openSheet(props);
      if (!sheet) return jsonResponse({ ok: false, e: "config" });
      var lastRow = sheet.getLastRow();

      var marcaNorm = data.marca.trim().toLowerCase();
      var rowToUpdate = 0;
      var currentVeces = 1;

      if (lastRow > 1) {
        // Asumiendo columnas: ID(1), Fecha(2), Tipo(3), Marca(4), Tienda(5), Producto(6), Pais(7), Ext(8), Veces(9), Estado(10)
        var values = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
        for (var r = 0; r < values.length; r++) {
          var rowData = values[r];
          var rowTipo = String(rowData[2] || "").trim();
          var rowMarca = String(rowData[3] || "").trim().toLowerCase();
          var rowEstado = String(rowData[9] || "").trim();
          if (isPending(rowEstado) && (rowTipo || "marca") === data.tipo && rowMarca === marcaNorm) {
            rowToUpdate = r + 2;
            currentVeces = parseInt(rowData[8] || "1", 10) + 1;
            break;
          }
        }
      }

      if (rowToUpdate > 0) {
        sheet.getRange(rowToUpdate, 9).setValue(currentVeces);
      } else {
        var id = Utilities.getUuid ? Utilities.getUuid() : (Date.now() + "_" + Math.floor(Math.random() * 10000));
        var cleanProd = safeText(data.producto, 200);
        var cleanStore = safeText(data.tienda, 120);
        var cleanCountry = safeText(data.pais, 20);
        sheet.appendRow([
          cell(id),
          new Date().toISOString(),
          cell(data.tipo),
          cell(data.marca.trim()),
          cell(cleanStore),
          cell(cleanProd),
          cell(cleanCountry),
          cell(data.ext.trim()),
          1,
          "pendiente"
        ]);
      }

      cache.put(instKey, String(instCount + 1), 3600);
      props.setProperty("DAILY", JSON.stringify({ d: today, n: dayCount + 1 }));

      return jsonResponse({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return jsonResponse({ ok: false, e: "servidor" });
  }
}

function doGet(e) {
  try {
    var token = (e && e.parameter && e.parameter.token) || "";
    var props = PropertiesService.getScriptProperties();
    var robotToken = props.getProperty("ROBOT_TOKEN") || "";

    if (!robotToken || !token || !constantTimeCompare(token, robotToken)) {
      return jsonResponse({ ok: false, e: "no_encontrado" });
    }

    var sheet = openSheet(props);
    if (!sheet) return jsonResponse({ ok: false, e: "config" });
    var lastRow = sheet.getLastRow();

    var op = (e && e.parameter && e.parameter.op) || "";

    if (op === "version") {
      var filasTotal = Math.max(0, lastRow - 1);
      return jsonResponse({ ok: true, version: CODE_VERSION, hoja: filasTotal });
    }

    // Borra las filas que el robot dejó en «procesado» en la corrida anterior (de abajo hacia arriba).
    if (op === "purge") {
      var plock = LockService.getScriptLock();
      if (!plock.tryLock(15000)) return jsonResponse({ ok: false, e: "bloqueo" });
      try {
        var borradas = 0;
        if (lastRow > 1) {
          var pv = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
          for (var k = pv.length - 1; k >= 0; k--) {
            if (String(pv[k][9] || "").trim().toLowerCase() === "procesado") {
              sheet.deleteRow(k + 2);
              borradas++;
            }
          }
        }
        return jsonResponse({ ok: true, borradas: borradas });
      } finally {
        plock.releaseLock();
      }
    }

    if (op === "ack") {
      var idsStr = (e && e.parameter && e.parameter.ids) || "";
      var idsList = idsStr ? idsStr.split(",").map(function(x) { return x.trim(); }).filter(Boolean) : [];
      if (!idsList.length) {
        return jsonResponse({ ok: true, procesados: 0 });
      }

      var idsSet = {};
      for (var j = 0; j < idsList.length; j++) idsSet[idsList[j]] = true;

      var lock = LockService.getScriptLock();
      if (!lock.tryLock(15000)) return jsonResponse({ ok: false, e: "bloqueo" });
      try {
        var countAck = 0;
        if (lastRow > 1) {
          var range = sheet.getRange(2, 1, lastRow - 1, 10);
          var rows = range.getValues();
          for (var r = 0; r < rows.length; r++) {
            var rowId = String(rows[r][0] || "").trim();
            if (idsSet[rowId]) {
              sheet.getRange(r + 2, 10).setValue("procesado");
              countAck++;
            }
          }
        }
        return jsonResponse({ ok: true, procesados: countAck });
      } finally {
        lock.releaseLock();
      }
    }

    // Listar pendientes (estado vacío o «pendiente»; nunca incluye inst).
    // Una fila escrita a mano sin id recibe uno aquí, para poder marcarla después.
    var pendientes = [];
    if (lastRow > 1) {
      var llock = LockService.getScriptLock();
      if (!llock.tryLock(15000)) return jsonResponse({ ok: false, e: "bloqueo" });
      try {
      var values = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
      for (var i = 0; i < values.length; i++) {
        var row = values[i];
        var estado = String(row[9] || "").trim();
        if (!String(row[3] || "").trim()) continue; // fila sin marca
        if (isPending(estado)) {
          if (!String(row[0] || "").trim()) {
            row[0] = Utilities.getUuid ? Utilities.getUuid() : (Date.now() + "_" + i);
            sheet.getRange(i + 2, 1).setValue(row[0]);
          }
          pendientes.push({
            id: String(row[0] || ""),
            fecha: String(row[1] || ""),
            tipo: String(row[2] || "").trim() || "marca",
            marca: String(row[3] || ""),
            tienda: String(row[4] || ""),
            producto: String(row[5] || ""),
            pais: String(row[6] || ""),
            veces: parseInt(row[8] || "1", 10) || 1
          });
        }
      }
      } finally {
        llock.releaseLock();
      }
    }

    return jsonResponse({ ok: true, filas: pendientes });
  } catch (err) {
    return jsonResponse({ ok: false, e: "servidor" });
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CODE_VERSION: CODE_VERSION,
    doPost: doPost,
    doGet: doGet,
    plausibleBrand: plausibleBrand,
    safeText: safeText,
    constantTimeCompare: constantTimeCompare,
    cell: cell
  };
}
