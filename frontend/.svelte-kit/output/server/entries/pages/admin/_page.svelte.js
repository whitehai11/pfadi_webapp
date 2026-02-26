import { s as store_get, e as ensure_array_like, a as attr, u as unsubscribe_stores } from "../../../chunks/index2.js";
import { C as Card } from "../../../chunks/Card.js";
import { S as SegmentedControl } from "../../../chunks/SegmentedControl.js";
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
      { value: "availability-missing", label: "Ruckmeldung fehlt" },
      { value: "packlist-missing", label: "Packliste fehlt" },
      {
        value: "packlist-incomplete",
        label: "Packliste unvollstandig"
      },
      { value: "event-created", label: "Termin erstellt" },
      { value: "event-updated", label: "Termin geandert" },
      { value: "event-canceled", label: "Termin abgesagt" },
      { value: "inventory-low", label: "Material unter Mindestmenge" },
      {
        value: "weekly-admin",
        label: "Wochentliche Admin-Erinnerung"
      }
    ];
    const roleOptions = [
      { value: "", label: "Alle" },
      { value: "user", label: "Nutzer" },
      { value: "materialwart", label: "Material" },
      { value: "admin", label: "Admin" }
    ];
    const leadUnitOptions = [
      { value: "hours", label: "Stunden" },
      { value: "days", label: "Tage" },
      { value: "weeks", label: "Wochen" }
    ];
    const scheduleOptions = [
      { value: "", label: "Kein" },
      { value: "daily", label: "Taglich" },
      { value: "weekly", label: "Wochentlich" },
      { value: "monthly", label: "Monatlich" }
    ];
    const eventTypeOptions = [
      { value: "", label: "Alle" },
      { value: "Gruppenstunde", label: "Gruppe" },
      { value: "Lager", label: "Lager" },
      { value: "Aktion", label: "Aktion" },
      { value: "Sonstiges", label: "Sonstiges" }
    ];
    const reminderAudienceOptions = [
      { value: "", label: "Alle passenden" },
      { value: "user", label: "Teilnehmende" },
      { value: "materialwart", label: "Materialteam" },
      { value: "admin", label: "Leitung" }
    ];
    const isKnownRuleType = (value) => ruleTypes.some((type) => type.value === value);
    const isScheduleRule = (ruleType) => [
      "availability-missing",
      "packlist-missing",
      "packlist-incomplete",
      "weekly-admin",
      "inventory-low"
    ].includes(ruleType);
    const ruleLabel = (value) => ruleTypes.find((type) => type.value === value)?.label ?? value;
    const reminderRoleLabel = (value) => reminderAudienceOptions.find((option) => option.value === value)?.label ?? "Alle passenden";
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="page-stack"><section class="page-intro"><p class="page-kicker">Admin</p> <h1 class="page-title">Systemsteuerung fur Team und Hinweise.</h1> <p class="page-description">Rollen, Feature-Flags und Push-Regeln bleiben getrennt und gut lesbar organisiert.</p></section> `);
      if (!store_get($$store_subs ??= {}, "$session", session) || store_get($$store_subs ??= {}, "$session", session).role !== "admin") {
        $$renderer3.push("<!--[-->");
        Card($$renderer3, {
          title: "Kein Zugriff",
          description: "Dieser Bereich ist nur fur Admins sichtbar.",
          children: ($$renderer4) => {
            $$renderer4.push(`<p class="text-muted">Bitte mit einem Administrationskonto anmelden.</p>`);
          },
          $$slots: { default: true }
        });
      } else {
        $$renderer3.push("<!--[!-->");
        {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--> <section class="split-grid">`);
        Card($$renderer3, {
          title: "Rollenverwaltung",
          description: "Rollen konnen direkt und ohne Seitenwechsel angepasst werden.",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="hairline-list"><!--[-->`);
            const each_array = ensure_array_like(users);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let user = each_array[$$index];
              $$renderer4.push(`<div class="list-row"><div class="list-meta"><strong>${escape_html(user.email)}</strong> <span class="text-muted">Benutzerrolle</span></div> `);
              $$renderer4.select({ class: "select", value: user.role }, ($$renderer5) => {
                $$renderer5.option({ value: "user" }, ($$renderer6) => {
                  $$renderer6.push(`Nutzer`);
                });
                $$renderer5.option({ value: "materialwart" }, ($$renderer6) => {
                  $$renderer6.push(`Materialwart`);
                });
                $$renderer5.option({ value: "admin" }, ($$renderer6) => {
                  $$renderer6.push(`Admin`);
                });
              });
              $$renderer4.push(`</div>`);
            }
            $$renderer4.push(`<!--]--></div>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Card($$renderer3, {
          title: "Feature-Flags",
          description: "Systemschalter beeinflussen Verhalten direkt nach dem Speichern.",
          children: ($$renderer4) => {
            $$renderer4.push(`<!--[-->`);
            const each_array_1 = ensure_array_like(settings);
            for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
              let item = each_array_1[$$index_1];
              if (item.key === "nfc_enabled") {
                $$renderer4.push("<!--[-->");
                $$renderer4.push(`<div class="toggle-row"><div class="list-meta"><strong>NFC aktivieren</strong> <span class="text-muted">NFC-Kennungen fur Material anzeigen und schreiben.</span></div> <label class="toggle"><input type="checkbox"${attr("checked", item.value === "true", true)}/></label></div>`);
              } else {
                $$renderer4.push("<!--[!-->");
              }
              $$renderer4.push(`<!--]-->`);
            }
            $$renderer4.push(`<!--]-->`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></section> <section class="split-grid">`);
        Card($$renderer3, {
          title: "Ruhezeiten",
          description: "In diesem Zeitraum werden Benachrichtigungen nicht versendet.",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="split-grid"><div class="field"><label for="quietStart">Beginn</label> <input id="quietStart" class="input" type="time"${attr("value", quietStart)}/></div> <div class="field"><label for="quietEnd">Ende</label> <input id="quietEnd" class="input" type="time"${attr("value", quietEnd)}/></div></div> <div class="actions"><button class="btn btn-primary" type="button">Ruhezeiten speichern</button></div>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Card($$renderer3, {
          title: "Push-Test",
          description: "Prufe, ob Benachrichtigungen am Gerat ankommen.",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="actions"><button class="btn btn-outline" type="button">Test-Benachrichtigung senden</button> <button class="btn btn-primary" type="button">Neue Regel</button></div> `);
            {
              $$renderer4.push("<!--[!-->");
            }
            $$renderer4.push(`<!--]-->`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></section> `);
        Card($$renderer3, {
          title: "Push-Regeln",
          description: "Jede Regel bleibt in vier klare Abschnitte gegliedert.",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="card-grid"><!--[-->`);
            const each_array_2 = ensure_array_like(rules);
            for (let $$index_6 = 0, $$length = each_array_2.length; $$index_6 < $$length; $$index_6++) {
              let rule = each_array_2[$$index_6];
              Card($$renderer4, {
                title: ruleLabel(rule.rule_type),
                description: "Erinnerungen und Trigger fur Termine, Material und Packlisten.",
                interactive: true,
                children: ($$renderer5) => {
                  if (rule.rule_type === "event-reminder") {
                    $$renderer5.push("<!--[-->");
                    $$renderer5.push(`<div class="split-grid reminder-form svelte-1jef3w8">`);
                    Card($$renderer5, {
                      title: "Zeitraum",
                      description: "Lege fest, auf welche Termine sich die Erinnerung bezieht und wie fruh sie ankommen soll.",
                      children: ($$renderer6) => {
                        $$renderer6.push(`<div class="form-grid"><div class="field"><label${attr("for", `rule-lead-${rule.id}`)}>Wie lange vorher soll erinnert werden?</label> <input${attr("id", `rule-lead-${rule.id}`)} class="input" type="number" min="1"${attr("value", rule.lead_value)}/> <p class="hint">Die Erinnerung wird vor dem Termin zu diesem Zeitpunkt verschickt.</p></div> <div class="field"><p class="fieldset-label">Zeiteinheit</p> `);
                        SegmentedControl($$renderer6, {
                          options: leadUnitOptions,
                          ariaLabel: "Zeiteinheit fur Vorlauf",
                          get value() {
                            return rule.lead_unit;
                          },
                          set value($$value) {
                            rule.lead_unit = $$value;
                            $$settled = false;
                          }
                        });
                        $$renderer6.push(`<!----></div> <div class="field"><p class="fieldset-label">Welche Termine sollen berucksichtigt werden?</p> `);
                        SegmentedControl($$renderer6, {
                          options: eventTypeOptions,
                          ariaLabel: "Terminart",
                          get value() {
                            return rule.event_type;
                          },
                          set value($$value) {
                            rule.event_type = $$value;
                            $$settled = false;
                          }
                        });
                        $$renderer6.push(`<!----> <p class="hint">Wenn du nichts einschrankst, gilt die Erinnerung fur alle Terminarten.</p></div></div>`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer5.push(`<!----> `);
                    Card($$renderer5, {
                      title: "Erinnerung",
                      description: "Hier bestimmst du, wann die Nachricht verschickt werden darf und wie oft sie wiederkommt.",
                      children: ($$renderer6) => {
                        $$renderer6.push(`<div class="form-grid"><div class="field"><label${attr("for", `rule-send-start-${rule.id}`)}>Ab wann darf die Erinnerung verschickt werden?</label> <input${attr("id", `rule-send-start-${rule.id}`)} class="input" type="time"${attr("value", rule.send_start)}/></div> <div class="field"><label${attr("for", `rule-send-end-${rule.id}`)}>Bis wann darf sie verschickt werden?</label> <input${attr("id", `rule-send-end-${rule.id}`)} class="input" type="time"${attr("value", rule.send_end)}/></div> <div class="field"><label${attr("for", `rule-cooldown-${rule.id}`)}>Wie oft soll erinnert werden?</label> <input${attr("id", `rule-cooldown-${rule.id}`)} class="input" type="number" min="0"${attr("value", rule.cooldown_hours)}/> <p class="hint">Gib an, wie viele Stunden zwischen zwei Erinnerungen mindestens liegen sollen.</p></div> <div class="field"><label${attr("for", `rule-start-date-${rule.id}`)}>Ab welchem Datum soll die Regel gelten?</label> <input${attr("id", `rule-start-date-${rule.id}`)} class="input" type="date"${attr("value", rule.schedule_start_date)}/></div> <div class="field"><p class="fieldset-label">Wie regelmassig soll gepruft werden?</p> `);
                        SegmentedControl($$renderer6, {
                          options: scheduleOptions,
                          ariaLabel: "Rhythmus",
                          get value() {
                            return rule.schedule_every;
                          },
                          set value($$value) {
                            rule.schedule_every = $$value;
                            $$settled = false;
                          }
                        });
                        $$renderer6.push(`<!----></div> <div class="field"><label${attr("for", `rule-schedule-time-${rule.id}`)}>Zu welcher Uhrzeit soll gepruft werden?</label> <input${attr("id", `rule-schedule-time-${rule.id}`)} class="input" type="time"${attr("value", rule.schedule_time)}/></div></div>`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer5.push(`<!----> `);
                    Card($$renderer5, {
                      title: "Zielgruppe",
                      description: "Bestimme, wen die Erinnerung erreicht. Du kannst alle oder nur einzelne Personen ansprechen.",
                      children: ($$renderer6) => {
                        $$renderer6.push(`<div class="form-grid"><div class="field"><label${attr("for", `rule-role-${rule.id}`)}>Wen mochtest du erinnern?</label> `);
                        $$renderer6.select(
                          {
                            id: `rule-role-${rule.id}`,
                            class: "select",
                            value: rule.target_role
                          },
                          ($$renderer7) => {
                            $$renderer7.push(`<!--[-->`);
                            const each_array_3 = ensure_array_like(reminderAudienceOptions);
                            for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
                              let option = each_array_3[$$index_2];
                              $$renderer7.option({ value: option.value }, ($$renderer8) => {
                                $$renderer8.push(`${escape_html(option.label)}`);
                              });
                            }
                            $$renderer7.push(`<!--]-->`);
                          }
                        );
                        $$renderer6.push(` <p class="hint">Aktuell ausgewahlt: ${escape_html(reminderRoleLabel(rule.target_role))}</p></div> <div class="field"><label${attr("for", `rule-user-${rule.id}`)}>Nur eine bestimmte Person erinnern?</label> `);
                        $$renderer6.select(
                          {
                            id: `rule-user-${rule.id}`,
                            class: "select",
                            value: rule.target_user_id
                          },
                          ($$renderer7) => {
                            $$renderer7.option({ value: "" }, ($$renderer8) => {
                              $$renderer8.push(`Nein, an alle passenden Personen senden`);
                            });
                            $$renderer7.push(`<!--[-->`);
                            const each_array_4 = ensure_array_like(users);
                            for (let $$index_3 = 0, $$length2 = each_array_4.length; $$index_3 < $$length2; $$index_3++) {
                              let user = each_array_4[$$index_3];
                              $$renderer7.option({ value: user.id }, ($$renderer8) => {
                                $$renderer8.push(`${escape_html(user.email)}`);
                              });
                            }
                            $$renderer7.push(`<!--]-->`);
                          }
                        );
                        $$renderer6.push(`</div></div>`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer5.push(`<!----> `);
                    Card($$renderer5, {
                      title: "Nachricht",
                      description: "Schreibe den Ton so, wie du ihn selbst gern erhalten wurdest: klar, freundlich und direkt.",
                      children: ($$renderer6) => {
                        $$renderer6.push(`<div class="form-grid"><div class="field"><label${attr("for", `rule-title-${rule.id}`)}>Wie soll die Erinnerung heissen?</label> <input${attr("id", `rule-title-${rule.id}`)} class="input"${attr("value", rule.title_template)} placeholder="z. B. Erinnerung an den nachsten Termin"/></div> <div class="field"><label${attr("for", `rule-body-${rule.id}`)}>Was mochtest du den Teilnehmenden sagen?</label> <textarea${attr("id", `rule-body-${rule.id}`)} class="textarea" rows="4" placeholder="z. B. Denk bitte daran, uns kurz Bescheid zu geben, ob du dabei bist.">`);
                        const $$body = escape_html(rule.body_template);
                        if ($$body) {
                          $$renderer6.push(`${$$body}`);
                        }
                        $$renderer6.push(`</textarea> <p class="hint">Du kannst Platzhalter wie {event.title} oder {event.start} verwenden.</p></div></div>`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer5.push(`<!----></div>`);
                  } else {
                    $$renderer5.push("<!--[!-->");
                    $$renderer5.push(`<div class="split-grid">`);
                    Card($$renderer5, {
                      title: "Zeitraum",
                      description: "Wann die Erinnerung greift und in welchem Kontext sie gilt.",
                      children: ($$renderer6) => {
                        $$renderer6.push(`<div class="form-grid"><div class="field"><label${attr("for", `rule-type-${rule.id}`)}>Regeltyp</label> `);
                        $$renderer6.select(
                          {
                            id: `rule-type-${rule.id}`,
                            class: "select",
                            value: rule.rule_type
                          },
                          ($$renderer7) => {
                            $$renderer7.push(`<!--[-->`);
                            const each_array_5 = ensure_array_like(ruleTypes);
                            for (let $$index_4 = 0, $$length2 = each_array_5.length; $$index_4 < $$length2; $$index_4++) {
                              let type = each_array_5[$$index_4];
                              $$renderer7.option({ value: type.value }, ($$renderer8) => {
                                $$renderer8.push(`${escape_html(type.label)}`);
                              });
                            }
                            $$renderer7.push(`<!--]-->`);
                            if (rule.rule_type && !isKnownRuleType(rule.rule_type)) {
                              $$renderer7.push("<!--[-->");
                              $$renderer7.option({ value: rule.rule_type }, ($$renderer8) => {
                                $$renderer8.push(`Benutzerdefiniert`);
                              });
                            } else {
                              $$renderer7.push("<!--[!-->");
                            }
                            $$renderer7.push(`<!--]-->`);
                          }
                        );
                        $$renderer6.push(`</div> <div class="field"><label${attr("for", `rule-send-start-${rule.id}`)}>Start der Erinnerung</label> <input${attr("id", `rule-send-start-${rule.id}`)} class="input" type="time"${attr("value", rule.send_start)}/></div> <div class="field"><label${attr("for", `rule-send-end-${rule.id}`)}>Ende der Erinnerung</label> <input${attr("id", `rule-send-end-${rule.id}`)} class="input" type="time"${attr("value", rule.send_end)}/></div> <div class="field"><p class="fieldset-label">Terminart</p> `);
                        SegmentedControl($$renderer6, {
                          options: eventTypeOptions,
                          ariaLabel: "Terminart",
                          get value() {
                            return rule.event_type;
                          },
                          set value($$value) {
                            rule.event_type = $$value;
                            $$settled = false;
                          }
                        });
                        $$renderer6.push(`<!----></div></div>`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer5.push(`<!----> `);
                    Card($$renderer5, {
                      title: "Wiederholung",
                      description: "Rhythmus, Startdatum und Erinnerungsintervall.",
                      children: ($$renderer6) => {
                        $$renderer6.push(`<div class="form-grid"><div class="field"><label${attr("for", `rule-start-date-${rule.id}`)}>Startdatum</label> <input${attr("id", `rule-start-date-${rule.id}`)} class="input" type="date"${attr("value", rule.schedule_start_date)}/></div> <div class="field"><p class="fieldset-label">Rhythmus</p> `);
                        SegmentedControl($$renderer6, {
                          options: scheduleOptions,
                          ariaLabel: "Rhythmus",
                          get value() {
                            return rule.schedule_every;
                          },
                          set value($$value) {
                            rule.schedule_every = $$value;
                            $$settled = false;
                          }
                        });
                        $$renderer6.push(`<!----></div> <div class="field"><label${attr("for", `rule-schedule-time-${rule.id}`)}>Uhrzeit</label> <input${attr("id", `rule-schedule-time-${rule.id}`)} class="input" type="time"${attr("value", rule.schedule_time)}/></div> <div class="field"><label${attr("for", `rule-cooldown-${rule.id}`)}>Erinnerungsintervall (Stunden)</label> <input${attr("id", `rule-cooldown-${rule.id}`)} class="input" type="number" min="0"${attr("value", rule.cooldown_hours)}/></div> `);
                        if (!isScheduleRule(rule.rule_type)) {
                          $$renderer6.push("<!--[-->");
                          $$renderer6.push(`<p class="text-muted">Diese Regel wird primar ereignisbasiert ausgelost.</p>`);
                        } else {
                          $$renderer6.push("<!--[!-->");
                        }
                        $$renderer6.push(`<!--]--></div>`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer5.push(`<!----></div> <div class="split-grid">`);
                    Card($$renderer5, {
                      title: "Teilnehmer",
                      description: "Fur wen die Nachricht gedacht ist.",
                      children: ($$renderer6) => {
                        $$renderer6.push(`<div class="form-grid"><div class="field"><p class="fieldset-label">Rolle</p> `);
                        SegmentedControl($$renderer6, {
                          options: roleOptions,
                          ariaLabel: "Zielrolle",
                          get value() {
                            return rule.target_role;
                          },
                          set value($$value) {
                            rule.target_role = $$value;
                            $$settled = false;
                          }
                        });
                        $$renderer6.push(`<!----></div> <div class="field"><label${attr("for", `rule-user-${rule.id}`)}>Bestimmter Nutzer</label> `);
                        $$renderer6.select(
                          {
                            id: `rule-user-${rule.id}`,
                            class: "select",
                            value: rule.target_user_id
                          },
                          ($$renderer7) => {
                            $$renderer7.option({ value: "" }, ($$renderer8) => {
                              $$renderer8.push(`Alle Nutzer`);
                            });
                            $$renderer7.push(`<!--[-->`);
                            const each_array_6 = ensure_array_like(users);
                            for (let $$index_5 = 0, $$length2 = each_array_6.length; $$index_5 < $$length2; $$index_5++) {
                              let user = each_array_6[$$index_5];
                              $$renderer7.option({ value: user.id }, ($$renderer8) => {
                                $$renderer8.push(`${escape_html(user.email)}`);
                              });
                            }
                            $$renderer7.push(`<!--]-->`);
                          }
                        );
                        $$renderer6.push(`</div> `);
                        if (rule.rule_type === "availability-missing") {
                          $$renderer6.push("<!--[-->");
                          $$renderer6.push(`<div class="field"><label${attr("for", `rule-min-response-${rule.id}`)}>Mindest-Zusagen (%)</label> <input${attr("id", `rule-min-response-${rule.id}`)} class="input" type="number" min="0" max="100"${attr("value", rule.min_response_percent)}/></div>`);
                        } else {
                          $$renderer6.push("<!--[!-->");
                        }
                        $$renderer6.push(`<!--]--></div>`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer5.push(`<!----> `);
                    Card($$renderer5, {
                      title: "Nachricht",
                      description: "Titel und Text der Benachrichtigung.",
                      children: ($$renderer6) => {
                        $$renderer6.push(`<div class="form-grid"><div class="field"><label${attr("for", `rule-title-${rule.id}`)}>Titel</label> <input${attr("id", `rule-title-${rule.id}`)} class="input"${attr("value", rule.title_template)} placeholder="z. B. Termin-Erinnerung"/></div> <div class="field"><label${attr("for", `rule-body-${rule.id}`)}>Nachricht</label> <textarea${attr("id", `rule-body-${rule.id}`)} class="textarea" rows="4">`);
                        const $$body_1 = escape_html(rule.body_template);
                        if ($$body_1) {
                          $$renderer6.push(`${$$body_1}`);
                        }
                        $$renderer6.push(`</textarea></div></div> <div class="rule-template-list text-muted"><span>Variablen: {event.title}, {event.start}, {event.end}, {event.type}, {event.location}</span> <span>{user.name}, {user.role}, {item.name}, {item.quantity}, {item.min_quantity}</span></div>`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer5.push(`<!----></div>`);
                  }
                  $$renderer5.push(`<!--]-->`);
                },
                $$slots: {
                  default: true,
                  actions: ($$renderer5) => {
                    $$renderer5.push(`<div slot="actions" class="actions"><span class="badge badge-secondary">${escape_html(rule.rule_type)}</span> <div class="toggle-row reminder-toggle svelte-1jef3w8"><div class="list-meta"><strong>Erinnerung aktiv</strong> <span class="text-muted">Nur aktive Erinnerungen werden verschickt.</span></div> <label class="toggle"><input type="checkbox"${attr("checked", rule.enabled, true)}/></label></div> <button class="btn btn-outline" type="button">Speichern</button> <button class="btn btn-danger" type="button">Loschen</button></div>`);
                  }
                }
              });
            }
            $$renderer4.push(`<!--]--></div>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!---->`);
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
