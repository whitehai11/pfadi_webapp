import { e as escape_html } from "../../../chunks/escaping.js";
import "clsx";
import "../../../chunks/toast.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let status = "NFC-Kennung lesen.";
    $$renderer2.push(`<div class="page-stack"><section class="page-intro"><h1 class="page-title">NFC</h1></section> <section class="surface-card nfc-hero"><div class="nfc-glow"></div> <div class="split-grid align-center"><div class="page-stack"><h2 class="section-title">Scan starten</h2> <div class="actions"><button class="btn btn-primary" type="button">${escape_html("Kennung lesen")}</button> <span class="text-muted">${escape_html(status)}</span></div></div> <div class="actions justify-center"><div class="nfc-orb" aria-hidden="true"></div></div></div></section> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
