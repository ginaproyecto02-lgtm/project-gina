# Project Gina — Guía y lista de publicación en tiendas de extensiones (Puerta 10)

Esta guía paso a paso contiene los requisitos, archivos y formularios necesarios para que el dueño del proyecto publique la extensión Gina en las tres tiendas oficiales: **Chrome Web Store**, **Microsoft Edge Add-ons** y **Mozilla Firefox Add-ons (AMO)**.

Todo el texto para copiar y pegar está en [`store/ficha-tienda.md`](file:///C:/Users/samza/OneDrive/Documentos/proyecto/project-gina/store/ficha-tienda.md).

---

## 1. Requisitos previos generales

1. **GitHub Pages activo:**
   - URL principal: `https://ginaproyecto02-lgtm.github.io/project-gina/`
   - Política de privacidad: `https://ginaproyecto02-lgtm.github.io/project-gina/privacidad.html`
   - Soporte: `https://ginaproyecto02-lgtm.github.io/project-gina/soporte.html`
2. **Paquetes comprimidos (ZIP) generados:**
   - Chrome y Edge: `gina-chrome-edge-3.3.0.zip`
   - Firefox: `gina-firefox-3.3.0.zip`
3. **Material gráfico en `store/imagenes/`:**
   - `icono-128.png` (128×128 px)
   - `promo-pequeno-440x280.png` (440×280 px)
   - `promo-marquesina-1400x560.png` (1400×560 px)
   - `logo-300.png` (300×300 px)
   - 5 capturas de pantalla de 1280×800 px:
     - `captura-1-producto.png`
     - `captura-2-comparador.png`
     - `captura-3-reputacion.png`
     - `captura-4-sugerir.png`
     - `captura-5-opciones.png`

---

## 2. Google Chrome Web Store

- **Portal de desarrolladores:** [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
- **Documentación oficial:** [Chrome Web Store Registration](https://developer.chrome.com/docs/webstore/register/) y [Review Process](https://developer.chrome.com/docs/webstore/review-process/).
- **Cuenta:** Se requiere una cuenta de Google y el pago de una cuota única de registro de **$5 USD**.

### Paso a paso:

1. **Subir paquete:**
   - Hacer clic en «Nuevo elemento» (Add new item).
   - Arrastrar o seleccionar `gina-chrome-edge-3.3.0.zip`.
2. **Pestaña «Ficha de la tienda» (Store listing):**
   - **Nombre:** Se lee automáticamente del manifest (`_locales/en` y `_locales/es`).
   - **Resumen:** `See which company, family, fund or government is behind what you buy, their track record and lobbying. Vote with every dollar.` (122 caracteres $\le 132$).
   - **Descripción detallada:** Copiar el bloque de la sección 3 de `store/ficha-tienda.md` (inglés) y añadir la traducción en español en la sección de idioma secundario.
   - **Categoría:** Seleccionar **Shopping** (Compras).
   - **Idioma predeterminado:** English (o Español).
3. **Pestaña «Recursos gráficos» (Graphics):**
   - **Ícono de la tienda:** Subir `store/imagenes/icono-128.png` (128×128).
   - **Capturas de pantalla:** Subir las 5 capturas (1280×800):
     1. `captura-1-producto.png`
     2. `captura-2-comparador.png`
     3. `captura-3-reputacion.png`
     4. `captura-4-sugerir.png`
     5. `captura-5-opciones.png`
   - **Mosaico promocional pequeño:** Subir `store/imagenes/promo-pequeno-440x280.png` (440×280, obligatorio en Chrome).
   - **Mosaico grande / marquesina (opcional):** Subir `store/imagenes/promo-marquesina-1400x560.png` (1400×560).
4. **Pestaña «Prácticas de privacidad» (Privacy practices):**
   - **Propósito único (Single purpose):** Copiar de `store/ficha-tienda.md` sección 5.
   - **Justificación de permisos:** Copiar cada justificación de la tabla generada desde `store/permisos.json`:
     - `storage`: Guardar preferencias, historial y diagnósticos locales.
     - `alarms`: Comprobación periódica de actualizaciones de la base y cola de sugerencias.
     - `offscreen`: Tareas DOM de diagnóstico en segundo plano en Chromium.
     - Hosts de Google Apps Script (`script.google.com`, `script.googleusercontent.com`): Envío anónimo de sugerencias.
     - Hosts opcionales de IA (`api.anthropic.com`, `generativelanguage.googleapis.com`, `api.groq.com`, `api.x.ai`): Solo bajo demanda si el usuario ingresa su clave.
     - `https://*/*`: Comparador bajo demanda con consentimiento explícito por tienda.
     - Content scripts (335 tiendas): Inyección local en tiendas compatibles.
   - **Uso de código remoto:** Marcar **NO** («No, I am not using remote code»).
   - **Datos de usuario recopilados:**
     - Marcar únicamente: ☑ **Website content** (Contenido web: nombre de marca y título del producto).
     - Justificación: Se procesa localmente en el navegador y nunca sale salvo que el usuario active voluntariamente su propia clave de IA.
     - Dejar todas las demás casillas desmarcadas.
   - **Certificaciones:** Aceptar las tres declaraciones de cumplimiento de políticas de desarrollador de Chrome.
5. **Pestaña «Distribución»:**
   - Países: Todos (o los 17 países compatibles).
   - Visibilidad: Pública.
6. **Enviar a revisión:**
   - Hacer clic en «Enviar a revisión» (Submit for review).
   - *Qué esperar:* Según la documentación oficial de Google, los tiempos de revisión varían según los permisos solicitados y revisiones automatizadas. En Manifest V3 sin código remoto el proceso suele ser expedito.

---

## 3. Microsoft Edge Add-ons

- **Portal de desarrolladores:** [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge)
- **Documentación oficial:** [Publishing extensions for Microsoft Edge](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/publish-extension).
- **Cuenta:** Gratuita para desarrolladores individuales de extensiones de Microsoft Edge.

### Paso a paso:

1. **Subir paquete:**
   - Crear una nueva extensión e importar `gina-chrome-edge-3.3.0.zip`.
2. **Propiedades y descripción:**
   - **Nombre:** Gina.
   - **Descripción breve:** Copiar el resumen ($\le 132$ caracteres).
   - **Descripción detallada:** Copiar el texto en inglés y español de `store/ficha-tienda.md`.
   - **Categoría:** Shopping.
   - **URL de política de privacidad:** `https://ginaproyecto02-lgtm.github.io/project-gina/privacidad.html`
   - **URL de soporte:** `https://ginaproyecto02-lgtm.github.io/project-gina/soporte.html`
3. **Recursos visuales:**
   - **Logotipo de la extensión:** Subir `store/imagenes/logo-300.png` (300×300) o `icono-128.png`.
   - **Capturas:** Subir las 5 capturas de 1280×800.
4. **Notas para la certificación (Notes for certification):**
   - Pegar el bloque de la sección 6 de `store/ficha-tienda.md`:
     `Works without an account or key: open any product page on walmart.com, amazon.com, bestbuy.com or mercadolibre.com.mx, or a search on google.com/travel/flights, and the card appears at the bottom right with ownership and a sourced reputation record. AI is optional and needs the user's own key (Anthropic, Gemini, Groq or xAI); there is no developer account or server. No remote code. The interface follows the browser language (6 languages).`
5. **Enviar a revisión:**
   - Hacer clic en «Publicar» (Publish).

---

## 4. Mozilla Firefox Add-ons (AMO)

- **Portal de desarrolladores:** [AMO Developer Hub](https://addons.mozilla.org/developers/)
- **Documentación oficial:** [Submitting an add-on to AMO](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/).
- **Cuenta:** Cuenta de Mozilla Firefox gratuita.

### Paso a paso:

1. **Subir paquete:**
   - Enviar nuevo complemento (Submit a New Add-on).
   - Seleccionar «En este sitio» (On this site - distribuido públicamente por Mozilla).
   - Subir el archivo `gina-firefox-3.3.0.zip`.
   - El validador en línea de AMO correrá y debe dar **0 errores** (idéntico al resultado de `addons-linter@10.15.0` en CI).
2. **Permisos de recopilación de datos:**
   - Se leen de `browser_specific_settings.gecko.data_collection_permissions`:
     - `required: ["none"]`
     - `optional: ["websiteContent"]`
3. **Ficha y metadatos:**
   - **Nombre y resumen:** Se leen automáticamente de `_locales/en` y `_locales/es`.
   - **Descripción:** Pegar el texto de `store/ficha-tienda.md`.
   - **Categoría:** Shopping.
   - **Licencia:** MIT.
   - **URLs públicas:**
     - Privacidad: `https://ginaproyecto02-lgtm.github.io/project-gina/privacidad.html`
     - Soporte: `https://ginaproyecto02-lgtm.github.io/project-gina/soporte.html`
4. **Notas para el revisor (Notes to reviewer):**
   - Pegar el bloque de la sección 7 de `store/ficha-tienda.md`:
     `No build step: the uploaded files are the source. The innerHTML warnings are template strings whose dynamic values all pass through an esc() HTML-escaping helper (defined at the top of card.js, popup.js and options.js). In Firefox the background uses background.scripts (service_worker is only for Chrome). AI is optional and uses the user's own API key; without a key, test on any product page on walmart.com or amazon.com, or a Google Flights search.`
5. **Capturas e ícono:**
   - Subir `icono-128.png` y las 5 capturas de pantalla de 1280×800.
6. **Enviar complemento:**
   - Confirmar el envío.
