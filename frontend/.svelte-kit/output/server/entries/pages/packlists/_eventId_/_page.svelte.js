import { s as store_get, u as unsubscribe_stores } from "../../../../chunks/index2.js";
import { p as page } from "../../../../chunks/stores.js";
import { C as Card } from "../../../../chunks/Card.js";
import "clsx";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    store_get($$store_subs ??= {}, "$page", page).params.eventId;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="page-stack"><section class="page-intro"><p class="page-kicker">Packliste</p> <h1 class="page-title">Material für einen Termin gezielt vorbereiten.</h1> <p class="page-description">Fortschritt, fehlende Einträge und Statusänderungen liegen in einer kompakten Übersicht.</p></section> `);
      {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      {
        $$renderer3.push("<!--[-->");
        Card($$renderer3, {
          title: "Packliste",
          description: "Die Daten werden geladen.",
          children: ($$renderer4) => {
            $$renderer4.push(`<p class="text-muted">Einen Moment bitte…</p>`);
          },
          $$slots: { default: true }
        });
      }
      $$renderer3.push(`<!--]--></div>`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
