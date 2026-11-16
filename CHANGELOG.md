# Registro de cambios (CHANGELOG) — Project Gina

Todas las modificaciones notables de este proyecto están documentadas en este archivo.
El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [3.3.0] — 2026-11-15 (Preparación para liberar el MVP — Tanda J)

Esta versión consolida el cumplimiento técnico, de accesibilidad, rendimiento y políticas de tienda requerido para la publicación oficial del Producto Mínimo Viable (MVP) en **Google Chrome Web Store**, **Microsoft Edge Add-ons** y **Mozilla Firefox Add-ons (AMO)**.

### Privacidad y sitio público (Puerta 4)
- **Portal estático para GitHub Pages (`docs/`):**
  - Portada oficial (`index.html`) con resumen de capacidades, arquitectura de privacidad local y compatibilidad con navegadores.
  - Centro de ayuda y soporte técnico (`soporte.html`) con preguntas frecuentes, guía de instalación y canal de reporte de incidencias.
  - Hoja de estilos compartida (`estilo.css`) con diseño accesible, tipografía del sistema y contraste conforme a WCAG 2.1 AA.
  - Política de privacidad bilingüe (`privacidad.html` en español e inglés) alineada estrictamente con las prácticas de las tres tiendas.
- **Cero rastreo por diseño:** el sitio público y la extensión operan sin analítica externa, sin cookies y sin descarga de código remoto.

### Cumplimiento de tiendas y empaquetado (Puertas 4 y 10)
- **Justificación exhaustiva de permisos (`store/permisos.json`):**
  - Declaración bilingüe (español e inglés) y justificación de uso para cada permiso de API (`storage`, `alarms`, `offscreen`), host obligatorio de Apps Script y host opcional de proveedores de IA.
  - Validación bidireccional automática en `datagen/build_data.py`: ningún permiso puede agregarse al manifiesto sin estar justificado documentalmente, y viceversa.
- **Empaquetado dual optimizado para Chromium y Gecko:**
  - `gina-chrome-edge-3.3.0.zip`: manifiesto con `background.service_worker` exclusivo para Chrome y Edge, sin claves no reconocidas de Gecko.
  - `gina-firefox-3.3.0.zip`: manifiesto con página de eventos en `background.scripts`, configuración reglamentaria `browser_specific_settings.gecko` (ID `gina@project-gina` y `data_collection_permissions`), omitiendo `chrome.offscreen`.
  - Generación de sumas de verificación criptográfica SHA-256 (`.sha256`) para cada archivo comprimido.
- **Validación con Mozilla Add-ons Linter:**
  - Integración de `addons-linter@10.15.0` en el flujo de integración continua, logrando 0 errores sobre el paquete de Firefox.
- **Ficha de tienda y lista de verificación (`store/`):**
  - Resúmenes breves acotados a $\le 132$ caracteres en todos los idiomas del catálogo (`messages.json`).
  - Documentación unificada de propósitos y respuestas de privacidad en `store/ficha-tienda.md`.
  - Guía paso a paso de publicación `store/LISTA_PUBLICACION.md` con enlaces a la documentación oficial de desarrolladores de Google, Microsoft y Mozilla.
  - 5 capturas de pantalla a resolución reglamentaria (1280×800 px) basadas en fixtures reales con empresas de confianza «Alta», ícono de 128 px y mosaico promocional de 440×280 px.

### Rendimiento medible (Puerta 6)
- **Medición interna en tiempo de ejecución:**
  - Instrumentación con `performance.now()` en `src/content.js` midiendo tiempos exactos de extracción del DOM y renderizado de la tarjeta en Shadow DOM.
  - Envío seguro de métricas al proceso de fondo (`src/background.js`) con almacenamiento circular acotado a 50 eventos en memoria (`perfLog`) y validación estricta de remitente de pestaña.
- **Panel de rendimiento para el usuario (`options/`):**
  - Sección interactiva en la página de opciones con cálculo de mediana y percentil 90 (p90) de los tiempos de extracción y renderizado mediante la función pura `resumenRendimiento`.
- **Suite de pruebas de rendimiento (`test/rendimiento.test.js`):**
  - 20 pruebas automatizadas sobre páginas guardadas reales de comercio electrónico garantizando tiempos de extracción + renderizado menores a 300 ms (mediana medida de 196 ms en fixtures reales).

### Idiomas y accesibilidad (Puerta 8)
- **Internacionalización completa (441 claves en 6 idiomas):**
  - Cobertura integral en `src/i18n.js` para español (`es`), inglés (`en`), alemán (`de`), francés (`fr`), italiano (`it`) y japonés (`ja`).
  - Traducción y paridad estructural de interfaz en tarjeta Shadow DOM (`card.js`), avisos (`notices.js`), panel popup (`popup.html` y `popup.js`), opciones (`options.html` y `options.js`) y vista de comparación (`comparar.html`).
- **Navegación accesible y cumplimiento WCAG 2.1 AA:**
  - Soporte de teclado completo con foco visible y cierre inmediato de la tarjeta mediante la tecla `Escape`.
  - Adición de etiquetas y roles ARIA (`role="region"`, `role="status"`, `aria-label`, `aria-live`) en todos los controles interactivos y estados asíncronos.
  - Verificación automatizada con el motor de reglas de accesibilidad `axe-core@4.10.2` en `test/accesibilidad.test.js` (13 pruebas, 0 violaciones críticas o serias).

### Auditoría y preparación de datos para MVP (Puertas 1, 2 y 3)
- **Herramienta interactiva de prueba manual (`options/prueba.html`):**
  - Lista de verificación para el dueño con enlaces directos de búsqueda en 10 tiendas mexicanas representativas (extraídas de `sites.json`) y 5 escenarios del comparador de precios.
  - Persistencia local del progreso en `storage.local.pruebaMVP` y exportación a formato Markdown (`aMarkdown`).
- **Generador de muestra estratificada (`datagen/muestra_auditoria.py`):**
  - Muestreo determinista reproducible con semilla de fecha (`--semilla AAAA-MM-DD`) que selecciona 50 empresas auditables (30 mexicanas, 20 internacionales, con al menos 10 de confianza «Alta»).
- **Candados de veracidad para reputación (`datagen/build_data.py`):**
  - Validación obligatoria de 5 reglas antes de compilar `brands.json`: URL HTTPS a documento concreto, campos de año y estado dentro de catálogo permitido, ausencia de adjetivos incriminatorios no respaldados por sentencia, y aclaración explícita sobre admisión o no de culpabilidad en acuerdos extrajudiciales.
  - Saneamiento de los 33 historiales de reputación en `datagen/reputacion.json`.

---

## [3.2.0] — 2026-10-18
- Historiales de reputación corporativa y desglose de dueños de marcas.
- Integración de sugerencias comunitarias mediante Google Apps Script.
- Comparador de precios entre tiendas y motor de semejanza de productos.
