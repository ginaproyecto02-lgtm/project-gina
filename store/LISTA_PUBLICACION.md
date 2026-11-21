# Project Gina — Guía y lista de publicación en tiendas de extensiones (Puerta 10)

Esta guía paso a paso contiene los requisitos, archivos y formularios necesarios para que el dueño del proyecto publique la extensión Gina en las tres tiendas oficiales: **Chrome Web Store**, **Microsoft Edge Add-ons** y **Mozilla Firefox Add-ons (AMO)**.

Todo el texto para copiar y pegar está en [`store/ficha-tienda.md`](ficha-tienda.md).

---

## 0. Checklist de acciones exclusivas del dueño (en navegador)

Antes de enviar los paquetes a revisión en las tiendas, el dueño del repositorio debe realizar en su navegador los siguientes pasos que requieren sus credenciales personales:

### 0.1 Despliegue del servicio de sugerencias (Google Apps Script)
1. Iniciar sesión con la cuenta del proyecto (`gina.proyecto02@gmail.com`) en Google Drive.
2. Crear una Hoja de cálculo de Google llamada `Gina - Sugerencias`, renombrar la pestaña a `sugerencias` y colocar encabezados: `id | fecha | tipo | marca | tienda | producto | pais | ext | veces | estado`.
3. Ir a **Extensiones → Apps Script**:
   - Pegar el código de `servicios/sugerencias/Code.gs`.
   - En Configuración del proyecto, activar «Mostrar appsscript.json» y pegar `servicios/sugerencias/appsscript.json`.
   - En Propiedades de la secuencia de comandos, definir `ROBOT_TOKEN` (cadena secreta de $\ge 32$ caracteres).
4. Pulsar **Implementar → Nueva implementación → Aplicación web**:
   - Ejecutar como: *Yo (`gina.proyecto02@gmail.com`)*.
   - Quién tiene acceso: *Cualquier usuario* (permite llamadas anónimas de la extensión).
   - Autorizar permisos y copiar la URL generada (`https://script.google.com/macros/s/.../exec`).

### 0.2 Cargar variables y secretos en GitHub y regenerar paquetes
En el repositorio de GitHub (`https://github.com/ginaproyecto02-lgtm/project-gina`):
1. **Settings → Secrets and variables → Actions → pestaña Variables**:
   - Crear variable `GINA_SUGERENCIAS_URL` con la URL `/exec` de Apps Script.
2. **Settings → Secrets and variables → Actions → pestaña Secrets**:
   - Crear secreto `GINA_SUGERENCIAS_TOKEN` con el mismo valor que `ROBOT_TOKEN`.
   - Verificar que exista `GINA_API_KEY` para el job semanal.
3. **Regenerar los paquetes ZIP:**
   - La URL de sugerencias se embebe directamente en `extension/data/proyecto.json` durante el empaquetado.
   - Tras configurar `GINA_SUGERENCIAS_URL`, ejecuta el flujo de GitHub Actions **«Project Gina — pruebas y paquete»** (vía *Run workflow*) para generar los ZIPs finales actualizados como artefactos de descarga, o ejecuta localmente:
     `python datagen/empaquetar.py --sugerencias-url "https://script.google.com/macros/s/.../exec"`
   - Esto asegura que los paquetes `dist/gina-chrome-edge-3.3.0.zip` y `dist/gina-firefox-3.3.0.zip` contengan la URL real antes de subirlos a las tiendas.

### 0.3 Habilitar permisos de PR en GitHub Actions
1. Ir a **Settings → Actions → General → Workflow permissions**.
2. Seleccionar **Read and write permissions**.
3. Marcar la casilla: ☑ **Allow GitHub Actions to create and approve pull requests**.
4. Guardar cambios.

### 0.4 Verificación de GitHub Pages (Público y Activo)
- Se ha verificado automáticamente vía HTTP que GitHub Pages ya responde **200 OK** en:
  - Portada: `https://ginaproyecto02-lgtm.github.io/project-gina/`
  - Privacidad: `https://ginaproyecto02-lgtm.github.io/project-gina/privacidad.html`
  - Soporte: `https://ginaproyecto02-lgtm.github.io/project-gina/soporte.html`
- Si por alguna razón requiriera reactivarse: **Settings → Pages → Source: Deploy from a branch (`main` / `/docs`)**.

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
