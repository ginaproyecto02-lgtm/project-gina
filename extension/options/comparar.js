// SPDX-License-Identifier: MIT
// Gina — Página de consentimiento del comparador (F1, validación 2026-10-18).
// Un script de contenido no puede llamar a permissions.request; esta página de la extensión sí, con el clic del usuario.
// Pide solo los dominios de comparación del país de la tienda y, si se conceden, guarda compareConsent.
(async () => {
  const api = typeof browser !== "undefined" ? browser : chrome;
  const I = globalThis.QED.I18N;
  try {
    const { gina_lang } = await api.storage.local.get("gina_lang");
    if (gina_lang && I.setLang) I.setLang(gina_lang);
  } catch (_) {}
  const t = (k, p) => I.t(k, p);
  const $ = (id) => document.getElementById(id);
  document.documentElement.lang = I.getLang();
  document.title = t("cmp_page_title");
  $("cmp_title").textContent = t("cmp_page_title");
  $("cmp_desc").textContent = t("compare_consent_desc");
  $("cmp_privacy").textContent = t("cmp_page_privacy");
  $("cmp_allow").textContent = t("cmp_page_allow");

  const pais = new URLSearchParams(location.search).get("pais") || "";
  let stores = [];
  try {
    const db = await (await fetch(api.runtime.getURL("data/brands.json"))).json();
    const table = (db && db.tiendas_comparar) || {};
    if (Object.prototype.hasOwnProperty.call(table, pais)) stores = table[pais] || [];
  } catch (_) {}
  stores = stores.filter((s) => s && typeof s.dominio === "string" && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s.dominio));

  $("cmp_stores_lbl").textContent = t("cmp_page_stores", { pais });
  for (const s of stores) {
    const li = document.createElement("li");
    li.textContent = `${s.nombre} (${s.dominio})`;
    $("cmp_stores").appendChild(li);
  }
  if (!stores.length) {
    $("cmp_allow").disabled = true;
    $("cmp_status").textContent = t("cmp_page_none");
    return;
  }

  $("cmp_allow").addEventListener("click", async () => {
    const origins = stores.map((s) => `https://*.${s.dominio}/*`);
    let granted = false;
    try { granted = await api.permissions.request({ origins }); } catch (_) { granted = false; }
    if (granted) {
      await api.storage.local.set({ compareConsent: true });
      $("cmp_allow").disabled = true;
      $("cmp_status").textContent = t("cmp_page_done");
      setTimeout(() => { try { window.close(); } catch (_) {} }, 1500);
    } else {
      $("cmp_status").textContent = t("cmp_page_denied");
    }
  });
})();
