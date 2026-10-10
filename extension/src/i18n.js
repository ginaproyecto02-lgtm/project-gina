// Gina — Sistema de internacionalización (i18n) para 6 idiomas:
// es (español), en (inglés), de (alemán), fr (francés), it (italiano), ja (japonés).
(function (root) {
  const QED = (root.QED = root.QED || {});
  const SUPPORTED = ["es", "en", "de", "fr", "it", "ja"];

  let currentLang = null;

  function detectLang() {
    try {
      if (typeof chrome !== "undefined" && chrome.i18n && chrome.i18n.getUILanguage) {
        const ui = chrome.i18n.getUILanguage().slice(0, 2).toLowerCase();
        if (SUPPORTED.includes(ui)) return ui;
      }
    } catch (e) {}
    const nav = (typeof navigator !== "undefined" && (navigator.languages && navigator.languages[0] || navigator.language)) || "es";
    const code = String(nav).slice(0, 2).toLowerCase();
    return SUPPORTED.includes(code) ? code : "en";
  }

  function getLang() {
    if (!currentLang) currentLang = detectLang();
    return currentLang;
  }

  function setLang(l) {
    if (SUPPORTED.includes(l)) currentLang = l;
  }

  // Diccionario general de cadenas UI
  const STRINGS = {
    // Top bar
    card_title_brand: {
      es: "¿a quién apoya tu dinero con esta marca?",
      en: "who does your money back with this brand?",
      de: "wen unterstützt dein Geld bei dieser Marke?",
      fr: "qui votre argent soutient-il avec cette marque ?",
      it: "chi sostiene il tuo denaro con questo marchio?",
      ja: "このブランドであなたのお金は誰を支えていますか？"
    },
    card_title_flight: {
      es: "¿a quién apoya tu dinero en este vuelo?",
      en: "who does your money back on this flight?",
      de: "wen unterstützt dein Geld bei diesem Flug?",
      fr: "qui votre argent soutient-il sur ce vol ?",
      it: "chi sostiene il tuo denaro con questo volo?",
      ja: "このフライトであなたのお金は誰を支えていますか？"
    },
    card_title_hotel: {
      es: "¿a quién apoya tu dinero en esta reserva?",
      en: "who does your money back on this booking?",
      de: "wen unterstützt dein Geld bei dieser Buchung?",
      fr: "qui votre argent soutient-il avec cette réservation ?",
      it: "chi sostiene il tuo denaro con questa prenotazione?",
      ja: "この予約であなたのお金は誰を支えていますか？"
    },
    btn_minimize: {
      es: "Minimizar",
      en: "Minimize",
      de: "Minimieren",
      fr: "Réduire",
      it: "Riduci a icona",
      ja: "最小化"
    },
    btn_close: {
      es: "Cerrar en esta página",
      en: "Close on this page",
      de: "Auf dieser Seite schließen",
      fr: "Fermer sur cette page",
      it: "Chiudi su questa pagina",
      ja: "このページで閉じる"
    },

    // Card body labels
    brand_detected: {
      es: "Marca detectada:",
      en: "Detected brand:",
      de: "Erkannte Marke:",
      fr: "Marque détectée :",
      it: "Marchio rilevato:",
      ja: "検出されたブランド："
    },
    who_controls: {
      es: "Quién la controla",
      en: "Who controls it",
      de: "Wer kontrolliert es",
      fr: "Qui la contrôle",
      it: "Chi la controlla",
      ja: "実質的支配者"
    },
    major_funds: {
      es: "Grandes fondos",
      en: "Major investment funds",
      de: "Große Investmentfonds",
      fr: "Grands fonds d'investissement",
      it: "Grandi fondi d'investimento",
      ja: "主要な投資ファンド"
    },
    gov_ties: {
      es: "Relación con gobiernos",
      en: "Government ties",
      de: "Regierungsbeziehungen",
      fr: "Relations gouvernementales",
      it: "Relazioni con i governi",
      ja: "政府・公的機関との関係"
    },
    source: {
      es: "Fuente",
      en: "Source",
      de: "Quelle",
      fr: "Source",
      it: "Fonte",
      ja: "情報源"
    },
    view_source: {
      es: "Ver fuente",
      en: "View source",
      de: "Quelle ansehen",
      fr: "Voir la source",
      it: "Vedi fonte",
      ja: "情報源を見る"
    },
    no_source: {
      es: "Sin fuente",
      en: "No source",
      de: "Keine Quelle",
      fr: "Sans source",
      it: "Senza fonte",
      ja: "情報源なし"
    },

    // Hints
    hint_title_deduced: {
      es: "La marca se dedujo del título del producto; revisa que sea la correcta.",
      en: "The brand was inferred from the product title; verify it is correct.",
      de: "Die Marke wurde aus dem Produkttitel abgeleitet; bitte prüfen.",
      fr: "La marque a été déduite du titre du produit ; vérifiez si elle est correcte.",
      it: "Il marchio è stato dedotto dal titolo del prodotto; verifica che sia corretto.",
      ja: "ブランド名は商品タイトルから推定されました。正しいかご確認ください。"
    },
    hint_ai_classified: {
      es: "Clasificado por IA ({model}, certeza {certeza}). Quedó en la cola para confirmarlo con fuentes.",
      en: "Classified by AI ({model}, certainty {certeza}). Queued for verification with public sources.",
      de: "Klassifiziert durch KI ({model}, Zuverlässigkeit {certeza}). Zur Bestätigung mit Quellen eingereiht.",
      fr: "Classé par IA ({model}, certitude {certeza}). En attente de confirmation avec sources publiques.",
      it: "Classificato tramite IA ({model}, certezza {certeza}). In coda per la verifica con fonti pubbliche.",
      ja: "AIによる分類（{model}、確信度 {certeza}）。公開情報源での確認待ちです。"
    },
    hint_ai_base: {
      es: "La IA asoció esta marca a un grupo registrado en la base ({model}).",
      en: "AI matched this brand to an existing database group ({model}).",
      de: "Die KI hat diese Marke einer bestehenden Gruppe zugeordnet ({model}).",
      fr: "L'IA a associé cette marque à un groupe enregistré dans la base ({model}).",
      it: "L'IA ha associato questo marchio a un gruppo esistente nel database ({model}).",
      ja: "AIはこのブランドをデータベース内の既存グループに関連付けました（{model}）。"
    },

    // Not found
    not_found_title: {
      es: "Marca no encontrada en la base",
      en: "Brand not in database yet",
      de: "Marke noch nicht in der Datenbank",
      fr: "Marque non trouvée dans la base",
      it: "Marchio non presente nel database",
      ja: "データベース未登録のブランド"
    },
    not_found_desc: {
      es: "La página indica la marca <b>{brand}</b>, pero todavía no está en la base.",
      en: "The page indicates the brand <b>{brand}</b>, but it is not yet in the database.",
      de: "Die Seite gibt die Marke <b>{brand}</b> an, sie ist jedoch noch nicht in der Datenbank.",
      fr: "La page indique la marque <b>{brand}</b>, mais elle n'est pas encore dans la base.",
      it: "La pagina indica il marchio <b>{brand}</b>, ma non è ancora presente nel database.",
      ja: "このページにはブランド「<b>{brand}</b>」が記載されていますが、まだデータベースにありません。"
    },
    not_found_unreadable: {
      es: "No se pudo leer la marca de este producto.",
      en: "Could not detect the brand for this product.",
      de: "Die Marke dieses Produkts konnte nicht erkannt werden.",
      fr: "Impossible de détecter la marque de ce produit.",
      it: "Impossibile rilevare il marchio di questo prodotto.",
      ja: "この商品のブランドを検出できませんでした。"
    },
    not_found_pending_hint: {
      es: "📋 Quedó registrada en tu cola de investigación local.",
      en: "📋 Recorded in your local research queue.",
      de: "📋 In deiner lokalen Recherche-Warteschlange erfasst.",
      fr: "📋 Enregistrée dans votre liste de recherche locale.",
      it: "📋 Registrata nella tua lista di ricerca locale.",
      ja: "📋 ローカルの調査キューに記録されました。"
    },
    suggest_btn: {
      es: "💡 Sugerir esta marca al proyecto",
      en: "💡 Suggest this brand to the project",
      de: "💡 Diese Marke dem Projekt vorschlagen",
      fr: "💡 Suggérer cette marque au projet",
      it: "💡 Suggerisci questo marchio al progetto",
      ja: "💡 このブランドをプロジェクトに提案"
    },
    suggest_success: {
      es: "✔ ¡Gracias! Marca anotada para la próxima actualización de la base.",
      en: "✔ Thank you! Brand queued for the next database update.",
      de: "✔ Danke! Marke für das nächste Datenbank-Update vorgemerkt.",
      fr: "✔ Merci ! Marque notée pour la prochaine mise à jour de la base.",
      it: "✔ Grazie! Marchio annotato per il prossimo aggiornamento del database.",
      ja: "✔ ありがとうございます！次回のデータベース更新に向けて記録しました。"
    },
    suggest_email_opt: {
      es: "✉ Enviar por correo al equipo",
      en: "✉ Send by email to the team",
      de: "✉ Per E-Mail an das Team senden",
      fr: "✉ Envoyer par courriel à l'équipe",
      it: "✉ Invia via email al team",
      ja: "✉ チームにメールで送信"
    },

    // Store & travel
    shopping_at: {
      es: "🏬 Compras en <b>{store}</b> → {empresa} · {controlador}",
      en: "🏬 Shopping at <b>{store}</b> → {empresa} · {controlador}",
      de: "🏬 Einkauf bei <b>{store}</b> → {empresa} · {controlador}",
      fr: "🏬 Achats chez <b>{store}</b> → {empresa} · {controlador}",
      it: "🏬 Acquisti su <b>{store}</b> → {empresa} · {controlador}",
      ja: "🏬 ショッピング先：<b>{store}</b> → {empresa} · {controlador}"
    },
    flying_with: {
      es: "✈️ Vuelas con <b>{airline}</b>",
      en: "✈️ Flying with <b>{airline}</b>",
      de: "✈️ Flug mit <b>{airline}</b>",
      fr: "✈️ Vol avec <b>{airline}</b>",
      it: "✈️ Volo con <b>{airline}</b>",
      ja: "✈️ 運航会社：<b>{airline}</b>"
    },
    booking_with: {
      es: "Reservas en <b>{agency}</b>",
      en: "Booking with <b>{agency}</b>",
      de: "Buchung über <b>{agency}</b>",
      fr: "Réservation chez <b>{agency}</b>",
      it: "Prenotazione su <b>{agency}</b>",
      ja: "予約先：<b>{agency}</b>"
    },
    other_airlines: {
      es: "Otras aerolíneas en esta página",
      en: "Other airlines on this page",
      de: "Weitere Fluggesellschaften auf dieser Seite",
      fr: "Autres compagnies sur cette page",
      it: "Altre compagnie aeree su questa pagina",
      ja: "このページの他の航空会社"
    },
    airlines_on_page: {
      es: "Aerolíneas en esta página",
      en: "Airlines on this page",
      de: "Fluggesellschaften auf dieser Seite",
      fr: "Compagnies sur cette page",
      it: "Compagnie aeree su questa pagina",
      ja: "このページの航空会社"
    },
    times_seen: {
      es: "aparece {count} {times}",
      en: "appears {count} {times}",
      de: "erscheint {count} {times}",
      fr: "apparaît {count} {times}",
      it: "appare {count} {times}",
      ja: "{count}回表示"
    },
    time_singular: { es: "vez", en: "time", de: "Mal", fr: "fois", it: "volta", ja: "回" },
    time_plural: { es: "veces", en: "times", de: "Mal", fr: "fois", it: "volte", ja: "回" },

    // Reputation
    rep_title: {
      es: "Reputación de {name}",
      en: "Reputation of {name}",
      de: "Reputation von {name}",
      fr: "Réputation de {name}",
      it: "Reputazione di {name}",
      ja: "{name}の評価・実績"
    },
    rep_general: {
      es: "Reputación",
      en: "Reputation",
      de: "Reputation",
      fr: "Réputation",
      it: "Reputazione",
      ja: "企業の評価・実績"
    },
    rep_investigating: {
      es: "Historial en investigación: aún no hay hechos confirmados.",
      en: "Record under investigation: no confirmed public records yet.",
      de: "Historie in Recherche: noch keine bestätigten Fakten.",
      fr: "Historique en cours de vérification : pas encore de faits confirmés.",
      it: "Storico in fase di analisi: nessun fatto ancora confermato.",
      ja: "調査中：まだ確認された公開記録はありません。"
    },
    rep_unresearched: {
      es: "Aún sin investigar. La investigación periódica la incluirá cuando veas esta empresa con frecuencia.",
      en: "Not yet researched. The periodic research will include it as you encounter this company.",
      de: "Noch nicht recherchiert. Wird bei häufigerem Vorkommen automatisch untersucht.",
      fr: "Pas encore documenté. La recherche périodique l'inclura si vous la croisez fréquemment.",
      it: "Non ancora esaminato. Verrà incluso nelle verifiche periodiche se visitato spesso.",
      ja: "未調査です。閲覧頻度に応じて定期更新時に調査されます。"
    },
    rep_facts_with_source: {
      es: "· {n} {facts} con fuente",
      en: "· {n} sourced {facts}",
      de: "· {n} belegte {facts}",
      fr: "· {n} {facts} avec source",
      it: "· {n} {facts} con fonte",
      ja: "· {n}件の出典付き記録"
    },
    fact_singular: { es: "hecho", en: "fact", de: "Fakt", fr: "fait", it: "fatto", ja: "件" },
    fact_plural: { es: "hechos", en: "facts", de: "Fakten", fr: "faits", it: "fatti", ja: "件" },
    rep_view_all: {
      es: "Ver {all_facts}{lobbying} y método",
      en: "View {all_facts}{lobbying} & method",
      de: "Alle {all_facts}{lobbying} und Methodik ansehen",
      fr: "Voir {all_facts}{lobbying} et méthode",
      it: "Vedi {all_facts}{lobbying} e metodo",
      ja: "{all_facts}{lobbying}と算定方法を見る"
    },
    all_facts_label: {
      es: "todos los hechos",
      en: "all records",
      de: "Fakten",
      fr: "tous les faits",
      it: "tutti i fatti",
      ja: "すべての記録"
    },
    details_label: {
      es: "detalles",
      en: "details",
      de: "Details",
      fr: "détails",
      it: "dettagli",
      ja: "詳細"
    },
    positive_facts: {
      es: "Hechos positivos",
      en: "Positive records",
      de: "Positive Fakten",
      fr: "Faits positifs",
      it: "Fatti positivi",
      ja: "肯定的な実績"
    },
    lobbying_donations: {
      es: "Lobbying y donaciones políticas",
      en: "Lobbying and political donations",
      de: "Lobbying und politische Spenden",
      fr: "Lobbying et dons politiques",
      it: "Lobbying e donazioni politiche",
      ja: "ロビー活動・政治献金"
    },
    funds_reputation: {
      es: "Reputación de sus fondos",
      en: "Reputation of its investment funds",
      de: "Reputation der beteiligten Fonds",
      fr: "Réputation de ses fonds d'investissement",
      it: "Reputazione dei suoi fondi",
      ja: "出資ファンドの評価"
    },
    method_disclaimer: {
      es: "El índice solo resume hechos públicos con fuente: condena 10, multa 8, acuerdo 6, juicio en curso 3, investigación 2, alegación 1, desestimado o anulado 0; pesan menos los de hace más de 3 años y más los de montos grandes. No es una opinión sobre la empresa y no se ajusta por su tamaño.",
      en: "The index summarizes sourced public records: conviction 10, fine 8, settlement 6, ongoing trial 3, inquiry 2, allegation 1, dismissed 0; events older than 3 years weigh less, large financial penalties weigh more. Not a subjective opinion; not size-adjusted.",
      de: "Der Index fasst belegte Fakten zusammen: Verurteilung 10, Bußgeld 8, Vergleich 6, laufendes Verfahren 3, Untersuchung 2, Vorwurf 1, eingestellt 0. Fakten vor >3 Jahren zählen weniger, hohe Beträge mehr. Keine subjektive Meinung.",
      fr: "L'indice résume des faits publics documentés : condamnation 10, amende 8, accord 6, procès en cours 3, enquête 2, allégation 1, non-lieu 0. Moins de poids après 3 ans, montants importants accentués. Pas une opinion subjective.",
      it: "L'indice riassume fatti pubblici documentati: condanna 10, multa 8, transazione 6, causa in corso 3, indagine 2, accusa 1, archiviato 0. Eventi >3 anni pesano meno, importi rilevanti di più. Nessun giudizio soggettivo.",
      ja: "本指数は公的・出典付き事実の客観的集計です（判決10、罰金8、和解6、係争3、調査2、疑惑1、棄却0）。3年以上前は軽微に、巨額制裁は加重評価。企業の規模調整や主観的意見ではありません。"
    },

    // Alternatives
    alt_header: {
      es: "🌱 Alternativas de {cat} con dueño local en {pais}",
      en: "🌱 Locally-owned {cat} alternatives in {pais}",
      de: "🌱 Lokale Alternativen für {cat} in {pais}",
      fr: "🌱 Alternatives locales de {cat} en {pais}",
      it: "🌱 Alternative locali per {cat} in {pais}",
      ja: "🌱 {pais}の地域資本による{cat}の選択肢"
    },
    alt_also_local: {
      es: "(esta marca también es de capital local)",
      en: "(this brand is also locally owned)",
      de: "(diese Marke ist ebenfalls lokal geführt)",
      fr: "(cette marque est aussi de capital local)",
      it: "(anche questo marchio è a capitale locale)",
      ja: "(このブランドも地域資本です)"
    },
    alt_none_yet: {
      es: "Aún no tenemos alternativas verificadas de este tipo en {pais}. Puedes sugerir una desde el ícono de Gina.",
      en: "No verified alternatives of this type in {pais} yet. You can suggest one via the Gina icon.",
      de: "Noch keine verifizierten Alternativen dieses Typs in {pais}. Du kannst eine über das Gina-Icon vorschlagen.",
      fr: "Pas encore d'alternative vérifiée de ce type en {pais}. Vous pouvez en suggérer une via l'icône Gina.",
      it: "Non ci sono ancora alternative verificate di questo tipo in {pais}. Puoi suggerirne una dall'icona di Gina.",
      ja: "{pais}におけるこの種類の検証済み代替品はまだありません。Ginaアイコンから提案できます。"
    },
    alt_disclaimer: {
      es: "Sugerencias por tipo de dueño (cooperativa, empleados, familia o fundador) y país; no comparan precio ni calidad.",
      en: "Suggestions based on ownership type (coop, employees, family, founder) and country; no quality or price comparison.",
      de: "Vorschläge nach Eigentümertyp (Genossenschaft, Mitarbeiter, Familie, Gründer) und Land; kein Preis- oder Qualitätsvergleich.",
      fr: "Suggestions selon le type de propriétaire (coopérative, salariés, famille, fondateur) et le pays ; sans comparaison de prix ou de qualité.",
      it: "Suggerimenti per tipo di proprietà (cooperativa, dipendenti, famiglia, fondatore) e paese; nessun confronto di prezzo o qualità.",
      ja: "所有形態（協同組合、従業員、創業家、創業者）と国に基づく提案です。価格や品質の比較ではありません。"
    },

    // Footer
    foot_disclaimer: {
      es: "Información orientativa basada en fuentes públicas. No es una recomendación de compra ni de inversión.",
      en: "Informational guidance based on public sources. Not a purchase or investment recommendation.",
      de: "Orientierende Information aus öffentlichen Quellen. Keine Kauf- oder Anlageempfehlung.",
      fr: "Information indicative basée sur des sources publiques. Ne constitue pas une recommandation d'achat ou d'investissement.",
      it: "Informazioni orientative basate su fonti pubbliche. Non costituisce un consiglio di acquisto o investimento.",
      ja: "公開情報に基づく参考情報です。購入や投資の推奨ではありません。"
    },

    // Popup
    tab_page: { es: "Esta página", en: "This page", de: "Diese Seite", fr: "Cette page", it: "Questa pagina", ja: "このページ" },
    tab_search: { es: "Buscar", en: "Search", de: "Suchen", fr: "Rechercher", it: "Cerca", ja: "検索" },
    tab_add: { es: "Agregar una marca", en: "Add brand", de: "Marke hinzufügen", fr: "Ajouter marque", it: "Aggiungi marchio", ja: "ブランド追加" },
    search_placeholder: {
      es: "Marca, tienda, aerolínea o fondo: Bimbo, Liverpool, BlackRock…",
      en: "Brand, store, airline or fund: Nike, Amazon, BlackRock…",
      de: "Marke, Shop, Airline oder Fonds: Adidas, Zalando, BlackRock…",
      fr: "Marque, magasin, compagnie ou fonds : Danone, Fnac, BlackRock…",
      it: "Marchio, negozio, compagnia o fondo: Barilla, Coop, BlackRock…",
      ja: "ブランド、店舗、航空会社、ファンド：ソニー、楽天、ブラックロック…"
    },
    show_card_btn: {
      es: "Mostrar la tarjeta en la página",
      en: "Show card on page",
      de: "Karte auf der Seite anzeigen",
      fr: "Afficher la fiche sur la page",
      it: "Mostra scheda sulla pagina",
      ja: "ページにカードを表示"
    },
    btn_options: {
      es: "⚙ Opciones y valores",
      en: "⚙ Settings & values",
      de: "⚙ Einstellungen & Werte",
      fr: "⚙ Paramètres & valeurs",
      it: "⚙ Impostazioni e valori",
      ja: "⚙ 設定と価値観"
    }
  };

  // Información didáctica de tipos de controlador
  const TIPO_INFO = {
    "Familia": {
      es: "Una familia controla la empresa: estrategia estable y de largo plazo.",
      en: "Family controlled: stable and long-term business strategy.",
      de: "Familiengeführt: stabile, langfristige Unternehmensstrategie.",
      fr: "Contrôlée par une famille : stratégie stable et de long terme.",
      it: "Controllata da una famiglia: strategia stabile e di lungo termine.",
      ja: "同族経営：安定的で長期的な事業戦略。"
    },
    "Familia + fondos": {
      es: "Una familia tiene el control y fondos institucionales son socios.",
      en: "Family controlled with institutional fund partners.",
      de: "Familiengeführt mit institutionellen Fonds als Partnern.",
      fr: "Contrôlée par une famille avec des fonds institutionnels associés.",
      it: "Controllata da una famiglia con fondi istituzionali come soci.",
      ja: "同族経営＋機関投資家ファンド。"
    },
    "Familia + capital privado": {
      es: "Familia y un fondo de capital privado comparten el control.",
      en: "Family and private equity share control.",
      de: "Familie und Private-Equity-Fonds teilen sich die Kontrolle.",
      fr: "Famille et capital-investissement partagent le contrôle.",
      it: "Famiglia e private equity condividono il controllo.",
      ja: "創業者一族とプライベートエクイティが共同支配。"
    },
    "Familia + corporación": {
      es: "Una familia y otra gran empresa son los accionistas de referencia.",
      en: "A family and another corporation are reference shareholders.",
      de: "Familie und ein Großkonzern sind Ankeraktionäre.",
      fr: "Une famille et un grand groupe sont actionnaires de référence.",
      it: "Una famiglia e un'altra grande impresa sono azionisti di riferimento.",
      ja: "同族と大手企業が主要株主。"
    },
    "Fundador": {
      es: "Su fundador conserva el control.",
      en: "Founder retains control.",
      de: "Gründer behält die Kontrolle.",
      fr: "Le fondateur conserve le contrôle.",
      it: "Il fondatore mantiene il controllo.",
      ja: "創業者支配：創業者が経営権を保持。"
    },
    "Fundador + fondos": {
      es: "El fundador manda y grandes fondos invierten.",
      en: "Founder directs and major institutional funds invest.",
      de: "Gründer führt, große Fonds investieren.",
      fr: "Le fondateur dirige et de grands fonds investissent.",
      it: "Il fondatore guida e grandi fondi investono.",
      ja: "創業者主導＋機関投資家ファンド。"
    },
    "Fondos dispersos": {
      es: "Nadie la controla por sí solo; los mayores accionistas suelen ser fondos indexados.",
      en: "Dispersed ownership; largest shareholders are usually index funds.",
      de: "Streubesitz; größte Aktionäre sind meist Indexfonds.",
      fr: "Actionnariat dispersé ; les plus grands actionnaires sont des fonds indiciels.",
      it: "Azionariato diffuso; i principali azionisti sono fondi indicizzati.",
      ja: "分散保有：単独支配なし、筆頭株主は主にインデックスファンド。"
    },
    "Corporación": {
      es: "Pertenece a otra gran empresa.",
      en: "Owned by another large corporation.",
      de: "Gehört zu einem anderen Großkonzern.",
      fr: "Appartient à une autre grande entreprise.",
      it: "Appartiene a un'altra grande impresa.",
      ja: "親会社・大手コングロマリット傘下。"
    },
    "Corporación + familia": {
      es: "Pertenece a una gran empresa con socios familiares.",
      en: "Owned by a corporation with family partners.",
      de: "Gehört zu einem Großkonzern mit Familienpartnern.",
      fr: "Appartient à une entreprise avec des partenaires familiaux.",
      it: "Appartiene a un gruppo aziendale con soci familiari.",
      ja: "企業グループ傘下（同族パートナーあり）。"
    },
    "Capital privado": {
      es: "Un fondo de capital privado es el dueño.",
      en: "Owned by a private equity fund.",
      de: "Im Besitz eines Private-Equity-Fonds.",
      fr: "Détenue par un fonds de capital-investissement.",
      it: "Di proprietà di un fondo di private equity.",
      ja: "プライベートエクイティ（投資ファンド）傘下。"
    },
    "Estatal": {
      es: "Pertenece a un Estado.",
      en: "State-owned enterprise.",
      de: "In staatlichem Besitz.",
      fr: "Entreprise publique / détenue par l'État.",
      it: "Di proprietà statale.",
      ja: "国有企業。"
    },
    "Cooperativa": {
      es: "Pertenece a sus socios cooperativistas.",
      en: "Owned by cooperative members.",
      de: "Gehört den Genossenschaftsmitgliedern.",
      fr: "Appartient à ses membres coopérateurs.",
      it: "Appartiene ai soci cooperatori.",
      ja: "協同組合（組合員が所有）。"
    },
    "Empleados": {
      es: "Pertenece a sus empleados.",
      en: "Employee-owned company.",
      de: "In Mitarbeiterhand.",
      fr: "Détenue par ses salariés.",
      it: "Di proprietà dei dipendenti.",
      ja: "従業員所有企業。"
    },
    "Privada": {
      es: "Empresa privada que no cotiza en bolsa.",
      en: "Privately held company (unlisted).",
      de: "Nicht börsennotiertes Privatunternehmen.",
      fr: "Société privée non cotée.",
      it: "Azienda privata non quotata in borsa.",
      ja: "非公開企業（非上場）。"
    },
    "Mixto": {
      es: "Propiedad mixta (pública y privada).",
      en: "Mixed public-private ownership.",
      de: "Gemischtwirtschaftlich (öffentlich-privat).",
      fr: "Propriété mixte (publique et privée).",
      it: "Proprietà mista (pubblica e privata).",
      ja: "官民共同所有（混合所有）。"
    },
    "Corporación + capital privado": {
      es: "Otra gran empresa y un fondo de capital privado son los accionistas de referencia.",
      en: "A corporation and private equity share key ownership.",
      de: "Großkonzern und Private-Equity-Fonds teilen sich die Anteile.",
      fr: "Une grande entreprise et un fonds d'investissement sont actionnaires clés.",
      it: "Un'azienda e un fondo di private equity sono azionisti di riferimento.",
      ja: "事業会社とPEファンドによる共同保有。"
    },
    "Fideicomiso": {
      es: "La controla un fideicomiso (trust) con un fin definido, no un accionista que busque vender.",
      en: "Controlled by a purpose trust or foundation, not a short-term shareholder.",
      de: "Gesteuert durch einen Trust/Stiftung mit Zweckbindung.",
      fr: "Contrôlée par un trust ou une fondation pérenne.",
      it: "Controllata da un trust o fondazione con scopo definito.",
      ja: "信託・財団支配（公益・長期目的）。"
    }
  };

  // Etiquetas cortas para los tipos de controlador
  const TIPO_LABELS = {
    "Familia": { es: "Familia", en: "Family", de: "Familie", fr: "Famille", it: "Famiglia", ja: "同族経営" },
    "Familia + fondos": { es: "Familia + fondos", en: "Family + funds", de: "Familie + Fonds", fr: "Famille + fonds", it: "Famiglia + fondi", ja: "同族＋ファンド" },
    "Familia + capital privado": { es: "Familia + capital privado", en: "Family + private equity", de: "Familie + PE", fr: "Famille + capital-invest.", it: "Famiglia + private equity", ja: "同族＋PE" },
    "Familia + corporación": { es: "Familia + corporación", en: "Family + corporation", de: "Familie + Konzern", fr: "Famille + entreprise", it: "Famiglia + gruppo", ja: "同族＋企業" },
    "Fundador": { es: "Fundador", en: "Founder", de: "Gründer", fr: "Fondateur", it: "Fondatore", ja: "創業者" },
    "Fundador + fondos": { es: "Fundador + fondos", en: "Founder + funds", de: "Gründer + Fonds", fr: "Fondateur + fonds", it: "Fondatore + fondi", ja: "創業者＋ファンド" },
    "Fondos dispersos": { es: "Fondos dispersos", en: "Dispersed funds", de: "Streubesitz", fr: "Fonds dispersés", it: "Fondi diffusi", ja: "分散保有" },
    "Corporación": { es: "Corporación", en: "Corporation", de: "Konzern", fr: "Groupe", it: "Gruppo aziendale", ja: "親会社傘下" },
    "Corporación + familia": { es: "Corporación + familia", en: "Corporation + family", de: "Konzern + Familie", fr: "Groupe + famille", it: "Gruppo + famiglia", ja: "企業＋同族" },
    "Capital privado": { es: "Capital privado", en: "Private equity", de: "Private Equity", fr: "Capital-investissement", it: "Private equity", ja: "PEファンド" },
    "Estatal": { es: "Estatal", en: "State-owned", de: "Staatlich", fr: "Public / État", it: "Statale", ja: "国有" },
    "Cooperativa": { es: "Cooperativa", en: "Cooperative", de: "Genossenschaft", fr: "Coopérative", it: "Cooperativa", ja: "協同組合" },
    "Empleados": { es: "Empleados", en: "Employee-owned", de: "Mitarbeiter", fr: "Salariés", it: "Dipendenti", ja: "従業員所有" },
    "Privada": { es: "Privada", en: "Private", de: "Privat", fr: "Privée", it: "Privata", ja: "非公開" },
    "Mixto": { es: "Mixto", en: "Mixed", de: "Gemischt", fr: "Mixte", it: "Misto", ja: "官民共同" },
    "Corporación + capital privado": { es: "Corporación + cap. privado", en: "Corporation + PE", de: "Konzern + PE", fr: "Groupe + capital-invest.", it: "Gruppo + private equity", ja: "企業＋PE" },
    "Fideicomiso": { es: "Fideicomiso", en: "Trust", de: "Treuhand", fr: "Fiducie / Trust", it: "Trust", ja: "信託・財団" }
  };

  // Estados legales
  const ESTADOS_MAP = {
    condena: { es: "Condena", en: "Conviction", de: "Verurteilung", fr: "Condamnation", it: "Condanna", ja: "有罪判決" },
    multa: { es: "Multa", en: "Fine", de: "Bußgeld", fr: "Amende", it: "Sanzione", ja: "罰金" },
    acuerdo: { es: "Acuerdo", en: "Settlement", de: "Vergleich", fr: "Accord", it: "Accordo", ja: "和解" },
    litigio: { es: "Juicio en curso", en: "Lawsuit", de: "Laufendes Verfahren", fr: "Procès en cours", it: "Processo", ja: "係争中" },
    investigacion: { es: "Investigación", en: "Inquiry", de: "Ermittlung", fr: "Enquête", it: "Indagine", ja: "当局調査" },
    alegacion: { es: "Alegación", en: "Allegation", de: "Vorwurf", fr: "Allégation", it: "Accusa", ja: "疑惑" },
    absuelto: { es: "Absuelto", en: "Acquitted", de: "Freigesprochen", fr: "Acquitté", it: "Assolto", ja: "無罪" },
    anulado: { es: "Anulado", en: "Dismissed", de: "Eingestellt", fr: "Annulé", it: "Annullato", ja: "破棄" }
  };

  // Temas de reputación
  const TEMAS_MAP = {
    ambiental: { es: "Medio ambiente", en: "Environment", de: "Umwelt", fr: "Environnement", it: "Ambiente", ja: "環境" },
    laboral: { es: "Trabajo", en: "Labor & Workers", de: "Arbeit", fr: "Travail & Salariés", it: "Lavoro", ja: "労働環境" },
    corrupcion: { es: "Corrupción y sanciones", en: "Corruption & Sanctions", de: "Korruption & Sanktionen", fr: "Corruption & Sanctions", it: "Corruzione e sanzioni", ja: "汚職・制裁" },
    privacidad: { es: "Privacidad y datos", en: "Privacy & Data", de: "Datenschutz", fr: "Vie privée & Données", it: "Privacy e dati", ja: "プライバシー" },
    competencia: { es: "Competencia", en: "Antitrust & Competition", de: "Wettbewerb", fr: "Concurrence", it: "Concorrenza", ja: "独占禁止" },
    consumidor: { es: "Trato al consumidor", en: "Consumer Protection", de: "Verbraucherschutz", fr: "Protection des consommateurs", it: "Tutela consumatori", ja: "消費者保護" },
    derechos_humanos: { es: "Derechos humanos", en: "Human Rights", de: "Menschenrechte", fr: "Droits humains", it: "Diritti umani", ja: "人権" },
    fiscal: { es: "Impuestos", en: "Taxes & Fiscal", de: "Steuern", fr: "Fiscalité", it: "Fisco e tasse", ja: "税務" },
    seguridad: { es: "Seguridad y salud", en: "Health & Safety", de: "Sicherheit & Gesundheit", fr: "Santé et sécurité", it: "Sicurezza e salute", ja: "安全衛生" },
    gobierno_corporativo: { es: "Gobierno corporativo", en: "Corporate Governance", de: "Unternehmensführung", fr: "Gouvernance", it: "Governance aziendale", ja: "企業統治" }
  };

  // Niveles del score
  function repLevel(indice, lang) {
    l = lang || getLang();
    const isEs = l === "es", isEn = l === "en", isDe = l === "de", isFr = l === "fr", isIt = l === "it", isJa = l === "ja";
    if (indice >= 75) {
      if (isEs) return "Pocas controversias registradas";
      if (isDe) return "Wenige erfasste Kontroversen";
      if (isFr) return "Peu de controverses enregistrées";
      if (isIt) return "Poche controversie registrate";
      if (isJa) return "記録された論争・不祥事は少数";
      return "Few recorded controversies";
    }
    if (indice >= 50) {
      if (isEs) return "Controversias moderadas";
      if (isDe) return "Moderate Kontroversen";
      if (isFr) return "Controverses modérées";
      if (isIt) return "Controversie moderate";
      if (isJa) return "中程度の論争・不祥事";
      return "Moderate controversies";
    }
    if (indice >= 25) {
      if (isEs) return "Controversias relevantes";
      if (isDe) return "Erhebliche Kontroversen";
      if (isFr) return "Controverses significatives";
      if (isIt) return "Controversie significative";
      if (isJa) return "重大な論争・制裁歴";
      return "Significant controversies";
    }
    if (isEs) return "Historial de sanciones serio";
    if (isDe) return "Erhebliche Sanktionshistorie";
    if (isFr) return "Lourd historique de sanctions";
    if (isIt) return "Grave storico di sanzioni";
    if (isJa) return "深刻な制裁・違法履歴";
    return "Serious sanctions history";
  }

  function t(key, params, lang) {
    const l = lang || getLang();
    const entry = STRINGS[key];
    let val = (entry && (entry[l] || entry["en"] || entry["es"])) || key;
    if (params && typeof params === "object") {
      for (const [k, v] of Object.entries(params)) {
        val = val.replace(new RegExp(`\\{${k}\\}`, "g"), v == null ? "" : v);
      }
    }
    return val;
  }

  function tipoLabel(tipo, lang) {
    const l = lang || getLang();
    return (TIPO_LABELS[tipo] && (TIPO_LABELS[tipo][l] || TIPO_LABELS[tipo]["es"])) || tipo;
  }

  function tipoInfo(tipo, lang) {
    const l = lang || getLang();
    return (TIPO_INFO[tipo] && (TIPO_INFO[tipo][l] || TIPO_INFO[tipo]["es"])) || "";
  }

  function estadoLabel(est, lang) {
    const l = lang || getLang();
    return (ESTADOS_MAP[est] && (ESTADOS_MAP[est][l] || ESTADOS_MAP[est]["es"])) || est;
  }

  function temaLabel(tema, lang) {
    const l = lang || getLang();
    return (TEMAS_MAP[tema] && (TEMAS_MAP[tema][l] || TEMAS_MAP[tema]["es"])) || tema;
  }

  QED.I18N = {
    SUPPORTED,
    detectLang,
    getLang,
    setLang,
    t,
    tipoLabel,
    tipoInfo,
    estadoLabel,
    temaLabel,
    repLevel
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
