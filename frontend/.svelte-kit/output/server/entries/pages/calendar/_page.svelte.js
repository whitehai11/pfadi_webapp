import { Z as attr, a0 as store_get, a4 as unsubscribe_stores } from "../../../chunks/index2.js";
import { s as session } from "../../../chunks/auth.js";
import { e as escape_html } from "../../../chunks/escaping.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let webcalUrl = "/calendar.ics";
    let title = "";
    let type = "Gruppenstunde";
    let start_at = "";
    let end_at = "";
    let location = "";
    let description = "";
    let packlist_required = false;
    $$renderer2.push(`<section class="card-grid grid-2"><div class="card"><h2 class="page-title">Kalender</h2> <div class="actions"><a class="btn btn-outline"${attr("href", webcalUrl)}>Kalender abonnieren</a></div></div> `);
    if (store_get($$store_subs ??= {}, "$session", session)?.role === "admin") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="card"><h3 class="section-title">${escape_html("Neuer Termin")}</h3> <form class="form-grid"><div class="field"><label for="title">Titel</label> <input id="title" class="input"${attr("value", title)} required/></div> <div class="field"><label for="type">Typ</label> `);
      $$renderer2.select({ id: "type", class: "select", value: type }, ($$renderer3) => {
        $$renderer3.option({}, ($$renderer4) => {
          $$renderer4.push(`Gruppenstunde`);
        });
        $$renderer3.option({}, ($$renderer4) => {
          $$renderer4.push(`Lager`);
        });
        $$renderer3.option({}, ($$renderer4) => {
          $$renderer4.push(`Aktion`);
        });
        $$renderer3.option({}, ($$renderer4) => {
          $$renderer4.push(`Sonstiges`);
        });
      });
      $$renderer2.push(`</div> <div class="field"><label for="start">Start</label> <input id="start" class="input" type="datetime-local"${attr("value", start_at)} required/></div> <div class="field"><label for="end">Ende</label> <input id="end" class="input" type="datetime-local"${attr("value", end_at)} required/></div> <div class="field"><label for="location">Ort</label> <input id="location" class="input"${attr("value", location)} required/></div> <div class="field"><label for="description">Beschreibung</label> <textarea id="description" class="textarea" rows="3">`);
      const $$body = escape_html(description);
      if ($$body) {
        $$renderer2.push(`${$$body}`);
      }
      $$renderer2.push(`</textarea></div> <label class="toggle"><input type="checkbox"${attr("checked", packlist_required, true)}/> Packliste erforderlich</label> <div class="actions"><button class="btn btn-primary" type="submit">Speichern</button> `);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div></form></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></section> <section class="card-grid">`);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="card">Lade Termine...</div>`);
    }
    $$renderer2.push(`<!--]--></section>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
