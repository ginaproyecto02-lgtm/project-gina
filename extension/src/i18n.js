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

    // ---------------- Modular Sections & Shopper Personas ----------------
    sec_reliability_title: {
      es: "Confiabilidad de compra y producto",
      en: "Purchase & Product Reliability",
      de: "Kauf- & Produktsicherheit",
      fr: "Fiabilité d'achat et produit",
      it: "Affidabilità dell'acquisto e prodotto",
      ja: "購入と商品の信頼性"
    },
    sec_alternatives_title: {
      es: "Mercado y alternativas locales",
      en: "Market & Local Alternatives",
      de: "Markt & lokale Alternativen",
      fr: "Marché et alternatives locales",
      it: "Mercato e alternative locali",
      ja: "市場と地域資本の代替案"
    },
    sec_ownership_title: {
      es: "¿A qué bicho le compras?",
      en: "Who are you buying from?",
      de: "Von wem kaufst du wirklich?",
      fr: "À qui donnez-vous votre argent ?",
      it: "A chi stai dando i tuoi soldi?",
      ja: "実質的に誰から買っていますか？"
    },
    persona_smart: {
      es: "Consumidor Inteligente",
      en: "Smart Shopper",
      de: "Kluger Käufer",
      fr: "Consommateur Malin",
      it: "Consumatore Intelligente",
      ja: "スマート消費者"
    },
    persona_saver: {
      es: "Consumidor Ahorrador",
      en: "Value & Local Shopper",
      de: "Sparbewusster Käufer",
      fr: "Consommateur Économe",
      it: "Consumatore Attento",
      ja: "地域・節約志向"
    },
    persona_conscious: {
      es: "Consumidor Consciente",
      en: "Conscious Shopper",
      de: "Bewusster Käufer",
      fr: "Consommateur Engagé",
      it: "Consumatore Consapevole",
      ja: "エシカル消費者"
    },

    // Tabs
    tab_smart: {
      es: "🛡️ Confiabilidad",
      en: "🛡️ Reliability",
      de: "🛡️ Sicherheit",
      fr: "🛡️ Fiabilité",
      it: "🛡️ Affidabilità",
      ja: "🛡️ 信頼性"
    },
    tab_saver: {
      es: "💡 Alternativas",
      en: "💡 Alternatives",
      de: "💡 Alternativen",
      fr: "💡 Alternatives",
      it: "💡 Alternative",
      ja: "💡 代替案"
    },
    tab_conscious: {
      es: "🏢 ¿Quién controla?",
      en: "🏢 Who controls?",
      de: "🏢 Wer kontrolliert?",
      fr: "🏢 Qui contrôle ?",
      it: "🏢 Chi controlla?",
      ja: "🏢 実質支配者"
    },

    // Reliability Levels
    rel_high: {
      es: "✔ Alta confiabilidad",
      en: "✔ High reliability",
      de: "✔ Hohe Zuverlässigkeit",
      fr: "✔ Haute fiabilité",
      it: "✔ Alta affidabilità",
      ja: "✔ 高い信頼性"
    },
    rel_standard: {
      es: "✔ Confiabilidad estándar",
      en: "✔ Standard reliability",
      de: "✔ Standard-Zuverlässigkeit",
      fr: "✔ Fiabilité standard",
      it: "✔ Affidabilità standard",
      ja: "✔ 標準的な信頼性"
    },
    rel_check: {
      es: "⚠ Verificar vendedor",
      en: "⚠ Verify seller",
      de: "⚠ Verkäufer prüfen",
      fr: "⚠ Vérifier le vendeur",
      it: "⚠ Verificare il venditore",
      ja: "⚠ 出品者を確認"
    },

    // Reliability Labels
    rel_seller_label: {
      es: "Vendedor y tienda",
      en: "Seller & Store",
      de: "Verkäufer & Shop",
      fr: "Vendeur & Boutique",
      it: "Venditore e Negozio",
      ja: "販売元・店舗"
    },
    rel_shipping_label: {
      es: "Envío y origen",
      en: "Shipping & Fulfillment",
      de: "Versand & Logistik",
      fr: "Livraison & Expédition",
      it: "Spedizione e Logistica",
      ja: "配送・発送元"
    },
    rel_warranty_label: {
      es: "Garantía y protección",
      en: "Warranty & Protection",
      de: "Garantie & Käuferschutz",
      fr: "Garantie & Protection",
      it: "Garanzia e Protezione",
      ja: "保証・購入者保護"
    },
    rel_norms_label: {
      es: "Normas de calidad y seguridad",
      en: "Quality & Safety Standards",
      de: "Qualitäts- & Sicherheitsnormen",
      fr: "Normes de qualité et sécurité",
      it: "Norme di qualità e sicurezza",
      ja: "品質・安全基準"
    },

    // Seller Types
    seller_official: {
      es: "Tienda Oficial de la marca",
      en: "Official Brand Store",
      de: "Offizieller Markenshop",
      fr: "Boutique Officielle de la marque",
      it: "Negozio Ufficiale del marchio",
      ja: "公式ブランドストア"
    },
    seller_direct: {
      es: "Vendido directamente por {platform}",
      en: "Sold directly by {platform}",
      de: "Direkt von {platform} verkauft",
      fr: "Vendu directement par {platform}",
      it: "Venduto direttamente da {platform}",
      ja: "{platform}直販"
    },
    seller_verified: {
      es: "Vendedor verificado de la plataforma",
      en: "Verified platform seller",
      de: "Verifizierter Plattform-Verkäufer",
      fr: "Vendeur vérifié par la plateforme",
      it: "Venditore verificato della piattaforma",
      ja: "プラットフォーム認証出品者"
    },
    seller_third_party: {
      es: "Vendedor externo independiente",
      en: "Third-party marketplace seller",
      de: "Externer Drittanbieter",
      fr: "Vendeur tiers indépendant",
      it: "Venditore terzo indipendente",
      ja: "サードパーティ出品者"
    },

    // Fulfillment
    ship_platform_fulfilled: {
      es: "Almacén oficial (Prime / Full) con envío asegurado",
      en: "Official warehouse (Prime / Full) with insured shipping",
      de: "Offizielles Lager (Prime / Full) mit versichertem Versand",
      fr: "Entrepôt officiel (Prime / Full) avec expédition assurée",
      it: "Magazzino ufficiale (Prime / Full) con spedizione assicurata",
      ja: "公式倉庫（Prime / フルフィルメント）による安心発送"
    },
    ship_seller_fulfilled: {
      es: "Envío directo gestionado por el vendedor",
      en: "Direct shipping fulfilled by the seller",
      de: "Direktversand durch den Verkäufer",
      fr: "Expédition directe gérée par le vendeur",
      it: "Spedizione diretta gestita dal venditore",
      ja: "出品者による直接発送"
    },

    // Warranty
    warranty_protected_30d: {
      es: "Compra Protegida · 30 días de devolución sin costo",
      en: "Buyer Protection · Free 30-day returns",
      de: "Käuferschutz · Kostenlose 30-Tage-Rückgabe",
      fr: "Protection acheteur · Retours gratuits sous 30 jours",
      it: "Protezione acquisti · Reso gratuito entro 30 giorni",
      ja: "購入者保護 · 30日間無料返品"
    },
    warranty_factory_note: {
      es: "Garantía legal y de fabricante aplicable contra defectos",
      en: "Applicable legal and manufacturer warranty against defects",
      de: "Gesetzliche und Herstellergarantie gegen Mängel",
      fr: "Garantie légale et fabricant contre les défauts",
      it: "Garanzia legale e del produttore contro i difetti",
      ja: "製造欠陥に対する法的保証およびメーカー保証"
    },

    // Norms descriptions
    norm_health_desc: {
      es: "Fórmula e ingredientes con registro sanitario y trazabilidad de lote.",
      en: "Formula and ingredients with sanitary registration and batch traceability.",
      de: "Rezeptur und Inhaltsstoffe mit gesundheitlicher Registrierung und Chargenrückverfolgbarkeit.",
      fr: "Formule et ingrédients avec enregistrement sanitaire et traçabilité des lots.",
      it: "Formula e ingredienti con registrazione sanitaria e tracciabilità del lotto.",
      ja: "衛生登録およびロット追跡管理された成分・配合。"
    },
    norm_batch_desc: {
      es: "Cumple especificaciones dermatológicas y etiquetado libre de sustancias nocivas.",
      en: "Meets dermatological specifications and clean, compliant labeling.",
      de: "Erfüllt dermatologische Vorgaben und schadstofffreie Kennzeichnung.",
      fr: "Conforme aux spécifications dermatologiques et étiquetage sécurisé.",
      it: "Conforme alle specifiche dermatologiche ed etichettatura conforme.",
      ja: "皮膚科学的仕様および有害物質不使用の基準に適合。"
    },
    norm_food_desc: {
      es: "Etiquetado nutrimental claro y estándares de inocuidad en alimentos.",
      en: "Clear nutritional labeling and food safety standards.",
      de: "Klare Nährwertkennzeichnung und Lebensmittelsicherheitsstandards.",
      fr: "Étiquetage nutritionnel clair et normes de sécurité alimentaire.",
      it: "Etichettatura nutrizionale trasparente e norme di sicurezza alimentare.",
      ja: "明確な栄養表示と食品安全基準。"
    },
    norm_freshness_desc: {
      es: "Garantía de fecha de caducidad vigente y almacenamiento higiénico.",
      en: "Valid expiration date guarantee and proper storage conditions.",
      de: "Garantie gültigen Haltbarkeitsdatums und fachgerechte Lagerung.",
      fr: "Garantie de date de péremption valide et stockage adapté.",
      it: "Garanzia di data di scadenza valida e stoccaggio idoneo.",
      ja: "有効な賞味期限保証と適切な保管管理。"
    },
    norm_tech_desc: {
      es: "Seguridad eléctrica, aislamiento y compatibilidad electromagnética certificada.",
      en: "Certified electrical safety, insulation, and electromagnetic compatibility.",
      de: "Zertifizierte elektrische Sicherheit, Isolation und elektromagnetische Verträglichkeit.",
      fr: "Sécurité électrique, isolation et compatibilité électromagnétique certifiés.",
      it: "Sicurezza elettrica, isolamento e compatibilità elettromagnetica certificati.",
      ja: "電気安全、絶縁性、電磁両立性の認証適合。"
    },
    norm_warranty_law_desc: {
      es: "Garantía obligatoria de funcionamiento técnico (mínimo 90 días a 1 año).",
      en: "Mandatory technical functioning warranty (minimum 90 days to 1 year).",
      de: "Gesetzliche technische Funktionsgarantie (mindestens 90 Tage bis 1 Jahr).",
      fr: "Garantie légale de bon fonctionnement technique (90 jours à 1 an min.).",
      it: "Garanzia obbligatoria di conformità tecnica (minimo da 90 giorni a 1 anno).",
      ja: "技術的動作保証（最低90日から1年間）。"
    },
    norm_sport_desc: {
      es: "Materiales probados para tensión, resistencia al desgaste y uso deportivo.",
      en: "Materials tested for stress, wear resistance, and outdoor/sport performance.",
      de: "Materialien geprüft auf Belastung, Verschleißfestigkeit und sportliche Nutzung.",
      fr: "Matériaux testés pour la traction, la résistance à l'usure et l'usage sportif.",
      it: "Materiali testati per trazione, resistenza all'usura e uso sportivo.",
      ja: "張力、耐摩耗性、実釣・スポーツ使用に耐えるテスト済み素材。"
    },
    norm_gear_guarantee_desc: {
      es: "Garantía de ensamble y componentes mecánicos originales.",
      en: "Warranty on mechanical assembly and original parts.",
      de: "Garantie auf mechanische Montage und Originalteile.",
      fr: "Garantie sur l'assemblage mécanique et les pièces d'origine.",
      it: "Garanzia sull'assemblaggio meccanico e sui componenti originali.",
      ja: "機械的組み立ておよび純正部品に対する保証。"
    },
    norm_cleaning_desc: {
      es: "Cumple normas de aseo doméstico, seguridad de envase y prevención de riesgos.",
      en: "Complies with household cleaning safety, secure packaging, and hazard warnings.",
      de: "Erfüllt Reinigungsnormen, Verpackungssicherheit und Gefahrenhinweise.",
      fr: "Conforme aux normes ménagères, sécurité du conditionnement et étiquetage des risques.",
      it: "Conforme alle norme per la pulizia, sicurezza della confezione e avvertenze.",
      ja: "家庭用洗剤基準、容器の安全性、リスク防止表示に適合。"
    },
    norm_general_desc: {
      es: "Protección legal de los derechos del consumidor y garantía de satisfacción.",
      en: "Consumer legal rights protection and satisfaction guarantee.",
      de: "Gesetzlicher Schutz der Verbraucherrechte und Zufriedenheitsgarantie.",
      fr: "Protection légale des droits des consommateurs et garantie de satisfaction.",
      it: "Tutela legale dei diritti del consumatore e garanzia di conformità.",
      ja: "消費者保護法に基づく権利保護および適合保証。"
    },
    norm_registered_brand_desc: {
      es: "Empresa matriz legalmente establecida con domicilio social y responsabilidad corporativa.",
      en: "Legally established parent company with registered office and corporate liability.",
      de: "Rechtlich eingetragene Muttergesellschaft mit Firmensitz und Haftung.",
      fr: "Société mère légalement constituée avec siège social et responsabilité civile.",
      it: "Società controllante legalmente costituita con sede sociale e responsabilità aziendale.",
      ja: "法人登記された親会社による責任と体制。"
    },

    // Shopping Advice Tips
    rel_tip_high: {
      es: "💡 Compra de máxima confianza: vendedor oficial/directo con devolución garantizada de 30 días.",
      en: "💡 Maximum confidence purchase: official/direct seller with guaranteed 30-day returns.",
      de: "💡 Höchste Zuverlässigkeit: offizieller/direkter Verkäufer mit 30 Tagen Rückgabegarantie.",
      fr: "💡 Achat de confiance maximale : vendeur officiel/direct avec retours garantis sous 30 jours.",
      it: "💡 Acquisto di massima fiducia: venditore ufficiale/diretto con reso garantito entro 30 giorni.",
      ja: "💡 最高度の信頼性：公式・直販出品者、30日間の返品保証付き。"
    },
    rel_tip_standard: {
      es: "💡 Vendedor con buen historial en plataforma y política activa de devoluciones.",
      en: "💡 Seller with good platform track record and active return policy.",
      de: "💡 Verkäufer mit gutem Plattform-Verlauf und aktiver Rückgaberichtlinie.",
      fr: "💡 Vendeur avec un bon historique sur la plateforme et politique de retours active.",
      it: "💡 Venditore con buona reputazione sulla piattaforma e politica di reso attiva.",
      ja: "💡 プラットフォーム実績良好、返品ポリシー適用の出品者です。"
    },
    rel_tip_check: {
      es: "⚠️ Vendedor externo: recomendamos revisar sus calificaciones recientes y tiempos de entrega antes de pagar.",
      en: "⚠️ Third-party seller: we recommend checking recent ratings and delivery times before checkout.",
      de: "⚠️ Drittanbieter: Prüfe bitte vor dem Kauf aktuelle Bewertungen und Lieferzeiten.",
      fr: "⚠️ Vendeur tiers : nous vous conseillons de vérifier les avis récents et délais de livraison avant d'acheter.",
      it: "⚠️ Venditore terzo: ti consigliamo di verificare recensioni recenti e tempi di consegna prima dell'acquisto.",
      ja: "⚠️ サードパーティ出品者：購入前に最近の評価と配送予定日を確認することをおすすめします。"
    },
    alt_saver_tip: {
      es: "💡 Las alternativas de ahorro y capital local ofrecen formulaciones equivalentes con hasta un 50%-80% de ahorro frente a marcas multinacionales importadas.",
      en: "💡 Locally-owned and budget alternatives offer equivalent quality with up to 50%-80% savings vs imported multinational brands.",
      de: "💡 Lokale und preiswerte Alternativen bieten vergleichbare Qualität mit bis zu 50%-80% Ersparnis gegenüber multinationalen Importmarken.",
      fr: "💡 Les alternatives locales et économiques offrent une qualité équivalente avec jusqu'à 50%-80% d'économies par rapport aux marques importées.",
      it: "💡 Le alternative locali ed economiche offrono qualità equivalente con un risparmio stimato fino al 50%-80% rispetto ai marchi importati.",
      ja: "💡 地域資本・お手頃な選択肢は、輸入多国籍ブランドと比べて最大50%〜80%の節約効果と安心の品質を両立します。"
    },
    alt_filter_all: {
      es: "Todas las locales",
      en: "All local options",
      de: "Alle lokalen Optionen",
      fr: "Toutes les options locales",
      it: "Tutte le opzioni locali",
      ja: "すべての地域選択肢"
    },
    alt_filter_budget: {
      es: "🏷️ Más económicas / Ahorro",
      en: "🏷️ Budget / High savings",
      de: "🏷️ Günstiger / Spartipp",
      fr: "🏷️ Plus économiques / Économies",
      it: "🏷️ Più economiche / Risparmio",
      ja: "🏷️ お手頃・高コスパ"
    },
    alt_badge_budget: {
      es: "Opción económica",
      en: "Budget option",
      de: "Günstige Option",
      fr: "Option économique",
      it: "Opzione economica",
      ja: "お手頃選択肢"
    },
    alt_no_budget_items: {
      es: "No hay marcas catalogadas específicamente de bajo costo en esta lista; todas las mostradas son de capital local independiente.",
      en: "No specific budget-tier brands found in this list; all displayed options are locally-owned.",
      de: "Keine speziellen Niedrigpreis-Marken gefunden; alle gezeigten Optionen sind lokal geführt.",
      fr: "Aucune marque spécifiquement économique répertoriée ici ; toutes sont locales et indépendantes.",
      it: "Nessun marchio specificamente economico in questo elenco; tutti quelli mostrati sono a capitale locale.",
      ja: "この一覧には格安特化ブランドはありません。表示されているものはすべて地域資本です。"
    },
    alt_options_count: {
      es: "opciones locales",
      en: "local options",
      de: "lokale Optionen",
      fr: "options locales",
      it: "opzioni locali",
      ja: "件の地域選択肢"
    },
    no_local_alternatives: {
      es: "Aún no hay alternativas locales registradas para este tipo de producto.",
      en: "No locally-owned alternatives registered for this product category yet.",
      de: "Noch keine lokalen Alternativen für diese Produktkategorie erfasst.",
      fr: "Aucune alternative locale enregistrée pour cette catégorie de produit pour le moment.",
      it: "Nessuna alternativa locale ancora registrata per questa categoria di producto.",
      ja: "この商品カテゴリの地域資本の選択肢はまだ登録されていません。"
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

  const CATEGORIAS_MAP = {
    lacteos: { es: "lácteos", en: "dairy", de: "Milchprodukte", fr: "produits laitiers", it: "latticini", ja: "乳製品" },
    bebidas: { es: "bebidas y jugos", en: "beverages & juices", de: "Getränke & Säfte", fr: "boissons et jus", it: "bevande e succhi", ja: "飲料・ジュース" },
    cerveza: { es: "cerveza", en: "beer", de: "Bier", fr: "bière", it: "birra", ja: "ビール" },
    cafe: { es: "café", en: "coffee", de: "Kaffee", fr: "café", it: "caffè", ja: "コーヒー" },
    chocolate_dulces: { es: "chocolates y dulces", en: "chocolates & sweets", de: "Schokolade & Süßwaren", fr: "chocolats et confiseries", it: "cioccolato e dolci", ja: "チョコレート・菓子" },
    botanas_galletas: { es: "botanas y galletas", en: "snacks & cookies", de: "Snacks & Kekse", fr: "snacks et biscuits", it: "snack e biscotti", ja: "スナック・ビスケット" },
    abarrotes: { es: "despensa y conservas", en: "pantry & groceries", de: "Grundnahrungsmittel", fr: "épicerie et conserves", it: "dispensa e conserve", ja: "食品・保存食" },
    panaderia_harinas: { es: "pan, cereales y harinas", en: "bread & bakery", de: "Brot & Backwaren", fr: "pain et céréales", it: "pane e farine", ja: "パン・穀物" },
    limpieza: { es: "limpieza del hogar", en: "household cleaning", de: "Haushaltsreinigung", fr: "nettoyage ménager", it: "pulizia della casa", ja: "家庭用洗剤・清掃" },
    cuidado_personal: { es: "higiene y cuidado personal", en: "personal hygiene", de: "Körperpflege & Hygiene", fr: "hygiène corporelle", it: "igiene personale", ja: "ボディケア・衛生" },
    skincare_cosmetica: { es: "dermocosmética y cuidado de la piel", en: "skincare & dermocosmetics", de: "Hautpflege & Dermokosmetik", fr: "soins de la peau et dermocosmétique", it: "cura della pelle e dermocosmesi", ja: "スキンケア・皮膚科学コスメ" },
    ropa_calzado: { es: "ropa y calzado", en: "apparel & footwear", de: "Kleidung & Schuhe", fr: "vêtements et chaussures", it: "abbigliamento e calzature", ja: "衣類・靴" },
    deportes_outdoor: { es: "deportes, pesca y aire libre", en: "sports, fishing & outdoors", de: "Sport, Angeln & Outdoor", fr: "sports, pêche et plein air", it: "sport, pesca e outdoor", ja: "スポーツ・釣り・アウトドア" }
  };

  function catLabel(catId, defaultLabel, lang) {
    const l = lang || getLang();
    return (CATEGORIAS_MAP[catId] && (CATEGORIAS_MAP[catId][l] || CATEGORIAS_MAP[catId]["es"])) || (defaultLabel || catId);
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
    repLevel,
    catLabel
  };

})(typeof globalThis !== "undefined" ? globalThis : this);
