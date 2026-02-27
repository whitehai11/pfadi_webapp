import { s as store_get, e as ensure_array_like, u as unsubscribe_stores } from "../../../chunks/index2.js";
import { C as Card } from "../../../chunks/Card.js";
import { s as session } from "../../../chunks/auth.js";
import { e as escape_html } from "../../../chunks/escaping.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let settings = [];
    $$renderer2.push(`<div class="page-stack"><section class="page-intro"><p class="page-kicker">Einstellungen</p> <h1 class="page-title">Benachrichtigungen und App-Status.</h1> <p class="page-description">Verwalte Push und prufe den aktuellen Versionsstand.</p></section> <section class="split-grid">`);
    Card($$renderer2, {
      title: "Benachrichtigungen",
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
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="hairline-list"><div class="list-row"><div class="list-meta"><strong>Aktuelle Version</strong> <span class="text-muted">Stand der laufenden Anwendung</span></div> <span class="badge badge-secondary">${escape_html("Unbekannt")}</span></div> <div class="list-row"><div class="list-meta"><strong>Commit</strong> <span class="text-muted">Zuletzt ausgerollter Stand</span></div> <span class="badge badge-secondary">${escape_html("Unbekannt")}</span></div> <div class="list-row"><div class="list-meta"><strong>Letztes Update</strong> <span class="text-muted">Zeitpunkt der letzten erfolgreichen Aktualisierung</span></div> <span class="badge badge-secondary">${escape_html("Unbekannt")}</span></div> <div class="list-row"><div class="list-meta"><strong>Auto Update</strong> <span class="text-muted">Geplanter Lauf alle 12 Stunden</span></div> <span class="badge badge-success">Aktiv</span></div> `);
        if (store_get($$store_subs ??= {}, "$session", session)?.role === "admin" && settings.length > 0) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<!--[-->`);
          const each_array = ensure_array_like(settings);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let item = each_array[$$index];
            $$renderer3.push(`<div class="list-row"><div class="list-meta"><strong>${escape_html(item.key)}</strong> <span class="text-muted">Aktueller Wert</span></div> <span class="badge badge-secondary">${escape_html(item.value)}</span></div>`);
          }
          $$renderer3.push(`<!--]-->`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></div>`);
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
