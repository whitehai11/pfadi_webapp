import "clsx";
import { C as Card } from "../../../chunks/Card.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="page-stack"><section class="page-intro"><p class="page-kicker">Packlisten</p> <h1 class="page-title">Vorbereitungen pro Termin bündeln.</h1> <p class="page-description">Jeder Termin erhält eine eigene Übersicht für Material, Fortschritt und offene Punkte.</p></section> `);
    Card($$renderer2, {
      title: "Termine mit Packlisten",
      description: "Wähle einen Termin, um die Packliste zu öffnen oder zu vervollständigen.",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="text-muted">Lade Termine...</p>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div>`);
  });
}
export {
  _page as default
};
