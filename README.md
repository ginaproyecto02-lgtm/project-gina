# Project Gina

**Gina** es una extensión gratuita para Chrome, Edge, Brave y Firefox (140+) que te muestra **a quién apoya tu dinero** mientras compras o reservas, y te sugiere **alternativas con dueño local** si prefieres que tu compra vaya a otro lado.

En cada producto, vuelo u hospedaje muestra:

- **Confiabilidad de compra:** vendedor directo o externo, origen del envío y garantías legales aplicables, tomados textualmente de la página sin inventar ni calificar artificialmente.
- **Quién es el dueño:** empresa, familia, fondo o Estado, y el país de su capital (también de la tienda, la aerolínea y la plataforma de reservas).
- **Su historial público:** multas, juicios, acuerdos y sentencias, cada uno con fuente y estado exacto, resumidos en un índice de 0 a 100 con fórmula pública.
- **Su lobbying:** gasto declarado y donaciones por partido cuando hay dato oficial, sin etiquetas ideológicas.
- **Alternativas locales:** para el tipo de producto (lácteos, café, detergente, cerveza, electrónica…), marcas de cooperativas, de sus empleados, de un fideicomiso o de familias y fundadores con capital del país de la tienda.

Cubre 335 sitios de 17 países: EE.UU., México, Canadá, Brasil, Argentina, Chile, Reino Unido, Alemania, Francia, España, Italia, China, Japón, Corea del Sur, Singapur, Israel e India. La base tiene 420 grupos dueños, 1.190 marcas, 110 aerolíneas, 24 categorías de producto y 33 historiales de reputación verificados.

## Cómo funciona (gratis para quien la usa)

```
Usuarios: instalan Gina → la base viene incluida → cada semana descargan la versión nueva del repositorio
          (sin cuenta, sin clave, sin enviar nada suyo; solo se reemplaza si la versión remota es mayor y limpia pendientes reconocidos).
          Si Gina no conoce una marca, el botón «Sugerir» de la tarjeta o el lote del popup abre un issue de GitHub prellenado
          con el marcador «gina:sugerencia» y la etiqueta «sugerencia» (o correo como respaldo).

Proyecto: GitHub Actions corre el canario los domingos (DRY_RUN=1, sin escribir) y la ejecución real los lunes (job/investigar.js):
          1. Lee los issues abiertos (marcador «gina:sugerencia» o plantilla YAML), los une con job/pendientes/ y quita duplicados.
          2. Orden barato de resolución:
             (a) ¿La marca ya está en la base? → comenta «Ya está en la base (grupo X)» y cierra el issue ($0).
             (b) Biblioteca local datagen/fuentes/ e índice SQLite FTS5 (<12 meses) → reutiliza fuente verificada ($0).
             (c) Wikidata con referencia (prov:wasDerivedFrom / P854) → propone sin gastar en IA ($0).
             (d) IA económica (Claude Haiku / Gemini Flash-Lite) → solo si lo anterior no resolvió.
          3. Verificación y contraste determinista (sin IA): HTTP 200, dominios.json, cita textual, Safe Browsing, Wayback, GLEIF y Fact Check.
          4. Revisión humana: agrega la marca a db.marcas ({n, g, job:1}) y el grupo con confianza «Alta», guarda evidencia en
             datagen/evidencias.csv y datagen/fuentes/<grupo_id>-<hash8>.json, escribe job/reportes/AAAA-MM-DD.md con métricas,
             crea la rama datos/AAAA-MM-DD y abre un Pull Request con «Closes #N» (nunca hace push directo a main).
          5. Publicación al fusionar el PR: el flujo «pruebas y paquete» completa aprobado_en_pr con el número del PR fusionado,
             build_data.py sube la confianza a «Verificado» y regenera extension/data/brands.json con versión nueva.
```

**Costo del proyecto:** GitHub (repositorio público y Actions) es gratis. Las marcas que ya están en la base, las resueltas por la biblioteca local (`datagen/fuentes/`, <12 meses) y las resueltas por Wikidata con referencia cuestan **US$0,00**. La IA solo se invoca como último recurso cuando ninguna vía gratuita encontró fuente verificable. Con Claude Haiku 5.5 (US$0,10 por millón de tokens de entrada y US$0,50 de salida) y la búsqueda web (US$10 por cada 1.000 búsquedas), cada marca que llega a la IA cuesta alrededor de US$0,03. Una ejecución típica cuesta entre US$0,00 y US$0,50 según cuántas marcas nuevas requieran búsqueda con IA. El reporte de cada ejecución detalla las métricas y el costo estimado exacto (`US$`). Para acotar aún más el gasto, ajusta `GINA_LIMIT`, `GINA_MAX_SEARCHES` o `GINA_EVERY_DAYS`.

La IA dentro del navegador sigue disponible como opción avanzada (con la clave de cada persona), pero no hace falta.

## Poner en marcha el proyecto

1. Sube esta carpeta a un repositorio **público** de GitHub (por ejemplo `tuusuario/project-gina`).
2. En `datagen/proyecto.json` pon `"repo": "tuusuario/project-gina"` y tu correo de correcciones en `"contacto"`, y ejecuta `python3 datagen/build_data.py`. Así la extensión sabe de dónde descargar la base y a dónde enviar sugerencias.
3. En *Settings → Secrets and variables → Actions* del repositorio:
   - Secreto `GINA_API_KEY`: tu clave de Anthropic (o de Gemini).
   - Variables opcionales: `GINA_PROVIDER` (`anthropic` o `gemini`), `GINA_MODEL` (por defecto el económico) y `GINA_EVERY_DAYS` (14 por defecto; 7 = semanal).
4. En *Settings → Actions → General*, permite a los flujos escribir en el repositorio.
5. Lanza la primera ejecución a mano desde *Actions → Project Gina — investigación → Run workflow*.
6. Genera el zip y publícalo en las tiendas (ver `PUBLICAR.md`).

Prueba local: `GINA_API_KEY=... GINA_FORCE=1 node job/investigar.js` (Node 22+, sin dependencias; `GINA_DRY_RUN=1` no escribe archivos).
Para correr la suite de pruebas local instala antes las dependencias limpias en `test/`:
```bash
cd test && npm ci
```
*(Un `node_modules` a medias en `test/` deja `node test/run.js` colgado).*

**Revisa los Pull Requests y reportes.** El robot nunca publica directo a `main`: abre un Pull Request en la rama `datos/AAAA-MM-DD` con el reporte en `job/reportes/` y las citas verificadas para revisión humana.

## Reputación: índice y tus valores

- **Índice de reputación (0–100):** resume solo hechos públicos con fuente. Cada hecho pesa según su estado: condena 10, multa 8, acuerdo 6, juicio en curso 3, investigación 2, alegación 1, desestimado o anulado 0. Pesan menos los de hace más de 3 años (×0,6) y los de más de 6 (×0,3), y más los montos grandes (≥US$1.000 M ×1,5; ≥US$100 M ×1,2; <US$10 M ×0,7). Índice = 100·e^(−suma/40), +3 por hecho positivo (máximo +6). No es una opinión y no se ajusta por el tamaño de la empresa.
- **Tus valores:** en Opciones eliges qué temas te importan. La tarjeta muestra además tu índice personal y avisa si la empresa tiene multas, acuerdos o condenas recientes en un tema «Muy importante».
- **Fondos:** si BlackRock, Vanguard, State Street, Blackstone, KKR, Berkshire Hathaway o Apollo están entre los dueños, se muestra también su historial.
- **Base inicial:** 30 historiales (23 empresas y 7 gestoras de fondos) con 79 hechos verificados uno por uno contra su fuente el 8-oct-2026. Seis están incompletos (Microsoft, P&G, AB InBev, LATAM, LVMH y Nike): se marcan «en investigación» y no muestran índice. El resto de los grupos aún no tiene historial; el job los va completando.

## Alternativas locales

- **Qué cuenta como alternativa:** una marca de la misma categoría cuyo dueño es una cooperativa, sus empleados, un fideicomiso, una familia o su fundador (con fondos solo como minoritarios), con capital del país de la tienda. Las cooperativas y las de empleados aparecen primero y, después, las de mejor reputación (o las más afines a tus valores).
- **Qué no mide:** precio, calidad, tamaño de la empresa ni si la marca se vende en esa tienda. Una gran empresa familiar del país también cuenta como capital local, y la tarjeta muestra el motivo de cada sugerencia.
- **Base inicial:** 11 categorías y 60 marcas alternativas (57 dueños) en 15 de los 17 países (con cooperativas destacadas en México, Argentina, Colombia, EE.UU., Canadá, Brasil, Chile, España, Francia, Italia, Alemania, Reino Unido, India, Singapur, Corea del Sur y Japón; aún pendientes China e Israel), cada una verificada con búsqueda web (sitio oficial, Wikipedia o prensa). Los usuarios pueden sugerir más desde el ícono de Gina; el job las verifica antes de publicarlas.
- **Cobertura desigual:** hay más alternativas en lácteos y en México, EE.UU., España e Italia. En algunas categorías y países todavía no hay ninguna; la tarjeta lo dice en vez de inventar.

## Instalación para probar

1. Descomprime el zip.
2. Abre `chrome://extensions` (o `edge://extensions`), activa **Modo de desarrollador** y pulsa **Cargar descomprimida**.
3. Elige la carpeta **`extension/`**.

En Firefox (140+): `about:debugging` → *Este Firefox* → **Cargar complemento temporal** → elige `extension/manifest.json`.

Para publicarla en las tiendas sigue **`PUBLICAR.md`**.

## Privacidad

- Sin la IA avanzada, Gina no envía nada: solo descarga la base del proyecto (un archivo de datos, sin código).
- Los datos de confiabilidad (calificación de la tienda, vendedor, origen del envío y garantías legales) se extraen localmente de la página abierta y nunca salen de tu navegador.
- Las sugerencias las envía el usuario por su voluntad, revisando el texto antes (issue de GitHub o correo). Solo incluyen marca, tienda y título del producto.
- Con la IA avanzada activada, al proveedor elegido solo van la marca, el título del producto y el nombre de la tienda (y, en la investigación de reputación, el nombre de la empresa).
- El conteo de qué empresas ves, tus valores y tus claves se quedan en tu navegador.

## Archivos

| Ruta | Qué es |
|---|---|
| `datagen/` | Fuente de los datos: `data_base.py` y `data_mundo.py` (grupos y marcas), `data_locales.py` (alternativas verificadas), `categorias.py`, `reputacion.json`, `sites_data.py`, `proyecto.json`, `fuentes/` y `indice_fuentes.py` (SQLite FTS5); `build_data.py` genera la base y el manifiesto |
| `extension/manifest.json`, `_locales/` | Manifest V3; nombre y descripción en inglés y español |
| `extension/data/brands.json` | Grupos, marcas, aerolíneas, reputación y categorías |
| `extension/data/sites.json`, `proyecto.json` | Registro de sitios y configuración del proyecto (repositorio, correo) |
| `extension/src/matcher.js` | Normaliza textos y reconoce marcas, aerolíneas y sitios |
| `extension/src/reputation.js` | Índice de reputación, valores del usuario, fondos |
| `extension/src/alternativas.js` | Categorías, alternativas locales y enlaces de sugerencia |
| `extension/src/extractors.js`, `flights.js` | Lectura de productos (8 idiomas) y de vuelos u hospedaje |
| `extension/src/card.js`, `content.js` | Tarjeta flotante y orquestación de la página |
| `extension/src/ai.js`, `background.js` | IA opcional, descarga de la base, memoria e investigación en el navegador |
| `extension/options/`, `extension/popup/` | Opciones (valores, base del proyecto, IA avanzada) y ventana del ícono (página actual, buscador, sugerencias) |
| `job/investigar.js`, `.github/workflows/` | Job del proyecto y su programación (canario dominical + ejecución real de lunes) |
| `docs/privacidad.html` | Política de privacidad (para publicar en GitHub Pages) |
| `store/` | Textos e imágenes para las tiendas |
| `test/` | `node test/run.js`, `node test/background.test.js`, `node test/job.test.js`, `node test/e2e_ciclo.test.js` (ejecutar antes `cd test && npm ci`) y `python3 test/e2e.py` (Playwright) |

## Límites

- Las tiendas cambian su HTML; si un sitio deja de detectar, ajusta `src/extractors.js` (o la expresión `p` del sitio en `datagen/sites_data.py`).
- Los nombres cortos o comunes (Delta, Roma, Valor…) solo cuentan cuando vienen del campo de marca, para evitar falsos positivos.
- Los datos cambian: revisa la confianza y la fuente de cada tarjeta.
- La interfaz (tarjeta flotante, menú emergente y opciones) está disponible en 6 idiomas (español, inglés, alemán, francés, italiano y japonés); los datos de las empresas están en español.
- Es información orientativa basada en fuentes públicas, no una recomendación de compra ni de inversión.

## Licencias

- **Código:** publicado bajo la licencia [MIT](LICENSE).
- **Datos (`extension/data/*.json`, `datagen/`):** publicados bajo [CC BY 4.0](LICENSE-DATA.md) (atribución requerida: *«Datos de Project Gina (github.com/ginaproyecto02-lgtm/project-gina)»*).
- **Nombre y logotipo:** «Gina», «Project Gina» y su logotipo están reservados y no forman parte de estas licencias.
