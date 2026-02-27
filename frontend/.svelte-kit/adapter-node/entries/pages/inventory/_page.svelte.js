import { c as attr_class, s as store_get, u as unsubscribe_stores, a as attr } from "../../../chunks/index2.js";
import { C as Card } from "../../../chunks/Card.js";
import { s as session } from "../../../chunks/auth.js";
import { e as escape_html } from "../../../chunks/escaping.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let boxContent = "";
    let boxCategory = "";
    let boxCondition = "";
    let boxNote = "";
    let activity = { type: "none", message: "Noch keine Änderungen." };
    const canEdit = (role) => role === "admin" || role === "materialwart";
    $$renderer2.push(`<div class="page-stack"><section class="page-intro"><p class="page-kicker">Material</p> <h1 class="page-title">Boxen und Kennungen geordnet pflegen.</h1> <p class="page-description">Verwalte Lagerboxen in ruhigen Karten und schreibe NFC-Daten direkt aus der App.</p></section> <section class="card activity-card"><div${attr_class(`activity-strip ${activity.type}`)}></div> <div class="activity-content"><span class="badge badge-secondary">Letzte Änderung</span> <div class="list-meta"><strong>${escape_html(activity.message)}</strong> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div></section> `);
    if (canEdit(store_get($$store_subs ??= {}, "$session", session)?.role)) {
      $$renderer2.push("<!--[-->");
      Card($$renderer2, {
        title: "Neue Box",
        description: "Lege eine neue Materialbox mit kurzen Zusatzinformationen an.",
        children: ($$renderer3) => {
          $$renderer3.push(`<form class="split-grid"><div class="form-grid"><div class="field"><label for="boxContent">Name oder Inhalt</label> <input id="boxContent" class="input"${attr("value", boxContent)} required/></div> <div class="field"><label for="boxCategory">Kategorie</label> <input id="boxCategory" class="input"${attr("value", boxCategory)}/></div></div> <div class="form-grid"><div class="field"><label for="boxCondition">Zustand</label> <input id="boxCondition" class="input"${attr("value", boxCondition)}/></div> <div class="field"><label for="boxNote">Hinweis</label> <input id="boxNote" class="input"${attr("value", boxNote)}/></div></div> <div class="actions" style="grid-column: 1 / -1;">`);
          {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--> <button class="btn btn-primary" type="submit">Box anlegen</button></div></form>`);
        },
        $$slots: { default: true }
      });
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    Card($$renderer2, {
      title: "Alle Boxen",
      description: "Bestehende Boxen inklusive Kennung und NFC-Aktionen.",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="text-muted">Lade Boxen...</p>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
