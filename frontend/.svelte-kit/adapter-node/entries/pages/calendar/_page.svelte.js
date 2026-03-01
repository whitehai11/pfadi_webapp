import { a as attr, s as store_get, c as attr_class, u as unsubscribe_stores } from "../../../chunks/index2.js";
import { a as session } from "../../../chunks/auth.js";
import "../../../chunks/toast.js";
import { C as Card } from "../../../chunks/Card.js";
import { S as SegmentedControl } from "../../../chunks/SegmentedControl.js";
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
    let formSubmitting = false;
    let formErrors = {};
    const typeOptions = [
      { value: "Gruppenstunde", label: "Gruppe" },
      { value: "Lager", label: "Lager" },
      { value: "Aktion", label: "Aktion" },
      { value: "Sonstiges", label: "Sonstiges" }
    ];
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="page-stack"><section class="page-intro"><h1 class="page-title">Kalender</h1></section> `);
      Card($$renderer3, {
        title: "Kalender abonnieren",
        $$slots: {
          actions: ($$renderer4) => {
            $$renderer4.push(`<div slot="actions"><a class="btn btn-outline"${attr("href", webcalUrl)}>ICS abonnieren</a></div>`);
          }
        }
      });
      $$renderer3.push(`<!----> `);
      if (store_get($$store_subs ??= {}, "$session", session)?.role === "admin") {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div id="new-event-form"><section class="page-stack"><h2 class="section-title">${escape_html("Neuer Termin")}</h2> <form class="page-stack"><section class="section-block"><h3 class="section-title">Grunddaten</h3> <div class="form-grid"><div class="field"><label for="title">Titel</label> <input id="title"${attr_class("input", void 0, { "input-invalid": Boolean(formErrors.title) })}${attr("value", title)} required maxlength="140"/> `);
        if (formErrors.title) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="field-error">${escape_html(formErrors.title)}</p>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></div> <div class="field"><p class="fieldset-label">Terminart</p> `);
        SegmentedControl($$renderer3, {
          options: typeOptions,
          ariaLabel: "Terminart",
          get value() {
            return type;
          },
          set value($$value) {
            type = $$value;
            $$settled = false;
          }
        });
        $$renderer3.push(`<!----></div> <div class="field"><label for="location">Ort</label> <input id="location"${attr_class("input", void 0, { "input-invalid": Boolean(formErrors.location) })}${attr("value", location)} required maxlength="140"/> `);
        if (formErrors.location) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="field-error">${escape_html(formErrors.location)}</p>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></div></div></section> <section class="section-block"><h3 class="section-title">Zeitraum</h3> <div class="form-grid"><div class="field"><label for="start">Beginn</label> <input id="start"${attr_class("input", void 0, { "input-invalid": Boolean(formErrors.start_at) })} type="datetime-local"${attr("value", start_at)} required/> `);
        if (formErrors.start_at) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="field-error">${escape_html(formErrors.start_at)}</p>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></div> <div class="field"><label for="end">Ende</label> <input id="end"${attr_class("input", void 0, { "input-invalid": Boolean(formErrors.end_at) })} type="datetime-local"${attr("value", end_at)} required/> `);
        if (formErrors.end_at) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="field-error">${escape_html(formErrors.end_at)}</p>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></div> <div class="toggle-row"><div class="list-meta"><strong>Packliste einplanen</strong></div> <label class="toggle"><input type="checkbox"${attr("checked", packlist_required, true)}/></label></div></div></section> <section class="section-block"><h3 class="section-title">Notiz</h3> <div class="field"><label for="description">Beschreibung</label> <textarea id="description"${attr_class("textarea", void 0, { "input-invalid": Boolean(formErrors.description) })} rows="4" maxlength="4000">`);
        const $$body = escape_html(description);
        if ($$body) {
          $$renderer3.push(`${$$body}`);
        }
        $$renderer3.push(`</textarea> `);
        if (formErrors.description) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="field-error">${escape_html(formErrors.description)}</p>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></div></section> <div class="actions"><button class="btn btn-primary" type="submit"${attr("disabled", formSubmitting, true)}>`);
        {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--> ${escape_html("Speichern")}</button> `);
        {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></div></form></section></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      {
        $$renderer3.push("<!--[-->");
        Card($$renderer3, {
          title: "Termine",
          children: ($$renderer4) => {
            $$renderer4.push(`<p class="text-muted">Laden...</p>`);
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
