import { a as attr, s as store_get, u as unsubscribe_stores } from "../../../chunks/index2.js";
import { s as session } from "../../../chunks/auth.js";
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
    const typeOptions = [
      { value: "Gruppenstunde", label: "Gruppe" },
      { value: "Lager", label: "Lager" },
      { value: "Aktion", label: "Aktion" },
      { value: "Sonstiges", label: "Sonstiges" }
    ];
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="page-stack"><section class="page-intro"><p class="page-kicker">Kalender</p> <h1 class="page-title">Termine, Zusagen und Überblick.</h1> <p class="page-description">Plane Treffen und halte Rückmeldungen direkt im selben Ablauf zusammen.</p></section> `);
      Card($$renderer3, {
        title: "Kalender abonnieren",
        description: "Abonniere alle Termine direkt im Kalender deiner Wahl.",
        $$slots: {
          actions: ($$renderer4) => {
            $$renderer4.push(`<div slot="actions"><a class="btn btn-outline"${attr("href", webcalUrl)}>ICS abonnieren</a></div>`);
          }
        }
      });
      $$renderer3.push(`<!----> `);
      if (store_get($$store_subs ??= {}, "$session", session)?.role === "admin") {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div>`);
        Card($$renderer3, {
          title: "Neuer Termin",
          description: "Die Eingaben sind in kleine Abschnitte gegliedert, damit der Termin schnell gepflegt werden kann.",
          children: ($$renderer4) => {
            $$renderer4.push(`<form class="page-stack"><div class="split-grid">`);
            Card($$renderer4, {
              title: "Grunddaten",
              description: "Titel, Typ und Ort des Termins.",
              children: ($$renderer5) => {
                $$renderer5.push(`<div class="form-grid"><div class="field"><label for="title">Titel</label> <input id="title" class="input"${attr("value", title)} required/></div> <div class="field"><p class="fieldset-label">Terminart</p> `);
                SegmentedControl($$renderer5, {
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
                $$renderer5.push(`<!----></div> <div class="field"><label for="location">Ort</label> <input id="location" class="input"${attr("value", location)} required/></div></div>`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> `);
            Card($$renderer4, {
              title: "Zeitraum",
              description: "Start und Ende in lokaler Zeit.",
              children: ($$renderer5) => {
                $$renderer5.push(`<div class="form-grid"><div class="field"><label for="start">Beginn</label> <input id="start" class="input" type="datetime-local"${attr("value", start_at)} required/></div> <div class="field"><label for="end">Ende</label> <input id="end" class="input" type="datetime-local"${attr("value", end_at)} required/></div> <div class="toggle-row"><div class="list-meta"><strong>Packliste einplanen</strong> <span class="text-muted">Für Lager und Aktionen direkt vorbereiten.</span></div> <label class="toggle"><input type="checkbox"${attr("checked", packlist_required, true)}/></label></div></div>`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----></div> `);
            Card($$renderer4, {
              title: "Notiz",
              description: "Zusätzliche Hinweise für Leitung und Teilnehmende.",
              children: ($$renderer5) => {
                $$renderer5.push(`<div class="field"><label for="description">Beschreibung</label> <textarea id="description" class="textarea" rows="4">`);
                const $$body = escape_html(description);
                if ($$body) {
                  $$renderer5.push(`${$$body}`);
                }
                $$renderer5.push(`</textarea></div>`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> <div class="actions"><button class="btn btn-primary" type="submit">Speichern</button> `);
            {
              $$renderer4.push("<!--[!-->");
            }
            $$renderer4.push(`<!--]--></div></form>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      {
        $$renderer3.push("<!--[-->");
        Card($$renderer3, {
          title: "Termine",
          description: "Die Termine werden geladen.",
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
