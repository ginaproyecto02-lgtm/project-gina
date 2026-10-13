# Cómo publicar Gina (Project Gina)

Guía para publicar la versión 3.1.0 en **Chrome Web Store**, **Microsoft Edge Add-ons** y **Firefox Add-ons**. Un solo paquete sirve para las tres tiendas (el manifest ya es compatible). Los textos para copiar y pegar (en inglés y español) están en `store/ficha-tienda.md` y las imágenes en `store/imagenes/`.

Datos revisados el 8 de octubre de 2026. Las tiendas cambian sus reglas: confirma cada punto en el enlace oficial al registrarte.

---

## 0. Antes de empezar (una sola vez)

**Primero el repositorio del proyecto** (para que la extensión sea gratis y se actualice sola): sigue «Poner en marcha el proyecto» en `README.md`. En resumen, sube el proyecto a un repositorio público de GitHub y pon `usuario/repositorio` y tu correo en `datagen/proyecto.json`. Ejecuta `python3 datagen/build_data.py`, carga la clave de la IA del job como secreto `GINA_API_KEY` y lanza la primera ejecución. **Genera el zip después de este paso**, porque la dirección del repositorio va dentro del paquete.


| Qué | Por qué | Cómo |
|---|---|---|
| **Revisar la marca «Gina»** | Es un nombre propio común; puede haber otra extensión, app o marca registrada «Gina» en software o comercio. | Busca «Gina» en las tres tiendas y en las bases de marcas: IMPI (México), USPTO (EE.UU.), EUIPO (UE), WIPO Global Brand Database (clases 9 y 35). El nombre completo «Gina: Know Who Your Money Backs» ayuda a distinguirla. |
| **Correo de contacto público** | Las tiendas lo muestran; sirve también para correcciones de datos. | Crea uno dedicado (por ejemplo, `gina.soporte@…`). No uses tu correo personal: en Chrome **el correo de la cuenta de desarrollador no se puede cambiar después**. |
| **Publicar la política de privacidad** | Obligatoria en Chrome y Edge porque la extensión lee contenido de páginas. | Reemplaza `CORREO_DE_CONTACTO` en `docs/privacidad.html` y súbela a una URL pública. Lo más simple es **GitHub Pages**: sube el proyecto a un repositorio, ve a *Settings → Pages → Deploy from branch → main → /docs*. La URL queda como `https://<usuario>.github.io/<repo>/privacidad.html`. |
| **Decidir: persona o empresa** | En Edge el tipo de cuenta (individual o empresa) **no se puede cambiar**. En Chrome debes declarar si eres «comerciante» (*trader*). | Si la publicas como proyecto personal y gratuito, «individual» y «no comerciante» es lo habitual. Si tienes o tendrás una empresa detrás, regístrala como empresa desde el inicio. |
| **Rellenar los marcadores** | Tu correo va en `datagen/proyecto.json` (la extensión lo toma de ahí al generar). Además: `CORREO_DE_CONTACTO` en `docs/privacidad.html`, y `CONTACT_EMAIL` y `PRIVACY_URL` en `store/ficha-tienda.md`. | Buscar y reemplazar; luego vuelve a generar el zip. |

---

> [!IMPORTANT]
> **Archivo para subir a las tiendas (ojo con los Artifacts de GitHub Actions):**
> - Si descargas el paquete desde los **Releases** de GitHub (etiqueta `v*`): el archivo `.zip` (`gina-extension-3.1.0.zip`) se sube tal cual.
> - Si descargas el paquete desde los **Artifacts** del flujo de GitHub Actions: GitHub siempre envuelve los artefactos dentro de otro archivo `.zip` (zip dentro de zip). Las tiendas rechazan ese archivo anidado. **Descomprime una vez el archivo descargado de Artifacts; sube el `gina-extension-X.Y.Z.zip` de adentro.**

## 1. Chrome Web Store (también cubre Brave, Opera y otros navegadores basados en Chromium)

**Costo:** pago único de registro (históricamente US$5; el monto se muestra al registrarte). **Revisión:** normalmente de unos días a un par de semanas. Los permisos amplios de sitios suelen alargarla.

1. Entra en el **Chrome Developer Dashboard** con una cuenta de Google y paga el registro.
2. Completa la cuenta: nombre del editor (*publisher name*), correo verificado y la declaración de **comerciante o no comerciante**. Si te declaras comerciante (requisito de la Ley de Servicios Digitales de la UE), debes dar dirección, teléfono (verificado por SMS) y nombre legal, y se muestran públicamente en la ficha.
3. **Nuevo elemento** → sube `gina-extension-3.1.0.zip` (si lo descargaste de GitHub Actions Artifacts, descomprime primero una vez para extraer el zip interno; no subas el zip contenedor).
4. Pestaña **Ficha de la tienda**: descripción larga, categoría *Compras*, idioma, ícono 128, mosaico promocional pequeño 440×280 (obligatorio), marquesina 1400×560 (opcional) y de 1 a 5 capturas de 1280×800.
5. Pestaña **Prácticas de privacidad**: propósito único, justificación de cada permiso, «no usa código remoto», casilla de *Contenido del sitio web*, las tres certificaciones y la URL de la política (todo en el bloque 5 de `store/ficha-tienda.md`).
6. Pestaña **Distribución**: gratis; visibilidad *Pública* (o *No listada* para probar con amigos primero); países: todos, o al menos los 17 que cubre.
7. **Enviar a revisión.** Si la rechazan, el correo indica la política; corrige y vuelve a enviar.

## 2. Microsoft Edge Add-ons

**Costo:** gratis. **Revisión:** hasta 7 días hábiles.

1. Entra en **Partner Center** con una **cuenta Microsoft personal** (Outlook/Hotmail; no una cuenta del trabajo o la escuela) y regístrate en el programa *Microsoft Edge*.
2. Elige **Individual** o **Empresa** (no se puede cambiar) y completa los datos de contacto.
3. **Crear nueva extensión** → sube el mismo zip (`gina-extension-3.1.0.zip`, descomprimido una vez si vino de Artifacts).
4. **Disponibilidad:** pública, en todos los mercados.
5. **Propiedades:** categoría *Compras*, URL de la política, sitio web y correo de soporte.
6. **Ficha de la tienda** (por idioma): descripción (de 250 a 10.000 caracteres; la larga cumple), logotipo 300×300 (`logo-300.png`), hasta 6 capturas, mosaico pequeño 440×280 opcional.
7. **Privacidad:** el mismo propósito único y las mismas justificaciones; código remoto: no.
8. **Notas para la certificación:** el texto del bloque 6 de `store/ficha-tienda.md`. Publicar.

## 3. Firefox Add-ons (addons.mozilla.org)

**Costo:** gratis. **Requisito:** Firefox 140 o superior (ya está en el manifest). **Revisión:** automática al subir, más una revisión manual que puede tardar más con permisos amplios.

1. Crea una cuenta en **addons.mozilla.org** → *Developer Hub* → **Submit a New Add-on** → *On this site*.
2. Sube el mismo zip (`gina-extension-3.1.0.zip`, descomprimido una vez si vino de Artifacts). La validación automática debe dar **0 errores**. Hoy da 0 errores y 14 avisos esperados (`service_worker` no lo usa Firefox; los `innerHTML` pasan por una función de escape).
3. Si pregunta por el código fuente: no hay paso de compilación ni minificación, así que responde que no hace falta.
4. Completa la ficha (puedes reutilizar los textos), elige la licencia y pega las notas para revisores del bloque 7.
5. El ID del complemento ya está fijado: `gina-who-your-money-backs@extension`. No lo cambies después de publicar.

## 4. Safari (opcional, más adelante)

Requiere una Mac con Xcode, convertir la extensión con `xcrun safari-web-extension-converter`, y la membresía Apple Developer Program (US$99 al año). Se distribuye por la App Store. Recomendable solo si hay demanda.

---

## 5. Riesgos de revisión y cómo están cubiertos

| Riesgo | Situación en Gina |
|---|---|
| **Permisos amplios** (335 sitios) | Son sitios concretos, no `<all_urls>`. La justificación explica que la extensión solo lee la marca. Es probable que la revisión tarde más. |
| **Código remoto** | No hay. La base que se descarga del repositorio es solo JSON de datos; el job publica datos, no código. Protege el repositorio (permisos, revisión de los reportes), porque lo que se publique ahí llega a todos los usuarios. |
| **Sugerencias públicas** | Los issues de GitHub son públicos y cualquiera puede abrir uno. El job no publica nada sin fuente verificada, pero revisa los reportes y cierra lo que sea spam o abuso. |
| **Claves de API** | Son del usuario, se guardan en local y solo van al proveedor elegido. Los permisos de cada proveedor se piden al guardar la clave. |
| **Datos sobre empresas y personas** (exactitud, posible reclamo de difamación) | Es el riesgo principal ahora que hay historial y un índice. Cada hecho tiene fuente y estado exacto, y los 79 hechos iniciales se verificaron uno por uno contra su fuente (15 campos corregidos). El índice usa una fórmula pública y no opina. Aun así: **antes de publicar, pide a un abogado que revise el texto del aviso y la política de correcciones**, ten listo el correo de correcciones y corrige rápido. Nunca agregues hechos sin fuente. |
| **Política y lobbying** | Solo cifras oficiales; nunca etiquetas como «de derecha» o «de izquierda». Mantén ese criterio si agregas datos de más países. |
| **Afiliados o cambios en la tienda** | No hay enlaces de afiliado ni cambios de precios o enlaces. Si algún día agregas afiliados, debes declararlo y pedir consentimiento. |
| **Ficha en inglés, interfaz en español** | El nombre y la descripción ya están en inglés y español (`_locales`), y la ficha va en inglés primero. La tarjeta y las opciones siguen en español: la ficha lo advierte. Traducir la interfaz es el siguiente paso recomendado. |

## 6. Publicar actualizaciones

1. Cambia los datos en `datagen/` y ejecuta `python3 datagen/build_data.py`. Para publicar una versión nueva, sube el número `version` en ese script.
2. Ejecuta las pruebas: `node test/run.js`, `node test/background.test.js` y `python3 test/e2e.py`.
3. Genera el zip con `manifest.json` en la raíz: `cd extension && zip -r ../gina-extension-X.Y.Z.zip . -x "README.md"`.
4. En cada tienda: *Paquete → Subir nueva versión*.

¿Solo cambian los datos (no el código)? Con el job semanal de GitHub y la «Base remota» configurada, los usuarios reciben la base nueva sin publicar una versión. Para que eso funcione para todos sin configuración, puedes poner tu URL raw como valor por defecto de `remoteUrl` antes de publicar. Como el archivo se descarga de tu repositorio, entonces sí debes declarar esa conexión en la política de privacidad (solo descarga, no envía datos).

## 7. Lista de lo que tengo que decidir o dar

- [ ] **Usuario de GitHub** y nombre del repositorio (sugerido: `project-gina`, público)
- [ ] Cuenta de Anthropic (o Gemini) para la clave del job, con límite de gasto (unos US$2 al mes)
- [ ] Nombre del editor (tu nombre o el de tu marca o empresa) y si es **individual o empresa**
- [ ] Declaración de **comerciante o no comerciante** (Chrome, UE); si comerciante: nombre legal, dirección y teléfono
- [ ] **Correo público** de soporte y correcciones
- [ ] **Dónde se publica la política**: usuario y repositorio de GitHub (para GitHub Pages) o tu dominio
- [ ] País de la cuenta y método de pago para el registro de Chrome
- [ ] Idiomas de la ficha (español; ¿inglés también?) y países donde se distribuye
- [ ] Gratis (recomendado) o de pago
- [ ] Confirmación del nombre «Gina» tras la búsqueda de marcas
- [ ] ¿Base remota por defecto con tu repositorio de GitHub? (sí o no)
- [x] Licencia para Firefox: MIT (código en `LICENSE`; datos bajo CC BY 4.0 en `LICENSE-DATA.md`)
