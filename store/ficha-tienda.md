# Gina (Project Gina) — store listing texts

Copy each block into the store form. Your contact e-mail and privacy policy URL are already filled in from `datagen/proyecto.json`.
The listing is **English first**, with Spanish as a second language. The extension name and short description are already localized in `_locales/en` and `_locales/es`. The interface is available in Spanish, English, German, French, Italian and Japanese; company data (owners, notes, reputation) is in Spanish.

---

## 1. Basics

| Field | Value |
|---|---|
| Name (from `_locales`) | EN: **Gina: Know Who Your Money Backs** · ES: **Gina: sabe a quién apoya tu dinero** |
| Short name | Gina |
| Version | 3.1.0 |
| Category | Chrome: **Shopping** · Edge: **Shopping** · Firefox: **Shopping** |
| Listing languages | English (default), Spanish (the interface also has German, French, Italian and Japanese) |
| Price | Free |
| Website / support | Your repository or site · `gina.proyecto02@gmail.com` |
| Privacy policy | `https://ginaproyecto02-lgtm.github.io/project-gina/privacidad.html` (publish `docs/privacidad.html`) |

## 2. Summary (≤132 characters, already in the manifest)

> See which company, family, fund or government is behind what you buy, their track record and lobbying. Vote with every dollar.

## 3. Description — English (primary)

```
Every dollar you spend is a vote. Gina shows you who it goes to.

While you shop or book online, Gina adds a small card that tells you:

• Who really owns the brand: the company, family, investment fund or government in control, and the country its capital comes from.
• Purchase reliability: direct vs. third-party seller, fulfillment origin, and applicable legal warranties, strictly as stated on the page.
• The big investment funds behind it, such as BlackRock, Vanguard, State Street, Blackstone, KKR, Berkshire Hathaway and Apollo, and their own track record.
• Its public track record: fines, lawsuits, settlements and court rulings on the environment, labor, corruption, privacy, competition, consumer protection, human rights, taxes and safety. Every item links to its source and says its exact status (allegation, lawsuit, settlement, fine, ruling, dismissed).
• Its declared lobbying and political donations where official data exists, shown as numbers, never as ideological labels.
• Who owns the store you are buying from, the airline you fly and the travel site you book on.
• Local alternatives: for the kind of product you are viewing (dairy, coffee, detergent, beer and more), brands owned by co-operatives, their employees, a trust, or local families and founders in the store's country, so your money can go where you choose.

YOUR VALUES, YOUR VOTE
Tell Gina what matters to you. Each card shows an open reputation score (0–100, built only from sourced facts with a published formula) plus how well the company matches your values, and warns you when it has recent fines or settlements on an issue you marked as very important.

WHERE IT WORKS
335 stores, airlines, travel agencies and stay platforms in 17 countries:
Americas: United States, Mexico, Canada, Brazil, Argentina, Chile.
Europe: United Kingdom, Germany, France, Spain, Italy.
Asia: China, Japan, South Korea, Singapore, Israel, India.
Ownership data for 354 groups, 988 brands (including Chinese, Japanese, Korean and Hebrew names), 110 airlines, and 16 product categories.

FREE AND COMMUNITY-POWERED
Gina is free, with no account and no API key. Project Gina updates the shared database every one to two weeks with an automated research run that only keeps facts whose source came from a real web search. Missing a brand or know a local alternative? Suggest it from the Gina icon and it is verified before it is published.
Advanced users can optionally connect their own AI key (Claude, Gemini, Groq or xAI) for instant answers on brands that are not yet in the database.

PRIVATE BY DESIGN
• Works without an account or key, and sends nothing about you.
• Everything stays in your browser. Seller, rating, shipping, and warranty data are read locally from the page and never leave your computer.
• No developer servers, analytics, ads or affiliate links.
• Only if you turn on AI are the brand name, product title and store name sent to the provider you choose.

The interface is available in 6 languages; company details are shown in Spanish.
Information is indicative and based on public sources; it can change. It is not purchase or investment advice. Spotted an error about a company? Write to gina.proyecto02@gmail.com and we will review and correct it.
```

## 3b. Descripción — español (segundo idioma)

```
Cada peso que gastas es un voto. Gina te muestra a quién va.

Mientras compras o reservas en línea, Gina agrega una tarjeta discreta que te dice:

• Quién es dueño de la marca: empresa, familia, fondo de inversión o Estado, y de qué país es su capital.
• Confiabilidad de compra: vendedor directo o externo, origen del envío y garantías legales aplicables, estrictamente según lo que indica la página.
• Los grandes fondos detrás, como BlackRock, Vanguard, State Street, Blackstone, KKR, Berkshire Hathaway y Apollo, y también su propio historial.
• Su historial público: multas, juicios, acuerdos y sentencias en medio ambiente, trabajo, corrupción, privacidad, competencia, trato al consumidor, derechos humanos, impuestos y seguridad. Cada hecho enlaza a su fuente e indica su estado exacto (alegación, juicio, acuerdo, multa, sentencia, desestimado).
• Su lobbying y sus donaciones políticas declaradas, cuando hay dato oficial: cifras, nunca etiquetas ideológicas.
• Quién es dueño de la tienda donde compras, de la aerolínea en que vuelas y de la plataforma donde reservas.

• Alternativas locales: para el tipo de producto que ves (lácteos, café, detergente, cerveza, electrónica y más), marcas de cooperativas, de sus empleados, de un fideicomiso o de familias y fundadores del país de la tienda, para que tu dinero vaya a donde tú decidas.

TUS VALORES, TU VOTO
Dile a Gina qué te importa. Cada tarjeta muestra un índice de reputación abierto (0–100, calculado solo con hechos con fuente y una fórmula publicada), qué tan alineada está la empresa con tus valores, y te avisa si tiene multas o acuerdos recientes en un tema que marcaste como muy importante.

DÓNDE FUNCIONA
335 tiendas, aerolíneas, agencias y plataformas de hospedaje en 17 países de América, Europa y Asia. 354 grupos, 988 marcas, 110 aerolíneas y 16 categorías de producto.

GRATIS Y HECHA EN COMUNIDAD
Gina es gratis, sin cuenta ni clave. Project Gina actualiza la base compartida cada una o dos semanas con una investigación automática que solo guarda hechos cuya fuente salió de una búsqueda real. ¿Falta una marca o conoces una alternativa local? Sugiérela desde el ícono de Gina; se verifica antes de publicarse.
Opcional y avanzado: conecta tu propia clave de IA (Claude, Gemini, Groq o xAI) para respuestas al momento.

PRIVACIDAD
Sin cuenta ni clave obligatoria. Todo se guarda en tu navegador. Los datos de confiabilidad (calificación, vendedor, envío y garantías) se extraen localmente y nunca salen de tu computadora. Sin servidores del desarrollador, analítica, publicidad ni enlaces de afiliado. La interfaz está disponible en 6 idiomas (español, inglés, alemán, francés, italiano y japonés).

Información orientativa basada en fuentes públicas. No es una recomendación de compra ni de inversión. ¿Un dato incorrecto sobre una empresa? Escríbenos a gina.proyecto02@gmail.com.
```

## 4. Screenshot captions (store/imagenes/)

| File | Caption |
|---|---|
| `captura-1-producto.png` | Prefer local? See co-op and family-owned alternatives for what you buy. |
| `captura-2-reputacion.png` | A sourced track record (fines, lawsuits, settlements, lobbying) scored with an open formula. |
| `captura-3-vuelos.png` | On flight searches, see which group controls each airline. |
| `captura-4-marca-nueva-ia.png` | Optional: connect your own AI key for instant answers on brands not yet in the database. |
| `captura-5-opciones.png` | Choose what matters to you: environment, labor, privacy, corruption and more. |

Store images: `icono-128.png` (icon), `promo-pequeno-440x280.png` (small tile, required on Chrome), `promo-marquesina-1400x560.png` (optional marquee), `logo-300.png` (Edge logo).

---

## 5. Chrome Web Store — "Privacy practices" tab

**Single purpose**
```
Help shoppers make informed purchases: seller and product reliability shown on the page, who owns the brand, and locally owned alternatives.
```

**Permission justifications**

| Permission | Justification |
|---|---|
| `storage` | Saves the user's preferences and values, the cache of identified brands, the list of pending brands, reputation records from the optional weekly research, a local count of which companies the user sees (used only to prioritize that research) and the API keys the user enters. |
| `alarms` | Schedules the weekly download of the project's updated data file and the optional personal research. |
| Host permissions (content-script sites) | The extension runs only on 335 specific shopping and travel sites to read the product brand or the airline names and show the card. It does not run on other sites. |
| Optional host permissions (api.anthropic.com, generativelanguage.googleapis.com, api.groq.com, api.x.ai, https://*/*) | Requested only when the user saves their own AI key, to call the API of the provider they choose. A specific origin under `https://*/*` is requested only if the user configures an OpenAI-compatible provider at their own address or a remote data file on their own server. |

**Remote code?** No. All JavaScript ships in the package. The weekly download from the project's GitHub repository is a JSON data file with no logic.

**Data collected** (tick only this box):
- ☑ **Website content**: the brand name and product title of the page being viewed. It is processed locally, and sent to the user's chosen AI provider only if the user turns on AI.
- Leave everything else unticked.

**Certifications:** tick all three (no sale or transfer to third parties outside approved uses; no use unrelated to the single purpose; no use for creditworthiness or lending).

## 6. Microsoft Edge Add-ons — "Privacy"

- Single purpose and permission justifications: same as block 5.
- Remote code: No.
- Personal data: website content, only when the user turns on AI (same text as block 5). Privacy policy URL: `https://ginaproyecto02-lgtm.github.io/project-gina/privacidad.html`.
- **Notes for certification:**
```
Works without an account or key: open any product page on walmart.com, amazon.com, bestbuy.com or mercadolibre.com.mx, or a search on google.com/travel/flights, and the card appears at the bottom right with ownership and a sourced reputation record. AI is optional and needs the user's own key (Anthropic, Gemini, Groq or xAI); there is no developer account or server. No remote code. The interface follows the browser language (6 languages).
```

## 7. Firefox Add-ons (AMO)

- Data collection is declared in the manifest (`data_collection_permissions`: required `none`, optional `websiteContent`). Firefox shows it at install time, and the extension asks for the permission when AI is turned on.
- **Notes to reviewer:**
```
No build step: the uploaded files are the source. The innerHTML warnings are template strings whose dynamic values all pass through an esc() HTML-escaping helper (defined at the top of card.js, popup.js and options.js). In Firefox the background uses background.scripts (service_worker is only for Chrome). AI is optional and uses the user's own API key; without a key, test on any product page on walmart.com or amazon.com, or a Google Flights search.
```
- License: choose one (for example MIT, or "All rights reserved").

## 8. Reputation data: editorial notes for reviewers and press

- Each fact links to its source (a regulator, a court, a company filing or a news outlet) and states its status. A settlement without admission of liability is labeled as such.
- The score formula is public, shown on the card and in the README. It measures documented record only, not company size or opinions.
- Lobbying is shown as declared amounts or donation splits by party, never as ideology.
- Corrections: `gina.proyecto02@gmail.com`. Commit to answering within a few days and fixing errors in the next data update. The weekly server job can publish the fix without a new extension release.

## 9. Local alternatives: editorial notes

- An alternative is a brand in the same product category whose owner is a co-operative, its employees, a trust, or a family or founder (funds only as minority holders), with capital from the store's country. Each one links to the source of its ownership.
- Suggestions do not compare price, quality or availability, and the card says so.
- User suggestions arrive as GitHub issues or e-mails sent voluntarily, and the research job verifies ownership with a source before publishing.
