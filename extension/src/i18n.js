// SPDX-License-Identifier: MIT
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
    not_found_page_brand_sub: {
      es: "No está en la base · leída del campo Marca de la página",
      en: "Not in database · read from page's brand field",
      de: "Nicht in der Datenbank · aus dem Markenfeld der Seite gelesen",
      fr: "Pas dans la base · lu depuis le champ marque de la page",
      it: "Non nel database · letto dal campo marchio della pagina",
      ja: "データベース未登録 · ページのブランド欄から読み取り"
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
      es: "Se abrió GitHub con tu sugerencia lista: revísala y pulsa «Submit».",
      en: "GitHub opened with your suggestion ready: review it and click 'Submit'.",
      de: "GitHub wurde mit deinem Vorschlag geöffnet: Bitte überprüfen und auf „Submit“ klicken.",
      fr: "GitHub s'est ouvert avec votre suggestion prête : vérifiez-la et cliquez sur « Submit ».",
      it: "GitHub si è aperto con il tuo suggerimento pronto: ricontrollalo e premi «Submit».",
      ja: "提案内容を入力したGitHubが開きました。内容を確認して「Submit」を押してください。"
    },
    suggest_email_opt: {
      es: "✉ Enviar por correo al equipo",
      en: "✉ Send by email to the team",
      de: "✉ Per E-Mail an das Team senden",
      fr: "✉ Envoyer par courriel à l'équipe",
      it: "✉ Invia via email al team",
      ja: "✉ チームにメールで送信"
    },
    sug_privacy_notice_drive: {
      es: "Se envía solo la marca, la tienda y el país. No se envía tu correo ni tu nombre.",
      en: "Only the brand, store and country are sent. Your email and name are never sent.",
      de: "Es werden nur Marke, Shop und Land gesendet. Weder E-Mail noch Name werden übermittelt.",
      fr: "Seuls la marque, la boutique et le pays sont envoyés. Ni votre e-mail ni votre nom ne sont transmis.",
      it: "Vengono inviati solo il marchio, il negozio e il paese. L'email e il nome non vengono mai inviati.",
      ja: "ブランド名、店舗、国のみが送信されます。メールアドレスや氏名は送信されません。"
    },
    suggest_sent_thanks: {
      es: "Enviada, gracias.",
      en: "Sent, thank you.",
      de: "Gesendet, vielen Dank.",
      fr: "Envoyée, merci.",
      it: "Inviato, gracias.",
      ja: "送信しました。ありがとうございます。"
    },
    sug_privacy_notice: {
      es: "Aviso: El proyecto verá tu dirección de correo al recibir este mensaje.",
      en: "Notice: The project will see your email address when receiving this message.",
      de: "Hinweis: Das Projekt sieht deine E-Mail-Adresse beim Empfang dieser Nachricht.",
      fr: "Avis : Le projet verra votre adresse e-mail à la réception de ce message.",
      it: "Avviso: Il proyecto vedrà il tuo indirizzo email alla ricezione di questo messaggio.",
      ja: "注意：メッセージ受信時にプロジェクト管理者にメールアドレスが表示されます。"
    },
    sug_opt_mailto: {
      es: "✉ Abrir en mi programa de correo",
      en: "✉ Open in email app",
      de: "✉ Im E-Mail-Programm öffnen",
      fr: "✉ Ouvrir dans le client de messagerie",
      it: "✉ Apri nel programma di posta",
      ja: "✉ メールソフトで開く"
    },
    sug_opt_gmail: {
      es: "✉ Abrir en Gmail",
      en: "✉ Open in Gmail",
      de: "✉ In Gmail öffnen",
      fr: "✉ Ouvrir dans Gmail",
      it: "✉ Apri in Gmail",
      ja: "✉ Gmailで開く"
    },
    sug_opt_copy: {
      es: "📋 Copiar texto",
      en: "📋 Copy text",
      de: "📋 Text kopieren",
      fr: "📋 Copier le texte",
      it: "📋 Copia testo",
      ja: "📋 テキストをコピー"
    },
    sug_opt_github: {
      es: "🐙 Abrir en GitHub Issues",
      en: "🐙 Open in GitHub Issues",
      de: "🐙 In GitHub Issues öffnen",
      fr: "🐙 Ouvrir dans GitHub Issues",
      it: "🐙 Apri in GitHub Issues",
      ja: "🐙 GitHub Issuesで開く"
    },
    sug_copied: {
      es: "✔ ¡Copiado al portapapeles!",
      en: "✔ Copied to clipboard!",
      de: "✔ In die Zwischenablage kopiert!",
      fr: "✔ Copié dans le presse-papiers !",
      it: "✔ Copiato negli appunti!",
      ja: "✔ クリップボードにコピーしました！"
    },
    suggest_already_submitted: {
      es: "Ya sugeriste esta marca al proyecto.",
      en: "You already suggested this brand to the project.",
      de: "Du hast diese Marke bereits für das Projekt vorgeschlagen.",
      fr: "Vous avez déjà suggéré cette marque au projet.",
      it: "Hai già suggerito questo marchio al progetto.",
      ja: "このブランドは既にプロジェクトに提案済みです。"
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
    alt_header_one: {
      es: "1 alternativa local de {cat} con dueño local en {pais}",
      en: "1 locally-owned {cat} alternative in {pais}",
      de: "1 lokale Alternative für {cat} in {pais}",
      fr: "1 alternative locale de {cat} avec propriétaire en {pais}",
      it: "1 alternativa locale per {cat} con proprietario in {pais}",
      ja: "{pais}の地域資本による{cat}の選択肢（1件）"
    },
    alt_header_other: {
      es: "{count} alternativas locales de {cat} con dueño local en {pais}",
      en: "{count} locally-owned {cat} alternatives in {pais}",
      de: "{count} lokale Alternativen für {cat} in {pais}",
      fr: "{count} alternatives locales de {cat} avec propriétaire en {pais}",
      it: "{count} alternative locali per {cat} con proprietario in {pais}",
      ja: "{pais}の地域資本による{cat}の選択肢（{count}件）"
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
    rel_not_stated: {
      es: "La página no lo indica",
      en: "Not stated on the page",
      de: "Auf der Seite nicht angegeben",
      fr: "Non indiqué sur la page",
      it: "Non indicato nella pagina",
      ja: "ページに記載なし"
    },
    norms_note: {
      es: "Normas que aplican a este tipo de producto. Gina no comprueba que el producto las cumpla: búscalas en el empaque o la ficha.",
      en: "Rules that apply to this kind of product. Gina does not check that the product meets them: look for them on the package or listing.",
      de: "Vorschriften für diese Produktart. Gina prüft nicht, ob das Produkt sie erfüllt: Achte auf Verpackung oder Produktseite.",
      fr: "Règles applicables à ce type de produit. Gina ne vérifie pas leur respect : cherchez-les sur l'emballage ou la fiche.",
      it: "Norme applicabili a questo tipo di prodotto. Gina non verifica che siano rispettate: cercale sulla confezione o nella scheda.",
      ja: "この種類の製品に適用される規則です。Ginaは適合を確認していません。パッケージや商品ページで確認してください。"
    },
    alt_disclaimer: {
      es: "Sugerencias por tipo de dueño (cooperativa, empleados, familia o fundador) y país. «Línea económica» es una clasificación editorial del proyecto; no comparamos precio ni calidad.",
      en: "Suggestions by ownership type (co-op, employees, family, founder) and country. “Budget line” is an editorial label from the project; we do not compare price or quality.",
      de: "Vorschläge nach Eigentümertyp (Genossenschaft, Mitarbeiter, Familie, Gründer) und Land. „Preiswerte Linie“ ist eine redaktionelle Einstufung; kein Preis- oder Qualitätsvergleich.",
      fr: "Suggestions selon le type de propriétaire (coopérative, salariés, famille, fondateur) et le pays. « Gamme économique » est un classement éditorial ; sans comparaison de prix ou de qualité.",
      it: "Suggerimenti per tipo di proprietà (cooperativa, dipendenti, famiglia, fondatore) e paese. «Linea economica» è una classificazione editoriale; nessun confronto di prezzo o qualità.",
      ja: "所有形態（協同組合・従業員・創業家・創業者）と国に基づく提案です。「お手頃ライン」は編集上の分類で、価格や品質は比較していません。"
    },

    // ---------------- Modular Sections & Shopper Personas ----------------
    sec_reliability_title: {
      es: "Confiabilidad de compra",
      en: "Purchase & Product Reliability",
      de: "Kauf- & Produktsicherheit",
      fr: "Fiabilité d'achat et produit",
      it: "Affidabilità dell'acquisto e prodotto",
      ja: "購入と商品の信頼性"
    },
    sec_market_title: {
      es: "Mercado y alternativas",
      en: "Market and alternatives",
      de: "Markt und Alternativen",
      fr: "Marché et alternatives",
      it: "Mercato e alternative",
      ja: "市場と代替案"
    },
    sec_alternatives_title: {
      es: "Mercado y alternativas",
      en: "Market and alternatives",
      de: "Markt und Alternativen",
      fr: "Marché et alternatives",
      it: "Mercato e alternative",
      ja: "市場と代替案"
    },
    sec_ownership_title: {
      es: "¿A quién le compras?",
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
      es: "✔ Vendedor oficial o directo",
      en: "✔ Official or direct seller",
      de: "✔ Offizieller oder direkter Verkäufer",
      fr: "✔ Vendeur officiel ou direct",
      it: "✔ Venditore ufficiale o diretto",
      ja: "✔ 公式・直販の出品者"
    },
    rel_standard: {
      es: "Vendedor con insignia o envío de la tienda",
      en: "Badged seller or store-fulfilled",
      de: "Verkäufer mit Abzeichen oder Versand durch den Shop",
      fr: "Vendeur labellisé ou expédié par la boutique",
      it: "Venditore con badge o spedito dal negozio",
      ja: "バッジ付き出品者またはストア発送"
    },
    rel_check: {
      es: "⚠ Revisa al vendedor",
      en: "⚠ Check the seller",
      de: "⚠ Verkäufer prüfen",
      fr: "⚠ Vérifiez le vendeur",
      it: "⚠ Controlla il venditore",
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
      es: "Vendedor con insignia de la plataforma",
      en: "Seller with a platform badge",
      de: "Verkäufer mit Plattform-Abzeichen",
      fr: "Vendeur avec badge de la plateforme",
      it: "Venditore con badge della piattaforma",
      ja: "プラットフォームのバッジ付き出品者"
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
      es: "Lo envía la plataforma (Full / Prime)",
      en: "Shipped by the platform (Full / Prime)",
      de: "Versand durch die Plattform (Full / Prime)",
      fr: "Expédié par la plateforme (Full / Prime)",
      it: "Spedito dalla piattaforma (Full / Prime)",
      ja: "プラットフォームから発送（Full / Prime）"
    },
    ship_seller_fulfilled: {
      es: "Lo envía el vendedor",
      en: "Shipped by the seller",
      de: "Versand durch den Verkäufer",
      fr: "Expédié par le vendeur",
      it: "Spedito dal venditore",
      ja: "出品者から発送"
    },

    // Warranty
    warranty_protected_30d: {
      es: "Revisa la política de devolución en la página",
      en: "Check the return policy on the page",
      de: "Rückgabebedingungen auf der Seite prüfen",
      fr: "Vérifiez la politique de retour sur la page",
      it: "Controlla la politica di reso nella pagina",
      ja: "ページで返品ポリシーを確認"
    },
    warranty_factory_note: {
      es: "Lo que indica la página. Antes de pagar, confirma devolución y garantía con la tienda.",
      en: "As stated on the page. Before paying, confirm returns and warranty with the store.",
      de: "Laut Seite. Vor dem Bezahlen Rückgabe und Garantie beim Shop bestätigen.",
      fr: "Selon la page. Avant de payer, confirmez retour et garantie auprès de la boutique.",
      it: "Secondo la pagina. Prima di pagare, conferma reso e garanzia con il negozio.",
      ja: "ページの記載です。支払い前に返品と保証をストアで確認してください。"
    },

    // Norms descriptions
    norm_health_desc: {
      es: "Busca el registro o aviso sanitario en el empaque.",
      en: "Look for the health registration or notice on the package.",
      de: "Achte auf die Gesundheitsregistrierung auf der Verpackung.",
      fr: "Cherchez l'enregistrement sanitaire sur l'emballage.",
      it: "Cerca la registrazione sanitaria sulla confezione.",
      ja: "パッケージで衛生登録・届出を確認してください。"
    },
    norm_batch_desc: {
      es: "Revisa que el empaque muestre lote, caducidad e ingredientes.",
      en: "Check that the package shows batch, expiry date and ingredients.",
      de: "Prüfe Charge, Haltbarkeit und Inhaltsstoffe auf der Verpackung.",
      fr: "Vérifiez lot, date de péremption et ingrédients sur l'emballage.",
      it: "Verifica lotto, scadenza e ingredienti sulla confezione.",
      ja: "パッケージのロット・使用期限・成分を確認してください。"
    },
    norm_food_desc: {
      es: "El etiquetado nutrimental y de advertencias es obligatorio; revísalo.",
      en: "Nutrition and warning labels are mandatory; check them.",
      de: "Nährwert- und Warnhinweise sind Pflicht; prüfe sie.",
      fr: "L'étiquetage nutritionnel et d'avertissement est obligatoire ; vérifiez-le.",
      it: "Etichette nutrizionali e di avvertenza sono obbligatorie; controllale.",
      ja: "栄養表示と警告表示は義務です。確認してください。"
    },
    norm_freshness_desc: {
      es: "Revisa la fecha de caducidad al recibir el producto.",
      en: "Check the expiry date when the product arrives.",
      de: "Prüfe das Haltbarkeitsdatum bei Lieferung.",
      fr: "Vérifiez la date de péremption à la réception.",
      it: "Controlla la data di scadenza alla consegna.",
      ja: "受け取り時に賞味・消費期限を確認してください。"
    },
    norm_tech_desc: {
      es: "Busca la marca de certificación eléctrica (NOM, CE, FCC) en el producto o la ficha.",
      en: "Look for the electrical certification mark (NOM, CE, FCC) on the product or listing.",
      de: "Achte auf das Prüfzeichen (NOM, CE, FCC) am Produkt oder auf der Seite.",
      fr: "Cherchez le marquage de certification (NOM, CE, FCC) sur le produit ou la fiche.",
      it: "Cerca il marchio di certificazione (NOM, CE, FCC) sul prodotto o nella scheda.",
      ja: "製品または商品ページで認証マーク（NOM、CE、FCC）を確認してください。"
    },
    norm_warranty_law_desc: {
      es: "La ley de tu país puede exigir una garantía mínima; pide la póliza.",
      en: "Your country's law may require a minimum warranty; ask for the warranty terms.",
      de: "Das Gesetz kann eine Mindestgarantie vorschreiben; verlange die Garantiebedingungen.",
      fr: "La loi peut imposer une garantie minimale ; demandez les conditions.",
      it: "La legge può prevedere una garanzia minima; chiedi le condizioni.",
      ja: "法律で最低保証が定められている場合があります。保証書を確認してください。"
    },
    norm_sport_desc: {
      es: "Revisa especificaciones (materiales, resistencia) en la ficha del producto.",
      en: "Check the specifications (materials, strength) in the listing.",
      de: "Prüfe die Angaben (Material, Belastbarkeit) auf der Produktseite.",
      fr: "Vérifiez les caractéristiques (matériaux, résistance) sur la fiche.",
      it: "Controlla le specifiche (materiali, resistenza) nella scheda.",
      ja: "商品ページで仕様（素材・強度）を確認してください。"
    },
    norm_gear_guarantee_desc: {
      es: "Pregunta por la garantía del fabricante contra defectos.",
      en: "Ask about the manufacturer's warranty against defects.",
      de: "Frage nach der Herstellergarantie gegen Mängel.",
      fr: "Renseignez-vous sur la garantie du fabricant contre les défauts.",
      it: "Chiedi della garanzia del produttore contro i difetti.",
      ja: "メーカーの欠陥保証を確認してください。"
    },
    norm_cleaning_desc: {
      es: "Lee las advertencias y el modo de uso del envase.",
      en: "Read the warnings and directions on the container.",
      de: "Lies Warnhinweise und Anwendung auf der Verpackung.",
      fr: "Lisez les avertissements et le mode d'emploi.",
      it: "Leggi avvertenze e modalità d'uso sulla confezione.",
      ja: "容器の注意書きと使用方法を読んでください。"
    },
    norm_general_desc: {
      es: "Tienes derechos como consumidor (información, garantía, devolución según la ley de tu país).",
      en: "You have consumer rights (information, warranty, returns under your country's law).",
      de: "Du hast Verbraucherrechte (Information, Garantie, Rückgabe nach Landesrecht).",
      fr: "Vous avez des droits de consommateur (information, garantie, retour selon la loi).",
      it: "Hai diritti come consumatore (informazione, garanzia, reso secondo la legge).",
      ja: "消費者としての権利があります（情報・保証・返品は国の法律に基づく）。"
    },
    norm_registered_brand_desc: {
      es: "Consulta quién es el dueño en la pestaña de propiedad.",
      en: "See who owns it in the ownership tab.",
      de: "Wem es gehört, steht im Eigentümer-Tab.",
      fr: "Voir le propriétaire dans l'onglet propriété.",
      it: "Vedi il proprietario nella scheda proprietà.",
      ja: "所有者は「所有」タブで確認できます。"
    },

    // Shopping Advice Tips
    rel_tip_high: {
      es: "💡 Lo vende la marca o la tienda directamente. Igual revisa la política de devolución en la página.",
      en: "💡 Sold by the brand or the store itself. Still check the return policy on the page.",
      de: "💡 Verkauf durch Marke oder Shop selbst. Prüfe trotzdem die Rückgabebedingungen.",
      fr: "💡 Vendu par la marque ou la boutique. Vérifiez tout de même la politique de retour.",
      it: "💡 Venduto dal marchio o dal negozio. Controlla comunque la politica di reso.",
      ja: "💡 ブランドまたはストアの直販です。返品ポリシーも確認してください。"
    },
    rel_tip_standard: {
      es: "💡 Vendedor con insignia o envío de la tienda. Revisa calificaciones y devolución antes de pagar.",
      en: "💡 Badged seller or store-fulfilled. Check ratings and returns before paying.",
      de: "💡 Verkäufer mit Abzeichen oder Versand durch den Shop. Prüfe Bewertungen und Rückgabe.",
      fr: "💡 Vendeur labellisé ou expédié par la boutique. Vérifiez avis et retours avant de payer.",
      it: "💡 Venditore con badge o spedito dal negozio. Controlla recensioni e resi prima di pagare.",
      ja: "💡 バッジ付き出品者またはストア発送です。支払い前に評価と返品を確認してください。"
    },
    rel_tip_check: {
      es: "⚠️ Vendedor externo o no identificado: revisa calificaciones, devoluciones y tiempos de entrega antes de pagar.",
      en: "⚠️ Third-party or unidentified seller: check ratings, returns and delivery times before paying.",
      de: "⚠️ Drittanbieter oder unbekannter Verkäufer: prüfe Bewertungen, Rückgabe und Lieferzeit.",
      fr: "⚠️ Vendeur tiers ou non identifié : vérifiez avis, retours et délais avant de payer.",
      it: "⚠️ Venditore terzo o non identificato: controlla recensioni, resi e tempi di consegna.",
      ja: "⚠️ 外部または不明な出品者です。支払い前に評価・返品・配送日数を確認してください。"
    },
    alt_saver_tip: {
      es: "💡 Compara precio y contenido en la tienda: Gina no compara precios.",
      en: "💡 Compare price and size at the store: Gina does not compare prices.",
      de: "💡 Vergleiche Preis und Menge im Shop: Gina vergleicht keine Preise.",
      fr: "💡 Comparez prix et contenance en boutique : Gina ne compare pas les prix.",
      it: "💡 Confronta prezzo e quantità nel negozio: Gina non confronta i prezzi.",
      ja: "💡 価格と内容量はストアで比較してください。Ginaは価格を比較しません。"
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
      es: "🏷️ Líneas económicas",
      en: "🏷️ Budget lines",
      de: "🏷️ Preiswerte Linien",
      fr: "🏷️ Gammes économiques",
      it: "🏷️ Linee economiche",
      ja: "🏷️ お手頃ライン"
    },
    alt_badge_budget: {
      es: "Línea económica",
      en: "Budget line",
      de: "Preiswerte Linie",
      fr: "Gamme économique",
      it: "Linea economica",
      ja: "お手頃ライン"
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

    // Confiabilidad Badges
    badge_direct_store: {
      es: "Tienda directa",
      en: "Direct store",
      de: "Direkter Shop",
      fr: "Boutique directe",
      it: "Negozio diretto",
      ja: "直営ストア"
    },
    badge_direct_sale: {
      es: "Venta directa",
      en: "Direct sale",
      de: "Direktverkauf",
      fr: "Vente directe",
      it: "Vendita diretta",
      ja: "直接販売"
    },
    badge_official_store: {
      es: "Tienda oficial",
      en: "Official store",
      de: "Offizieller Shop",
      fr: "Boutique officielle",
      it: "Negozio ufficiale",
      ja: "公式ストア"
    },
    badge_check: {
      es: "Revisar",
      en: "Review",
      de: "Prüfen",
      fr: "À vérifier",
      it: "Controllare",
      ja: "要確認"
    },
    badge_verified: {
      es: "Vendedor verificado",
      en: "Verified seller",
      de: "Verifizierter Verkäufer",
      fr: "Vendeur vérifié",
      it: "Venditore verificato",
      ja: "認証済み出品者"
    },

    // 1-Line Summaries
    summary_rel_direct: {
      es: "Tienda directa",
      en: "Direct store",
      de: "Direkter Shop",
      fr: "Boutique directe",
      it: "Negozio diretto",
      ja: "直営ストア"
    },
    summary_rel_fulfilled: {
      es: "Vendido y enviado por {store}",
      en: "Sold and shipped by {store}",
      de: "Verkauft und versandt von {store}",
      fr: "Vendu et expédié par {store}",
      it: "Venduto e spedito da {store}",
      ja: "{store}が販売・発送"
    },
    summary_rel_ext_intl: {
      es: "Vendedor externo · se envía desde {country}",
      en: "Third-party seller · ships from {country}",
      de: "Drittanbieter · Versand aus {country}",
      fr: "Vendeur tiers · expédié depuis {country}",
      it: "Venditore terzo · spedito da {country}",
      ja: "サードパーティ出品者 · {country}から発送"
    },
    summary_rel_ext: {
      es: "Vendedor externo",
      en: "Third-party seller",
      de: "Drittanbieter",
      fr: "Vendeur tiers",
      it: "Venditore terzo",
      ja: "サードパーティ出品者"
    },
    summary_mkt_one: { es: "1 alternativa local", en: "1 local alternative", de: "1 lokale Alternative", fr: "1 alternative locale", it: "1 alternativa locale", ja: "地域資本の代替案1件" },
    summary_mkt_count: {
      es: "{count} alternativas locales",
      en: "{count} local alternatives",
      de: "{count} lokale Alternativen",
      fr: "{count} alternatives locales",
      it: "{count} alternative locali",
      ja: "{count}件の地域資本の代替案"
    },
    summary_mkt_none: {
      es: "Sin alternativas locales todavía",
      en: "No local alternatives yet",
      de: "Noch keine lokalen Alternativen",
      fr: "Pas encore d'alternatives locales",
      it: "Nessuna alternativa locale ancora",
      ja: "地域資本の代替案はまだありません"
    },
    summary_own_unregistered: {
      es: "Aún no en la base de Gina",
      en: "Not yet in Gina database",
      de: "Noch nicht in der Gina-Datenbank",
      fr: "Pas encore dans la base Gina",
      it: "Non ancora nel database Gina",
      ja: "Ginaデータベース未登録"
    },

    // Provenance (Origins)
    src_page: {
      es: "Según la página",
      en: "According to the page",
      de: "Laut Webseite",
      fr: "Selon la page",
      it: "Secondo la pagina",
      ja: "商品ページの記載"
    },
    src_official: {
      es: "Dato oficial: {source}",
      en: "Official record: {source}",
      de: "Offizielle Angabe: {source}",
      fr: "Donnée officielle : {source}",
      it: "Dato ufficiale: {source}",
      ja: "公的情報：{source}"
    },
    src_unverified: {
      es: "Gina no lo verifica",
      en: "Gina does not verify this",
      de: "Gina prüft dies nicht",
      fr: "Gina ne le vérifie pas",
      it: "Gina non lo verifica",
      ja: "Ginaによる独自検証なし"
    },
    src_read_from: {
      es: "Leído de: {source}",
      en: "Read from: {source}",
      de: "Gelesen aus: {source}",
      fr: "Lu depuis : {source}",
      it: "Letto da: {source}",
      ja: "読み取り元：{source}"
    },

    // 3-Line Data Labels (Uppercase)
    lbl_seller: { es: "VENDEDOR", en: "SELLER", de: "VERKÄUFER", fr: "VENDEUR", it: "VENDITORE", ja: "販売元" },
    lbl_shipping: { es: "ENVÍO", en: "SHIPPING", de: "VERSAND", fr: "EXPÉDITION", it: "SPEDIZIONE", ja: "配送" },
    lbl_warranty: { es: "GARANTÍA Y DEVOLUCIÓN", en: "WARRANTY & RETURNS", de: "GARANTIE & RÜCKGABE", fr: "GARANTIE & RETOURS", it: "GARANZIA E RESI", ja: "保証・返品" },
    lbl_norms: { es: "NORMAS APLICABLES", en: "APPLICABLE STANDARDS", de: "ANWENDBARE NORMEN", fr: "NORMES APPLICABLES", it: "NORME APPLICABILI", ja: "適用基準" },
    lbl_controller: { es: "QUIÉN LA CONTROLA", en: "WHO CONTROLS IT", de: "WER ES KONTROLLIERT", fr: "QUI LA CONTRÔLE", it: "CHI LA CONTROLLA", ja: "実質的支配者" },
    lbl_funds: { es: "GRANDES FONDOS", en: "MAJOR FUNDS", de: "GROSSE FONDS", fr: "GRANDS FONDS", it: "GRANDI FONDI", ja: "主要ファンド" },
    lbl_gov: { es: "RELACIÓN CON GOBIERNOS", en: "GOVERNMENT TIES", de: "STAATSVERBINDUNGEN", fr: "LIENS AVEC L'ÉTAT", it: "LEGAMI CON IL GOVERNO", ja: "政府との関係" },
    lbl_store: { es: "TIENDA", en: "STORE", de: "SHOP", fr: "BOUTIQUE", it: "NEGOZIO", ja: "店舗" },
    lbl_reputation: { es: "REPUTACIÓN PÚBLICA", en: "PUBLIC REPUTATION", de: "ÖFFENTLICHE REPUTATION", fr: "RÉPUTATION PUBLIQUE", it: "REPUTAZIONE PUBBLICA", ja: "公的評価" },
    lbl_official_alerts: { es: "ALERTAS OFICIALES", en: "OFFICIAL ALERTS", de: "OFFIZIELLE WARNUNGEN", fr: "ALERTES OFFICIELLES", it: "ALLERTE UFFICIALI", ja: "公的警告" },
    lbl_other_brands: { es: "OTRAS MARCAS DEL MISMO DUEÑO", en: "OTHER BRANDS FROM SAME OWNER", de: "WEITERE MARKEN DESSELBEN EIGENTÜMERS", fr: "AUTRES MARQUES DU MÊME PROPRIÉTAIRE", it: "ALTRI MARCHI DELLO STESSO PROPRIETARIO", ja: "同一所有者の他のブランド" },
    lbl_category_dominance: { es: "OTRAS MARCAS DE ESTE TIPO EN LA BASE", en: "OTHER BRANDS OF THIS TYPE IN THE DATABASE", de: "WEITERE MARKEN DIESER ART IN DER DATENBANK", fr: "AUTRES MARQUES DE CE TYPE DANS LA BASE", it: "ALTRI MARCHI DI QUESTO TIPO NEL DATABASE", ja: "データベース内の同種ブランド" },
    values_alert_msg: {
      es: "Tema relevante para tus valores: {topics}",
      en: "Relevant topic to your values: {topics}",
      de: "Relevantes Thema für deine Werte: {topics}",
      fr: "Sujet pertinent selon vos valeurs : {topics}",
      it: "Tema rilevante per i tuoi valori: {topics}",
      ja: "あなたの価値観に関連する注意：{topics}"
    },
    lbl_product_notices: {
      es: "AVISOS DEL PRODUCTO",
      en: "PRODUCT NOTICES",
      de: "PRODUKTHINWEISE",
      fr: "AVIS SUR LE PRODUIT",
      it: "AVVISI SUL PRODOTTO",
      ja: "製品の通知"
    },
    badge_official_notice: {
      es: "Aviso oficial",
      en: "Official notice",
      de: "Offizieller Hinweis",
      fr: "Avis officiel",
      it: "Avviso ufficiale",
      ja: "公的通知"
    },
    notices_disclaimer: {
      es: "Información de autoridades y de la página. No es consejo médico.",
      en: "Information from authorities and the page. Not medical advice.",
      de: "Angaben von Behörden und der Website. Keine medizinische Beratung.",
      fr: "Informations des autorités et du site. Ne constitue pas un avis médical.",
      it: "Informazioni delle autorità e della pagina. Non è un parere medico.",
      ja: "当局およびページからの情報です。医療アドバイスではありません。"
    },
    lbl_nom051_title: {
      es: "Sellos de advertencia NOM-051",
      en: "NOM-051 warning stamps",
      de: "NOM-051 Warnhinweise",
      fr: "Sceaux d'avertissement NOM-051",
      it: "Sigilli di avvertimento NOM-051",
      ja: "NOM-051警告表示"
    },
    opt_chk_openfoodfacts: {
      es: "Consultar ingredientes en Open Food Facts por código de barras (opcional, base colaborativa ODbL)",
      en: "Check ingredients on Open Food Facts by barcode (optional, ODbL collaborative database)",
      de: "Zutaten auf Open Food Facts per Barcode prüfen (optional, ODbL-Kollaborationsdatenbank)",
      fr: "Vérifier les ingrédients sur Open Food Facts par code-barres (facultatif, base collaborative ODbL)",
      it: "Verifica gli ingredienti su Open Food Facts tramite codice a barre (opzionale, database collaborativo ODbL)",
      ja: "バーコードでOpen Food Factsの原材料を確認（任意、ODbL共同データベース）"
    },

    // Precio (según las visitas del usuario), MSI, otras tiendas, rastreadores y marcas propias
    price_1w: { es: "1 sem", en: "1 wk", de: "1 Wo", fr: "1 sem", it: "1 sett", ja: "1週間" },
    price_1m: { es: "1 mes", en: "1 mo", de: "1 Mo", fr: "1 mois", it: "1 mese", ja: "1ヶ月" },
    price_3m: { es: "3 meses", en: "3 mos", de: "3 Mo", fr: "3 mois", it: "3 mesi", ja: "3ヶ月" },
    price_visits_label: {
      es: "Según tus {n} visitas a este producto (guardado solo en tu navegador)",
      en: "Based on your {n} visits to this product (stored only in your browser)",
      de: "Basierend auf deinen {n} Besuchen dieses Produkts (nur in deinem Browser gespeichert)",
      fr: "D'après vos {n} visites de ce produit (enregistré uniquement dans votre navigateur)",
      it: "In base alle tue {n} visite a questo prodotto (salvato solo nel tuo browser)",
      ja: "この商品へのあなたの{n}回の訪問に基づく（ブラウザ内のみに保存）"
    },
    price_first_visit: {
      es: "Primera visita: Gina guarda el precio solo en tu navegador para compararlo en tus próximas visitas.",
      en: "First visit: Gina saves the price only in your browser to compare it on your next visits.",
      de: "Erster Besuch: Gina speichert den Preis nur in deinem Browser, um ihn bei späteren Besuchen zu vergleichen.",
      fr: "Première visite : Gina enregistre le prix uniquement dans votre navigateur pour le comparer lors de vos prochaines visites.",
      it: "Prima visita: Gina salva il prezzo solo nel tuo browser per confrontarlo nelle prossime visite.",
      ja: "初回訪問：次回以降の比較のため、価格をブラウザ内にのみ保存します。"
    },
    price_insufficient: { es: "Aún no hay suficientes visitas", en: "Not enough visits yet", de: "Noch nicht genug Besuche", fr: "Pas encore assez de visites", it: "Visite non ancora sufficienti", ja: "訪問回数がまだ不足" },
    price_above: { es: "▲ +{n}% sobre tu promedio", en: "▲ +{n}% above your average", de: "▲ +{n}% über deinem Durchschnitt", fr: "▲ +{n}% au-dessus de votre moyenne", it: "▲ +{n}% sopra la tua media", ja: "▲ 平均より+{n}%" },
    price_below: { es: "▼ −{n}% bajo tu promedio", en: "▼ −{n}% below your average", de: "▼ −{n}% unter deinem Durchschnitt", fr: "▼ −{n}% sous votre moyenne", it: "▼ −{n}% sotto la tua media", ja: "▼ 平均より−{n}%" },
    price_around: { es: "≈ En tu promedio ({n}%)", en: "≈ Around your average ({n}%)", de: "≈ Im Durchschnitt ({n}%)", fr: "≈ Dans votre moyenne ({n}%)", it: "≈ Nella tua media ({n}%)", ja: "≈ 平均並み（{n}%）" },
    price_history_off: {
      es: "Historial de precios desactivado (Opciones).",
      en: "Price history is turned off (Options).",
      de: "Preisverlauf ist deaktiviert (Optionen).",
      fr: "Historique des prix désactivé (Options).",
      it: "Cronologia prezzi disattivata (Opzioni).",
      ja: "価格履歴はオフです（オプション）。"
    },
    price_no_msi: {
      es: "La página no indica meses sin intereses",
      en: "The page does not state interest-free installments",
      de: "Die Seite nennt keine zinsfreie Ratenzahlung",
      fr: "La page n'indique pas de paiement en plusieurs fois sans frais",
      it: "La pagina non indica rate senza interessi",
      ja: "ページに無利息分割払いの記載なし"
    },
    price_msi_months: {
      es: "Hasta {n} meses sin intereses (según la tienda)",
      en: "Up to {n} interest-free installments (per the store)",
      de: "Bis zu {n} zinsfreie Raten (laut Shop)",
      fr: "Jusqu'à {n} mensualités sans frais (selon la boutique)",
      it: "Fino a {n} rate senza interessi (secondo il negozio)",
      ja: "最大{n}回無利息分割（ストア表示）"
    },
    price_msi_generic: {
      es: "Meses sin intereses disponibles (según la tienda)",
      en: "Interest-free installments available (per the store)",
      de: "Zinsfreie Ratenzahlung verfügbar (laut Shop)",
      fr: "Paiement sans frais disponible (selon la boutique)",
      it: "Rate senza interessi disponibili (secondo il negozio)",
      ja: "無利息分割あり（ストア表示）"
    },
    lbl_price: { es: "PRECIO EN ESTA PÁGINA", en: "PRICE ON THIS PAGE", de: "PREIS AUF DIESER SEITE", fr: "PRIX SUR CETTE PAGE", it: "PREZZO IN QUESTA PAGINA", ja: "このページの価格" },
    lbl_rating: { es: "CALIFICACIÓN DE LA TIENDA", en: "STORE RATING", de: "SHOP-BEWERTUNG", fr: "NOTE DE LA BOUTIQUE", it: "VALUTAZIONE DEL NEGOZIO", ja: "ストア評価" },
    lbl_in_other_stores: {
      es: "EN OTRAS TIENDAS",
      en: "IN OTHER STORES",
      de: "IN ANDEREN SHOPS",
      fr: "DANS D'AUTRES BOUTIQUES",
      it: "IN ALTRI NEGOZI",
      ja: "他のストアで"
    },
    compare_same_product: {
      es: "Mismo producto",
      en: "Same product",
      de: "Gleiches Produkt",
      fr: "Même produit",
      it: "Stesso prodotto",
      ja: "同一商品"
    },
    compare_badge_cheapest: {
      es: "El más barato que encontramos",
      en: "Cheapest found",
      de: "Günstigstes Angebot",
      fr: "Le moins cher trouvé",
      it: "Il più economico trovato",
      ja: "最安値"
    },
    compare_similar_product: {
      es: "Parecidos",
      en: "Similar products",
      de: "Ähnliche Produkte",
      fr: "Produits similaires",
      it: "Prodotti simili",
      ja: "類似商品"
    },
    compare_similar_notice: {
      es: "Parecido, revisa el modelo",
      en: "Similar, check model",
      de: "Ähnlich, Modell prüfen",
      fr: "Similaire, vérifier modèle",
      it: "Simile, controlla modello",
      ja: "類似品、型番を確認してください"
    },
    compare_read_mins_ago: {
      es: "leído hace {n} min",
      en: "read {n} min ago",
      de: "vor {n} Min. gelesen",
      fr: "lu il y a {n} min",
      it: "letto {n} min fa",
      ja: "{n}分前に取得"
    },
    compare_no_matches: {
      es: "No encontramos este producto en otras tiendas",
      en: "We did not find this product in other stores",
      de: "Keine Angebote in anderen Shops gefunden",
      fr: "Aucun produit trouvé dans d'autres boutiques",
      it: "Nessun prodotto trovato in altri negozi",
      ja: "他のストアではこの商品が見つかりませんでした"
    },
    compare_btn_activate: {
      es: "Ver este producto en otras tiendas",
      en: "See this product in other stores",
      de: "Dieses Produkt in anderen Shops ansehen",
      fr: "Voir ce produit dans d'autres boutiques",
      it: "Vedi questo prodotto in altri negozi",
      ja: "他のストアでこの商品を見る"
    },
    compare_consent_desc: {
      es: "Consulta el precio en tiendas locales directamente aquí, sin cookies ni salir de la página.",
      en: "Check prices at local stores right here, with no cookies and without leaving the page.",
      de: "Preise lokaler Shops direkt hier prüfen, ohne Cookies und ohne die Seite zu verlassen.",
      fr: "Consultez les prix des boutiques locales directement ici, sans cookies et sans quitter la page.",
      it: "Controlla i prezzi nei negozi locali direttamente qui, senza cookie e senza lasciare la pagina.",
      ja: "クッキーなしで、ページを離れずに他のストアの価格を直接確認できます。"
    },
    compare_consent_opened: {
      es: "Se abrió una pestaña de Gina para que des el permiso. Al aceptarlo, la comparación aparece aquí.",
      en: "A Gina tab opened so you can grant permission. Once you accept, the comparison appears here.",
      de: "Ein Gina-Tab wurde geöffnet, um die Berechtigung zu erteilen. Danach erscheint der Vergleich hier.",
      fr: "Un onglet Gina s'est ouvert pour accorder l'autorisation. Une fois acceptée, la comparaison apparaît ici.",
      it: "Si è aperta una scheda di Gina per concedere il permesso. Dopo averlo accettato, il confronto appare qui.",
      ja: "許可のためのGinaタブを開きました。許可すると、ここに比較が表示されます。"
    },
    cmp_page_title: {
      es: "Gina: comparar en otras tiendas",
      en: "Gina: compare in other stores",
      de: "Gina: in anderen Shops vergleichen",
      fr: "Gina : comparer dans d'autres boutiques",
      it: "Gina: confronta in altri negozi",
      ja: "Gina：他のストアで比較"
    },
    cmp_page_stores: {
      es: "Tiendas que Gina consultará ({pais}):",
      en: "Stores Gina will check ({pais}):",
      de: "Shops, die Gina abfragt ({pais}):",
      fr: "Boutiques que Gina consultera ({pais}) :",
      it: "Negozi che Gina consulterà ({pais}):",
      ja: "Ginaが確認するストア（{pais}）："
    },
    cmp_page_privacy: {
      es: "La consulta sale de tu navegador, sin cookies ni sesión. La tienda ve la búsqueda (marca y modelo), no quién eres. Puedes apagarlo en Opciones.",
      en: "The request leaves your browser with no cookies or session. The store sees the search (brand and model), not who you are. You can turn it off in Options.",
      de: "Die Anfrage geht ohne Cookies oder Sitzung von deinem Browser aus. Der Shop sieht die Suche (Marke und Modell), nicht dich. In den Optionen abschaltbar.",
      fr: "La requête part de ton navigateur, sans cookies ni session. La boutique voit la recherche (marque et modèle), pas qui tu es. Désactivable dans les Options.",
      it: "La richiesta parte dal tuo browser, senza cookie né sessione. Il negozio vede la ricerca (marca e modello), non chi sei. Puoi disattivarlo nelle Opzioni.",
      ja: "リクエストはクッキーやセッションなしでブラウザから送信されます。ストアに見えるのは検索（ブランドと型番）だけで、あなたが誰かは分かりません。オプションでオフにできます。"
    },
    cmp_page_allow: {
      es: "Permitir y comparar",
      en: "Allow and compare",
      de: "Erlauben und vergleichen",
      fr: "Autoriser et comparer",
      it: "Consenti e confronta",
      ja: "許可して比較する"
    },
    cmp_page_done: {
      es: "Listo. Regresa a la tienda: la comparación ya aparece en la tarjeta.",
      en: "Done. Go back to the store: the comparison now appears in the card.",
      de: "Fertig. Zurück zum Shop: Der Vergleich erscheint jetzt in der Karte.",
      fr: "C'est fait. Reviens à la boutique : la comparaison apparaît dans la carte.",
      it: "Fatto. Torna al negozio: il confronto ora appare nella scheda.",
      ja: "完了しました。ストアに戻ると、カードに比較が表示されます。"
    },
    cmp_page_denied: {
      es: "No se concedió el permiso. Gina no consultará otras tiendas.",
      en: "Permission was not granted. Gina will not check other stores.",
      de: "Berechtigung nicht erteilt. Gina fragt keine anderen Shops ab.",
      fr: "Autorisation refusée. Gina ne consultera pas d'autres boutiques.",
      it: "Permesso non concesso. Gina non consulterà altri negozi.",
      ja: "許可されませんでした。Ginaは他のストアを確認しません。"
    },
    cmp_page_none: {
      es: "No hay tiendas de comparación para este país.",
      en: "There are no comparison stores for this country.",
      de: "Für dieses Land gibt es keine Vergleichsshops.",
      fr: "Aucune boutique de comparaison pour ce pays.",
      it: "Nessun negozio di confronto per questo paese.",
      ja: "この国には比較対象のストアがありません。"
    },
    compare_cant_read: {
      es: "No pudimos leer: {store}",
      en: "Could not read: {store}",
      de: "Konnte nicht gelesen werden: {store}",
      fr: "Impossible de lire : {store}",
      it: "Impossibile leggere: {store}",
      ja: "読み込めませんでした: {store}"
    },
    lbl_price_trackers: { es: "HISTORIAL REAL DE PRECIOS (SITIOS EXTERNOS)", en: "REAL PRICE HISTORY (EXTERNAL SITES)", de: "ECHTER PREISVERLAUF (EXTERNE SEITEN)", fr: "HISTORIQUE RÉEL DES PRIX (SITES EXTERNES)", it: "STORICO REALE DEI PREZZI (SITI ESTERNI)", ja: "実際の価格履歴（外部サイト）" },
    keepa_btn: {
      es: "Seguir precio en Keepa",
      en: "Track price on Keepa",
      de: "Preis auf Keepa verfolgen",
      fr: "Suivre le prix sur Keepa",
      it: "Traccia il prezzo su Keepa",
      ja: "Keepaで価格を追跡"
    },
    keepa_target_label: {
      es: "Precio objetivo sugerido",
      en: "Suggested target price",
      de: "Vorgeschlagener Zielpreis",
      fr: "Prix cible suggéré",
      it: "Prezzo target suggerito",
      ja: "推奨目標価格"
    },
    keepa_account_notice: {
      es: "Keepa te pedirá una cuenta gratuita para enviarte la alerta por correo o Telegram.",
      en: "Keepa will ask for a free account to send you alerts via email or Telegram.",
      de: "Keepa benötigt ein kostenloses Konto, um Benachrichtigungen per E-Mail oder Telegram zu senden.",
      fr: "Keepa demandera un compte gratuit pour vous envoyer des alertes par e-mail ou Telegram.",
      it: "Keepa richiederà un account gratuito per inviarti avvisi via email o Telegram.",
      ja: "KeepaはメールまたはTelegramで通知を送信するために無料アカウントを要求します。"
    },
    btn_follow_price: {
      es: "Seguir precio",
      en: "Track price",
      de: "Preis verfolgen",
      fr: "Suivre le prix",
      it: "Traccia prezzo",
      ja: "価格を追跡"
    },
    btn_copy: {
      es: "Copiar",
      en: "Copy",
      de: "Kopieren",
      fr: "Copier",
      it: "Copia",
      ja: "コピー"
    },
    rel_discount_line: { es: "¿Descuento real? {txt} en el último mes.", en: "Real discount? {txt} over the last month.", de: "Echter Rabatt? {txt} im letzten Monat.", fr: "Vraie remise ? {txt} sur le dernier mois.", it: "Sconto reale? {txt} nell'ultimo mese.", ja: "本当の割引？過去1か月で{txt}。" },
    rel_discount_unknown: {
      es: "¿Descuento real? Aún no hay suficientes visitas tuyas para saberlo.",
      en: "Real discount? Not enough of your visits yet to tell.",
      de: "Echter Rabatt? Noch nicht genug Besuche, um es zu sagen.",
      fr: "Vraie remise ? Pas encore assez de visites pour le dire.",
      it: "Sconto reale? Non ci sono ancora abbastanza visite per dirlo.",
      ja: "本当の割引？判断するにはまだ訪問回数が足りません。"
    },
    lbl_store_brands: { es: "MARCAS PROPIAS DE CADENAS EN ESTA CATEGORÍA", en: "STORE BRANDS IN THIS CATEGORY", de: "EIGENMARKEN IN DIESER KATEGORIE", fr: "MARQUES DE DISTRIBUTEUR DANS CETTE CATÉGORIE", it: "MARCHI DEL DISTRIBUTORE IN QUESTA CATEGORIA", ja: "このカテゴリーのプライベートブランド" },
    store_brands_note: {
      es: "El dueño es la cadena; el fabricante no suele publicarse. Gina no compara precio ni calidad.",
      en: "The owner is the retail chain; the manufacturer is usually not disclosed. Gina does not compare price or quality.",
      de: "Eigentümer ist die Handelskette; der Hersteller wird meist nicht genannt. Gina vergleicht weder Preis noch Qualität.",
      fr: "Le propriétaire est l'enseigne ; le fabricant n'est généralement pas publié. Gina ne compare ni prix ni qualité.",
      it: "Il proprietario è la catena; il produttore di solito non è reso noto. Gina non confronta prezzo né qualità.",
      ja: "所有者は小売チェーンで、製造元は通常公表されません。Ginaは価格や品質を比較しません。"
    },
    alt_badge_local_indep: {
      es: "Local / Independiente",
      en: "Local / Independent",
      de: "Lokal / Unabhängig",
      fr: "Local / Indépendant",
      it: "Locale / Indipendente",
      ja: "地域 / 独立系"
    },
    pref_price_history: {
      es: "Guardar historial de precios en este navegador",
      en: "Save price history in this browser",
      de: "Preisverlauf in diesem Browser speichern",
      fr: "Enregistrer l'historique des prix dans ce navigateur",
      it: "Salva la cronologia dei prezzi in questo browser",
      ja: "このブラウザに価格履歴を保存する"
    },
    pref_price_history_desc: {
      es: "Guarda el identificador del producto (ASIN, MLM, código de barras) y su precio, máximo 300 productos y 90 días. Nunca sale de tu navegador.",
      en: "Stores the product ID (ASIN, MLM, barcode) and its price, up to 300 products and 90 days. It never leaves your browser.",
      de: "Speichert die Produkt-ID (ASIN, MLM, Barcode) und den Preis, höchstens 300 Produkte und 90 Tage. Verlässt nie deinen Browser.",
      fr: "Enregistre l'identifiant du produit (ASIN, MLM, code-barres) et son prix, 300 produits et 90 jours au maximum. Ne quitte jamais votre navigateur.",
      it: "Salva l'identificativo del prodotto (ASIN, MLM, codice a barre) e il prezzo, massimo 300 prodotti e 90 giorni. Non lascia mai il tuo browser.",
      ja: "商品ID（ASIN、MLM、バーコード）と価格を最大300商品・90日間保存します。ブラウザの外には送信されません。"
    },
    btn_clear_price_history: { es: "Borrar historial de precios", en: "Clear price history", de: "Preisverlauf löschen", fr: "Effacer l'historique des prix", it: "Cancella cronologia prezzi", ja: "価格履歴を削除" },
    price_history_cleared: { es: "Historial de precios borrado.", en: "Price history cleared.", de: "Preisverlauf gelöscht.", fr: "Historique des prix effacé.", it: "Cronologia prezzi cancellata.", ja: "価格履歴を削除しました。" },
    base_stale: {
      es: "Base del {fecha}: puede haber datos desactualizados.",
      en: "Database from {fecha}: some data may be out of date.",
      de: "Datenbank vom {fecha}: Daten könnten veraltet sein.",
      fr: "Base du {fecha} : certaines données peuvent être obsolètes.",
      it: "Database del {fecha}: alcuni dati potrebbero non essere aggiornati.",
      ja: "{fecha}時点のデータ：古い情報が含まれる可能性があります。"
    },

    // Footer
    foot_disclaimer: {
      es: "Orientativo, con fuentes públicas. No es recomendación de compra.",
      en: "Orientational, based on public sources. Not a purchase recommendation.",
      de: "Orientierend, aus öffentlichen Quellen. Keine Kaufempfehlung.",
      fr: "Indicatif, sources publiques. Pas une recommandation d'achat.",
      it: "Orientativo, da fonti pubbliche. Non è un consiglio di acquisto.",
      ja: "公開情報に基づく参考情報です。購入推奨ではありません。"
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
    },

    // Options page UI
    opt_page_title: {
      es: "Gina — tus valores y opciones",
      en: "Gina — your values and settings",
      de: "Gina — deine Werte und Einstellungen",
      fr: "Gina — vos valeurs et paramètres",
      it: "Gina — i tuoi valori e impostazioni",
      ja: "Gina — あなたの価値観と設定"
    },
    opt_header_title: {
      es: "Gina — tus valores y opciones",
      en: "Gina — your values and settings",
      de: "Gina — deine Werte und Einstellungen",
      fr: "Gina — vos valeurs et paramètres",
      it: "Gina — i tuoi valori e impostazioni",
      ja: "Gina — あなたの価値観と設定"
    },
    opt_header_desc: {
      es: "Gina te muestra a quién apoya tu dinero: quién es dueño de cada marca, su historial público y su lobbying, para que cada compra vaya a donde tú quieras. Así decide quién es el dueño: <b>1)</b> tus marcas → <b>2)</b> marcas verificadas por la investigación → <b>3)</b> base (local o remota) → <b>4)</b> caché de IA → <b>5)</b> consulta en vivo al modelo pequeño. Lo que no se sabe queda en <b>pendientes</b> para el job semanal.",
      en: "Gina shows who your money backs: who owns each brand, their public record, and their lobbying, so every purchase goes where you choose. How it determines ownership: <b>1)</b> your custom brands → <b>2)</b> research-verified brands → <b>3)</b> base catalog (local or remote) → <b>4)</b> AI cache → <b>5)</b> live query to small model. What remains unknown is saved to <b>pending</b> for the weekly job.",
      de: "Gina zeigt dir, wen dein Geld unterstützt: wem jede Marke gehört, deren öffentliche Vorgeschichte und Lobbying, damit jeder Einkauf dorthin fließt, wo du möchtest. So wird der Eigentümer ermittelt: <b>1)</b> deine Marken → <b>2)</b> durch Recherche verifizierte Marken → <b>3)</b> Basisdaten (lokal oder remote) → <b>4)</b> KI-Cache → <b>5)</b> Live-Abfrage an das kleine Modell. Unbekanntes verbleibt in <b>ausstehend</b> für den wöchentlichen Job.",
      fr: "Gina vous montre qui votre argent soutient : qui possède chaque marque, son historique public et son lobbying, pour que chaque achat aille là où vous le décidez. Détermination du propriétaire : <b>1)</b> vos marques → <b>2)</b> marques vérifiées par recherche → <b>3)</b> base (locale ou distante) → <b>4)</b> cache IA → <b>5)</b> requête directe au petit modèle. Les inconnues restent en <b>attente</b> pour la recherche hebdomadaire.",
      it: "Gina ti mostra chi sostiene il tuo denaro: chi possiede ogni marchio, la sua reputazione pubblica e il lobbying, così ogni acquisto va dove preferisci. Come determina il proprietario: <b>1)</b> i tuoi marchi → <b>2)</b> marchi verificati dalla ricerca → <b>3)</b> database (locale o remoto) → <b>4)</b> cache IA → <b>5)</b> interrogazione diretta al modello leggero. Ciò che non è noto resta in <b>in sospeso</b> per il lavoro settimanale.",
      ja: "Ginaはあなたの支出が誰を支えているかを可視化します：各ブランドの所有者、公的記録、ロビー活動。所有者の判定順：<b>1)</b> カスタム登録 → <b>2)</b> 調査で検証済みのブランド → <b>3)</b> ベースDB（ローカルまたはリモート） → <b>4)</b> AIキャッシュ → <b>5)</b> 小型モデルへの即時照会。未判定のものは週次ジョブ用の<b>保留中</b>に記録されます。"
    },
    opt_language: {
      es: "Idioma",
      en: "Language",
      de: "Sprache",
      fr: "Langue",
      it: "Lingua",
      ja: "言語"
    },
    opt_sec_profile: {
      es: "Tu perfil de compra",
      en: "Your shopping profile",
      de: "Dein Einkaufsprofil",
      fr: "Votre profil d'achat",
      it: "Il tuo profilo di acquisto",
      ja: "あなたの購入プロフィール"
    },
    opt_tag_profile: {
      es: "qué sección abre primero",
      en: "which section opens first",
      de: "welcher Bereich zuerst öffnet",
      fr: "quelle section s'ouvre en premier",
      it: "quale sezione si apre per prima",
      ja: "最初に開くセクション"
    },
    opt_help_profile: {
      es: "Esto solo elige qué sección ves primero. No oculta nada; siempre puedes tocar cualquier sección para verla.",
      en: "This only chooses which section opens first. It does not hide anything; you can always tap any section to view it.",
      de: "Dies bestimmt nur, welcher Bereich zuerst geöffnet ist. Es blendet nichts aus; du kannst jederzeit jeden Bereich anklicken.",
      fr: "Ceci choisit uniquement la section qui s'ouvre en premier. Rien n'est masqué ; vous pouvez toujours cliquer sur n'importe quelle section.",
      it: "Questo decide solo quale sezione si apre per prima. Non nasconde nulla; puoi sempre cliccare su qualsiasi sezione per vederla.",
      ja: "最初にどのセクションを開くかを設定します。情報は何も隠されず、いつでも各セクションをタップして確認できます。"
    },
    prof_opt_none: {
      es: "Ninguno (por defecto)",
      en: "None (default)",
      de: "Keines (Standard)",
      fr: "Aucun (par défaut)",
      it: "Nessuno (predefinito)",
      ja: "指定なし（デフォルト）"
    },
    prof_desc_none: {
      es: "La tarjeta empieza cerrada y compacta. Tú decides qué sección abrir cuando te interese.",
      en: "The card starts closed and compact. You decide which section to open when interested.",
      de: "Die Karte startet geschlossen und kompakt. Du entscheidest, welcher Bereich dich interessiert.",
      fr: "La fiche commence fermée et compacte. Vous choisissez quand ouvrir une section.",
      it: "La scheda parte chiusa e compatta. Decidi tu quale sezione aprire quando ti interessa.",
      ja: "カードは閉じたコンパクトな状態で表示されます。必要なときにセクションを開きます。"
    },
    prof_opt_smart: {
      es: "Consumidor inteligente",
      en: "Smart shopper",
      de: "Kluger Käufer",
      fr: "Consommateur malin",
      it: "Consumatore intelligente",
      ja: "スマート消費者"
    },
    prof_desc_smart: {
      es: "Abre primero «Confiabilidad de compra» (vendedor directo o externo, garantías legales y normas aplicables).",
      en: "Opens “Purchase Reliability” first (direct or third-party seller, legal warranty, and applicable standards).",
      de: "Öffnet zuerst „Kaufsicherheit“ (Direkt- oder Drittanbieter, gesetzliche Gewährleistung und anwendbare Normen).",
      fr: "Ouvre d'abord « Fiabilité d'achat » (vendeur direct ou tiers, garanties légales et normes applicables).",
      it: "Apre prima «Affidabilità dell'acquisto» (venditore diretto o terzo, garanzie legali e norme applicabili).",
      ja: "「購入の信頼性」（直接・外部出品者、法定保証、適用基準）を最初に開きます。"
    },
    prof_opt_saver: {
      es: "Consumidor ahorrador",
      en: "Value shopper",
      de: "Sparbewusster Käufer",
      fr: "Consommateur économe",
      it: "Consumatore attento al risparmio",
      ja: "節約志向の消費者"
    },
    prof_desc_saver: {
      es: "Abre primero «Mercado y alternativas» (marcas del mismo grupo y alternativas con dueño local o línea económica).",
      en: "Opens “Market and alternatives” first (same-owner brands and local or budget alternatives).",
      de: "Öffnet zuerst „Markt und Alternativen“ (Marken desselben Eigentümers und lokale oder preiswerte Alternativen).",
      fr: "Ouvre d'abord « Marché et alternatives » (marques du même groupe et alternatives locales ou économiques).",
      it: "Apre prima «Mercato e alternative» (marchi dello stesso gruppo e alternative locali o economiche).",
      ja: "「市場と代替案」（同一所有者の他ブランド、地域資本やお手頃ラインの選択肢）を最初に開きます。"
    },
    prof_opt_conscious: {
      es: "Consumidor consciente",
      en: "Conscious shopper",
      de: "Bewusster Käufer",
      fr: "Consommateur engagé",
      it: "Consumatore consapevole",
      ja: "エシカル消費者"
    },
    prof_desc_conscious: {
      es: "Abre primero «¿A quién le compras?» (controlador, tipo de dueño, país del capital y reputación pública).",
      en: "Opens “Who are you buying from?” first (controlling entity, owner type, capital origin, and public reputation).",
      de: "Öffnet zuerst „Von wem kaufst du?“ (Kontrollierende Einheit, Eigentümertyp, Kapitalland und öffentliche Reputation).",
      fr: "Ouvre d'abord « À qui achetez-vous ? » (contrôleur, type de propriétaire, pays du capital et réputation publique).",
      it: "Apre prima «A chi compri?» (soggetto controllante, tipo di proprietà, paese del capitale e reputazione pubblica).",
      ja: "「実質的に誰から買っていますか？」（実質支配者、所有形態、資本国、公的評価）を最初に開きます。"
    },
    msg_profile_saved: {
      es: "Perfil guardado. Las tarjetas se abrirán según tu preferencia.",
      en: "Profile saved. Cards will open according to your preference.",
      de: "Profil gespeichert. Die Karten öffnen sich nun nach deiner Präferenz.",
      fr: "Profil enregistré. Les fiches s'ouvriront selon votre préférence.",
      it: "Profilo salvato. Le schede si apriranno in base alla tua preferenza.",
      ja: "プロフィールを保存しました。カードは設定に合わせて開きます。"
    },
    opt_sec_values: {
      es: "Tus valores",
      en: "Your values",
      de: "Deine Werte",
      fr: "Vos valeurs",
      it: "I tuoi valori",
      ja: "あなたの価値観"
    },
    opt_tag_instant: {
      es: "se guardan al momento",
      en: "saved instantly",
      de: "sofort gespeichert",
      fr: "enregistré instantanément",
      it: "salvati all'istante",
      ja: "即時保存"
    },
    opt_help_values: {
      es: "Elige qué temas te importan. Cada tarjeta muestra el <b>índice de reputación</b> (igual para todos: resume solo hechos públicos con fuente) y, además, <b>qué tan alineada está con tus valores</b>. Si un tema es «Muy importante», Gina te avisa cuando la empresa tiene multas, acuerdos o condenas recientes en ese tema.",
      en: "Choose which topics matter to you. Each card shows the <b>reputation index</b> (identical for everyone: summarizes sourced public records) plus <b>how aligned it is with your values</b>. If a topic is “Very important”, Gina alerts you when the company has recent fines, settlements, or convictions in that area.",
      de: "Wähle Themen, die dir wichtig sind. Jede Karte zeigt den <b>Reputationsindex</b> (für alle gleich: belegte öffentliche Fakten) und <b>wie gut sie zu deinen Werten passt</b>. Bei „Sehr wichtig“ warnt Gina bei aktuellen Bußgeldern, Vergleichen oder Verurteilungen.",
      fr: "Choisissez les thèmes qui vous importent. Chaque fiche affiche <b>l'indice de réputation</b> (identique pour tous : faits publics vérifiés) et <b>son alignement avec vos valeurs</b>. Si un sujet est « Très important », Gina vous alerte en cas d'amende, d'accord ou de condamnation récente.",
      it: "Scegli i temi che ti stanno a cuore. Ogni scheda mostra <b>l'indice di reputazione</b> (uguale per tutti: riassume fatti pubblici documentati) e <b>la conformità ai tuoi valori</b>. Se un tema è «Molto importante», Gina ti avvisa di recenti sanzioni, accordi o condanne.",
      ja: "関心のあるテーマを選択してください。各カードには<b>評価指数</b>（出典付き公的記録の客観的要約）と<b>あなたの価値観との一致度</b>が表示されます。「非常に重要」に設定したテーマで最近の罰金や判決がある場合、Ginaが警告を表示します。"
    },
    opt_val_0: {
      es: "No me importa",
      en: "Not important",
      de: "Nicht wichtig",
      fr: "Pas important",
      it: "Non mi interessa",
      ja: "関心なし"
    },
    opt_val_1: {
      es: "Normal",
      en: "Normal",
      de: "Normal",
      fr: "Normal",
      it: "Normale",
      ja: "普通"
    },
    opt_val_2: {
      es: "Muy importante",
      en: "Very important",
      de: "Sehr wichtig",
      fr: "Très important",
      it: "Molto importante",
      ja: "非常に重要"
    },
    opt_chk_lobbying: {
      es: "Mostrar el lobbying y las donaciones políticas declaradas (dato público, sin etiquetas ideológicas)",
      en: "Show declared lobbying and political donations (public record, non-ideological)",
      de: "Offizielles Lobbying und Parteispenden anzeigen (öffentliche Angabe, neutral)",
      fr: "Afficher le lobbying et les dons politiques déclarés (données publiques, neutres)",
      it: "Mostra lobbying e donazioni politiche dichiarate (dato pubblico, neutrale)",
      ja: "公式に申告されたロビー活動・政治献金を表示（客観的な公的データ）"
    },
    opt_chk_alternatives: {
      es: "Sugerir alternativas con dueño local (cooperativas, de empleados, familiares) para el tipo de producto que ves",
      en: "Suggest locally owned alternatives (co-ops, employee-owned, family-owned) for the product you view",
      de: "Lokale Alternativen vorschlagen (Genossenschaften, Mitarbeiter- oder Familienbetriebe)",
      fr: "Suggérer des alternatives locales (coopératives, salariés, familiales) pour le produit consulté",
      it: "Suggerisci alternative a proprietà locale (cooperative, dipendenti, familiari) per il prodotto visualizzato",
      ja: "閲覧中の商品に対して地域資本の代替案（協同組合・従業員所有・同族企業）を提案"
    },
    opt_chk_compare_enabled: {
      es: "Comparar en otras tiendas",
      en: "Compare in other stores",
      de: "In anderen Shops vergleichen",
      fr: "Comparer dans d'autres boutiques",
      it: "Confronta in altri negozi",
      ja: "他のストアと比較"
    },
    opt_help_compare: {
      es: "Busca el mismo producto o parecidos en tiendas locales y muestra los precios en la tarjeta sin salir de la página.",
      en: "Searches for the same or similar products in local stores and shows prices in the card without leaving the page.",
      de: "Sucht nach demselben oder ähnlichen Produkten in lokalen Shops und zeigt Preise in der Karte an, ohne die Seite zu verlassen.",
      fr: "Recherche le même produit ou des équivalents dans les boutiques locales et affiche les prix dans la fiche sans quitter la page.",
      it: "Cerca lo stesso prodotto o simili nei negozi locali e mostra i prezzi nella scheda senza lasciare la pagina.",
      ja: "同一商品または類似品を他のストアで検索し、ページを離れずにカード内に価格を表示します。"
    },
    msg_values_saved: {
      es: "Guardado. Las tarjetas ya usan tus valores.",
      en: "Saved. Cards are now aligned with your values.",
      de: "Gespeichert. Karten nutzen jetzt deine Werte.",
      fr: "Enregistré. Les fiches utilisent vos valeurs.",
      it: "Salvato. Le schede ora usano i tuoi valori.",
      ja: "保存完了。カードにあなたの価値観が反映されます。"
    },
    opt_sec_project: {
      es: "Base del proyecto",
      en: "Project database",
      de: "Projektdatenbank",
      fr: "Base du projet",
      it: "Database del progetto",
      ja: "プロジェクトデータベース"
    },
    opt_tag_free: {
      es: "gratis, sin claves",
      en: "free, no keys required",
      de: "kostenlos, ohne API-Key",
      fr: "gratuit, sans clés",
      it: "gratuito, senza chiavi",
      ja: "完全無料・APIキー不要"
    },
    opt_help_project: {
      es: "Gina funciona sin cuenta ni clave de IA. La base de dueños, reputación y alternativas la mantiene <b id=\"projName\">Project Gina</b>: una investigación automática la actualiza cada una o dos semanas y tu navegador la descarga sola, sin enviar nada tuyo.",
      en: "Gina works without accounts or AI keys. The database of owners, reputation, and alternatives is maintained by <b id=\"projName\">Project Gina</b>: automated research updates it every 1–2 weeks and your browser downloads it automatically without sending personal data.",
      de: "Gina funktioniert ohne Konto oder KI-Schlüssel. Die Datenbank für Eigentümer, Reputation und Alternativen wird von <b id=\"projName\">Project Gina</b> gepflegt: Eine automatisierte Recherche aktualisiert sie alle 1–2 Wochen, und dein Browser lädt sie herunter, ohne private Daten zu übertragen.",
      fr: "Gina fonctionne sans compte ni clé IA. La base de propriétaires, réputation et alternatives est gérée par <b id=\"projName\">Project Gina</b> : une recherche automatisée la met à jour toutes les 1–2 semaines et votre navigateur la télécharge sans envoyer vos données.",
      it: "Gina funziona senza account né chiavi IA. Il database di proprietari, reputazione e alternative è curato da <b id=\"projName\">Project Gina</b>: una ricerca automatica lo aggiorna ogni 1-2 settimane e il browser lo scarica senza inviare dati personali.",
      ja: "GinaはアカウントやAIキーなしで動作します。所有者・公的評価・代替案のデータベースは<b id=\"projName\">Project Gina</b>によって維持され、定期的な自動調査により更新され、個人情報を送信することなくブラウザに自動同期されます。"
    },
    opt_btn_suggest_pending: {
      es: "💡 Sugerir al proyecto las marcas que no encontró Gina",
      en: "💡 Suggest missing brands to the project",
      de: "💡 Fehlende Marken an das Projekt melden",
      fr: "💡 Suggérer au projet les marques introuvables",
      it: "💡 Suggerisci al progetto i marchi non trovati",
      ja: "💡 未登録ブランドをプロジェクトに提案"
    },
    proj_status_no_repo: {
      es: "Esta copia no tiene configurado el repositorio del proyecto: la base se actualiza solo con nuevas versiones de la extensión.",
      en: "No project repository configured in this build: database updates only via extension releases.",
      de: "Kein Repository konfiguriert: Updates nur über neue Erweiterungsversionen.",
      fr: "Aucun dépôt configuré : base mise à jour uniquement via les versions de l'extension.",
      it: "Nessun repository configurato: aggiornamento solo con nuove versioni dell'estensione.",
      ja: "リポジトリが設定されていません。拡張機能のアップデート時のみ更新されます。"
    },
    proj_status_fetched: {
      es: "Base del proyecto descargada: {date} · versión {version}.",
      en: "Project database downloaded: {date} · version {version}.",
      de: "Projektdatenbank heruntergeladen: {date} · Version {version}.",
      fr: "Base du projet téléchargée : {date} · version {version}.",
      it: "Database scaricato: {date} · versione {version}.",
      ja: "プロジェクトDBダウンロード完了：{date} · バージョン {version}。"
    },
    proj_status_err: {
      es: "No se pudo descargar la base del proyecto ({err}); se reintentará.",
      en: "Could not download project database ({err}); will retry.",
      de: "Projektdatenbank konnte nicht geladen werden ({err}); erneuter Versuch folgt.",
      fr: "Impossible de télécharger la base ({err}) ; nouvelle tentative prévue.",
      it: "Impossibile scaricare il database ({err}); nuovo tentativo in corso.",
      ja: "プロジェクトDBをダウンロードできませんでした（{err}）。再試行します。"
    },
    proj_status_queued: {
      es: "La base del proyecto se descargará en el próximo minuto o al abrir el navegador.",
      en: "Project database will download in the next minute or on browser startup.",
      de: "Projektdatenbank wird in Kürze oder beim nächsten Browserstart heruntergeladen.",
      fr: "La base sera téléchargée dans la minute ou au démarrage du navigateur.",
      it: "Il database verrà scaricato nel prossimo minuto o all'avvio del browser.",
      ja: "プロジェクトDBは間もなく、またはブラウザ起動時にダウンロードされます。"
    },
    msg_proj_none: {
      es: "No hay marcas pendientes por sugerir.",
      en: "No pending brands to suggest.",
      de: "Keine ausstehenden Marken zum Vorschlagen.",
      fr: "Aucune marque en attente à suggérer.",
      it: "Nessun marchio in sospeso da suggerire.",
      ja: "提案対象の保留中ブランドはありません。"
    },
    msg_proj_sent: {
      es: "Se abrió el correo con {n} marcas para {to} (también se copiaron al portapapeles).",
      en: "Email draft opened with {n} brands for {to} (also copied to clipboard).",
      de: "E-Mail-Entwurf mit {n} Marken für {to} geöffnet (in Zwischenablage kopiert).",
      fr: "Courriel ouvert avec {n} marques pour {to} (copié dans le presse-papiers).",
      it: "Email aperta con {n} marchi per {to} (anche copiati negli appunti).",
      ja: "{to}宛てに{n}件のブランドを含むメールを作成しました（クリップボードにもコピー済み）。"
    },
    opt_advanced_title: {
      es: "Avanzado: tu propia IA",
      en: "Advanced: bring your own AI",
      de: "Erweitert: Eigene KI anbinden",
      fr: "Avancé : votre propre IA",
      it: "Avanzato: la tua IA personale",
      ja: "高度な設定：独自のAIキーを使用"
    },
    opt_tag_optional: {
      es: "opcional",
      en: "optional",
      de: "optional",
      fr: "facultatif",
      it: "opzionale",
      ja: "任意"
    },
    opt_advanced_help: {
      es: "Solo si quieres respuestas al momento para marcas que aún no están en la base, o investigar por tu cuenta. Necesita tu propia clave de API (tiene costo en tu cuenta del proveedor).",
      en: "Only if you want instant answers for brands not yet in the database, or to run your own research. Requires your own API key (billed to your provider account).",
      de: "Nur wenn du Sofortantworten für unbekannte Marken wünschst oder selbst recherchieren möchtest. Erfordert eigenen API-Schlüssel (Kosten beim Anbieter).",
      fr: "Uniquement pour des réponses instantanées sur les marques inconnues ou pour rechercher vous-même. Nécessite une clé API payante auprès du fournisseur.",
      it: "Solo se desideri risposte istantanee per marchi non ancora registrati o per ricerche personali. Richiede una tua chiave API (costi a carico tuo).",
      ja: "未登録ブランドに対して即時判定を行いたい場合や、独自に調査を実行したい場合のみ設定してください。プロバイダーのアカウントでAPIキーの発行（有料）が必要です。"
    },
    opt_sec_live: {
      es: "1. Consulta en vivo",
      en: "1. Live lookup",
      de: "1. Live-Abfrage",
      fr: "1. Consultation directe",
      it: "1. Consultazione in tempo reale",
      ja: "1. 即時照会"
    },
    opt_tag_cheap: {
      es: "modelo pequeño y barato",
      en: "small, lightweight model",
      de: "kleines, günstiges Modell",
      fr: "modèle léger et économique",
      it: "modello leggero ed economico",
      ja: "小型・安価なモデル"
    },
    opt_help_live: {
      es: "Se usa solo cuando la marca no está en la memoria. Recomendado: Claude Haiku, Gemini Flash-Lite o un modelo pequeño en Groq/xAI.",
      en: "Used only when the brand is not in local memory. Recommended: Claude Haiku, Gemini Flash-Lite, or a small model on Groq/xAI.",
      de: "Wird nur genutzt, wenn die Marke nicht lokal gespeichert ist. Empfohlen: Claude Haiku, Gemini Flash-Lite oder ein kleines Modell auf Groq/xAI.",
      fr: "Utilisé uniquement si la marque est absente de la mémoire. Recommandé : Claude Haiku, Gemini Flash-Lite ou un modèle léger sur Groq/xAI.",
      it: "Usato solo se il marchio non è in memoria. Consigliato: Claude Haiku, Gemini Flash-Lite o un modello leggero su Groq/xAI.",
      ja: "ブランドが未登録の場合にのみ使用されます。推奨：Claude Haiku、Gemini Flash-Lite、Groq/xAIの小型モデル。"
    },
    opt_chk_ai_enabled: {
      es: "Activar la clasificación con IA en las tiendas",
      en: "Enable AI classification on store pages",
      de: "KI-Klassifizierung in Onlineshops aktivieren",
      fr: "Activer la classification par IA sur les boutiques",
      it: "Attiva la classificazione IA nei negozi",
      ja: "ショッピングサイトでのAI分類を有効化"
    },
    opt_lbl_provider: {
      es: "Proveedor",
      en: "Provider",
      de: "Anbieter",
      fr: "Fournisseur",
      it: "Fornitore",
      ja: "プロバイダー"
    },
    opt_lbl_model: {
      es: "Modelo",
      en: "Model",
      de: "Modell",
      fr: "Modèle",
      it: "Modello",
      ja: "モデル"
    },
    opt_ph_model: {
      es: "nombre del modelo",
      en: "model name",
      de: "Modellname",
      fr: "nom du modèle",
      it: "nome del modello",
      ja: "モデル名"
    },
    opt_lbl_key: {
      es: "Clave de API",
      en: "API Key",
      de: "API-Schlüssel",
      fr: "Clé API",
      it: "Chiave API",
      ja: "APIキー"
    },
    opt_ph_key: {
      es: "pega aquí tu clave",
      en: "paste your key here",
      de: "Schlüssel hier einfügen",
      fr: "collez votre clé ici",
      it: "incolla qui la chiave",
      ja: "キーをここに貼り付け"
    },
    opt_lbl_base: {
      es: "URL base (compatible con OpenAI)",
      en: "Base URL (OpenAI-compatible)",
      de: "Basis-URL (OpenAI-kompatibel)",
      fr: "URL de base (compatible OpenAI)",
      it: "URL di base (compatibile OpenAI)",
      ja: "ベースURL（OpenAI互換）"
    },
    opt_lbl_daily_limit: {
      es: "Límite de consultas por día",
      en: "Daily query limit",
      de: "Tägliches Abfragelimit",
      fr: "Limite de requêtes par jour",
      it: "Limite di richieste giornaliere",
      ja: "1日の最大照会回数"
    },
    opt_lbl_cache_days: {
      es: "Días que dura la caché",
      en: "Cache duration (days)",
      de: "Cache-Dauer (Tage)",
      fr: "Durée du cache (jours)",
      it: "Durata cache (giorni)",
      ja: "キャッシュ保持日数"
    },
    opt_btn_test_key: {
      es: "Probar clave",
      en: "Test key",
      de: "Schlüssel testen",
      fr: "Tester la clé",
      it: "Verifica chiave",
      ja: "キーをテスト"
    },
    opt_privacy_note: {
      es: "Privacidad: a la IA se envía solo el nombre de la marca, el título del producto y el nombre de la tienda. No se envían tu historial, tu sesión ni la URL.",
      en: "Privacy: only brand name, product title, and store name are sent to the AI. Browsing history, session cookies, and URLs are never sent.",
      de: "Datenschutz: Nur Markenname, Produkttitel und Shopname werden an die KI gesendet. Kein Browserverlauf, keine Session und keine URLs.",
      fr: "Vie privée : seuls le nom de la marque, le titre du produit et le nom de la boutique sont envoyés à l'IA. Jamais votre historique, session ou URL.",
      it: "Privacy: all'IA vengono inviati solo nome del marchio, titolo del prodotto e negozio. Nessuna cronologia, sessione o URL.",
      ja: "プライバシー：ブランド名、商品タイトル、店舗名のみがAIに送信されます。閲覧履歴、セッション、URLは一切送信されません。"
    },
    opt_sec_research: {
      es: "2. Investigación semanal",
      en: "2. Weekly research",
      de: "2. Wöchentliche Recherche",
      fr: "2. Recherche hebdomadaire",
      it: "2. Ricerca settimanale",
      ja: "2. 週次調査"
    },
    opt_tag_search: {
      es: "modelo grande con búsqueda web",
      en: "large model with web search",
      de: "großes Modell mit Websuche",
      fr: "grand modèle avec recherche web",
      it: "modello avanzato con ricerca web",
      ja: "ウェブ検索対応の大型モデル"
    },
    opt_help_research: {
      es: "Una vez por semana investiga las marcas pendientes (las más vistas primero), revalida los datos de la base marcados «Verificar» e investiga la reputación (controversias, lobbying) de las empresas y fondos que más ves. Solo se guardan hechos cuya fuente salió de la búsqueda real. Un dato solo queda como <b>Verificado</b> si las fuentes salen de la búsqueda real del proveedor. Claude (búsqueda web) y Gemini (Google Search) lo permiten; los compatibles con OpenAI no.",
      en: "Once a week researches pending brands (most-viewed first), revalidates database entries flagged “Verify”, and gathers public reputation records (controversies, lobbying) for companies you see most. Only events sourced from real live search are retained. A record only reaches <b>Verified</b> status if grounded in live search results. Claude (web search) and Gemini (Google Search) support this; generic OpenAI-compatible endpoints do not.",
      de: "Recherchiert einmal wöchentlich ausstehende Marken (häufigste zuerst), revalidiert Einträge mit Status „Prüfen“ und analysiert Reputation und Lobbying. Nur belegte Quellen aus realer Websuche werden gespeichert. Status <b>Verifiziert</b> erfordert Live-Suchergebnisse (unterstützt von Claude und Gemini).",
      fr: "Recherche hebdomadaire des marques en attente, revalidation des données à vérifier et analyse de réputation. Seuls les faits issus d'une recherche web réelle sont conservés avec le statut <b>Vérifié</b> (supporté par Claude et Gemini).",
      it: "Una volta a settimana analizza i marchi in sospeso, rivaluta i dati da verificare e approfondisce reputazione e lobbying. Solo i fatti con fonti da ricerca reale ottengono lo stato <b>Verificato</b> (supportato da Claude e Gemini).",
      ja: "週に1回、未登録ブランドを調査し、確認待ちデータを再検証し、頻出企業の公的記録を収集します。実際のウェブ検索結果で裏付けられた事実のみが<b>検証済み</b>として記録されます（ClaudeおよびGeminiが対応）。"
    },
    opt_chk_job_enabled: {
      es: "Ejecutar la investigación cada semana",
      en: "Run weekly research automatically",
      de: "Recherche wöchentlich automatisch ausführen",
      fr: "Exécuter la recherche chaque semaine",
      it: "Esegui la ricerca ogni settimana",
      ja: "週次調査を自動実行"
    },
    opt_lbl_r_key: {
      es: "Clave de API (puede ser otra cuenta o proyecto)",
      en: "API Key (can be separate account/project)",
      de: "API-Schlüssel (kann separates Projekt sein)",
      fr: "Clé API (peut être un autre compte)",
      it: "Chiave API (può essere un altro account)",
      ja: "APIキー（別プロジェクト・アカウントも可）"
    },
    opt_chk_use_classify_key: {
      es: "Usar la misma clave de la consulta en vivo (si es el mismo proveedor)",
      en: "Use same key as live lookup (if same provider)",
      de: "Gleichen Schlüssel wie für Live-Abfrage nutzen",
      fr: "Utiliser la même clé que pour la consultation directe",
      it: "Usa la stessa chiave della consultazione directa",
      ja: "即時照会と同じキーを使用（同プロバイダーの場合）"
    },
    opt_chk_github_issues: {
      es: "Abrir sugerencias directamente como issues en GitHub (requiere cuenta de GitHub)",
      en: "Open suggestions directly as GitHub issues (requires GitHub account)",
      de: "Vorschläge direkt als GitHub-Issues öffnen (erfordert GitHub-Konto)",
      fr: "Ouvrir les suggestions directement sous forme d'issues GitHub (nécessite un compte GitHub)",
      it: "Apri i suggerimenti direttamente come issue di GitHub (richiede account GitHub)",
      ja: "提案を直接GitHub Issueとして開く（GitHubアカウントが必要）"
    },
    opt_lbl_weekly_limit: {
      es: "Marcas investigadas por semana",
      en: "Brands researched per week",
      de: "Recherchierte Marken pro Woche",
      fr: "Marques recherchées par semaine",
      it: "Marchi analizzati a settimana",
      ja: "週ごとの調査対象ブランド数"
    },
    opt_lbl_reval_limit: {
      es: "Grupos revalidados por semana",
      en: "Groups revalidated per week",
      de: "Revalidierte Gruppen pro Woche",
      fr: "Groupes revalidés par semaine",
      it: "Gruppi rivalutati a settimana",
      ja: "週ごとの再検証グループ数"
    },
    opt_lbl_rep_limit: {
      es: "Historiales de reputación por semana",
      en: "Reputation records per week",
      de: "Reputationshistorien pro Woche",
      fr: "Dossiers de réputation par semaine",
      it: "Storici di reputazione a settimana",
      ja: "週ごとの公的評価調査数"
    },
    opt_btn_run_now: {
      es: "▶ Ejecutar ahora",
      en: "▶ Run now",
      de: "▶ Jetzt ausführen",
      fr: "▶ Lancer maintenant",
      it: "▶ Esegui ora",
      ja: "▶ 今すぐ実行"
    },
    msg_research_running: {
      es: "Investigación en curso. Puedes cerrar esta pestaña; el resultado aparecerá en la bitácora.",
      en: "Research in progress. You can close this tab; results will appear in the log.",
      de: "Recherche läuft. Du kannst diesen Tab schließen; Ergebnisse erscheinen im Protokoll.",
      fr: "Recherche en cours. Vous pouvez fermer cet onglet ; les résultats apparaîtront dans le journal.",
      it: "Ricerca in corso. Puoi chiudere questa scheda; i risultati appariranno nel registro.",
      ja: "調査を実行中です。このタブを閉じても処理は継続し、結果はログに記録されます。"
    },
    msg_provider_no_search: {
      es: "Este proveedor no tiene búsqueda web: sus resultados quedarán «sin fuentes» (no verificados).",
      en: "This provider lacks web search: findings will remain “unsourced” (unverified).",
      de: "Dieser Anbieter bietet keine Websuche: Ergebnisse bleiben „ohne Quellen“ (nicht verifiziert).",
      fr: "Ce fournisseur ne propose pas de recherche web : les résultats resteront « sans sources » (non vérifiés).",
      it: "Questo fornitore non supporta la ricerca web: i risultati rimarranno «senza fonti» (non verificati).",
      ja: "このプロバイダーはウェブ検索に未対応です。結果は「情報源なし」（未検証）となります。"
    },
    opt_sec_custom_remote: {
      es: "3. Otra base remota",
      en: "3. Custom remote database",
      de: "3. Eigene Remote-Datenbank",
      fr: "3. Autre base distante",
      it: "3. Altro database remoto",
      ja: "3. カスタムリモートDB"
    },
    opt_sec_github_issues: {
      es: "Sugerencias por GitHub",
      en: "GitHub Suggestions",
      de: "GitHub-Vorschläge",
      fr: "Suggestions via GitHub",
      it: "Suggerimenti via GitHub",
      ja: "GitHubでの提案"
    },
    opt_help_custom_remote: {
      es: "Déjalo vacío para usar la base del proyecto. Solo si mantienes tu propia copia (por ejemplo, con el job de <code>job/</code> en tu GitHub), pon aquí la URL de tu <code>brands.json</code>.",
      en: "Leave blank to use the official project database. Only enter a URL if you maintain your own <code>brands.json</code> copy (e.g., via GitHub Actions).",
      de: "Leer lassen für die offizielle Projektdatenbank. Nur ausfüllen, wenn du eine eigene Kopie von <code>brands.json</code> betreibst.",
      fr: "Laissez vide pour utiliser la base officielle. Renseignez l'URL uniquement si vous maintenez votre propre <code>brands.json</code>.",
      it: "Lascia vuoto per usare il database del progetto. Inserisci l'URL solo se gestisci un tuo <code>brands.json</code>.",
      ja: "公式プロジェクトDBを使用する場合は空欄にしてください。独自に<code>brands.json</code>をホストしている場合のみURLを入力してください。"
    },
    opt_lbl_remote_url: {
      es: "URL del brands.json",
      en: "brands.json URL",
      de: "URL zu brands.json",
      fr: "URL du brands.json",
      it: "URL di brands.json",
      ja: "brands.jsonのURL"
    },
    remote_status_none: {
      es: "Sin base remota descargada.",
      en: "No remote database downloaded.",
      de: "Keine Remote-Datenbank geladen.",
      fr: "Aucune base distante téléchargée.",
      it: "Nessun database remoto scaricato.",
      ja: "リモートDBはダウンロードされていません。"
    },
    remote_status_fetched: {
      es: "Última descarga: {date} · versión {version} · {count} marcas",
      en: "Last fetch: {date} · version {version} · {count} brands",
      de: "Letzter Download: {date} · Version {version} · {count} Marken",
      fr: "Dernier téléchargement : {date} · version {version} · {count} marques",
      it: "Ultimo download: {date} · versione {version} · {count} marchi",
      ja: "最終ダウンロード：{date} · バージョン {version} · {count}ブランド"
    },
    btn_save_settings: {
      es: "Guardar configuración",
      en: "Save settings",
      de: "Einstellungen speichern",
      fr: "Enregistrer la configuration",
      it: "Salva impostazioni",
      ja: "設定を保存"
    },
    msg_save_ok: {
      es: "Configuración guardada.",
      en: "Settings saved.",
      de: "Einstellungen gespeichert.",
      fr: "Configuration enregistrée.",
      it: "Configurazione salvata.",
      ja: "設定を保存しました。"
    },
    msg_save_no_perms: {
      es: "Guardada, pero no diste permiso de acceso al proveedor: las consultas pueden fallar.",
      en: "Saved, but host permission was not granted: provider queries may fail.",
      de: "Gespeichert, jedoch ohne Anbieterberechtigung: Abfragen könnten fehlschlagen.",
      fr: "Enregistré, mais les autorisations d'accès n'ont pas été accordées : les requêtes peuvent échouer.",
      it: "Salvato, ma non sono stati concessi i permessi per il provider: le richieste potrebbero fallire.",
      ja: "保存されましたが、プロバイダーへのアクセス権限が付与されていないため照会が失敗する可能性があります。"
    },
    opt_sec_memory: {
      es: "4. Memoria",
      en: "4. Local Memory",
      de: "4. Lokaler Speicher",
      fr: "4. Mémoire locale",
      it: "4. Memoria locale",
      ja: "4. ローカルメモリ"
    },
    stat_ai_cache: {
      es: "en caché de IA",
      en: "in AI cache",
      de: "im KI-Cache",
      fr: "en cache IA",
      it: "nella cache IA",
      ja: "AIキャッシュ内"
    },
    stat_pending: {
      es: "pendientes de análisis",
      en: "pending analysis",
      de: "ausstehende Analysen",
      fr: "en attente d'analyse",
      it: "in attesa di analisi",
      ja: "分析保留中"
    },
    stat_verified: {
      es: "verificadas por investigación",
      en: "verified by research",
      de: "durch Recherche verifiziert",
      fr: "vérifiées par recherche",
      it: "verificati dalla ricerca",
      ja: "調査により検証済み"
    },
    stat_revalidated: {
      es: "grupos revalidados",
      en: "revalidated groups",
      de: "revalidierte Gruppen",
      fr: "groupes revalidés",
      it: "gruppi rivalutati",
      ja: "再検証済みグループ"
    },
    stat_queries_today: {
      es: "consultas hoy ({in} / {out} tokens)",
      en: "queries today ({in} / {out} tokens)",
      de: "Abfragen heute ({in} / {out} Tokens)",
      fr: "requêtes aujourd'hui ({in} / {out} tokens)",
      it: "richieste oggi ({in} / {out} token)",
      ja: "本日の照会 ({in} / {out} トークン)"
    },
    stat_rep_researched: {
      es: "historiales de reputación investigados",
      en: "reputation records researched",
      de: "recherchierte Reputationsdossiers",
      fr: "dossiers de réputation analysés",
      it: "storici di reputazione analizzati",
      ja: "調査済み公的評価記録"
    },
    stat_custom_brands: {
      es: "marcas agregadas por ti",
      en: "brands added by you",
      de: "von dir hinzugefügte Marken",
      fr: "marques ajoutées par vous",
      it: "marchi aggiunti da te",
      ja: "あなたが追加したブランド"
    },
    opt_sub_pending: {
      es: "Pendientes de análisis",
      en: "Pending analysis",
      de: "Ausstehende Analysen",
      fr: "En attente d'analyse",
      it: "In attesa di analisi",
      ja: "分析保留中"
    },
    th_brand_product: {
      es: "Marca / producto",
      en: "Brand / product",
      de: "Marke / Produkt",
      fr: "Marque / produit",
      it: "Marchio / prodotto",
      ja: "ブランド / 商品"
    },
    th_store: {
      es: "Tienda",
      en: "Store",
      de: "Shop",
      fr: "Boutique",
      it: "Negozio",
      ja: "店舗"
    },
    th_times_seen: {
      es: "Veces vista",
      en: "Times seen",
      de: "Aufrufe",
      fr: "Vues",
      it: "Visualizzazioni",
      ja: "閲覧回数"
    },
    th_status: {
      es: "Estado",
      en: "Status",
      de: "Status",
      fr: "Statut",
      it: "Stato",
      ja: "状態"
    },
    th_last_try: {
      es: "Último intento",
      en: "Last attempt",
      de: "Letzter Versuch",
      fr: "Dernier essai",
      it: "Ultimo tentativo",
      ja: "最終試行"
    },
    opt_sub_verified: {
      es: "Marcas verificadas por la investigación",
      en: "Research-verified brands",
      de: "Durch Recherche verifizierte Marken",
      fr: "Marques vérifiées par recherche",
      it: "Marchi verificati dalla ricerca",
      ja: "調査により検証済みのブランド"
    },
    th_brand: {
      es: "Marca",
      en: "Brand",
      de: "Marke",
      fr: "Marque",
      it: "Marchio",
      ja: "ブランド"
    },
    th_company: {
      es: "Empresa",
      en: "Company",
      de: "Unternehmen",
      fr: "Entreprise",
      it: "Azienda",
      ja: "企業"
    },
    th_controller: {
      es: "Controlador",
      en: "Controller",
      de: "Kontrolliert von",
      fr: "Contrôleur",
      it: "Controllore",
      ja: "実質支配者"
    },
    th_source: {
      es: "Fuente",
      en: "Source",
      de: "Quelle",
      fr: "Source",
      it: "Fonte",
      ja: "出典"
    },
    th_date: {
      es: "Fecha",
      en: "Date",
      de: "Datum",
      fr: "Date",
      it: "Data",
      ja: "日付"
    },
    opt_sub_log: {
      es: "Bitácora de ejecuciones",
      en: "Execution log",
      de: "Ausführungsprotokoll",
      fr: "Journal d'exécution",
      it: "Registro esecuzioni",
      ja: "実行ログ"
    },
    th_log_date: {
      es: "Fecha",
      en: "Date",
      de: "Datum",
      fr: "Date",
      it: "Data",
      ja: "日時"
    },
    th_log_origin: {
      es: "Origen",
      en: "Origin",
      de: "Auslöser",
      fr: "Origine",
      it: "Origine",
      ja: "トリガー"
    },
    th_log_researched: {
      es: "Investigadas",
      en: "Researched",
      de: "Recherchiert",
      fr: "Recherchées",
      it: "Analizzati",
      ja: "調査数"
    },
    th_log_verified: {
      es: "Verificadas",
      en: "Verified",
      de: "Verifiziert",
      fr: "Vérifiées",
      it: "Verificati",
      ja: "検証数"
    },
    th_log_unsourced: {
      es: "Sin fuentes",
      en: "Unsourced",
      de: "Ohne Quellen",
      fr: "Sans sources",
      it: "Senza fonti",
      ja: "情報源なし"
    },
    th_log_not_found: {
      es: "No encontradas",
      en: "Not found",
      de: "Nicht gefunden",
      fr: "Non trouvées",
      it: "Non trovati",
      ja: "未発見"
    },
    th_log_revalidated: {
      es: "Revalidadas",
      en: "Revalidated",
      de: "Revalidiert",
      fr: "Revalidées",
      it: "Rivalutati",
      ja: "再検証数"
    },
    th_log_tokens: {
      es: "Tokens (ent./sal.)",
      en: "Tokens (in/out)",
      de: "Tokens (ein/aus)",
      fr: "Tokens (ent./sort.)",
      it: "Token (in/out)",
      ja: "トークン (入/出)"
    },
    th_log_changes: {
      es: "Cambios y errores",
      en: "Changes & errors",
      de: "Änderungen & Fehler",
      fr: "Changements & erreurs",
      it: "Modifiche ed errori",
      ja: "変更およびエラー"
    },
    opt_btn_export_mem: {
      es: "⬇ Exportar memoria (JSON)",
      en: "⬇ Export memory (JSON)",
      de: "⬇ Speicher exportieren (JSON)",
      fr: "⬇ Exporter la mémoire (JSON)",
      it: "⬇ Esporta memoria (JSON)",
      ja: "⬇ メモリをエクスポート (JSON)"
    },
    opt_btn_import_mem: {
      es: "⬆ Importar memoria",
      en: "⬆ Import memory",
      de: "⬆ Speicher importieren",
      fr: "⬆ Importer la mémoire",
      it: "⬆ Importa memoria",
      ja: "⬆ メモリをインポート"
    },
    opt_btn_export_pending: {
      es: "⬇ Exportar pendientes para el job de servidor",
      en: "⬇ Export pending for server job",
      de: "⬇ Ausstehende für Server-Job exportieren",
      fr: "⬇ Exporter les éléments en attente",
      it: "⬇ Esporta in sospeso per server",
      ja: "⬇ サーバー用保留中データをエクスポート"
    },
    opt_btn_clear_cache: {
      es: "Vaciar caché de IA",
      en: "Clear AI cache",
      de: "KI-Cache leeren",
      fr: "Vider le cache IA",
      it: "Svuota cache IA",
      ja: "AIキャッシュを消去"
    },
    msg_no_pending: {
      es: "No hay pendientes. Las marcas que no estén en la base aparecerán aquí.",
      en: "No pending brands. Missing brands will appear here.",
      de: "Keine ausstehenden Marken. Unbekannte Marken erscheinen hier.",
      fr: "Aucune marque en attente. Les nouvelles marques apparaîtront ici.",
      it: "Nessun marchio in sospeso. I nuovi marchi appariranno qui.",
      ja: "保留中のブランドはありません。未登録ブランドはここに表示されます。"
    },
    msg_no_verified: {
      es: "Todavía no hay marcas verificadas por la investigación semanal.",
      en: "No brands verified by weekly research yet.",
      de: "Noch keine Marken durch die wöchentliche Recherche verifiziert.",
      fr: "Aucune marque vérifiée par la recherche pour le moment.",
      it: "Nessun marchio ancora verificato dalla ricerca settimanale.",
      ja: "週次調査で検証されたブランドはまだありません。"
    },
    msg_no_logs: {
      es: "Aún no hay ejecuciones.",
      en: "No runs yet.",
      de: "Noch keine Ausführungen protokolliert.",
      fr: "Aucune exécution pour le moment.",
      it: "Nessuna esecuzione ancora.",
      ja: "実行記録はまだありません。"
    },
    msg_mem_exported: {
      es: "Memoria exportada (no incluye tus claves).",
      en: "Memory exported (keys excluded).",
      de: "Speicher exportiert (ohne API-Schlüssel).",
      fr: "Mémoire exportée (clés exclues).",
      it: "Memoria esportata (chiavi escluse).",
      ja: "メモリをエクスポートしました（キーは除外されます）。"
    },
    msg_pending_exported: {
      es: "{count} pendientes exportados. Súbelos a la carpeta job/pendientes/ de tu repositorio.",
      en: "{count} pending items exported. Upload them to job/pendientes/ in your repo.",
      de: "{count} Einträge exportiert. Lade sie in job/pendientes/ deines Repositories hoch.",
      fr: "{count} éléments exportés. Déposez-les dans job/pendientes/ de votre dépôt.",
      it: "{count} elementi in sospeso esportati. Caricali nella cartella job/pendientes/ del repository.",
      ja: "{count}件の保留中項目をエクスポートしました。リポジトリのjob/pendientes/に配置してください。"
    },
    msg_cache_cleared: {
      es: "Caché de IA vaciada. Las marcas se volverán a consultar cuando aparezcan.",
      en: "AI cache cleared. Brands will be queried again when encountered.",
      de: "KI-Cache geleert. Marken werden beim nächsten Auftreten neu angefragt.",
      fr: "Cache IA vidé. Les marques seront réinterrogées lors de leur apparition.",
      it: "Cache IA svuotata. I marchi verranno ricontrollati quando rilevati.",
      ja: "AIキャッシュを消去しました。再訪時に再照会されます。"
    },
    msg_mem_imported: {
      es: "Importado: {n1} en caché, {n2} pendientes, {n3} verificadas, {n4} grupos revalidados, {n5} historiales de reputación.",
      en: "Imported: {n1} cached, {n2} pending, {n3} verified, {n4} revalidated groups, {n5} reputation records.",
      de: "Importiert: {n1} im Cache, {n2} ausstehend, {n3} verifiziert, {n4} revalidierte Gruppen, {n5} Reputationsdossiers.",
      fr: "Importé : {n1} en cache, {n2} en attente, {n3} vérifiées, {n4} groupes revalidés, {n5} dossiers de réputation.",
      it: "Importato: {n1} in cache, {n2} in sospeso, {n3} verificati, {n4} gruppi rivalutati, {n5} storici di reputazione.",
      ja: "インポート完了：キャッシュ {n1}件、保留中 {n2}件、検証済み {n3}件、再検証グループ {n4}件、公的評価記録 {n5}件。"
    },
    status_por_investigar: {
      es: "Por investigar",
      en: "To research",
      de: "Zu recherchieren",
      fr: "À rechercher",
      it: "Da verificare",
      ja: "調査待ち"
    },
    status_por_verificar: {
      es: "Clasificada por IA · por verificar",
      en: "AI classified · to verify",
      de: "KI-klassifiziert · zu prüfen",
      fr: "Classé par IA · à vérifier",
      it: "Classificato da IA · da verificare",
      ja: "AI分類済み · 検証待ち"
    },
    status_reintentar: {
      es: "Reintentar",
      en: "Retry",
      de: "Wiederholen",
      fr: "Réessayer",
      it: "Riprova",
      ja: "再試行"
    },
    status_sin_fuentes: {
      es: "Sin fuentes",
      en: "No sources",
      de: "Ohne Quellen",
      fr: "Sans sources",
      it: "Senza fonti",
      ja: "情報源なし"
    },
    status_verificada: {
      es: "Verificada",
      en: "Verified",
      de: "Verifiziert",
      fr: "Vérifiée",
      it: "Verificato",
      ja: "検証済み"
    },
    status_no_encontrada: {
      es: "No encontrada",
      en: "Not found",
      de: "Nicht gefunden",
      fr: "Non trouvée",
      it: "Non trovato",
      ja: "未発見"
    },
    btn_retry_title: {
      es: "Volver a intentar",
      en: "Retry",
      de: "Erneut versuchen",
      fr: "Réessayer",
      it: "Riprova",
      ja: "再試行"
    },
    btn_remove_title: {
      es: "Quitar",
      en: "Remove",
      de: "Entfernen",
      fr: "Supprimer",
      it: "Rimuovi",
      ja: "削除"
    },
    opt_footer: {
      es: "¿Encontraste un dato incorrecto sobre una empresa? Escríbenos para corregirlo: {contacto}. Las claves se guardan solo en este navegador (almacenamiento local de la extensión) y se envían únicamente al proveedor que elijas. Recomendación: crea claves con límite de gasto. Información orientativa; no es una recomendación de compra ni de inversión.",
      en: "Found incorrect company data? Contact us to fix it: {contacto}. API keys are stored only in this browser (extension local storage) and sent only to your chosen provider. Tip: create keys with spending limits. Orientational information; not a purchase or investment recommendation.",
      de: "Fehlerhafte Angaben gefunden? Schreib uns: {contacto}. API-Schlüssel werden ausschließlich lokal in diesem Browser gespeichert und nur an den gewählten Anbieter gesendet. Tipp: Limits einrichten. Nur zur Orientierung; keine Kauf- oder Anlageempfehlung.",
      fr: "Une information inexacte ? Écrivez-nous : {contacto}. Les clés sont stockées uniquement dans ce navigateur et transmises seulement au fournisseur choisi. Conseil : définissez des plafonds. À titre indicatif ; pas une recommandation d'achat ou d'investissement.",
      it: "Hai trovato un dato errato? Contattaci: {contacto}. Le chiavi sono salvate solo in questo browser e trasmesse solo al fornitore scelto. Consiglio: imposta un limite di spesa. Informazioni orientative; non costituiscono consiglio di acquisto o investimento.",
      ja: "企業情報に誤りを見つけましたか？修正依頼はこちら：{contacto}。APIキーはこのブラウザのローカルストレージにのみ保存され、選択したプロバイダーにのみ送信されます。利用限度額の設定を推奨します。参考情報であり、購入や投資の推奨ではありません。"
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

  // Traducción de países a los 6 idiomas
  const PAISES_MAP = {
    "Alemania": { es: "Alemania", en: "Germany", de: "Deutschland", fr: "Allemagne", it: "Germania", ja: "ドイツ" },
    "Argentina": { es: "Argentina", en: "Argentina", de: "Argentinien", fr: "Argentine", it: "Argentina", ja: "アルゼンチン" },
    "Austria": { es: "Austria", en: "Austria", de: "Österreich", fr: "Autriche", it: "Austria", ja: "オーストリア" },
    "Bélgica": { es: "Bélgica", en: "Belgium", de: "Belgien", fr: "Belgique", it: "Belgio", ja: "ベルギー" },
    "Bermudas": { es: "Bermudas", en: "Bermuda", de: "Bermuda", fr: "Bermudes", it: "Bermuda", ja: "バミューダ" },
    "Brasil": { es: "Brasil", en: "Brazil", de: "Brasilien", fr: "Brésil", it: "Brasile", ja: "ブラジル" },
    "Canadá": { es: "Canadá", en: "Canada", de: "Kanada", fr: "Canada", it: "Canada", ja: "カナダ" },
    "Chile": { es: "Chile", en: "Chile", de: "Chile", fr: "Chili", it: "Cile", ja: "チリ" },
    "China": { es: "China", en: "China", de: "China", fr: "Chine", it: "Cina", ja: "中国" },
    "Colombia": { es: "Colombia", en: "Colombia", de: "Kolumbien", fr: "Colombie", it: "Colombia", ja: "コロンビア" },
    "Corea del Sur": { es: "Corea del Sur", en: "South Korea", de: "Südkorea", fr: "Corée du Sud", it: "Corea del Sud", ja: "韓国" },
    "Dinamarca": { es: "Dinamarca", en: "Denmark", de: "Dänemark", fr: "Danemark", it: "Danimarca", ja: "デンマーク" },
    "EE.UU.": { es: "EE.UU.", en: "USA", de: "USA", fr: "États-Unis", it: "USA", ja: "米国" },
    "Emiratos": { es: "Emiratos", en: "UAE", de: "VAE", fr: "Émirats", it: "Emirati", ja: "UAE" },
    "España": { es: "España", en: "Spain", de: "Spanien", fr: "Espagne", it: "Spagna", ja: "スペイン" },
    "Francia": { es: "Francia", en: "France", de: "Frankreich", fr: "France", it: "Francia", ja: "フランス" },
    "Global": { es: "Global", en: "Global", de: "Global", fr: "Mondial", it: "Globale", ja: "グローバル" },
    "Hong Kong": { es: "Hong Kong", en: "Hong Kong", de: "Hongkong", fr: "Hong Kong", it: "Hong Kong", ja: "香港" },
    "India": { es: "India", en: "India", de: "Indien", fr: "Inde", it: "India", ja: "インド" },
    "Irlanda": { es: "Irlanda", en: "Ireland", de: "Irland", fr: "Irlande", it: "Irlanda", ja: "アイルランド" },
    "Israel": { es: "Israel", en: "Israel", de: "Israel", fr: "Israël", it: "Israele", ja: "イスラエル" },
    "Italia": { es: "Italia", en: "Italy", de: "Italien", fr: "Italie", it: "Italia", ja: "イタリア" },
    "Japón": { es: "Japón", en: "Japan", de: "Japan", fr: "Japon", it: "Giappone", ja: "日本" },
    "Luxemburgo": { es: "Luxemburgo", en: "Luxembourg", de: "Luxemburg", fr: "Luxembourg", it: "Lussemburgo", ja: "ルクセンブルク" },
    "México": { es: "México", en: "Mexico", de: "Mexiko", fr: "Mexique", it: "Messico", ja: "メキシコ" },
    "Países Bajos": { es: "Países Bajos", en: "Netherlands", de: "Niederlande", fr: "Pays-Bas", it: "Paesi Bassi", ja: "オランダ" },
    "Panamá": { es: "Panamá", en: "Panama", de: "Panama", fr: "Panama", it: "Panama", ja: "パナマ" },
    "Qatar": { es: "Qatar", en: "Qatar", de: "Katar", fr: "Qatar", it: "Qatar", ja: "カタール" },
    "Reino Unido": { es: "Reino Unido", en: "United Kingdom", de: "Vereinigtes Königreich", fr: "Royaume-Uni", it: "Regno Unito", ja: "英国" },
    "Singapur": { es: "Singapur", en: "Singapore", de: "Singapur", fr: "Singapour", it: "Singapore", ja: "シンガポール" },
    "Suiza": { es: "Suiza", en: "Switzerland", de: "Schweiz", fr: "Suisse", it: "Svizzera", ja: "スイス" },
    "Turquía": { es: "Turquía", en: "Turkey", de: "Türkei", fr: "Turquie", it: "Turchia", ja: "トルコ" }
  };

  function paisLabel(p, lang) {
    if (!p) return "";
    const l = lang || getLang();
    if (p.includes("/")) {
      return p.split("/").map((part) => paisLabel(part.trim(), l)).join(" / ");
    }
    const cleanP = p.replace(/^Otros\s*\((.*)\)$/i, "$1").trim();
    const entry = PAISES_MAP[cleanP] || PAISES_MAP[p];
    if (entry) {
      const translated = entry[l] || entry["en"] || entry["es"];
      return p.startsWith("Otros (") ? (l === "es" ? p : translated) : translated;
    }
    return p;
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
    catLabel,
    paisLabel
  };

})(typeof globalThis !== "undefined" ? globalThis : this);
