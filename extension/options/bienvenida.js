// SPDX-License-Identifier: MIT
// Gina — Script de la página de bienvenida y onboarding (Opción B)
(function () {
  const api = typeof browser !== "undefined" ? browser : chrome;
  const QED = globalThis.QED || {};
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const I18N = () => QED.I18N || {
    t: (k) => k,
    getLang: () => "es",
    setLang: () => {}
  };
  const t = (k, p) => I18N().t(k, p);

  function applyI18n() {
    const curLang = I18N().getLang();
    if (document.documentElement) document.documentElement.lang = curLang;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const k = el.getAttribute("data-i18n");
      if (k) el.textContent = t(k);
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      const k = el.getAttribute("data-i18n-ph");
      if (k) el.placeholder = t(k);
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const k = el.getAttribute("data-i18n-title");
      if (k) el.title = t(k);
    });
  }

  async function init() {
    let saved = {};
    try {
      saved = await api.storage.local.get(["settings", "gina_user_profile", "gina_lang", "gina_country", "onboarding"]);
    } catch (_) {}

    const curLang = saved.gina_lang || (I18N().getLang && I18N().getLang()) || "es";
    if (I18N().setLang) I18N().setLang(curLang);
    const langSel = $("#lang_select");
    if (langSel) {
      langSel.value = curLang;
      langSel.addEventListener("change", async () => {
        const nextLang = langSel.value;
        if (I18N().setLang) I18N().setLang(nextLang);
        try { await api.storage.local.set({ gina_lang: nextLang }); } catch (_) {}
        applyI18n();
      });
    }

    const st = saved.settings || {};
    const countrySel = $("#country_select");
    if (countrySel) {
      const defCountry = saved.gina_country || st.country || "México";
      if (Array.from(countrySel.options).some((o) => o.value === defCountry)) {
        countrySel.value = defCountry;
      }
    }

    const vals = st.values || {};
    const vAmb = $("#val_ambiental");
    if (vAmb && vals.ambiental !== undefined) vAmb.value = String(vals.ambiental);
    const vLab = $("#val_laboral");
    if (vLab && vals.laboral !== undefined) vLab.value = String(vals.laboral);

    const chkAlt = $("#showAlternatives");
    if (chkAlt && st.showAlternatives !== undefined) chkAlt.checked = !!st.showAlternatives;
    const chkCmp = $("#compareEnabled");
    if (chkCmp && st.compareEnabled !== undefined) chkCmp.checked = !!st.compareEnabled;

    const prof = saved.gina_user_profile || st.userProfile || "consciente";
    const radio = document.querySelector(`input[name="userProfile"][value="${esc(prof)}"]`);
    if (radio) radio.checked = true;

    applyI18n();

    const btn = $("#btnFinish");
    if (btn) {
      btn.addEventListener("click", async () => {
        const country = countrySel ? countrySel.value : "México";
        const lang = langSel ? langSel.value : "es";
        const checkedRadio = document.querySelector('input[name="userProfile"]:checked');
        const userProfile = checkedRadio ? checkedRadio.value : "consciente";
        const showAlternatives = chkAlt ? chkAlt.checked : true;
        const compareEnabled = chkCmp ? chkCmp.checked : true;
        const newValues = Object.assign({}, st.values || {}, {
          ambiental: vAmb ? parseInt(vAmb.value, 10) : 1,
          laboral: vLab ? parseInt(vLab.value, 10) : 1
        });

        const updatedSettings = Object.assign({}, st, {
          country,
          userProfile,
          showAlternatives,
          compareEnabled,
          values: newValues
        });

        try {
          await api.storage.local.set({
            settings: updatedSettings,
            gina_user_profile: userProfile,
            gina_lang: lang,
            onboarding: { completed: true, date: Date.now() }
          });
        } catch (_) {}

        const notice = $("#welcomeNotice");
        if (notice) notice.style.display = "block";
        btn.textContent = "✓ " + t("welcome_btn_finish");
        btn.disabled = true;
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
