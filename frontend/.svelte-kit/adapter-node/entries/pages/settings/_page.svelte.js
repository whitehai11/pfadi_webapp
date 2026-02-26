import { s as store_get, e as ensure_array_like, u as unsubscribe_stores } from "../../../chunks/index2.js";
import { C as Card } from "../../../chunks/Card.js";
import { s as session } from "../../../chunks/auth.js";
import { e as escape_html } from "../../../chunks/escaping.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let settings = [];
    $$renderer2.push(`<div class="page-stack"><section class="page-intro"><p class="page-kicker">Einstellungen</p> <h1 class="page-title">Benachrichtigungen und App-Status.</h1> <p class="page-description">Verwalte deine Push-Benachrichtigungen und prüfe den aktuellen Systemzustand.</p></section> <section class="split-grid">`);
    Card($$renderer2, {
      title: "Benachrichtigungen",
      description: "Die App informiert dich über Termine, Material und Rückmeldungen.",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="actions"><button class="btn btn-primary" type="button">Push aktivieren</button> <button class="btn btn-outline" type="button">Push deaktivieren</button></div> `);
        {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Systemstatus",
      description: "Technische Schalter und aktuelle Konfiguration.",
      children: ($$renderer3) => {
        if (store_get($$store_subs ??= {}, "$session", session)?.role !== "admin") {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="text-muted">Nur Admins sehen die vollständigen Systemwerte.</p>`);
        } else {
          $$renderer3.push("<!--[!-->");
          if (settings.length === 0) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<p class="text-muted">Keine Statusdaten verfügbar.</p>`);
          } else {
            $$renderer3.push("<!--[!-->");
            $$renderer3.push(`<div class="hairline-list"><!--[-->`);
            const each_array = ensure_array_like(settings);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let item = each_array[$$index];
              $$renderer3.push(`<div class="list-row"><div class="list-meta"><strong>${escape_html(item.key)}</strong> <span class="text-muted">Aktueller Wert</span></div> <span class="badge badge-secondary">${escape_html(item.value)}</span></div>`);
            }
            $$renderer3.push(`<!--]--></div>`);
          }
          $$renderer3.push(`<!--]-->`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></section></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
