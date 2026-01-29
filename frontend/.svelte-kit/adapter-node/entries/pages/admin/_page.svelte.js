import { a0 as store_get, a5 as ensure_array_like, Z as attr, a4 as unsubscribe_stores } from "../../../chunks/index2.js";
import { s as session } from "../../../chunks/auth.js";
import { e as escape_html } from "../../../chunks/escaping.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let users = [];
    let settings = [];
    let rules = [];
    let quietStart = "21:00";
    let quietEnd = "06:00";
    const ruleTypes = [
      { value: "event-reminder", label: "Termin-Erinnerung" },
      { value: "availability-missing", label: "Rückmeldung fehlt" },
      { value: "packlist-missing", label: "Packliste fehlt" },
      {
        value: "packlist-incomplete",
        label: "Packliste unvollständig"
      },
      { value: "event-created", label: "Termin erstellt" },
      { value: "event-updated", label: "Termin geändert" },
      { value: "event-canceled", label: "Termin abgesagt" },
      { value: "inventory-low", label: "Material unter Mindestmenge" },
      {
        value: "weekly-admin",
        label: "Wöchentliche Admin-Erinnerung"
      }
    ];
    const isKnownRuleType = (value) => ruleTypes.some((type) => type.value === value);
    const eventTypes = ["", "Gruppenstunde", "Lager", "Aktion", "Sonstiges"];
    const isScheduleRule = (ruleType) => [
      "availability-missing",
      "packlist-missing",
      "packlist-incomplete",
      "weekly-admin",
      "inventory-low"
    ].includes(ruleType);
    $$renderer2.push(`<section><h2 class="page-title">Admin</h2> `);
    if (!store_get($$store_subs ??= {}, "$session", session) || store_get($$store_subs ??= {}, "$session", session).role !== "admin") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-muted">Nur für Admins.</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <section class="card-grid grid-2"><div class="card"><h3 class="section-title">Rollenverwaltung</h3> <p class="text-muted">Benutzernamen und Rollen sofort ändern</p> <div class="card-grid"><!--[-->`);
      const each_array = ensure_array_like(users);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let user = each_array[$$index];
        $$renderer2.push(`<div class="actions actions-between"><span>${escape_html(user.email)}</span> `);
        $$renderer2.select({ class: "select", value: user.role }, ($$renderer3) => {
          $$renderer3.option({ value: "user" }, ($$renderer4) => {
            $$renderer4.push(`Nutzer`);
          });
          $$renderer3.option({ value: "materialwart" }, ($$renderer4) => {
            $$renderer4.push(`Materialwart`);
          });
          $$renderer3.option({ value: "admin" }, ($$renderer4) => {
            $$renderer4.push(`Admin`);
          });
        });
        $$renderer2.push(`</div>`);
      }
      $$renderer2.push(`<!--]--></div></div> <div class="card"><h3 class="section-title">Feature-Flags</h3> <p class="text-muted">Schalter wirken sofort auf die NFC-Anzeige.</p> <div class="form-grid"><!--[-->`);
      const each_array_1 = ensure_array_like(settings);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let item = each_array_1[$$index_1];
        if (item.key === "nfc_enabled") {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="actions actions-between"><div><strong>NFC aktivieren</strong> <p class="text-muted">NFC-Kennungen für Material anzeigen.</p></div> <label class="toggle"><input type="checkbox"${attr("checked", item.value === "true", true)}/></label></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></div></div></section> <section class="card"><h3 class="section-title">Ruhezeiten</h3> <p class="text-muted">Push-Benachrichtigungen werden in dieser Zeit unterdrückt.</p> <div class="form-grid"><div class="field"><label for="quietStart">Start</label> <input id="quietStart" class="input" type="time"${attr("value", quietStart)}/></div> <div class="field"><label for="quietEnd">Ende</label> <input id="quietEnd" class="input" type="time"${attr("value", quietEnd)}/></div></div> <div class="actions"><button class="btn btn-primary">Speichern</button></div></section> <section class="card"><div class="actions actions-between"><div><h3 class="section-title">Push-Regeln</h3> <p class="text-muted">Regeln für Push-Benachrichtigungen</p></div> <button class="btn btn-outline">Neue Regel</button></div> <div class="card-grid"><!--[-->`);
      const each_array_2 = ensure_array_like(rules);
      for (let $$index_5 = 0, $$length = each_array_2.length; $$index_5 < $$length; $$index_5++) {
        let rule = each_array_2[$$index_5];
        $$renderer2.push(`<div class="card"><div class="actions actions-between">`);
        $$renderer2.select({ class: "select", value: rule.rule_type }, ($$renderer3) => {
          $$renderer3.push(`<!--[-->`);
          const each_array_3 = ensure_array_like(ruleTypes);
          for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
            let type = each_array_3[$$index_2];
            $$renderer3.option({ value: type.value }, ($$renderer4) => {
              $$renderer4.push(`${escape_html(type.label)}`);
            });
          }
          $$renderer3.push(`<!--]-->`);
          if (rule.rule_type && !isKnownRuleType(rule.rule_type)) {
            $$renderer3.push("<!--[-->");
            $$renderer3.option({ value: rule.rule_type }, ($$renderer4) => {
              $$renderer4.push(`Benutzerdefiniert`);
            });
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]-->`);
        });
        $$renderer2.push(` <label class="toggle"><input type="checkbox"${attr("checked", rule.enabled, true)}/> Aktiv</label> `);
        if (rule.rule_type === "event-reminder") {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<input class="input" type="number" min="1"${attr("value", rule.lead_value)}/> `);
          $$renderer2.select({ class: "select", value: rule.lead_unit }, ($$renderer3) => {
            $$renderer3.option({ value: "hours" }, ($$renderer4) => {
              $$renderer4.push(`Stunden`);
            });
            $$renderer3.option({ value: "days" }, ($$renderer4) => {
              $$renderer4.push(`Tage`);
            });
            $$renderer3.option({ value: "weeks" }, ($$renderer4) => {
              $$renderer4.push(`Wochen`);
            });
          });
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        $$renderer2.select({ class: "select", value: rule.target_role }, ($$renderer3) => {
          $$renderer3.option({ value: "" }, ($$renderer4) => {
            $$renderer4.push(`Alle Rollen`);
          });
          $$renderer3.option({ value: "user" }, ($$renderer4) => {
            $$renderer4.push(`Nutzer`);
          });
          $$renderer3.option({ value: "materialwart" }, ($$renderer4) => {
            $$renderer4.push(`Materialwart`);
          });
          $$renderer3.option({ value: "admin" }, ($$renderer4) => {
            $$renderer4.push(`Admin`);
          });
        });
        $$renderer2.push(` `);
        $$renderer2.select({ class: "select", value: rule.target_user_id }, ($$renderer3) => {
          $$renderer3.option({ value: "" }, ($$renderer4) => {
            $$renderer4.push(`Alle Nutzer`);
          });
          $$renderer3.push(`<!--[-->`);
          const each_array_4 = ensure_array_like(users);
          for (let $$index_3 = 0, $$length2 = each_array_4.length; $$index_3 < $$length2; $$index_3++) {
            let user = each_array_4[$$index_3];
            $$renderer3.option({ value: user.id }, ($$renderer4) => {
              $$renderer4.push(`${escape_html(user.email)}`);
            });
          }
          $$renderer3.push(`<!--]-->`);
        });
        $$renderer2.push(` <div class="actions"><button class="btn btn-primary">Speichern</button> <button class="btn btn-danger">Löschen</button></div></div> <div class="form-grid"><div class="field"><label${attr("for", `rule-${rule.id}-send-start`)}>Fenster-Start</label> <input${attr("id", `rule-${rule.id}-send-start`)} class="input" type="time"${attr("value", rule.send_start)}/></div> <div class="field"><label${attr("for", `rule-${rule.id}-send-end`)}>Fenster-Ende</label> <input${attr("id", `rule-${rule.id}-send-end`)} class="input" type="time"${attr("value", rule.send_end)}/></div> <div class="field"><label${attr("for", `rule-${rule.id}-cooldown`)}>Cooldown (Stunden)</label> <input${attr("id", `rule-${rule.id}-cooldown`)} class="input" type="number" min="0"${attr("value", rule.cooldown_hours)}/></div> <div class="field"><label${attr("for", `rule-${rule.id}-event-type`)}>Event-Typ</label> `);
        $$renderer2.select(
          {
            id: `rule-${rule.id}-event-type`,
            class: "select",
            value: rule.event_type
          },
          ($$renderer3) => {
            $$renderer3.push(`<!--[-->`);
            const each_array_5 = ensure_array_like(eventTypes);
            for (let $$index_4 = 0, $$length2 = each_array_5.length; $$index_4 < $$length2; $$index_4++) {
              let type = each_array_5[$$index_4];
              $$renderer3.option({ value: type }, ($$renderer4) => {
                $$renderer4.push(`${escape_html(type === "" ? "Alle Typen" : type)}`);
              });
            }
            $$renderer3.push(`<!--]-->`);
          }
        );
        $$renderer2.push(`</div> `);
        if (rule.rule_type === "availability-missing") {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="field"><label${attr("for", `rule-${rule.id}-min-response`)}>Min. Rückmeldungen (%)</label> <input${attr("id", `rule-${rule.id}-min-response`)} class="input" type="number" min="0" max="100"${attr("value", rule.min_response_percent)}/></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (isScheduleRule(rule.rule_type)) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="field"><label${attr("for", `rule-${rule.id}-start-date`)}>Startdatum</label> <input${attr("id", `rule-${rule.id}-start-date`)} class="input" type="date"${attr("value", rule.schedule_start_date)}/></div> <div class="field"><label${attr("for", `rule-${rule.id}-schedule-every`)}>Rhythmus</label> `);
          $$renderer2.select(
            {
              id: `rule-${rule.id}-schedule-every`,
              class: "select",
              value: rule.schedule_every
            },
            ($$renderer3) => {
              $$renderer3.option({ value: "" }, ($$renderer4) => {
                $$renderer4.push(`Kein Rhythmus`);
              });
              $$renderer3.option({ value: "daily" }, ($$renderer4) => {
                $$renderer4.push(`Täglich`);
              });
              $$renderer3.option({ value: "weekly" }, ($$renderer4) => {
                $$renderer4.push(`Wöchentlich`);
              });
              $$renderer3.option({ value: "monthly" }, ($$renderer4) => {
                $$renderer4.push(`Monatlich`);
              });
            }
          );
          $$renderer2.push(`</div> <div class="field"><label${attr("for", `rule-${rule.id}-schedule-time`)}>Uhrzeit</label> <input${attr("id", `rule-${rule.id}-schedule-time`)} class="input" type="time"${attr("value", rule.schedule_time)}/></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div> <div class="form-grid"><div class="field"><label${attr("for", `rule-${rule.id}-title-template`)}>Titel (Template)</label> <input${attr("id", `rule-${rule.id}-title-template`)} class="input"${attr("value", rule.title_template)} placeholder="z. B. Termin-Erinnerung"/></div> <div class="field"><label${attr("for", `rule-${rule.id}-body-template`)}>Text (Template)</label> <textarea${attr("id", `rule-${rule.id}-body-template`)} class="input" rows="3">`);
        const $$body = escape_html(rule.body_template);
        if ($$body) {
          $$renderer2.push(`${$$body}`);
        }
        $$renderer2.push(`</textarea></div></div> <p class="text-muted">Variablen: {event.title}, {event.start}, {event.end}, {event.type}, {event.location},
              {user.name}, {user.role}, {item.name}, {item.quantity}, {item.min_quantity}</p></div>`);
      }
      $$renderer2.push(`<!--]--></div></section>`);
    }
    $$renderer2.push(`<!--]--></section>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
