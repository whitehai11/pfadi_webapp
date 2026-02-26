import { e as escape_html } from "../../../chunks/escaping.js";
import "clsx";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let status = "NFC-Kennung lesen.";
    $$renderer2.push(`<div class="page-stack"><section class="page-intro"><p class="page-kicker">NFC</p> <h1 class="page-title">Kennungen leise und direkt auslesen.</h1> <p class="page-description">Halte das Gerät an eine Box und öffne Materialdaten ohne zusätzlichen Kontextwechsel.</p></section> <section class="surface-card nfc-hero"><div class="nfc-glow"></div> <div class="split-grid" style="align-items: center;"><div class="page-stack"><h2 class="section-title">Scan starten</h2> <p class="text-muted">Die App liest die Kennung aus und öffnet sofort die passende Box.</p> <div class="actions"><button class="btn btn-primary" type="button">${escape_html("Kennung lesen")}</button> <span class="text-muted">${escape_html(status)}</span></div></div> <div class="actions" style="justify-content: center;"><div class="nfc-orb" aria-hidden="true"></div></div></div></section> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
