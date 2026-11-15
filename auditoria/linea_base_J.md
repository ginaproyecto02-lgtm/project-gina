# Auditoría de Línea Base — Tanda J (MVP)

**Fecha:** 14 de noviembre de 2026  
**Commit base:** `8c6ef94` («feat(comparador): lectura adaptativa cuando una tienda cambia su HTML; precio actual en Mercado Libre»)  
**Versión de extensión:** 3.2.0  
**Objetivo:** Establecer mediciones y estado inicial antes de implementar las puertas del MVP.

---

## 1. Suites de Pruebas y Cobertura Inicial

Ejecución de `python datagen/build_data.py` y las 14 suites del flujo de integración (`generar-paquete.yml`):

| Archivo de Prueba | Pruebas Pasadas | Estado |
|---|:---:|:---:|
| `test/run.js` | 147 | OK |
| `test/background.test.js` | 57 | OK |
| `test/job.test.js` | 35 | OK |
| `test/e2e_ciclo.test.js` | 18 | OK |
| `test/snapshots.test.js` | 4 | OK |
| `test/seguridad.test.js` | 86 | OK |
| `test/comparador.test.js` | 21 | OK |
| `test/semejanza.test.js` | 72 | OK |
| `test/sugerencias_gs.test.js` | 33 | OK |
| `test/sugerencias_robot.test.js` | 7 | OK |
| `test/ciclo_extenso.test.js` | 90 | OK |
| `test/verificar_sugerencias.test.js` | 13 | OK |
| `test/calidad.test.js` | 21 | OK |
| `test/adaptivo.test.js` | 53 | OK |
| **Total Global** | **657** | **14/14 en verde** |

---

## 2. Tamaño del Paquete y Datos

### Tamaño global de `extension/`
- **Total `extension/`:** 1,595,833 bytes (~1.522 MB)

### Desglose de archivos en `extension/data/`
| Archivo | Tamaño (Bytes) | Tamaño (KB) |
|---|---:|---:|
| `aditivos.json` | 3,640 bytes | 3.55 KB |
| `alertas.json` | 660 bytes | 0.64 KB |
| `brands.json` | 854,368 bytes | 834.34 KB |
| `categorias_tienda.json` | 4,171 bytes | 4.07 KB |
| `dominios.json` | 1,840 bytes | 1.80 KB |
| `estudios_calidad.json` | 17,567 bytes | 17.16 KB |
| `garantias_pais.json` | 3,953 bytes | 3.86 KB |
| `normas_pais.json` | 5,802 bytes | 5.67 KB |
| `portadas_no_validas.json` | 611 bytes | 0.60 KB |
| `proyecto.json` | 411 bytes | 0.40 KB |
| `sites.json` | 56,933 bytes | 55.60 KB |

---

## 3. Permisos y Configuración del Manifest (`extension/manifest.json`)

- **Manifest Version:** 3
- **Permisos (`permissions`):**
  - `storage` (preferencias de usuario, historial local de precios y caché local de comparador)
  - `alarms` (reintentos periódicos de sugerencias en cola)
  - `offscreen` (DOMParser aislado para lectura de comparador en navegadores basados en Chromium)
- **Permisos de host (`host_permissions`):**
  - `https://script.google.com/*`
  - `https://script.googleusercontent.com/*`
- **Permisos de host opcionales (`optional_host_permissions`):**
  - `https://api.anthropic.com/*` (clasificación local asistida por IA opcional)
  - `https://generativelanguage.googleapis.com/*` (clasificación local asistida por IA opcional)
  - `https://api.groq.com/*` (clasificación local asistida por IA opcional)
  - `https://api.x.ai/*` (clasificación local asistida por IA opcional)
  - `https://*/*` (comparador entre tiendas bajo demanda del usuario en options/comparar.html)
- **Cobertura de sitios (`content_scripts[0].matches`):**
  - **335 patrones de coincidencia** correspondientes a 335 sitios de comercio electrónico y servicios en 29 países.
- **Configuración específica de Gecko / Firefox (`browser_specific_settings`):**
  - `gecko.id`: `"gina@project-gina"`
  - `gecko.strict_min_version`: `"140.0"`
  - `gecko.data_collection_permissions.required`: `["none"]`
  - `gecko.data_collection_permissions.optional`: `["websiteContent"]`
