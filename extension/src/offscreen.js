// SPDX-License-Identifier: MIT
// Gina — Offscreen parser para Chrome Service Worker (DOMParser)
(function () {
  const api = typeof browser !== "undefined" ? browser : chrome;
  if (!api || !api.runtime || !api.runtime.onMessage) return;

  api.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg && msg.type === "qed:offscreen_parse") {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(msg.html || "", "text/html");
        const items = QED.extractStoreItems(msg.html, doc, msg.storeConfig || {});
        reply({ ok: true, items });
      } catch (e) {
        reply({ ok: false, error: String(e), items: [] });
      }
      return true;
    }
    return false;
  });
})();
