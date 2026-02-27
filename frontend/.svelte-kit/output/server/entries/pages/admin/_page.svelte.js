import { b as attr_class, a as attr, c as bind_props, g as sanitize_slots, f as slot, s as store_get, e as ensure_array_like, j as stringify, u as unsubscribe_stores } from "../../../chunks/index2.js";
import { C as Card } from "../../../chunks/Card.js";
import { S as SegmentedControl } from "../../../chunks/SegmentedControl.js";
import { I as Icon } from "../../../chunks/Icon.js";
import { _ as fallback } from "../../../chunks/context.js";
import { e as escape_html } from "../../../chunks/escaping.js";
import { s as session } from "../../../chunks/auth.js";
function SettingsRow($$renderer, $$props) {
  let title = fallback($$props["title"], "");
  let subtitle = fallback($$props["subtitle"], "");
  let first = fallback($$props["first"], false);
  let last = fallback($$props["last"], false);
  let disabled = fallback($$props["disabled"], false);
  $$renderer.push(`<button type="button"${attr_class("settings-row svelte-122yhqn", void 0, { "first": first, "last": last, "disabled": disabled })}${attr("disabled", disabled, true)}><span class="settings-row__copy svelte-122yhqn"><span class="settings-row__title svelte-122yhqn">${escape_html(title)}</span> `);
  if (subtitle) {
    $$renderer.push("<!--[-->");
    $$renderer.push(`<span class="settings-row__subtitle svelte-122yhqn">${escape_html(subtitle)}</span>`);
  } else {
    $$renderer.push("<!--[!-->");
  }
  $$renderer.push(`<!--]--></span> <span class="settings-row__chevron svelte-122yhqn" aria-hidden="true">`);
  Icon($$renderer, { name: "chevron", size: 15 });
  $$renderer.push(`<!----></span></button>`);
  bind_props($$props, { title, subtitle, first, last, disabled });
}
function SlideOverDetail($$renderer, $$props) {
  const $$slots = sanitize_slots($$props);
  $$renderer.component(($$renderer2) => {
    let open = fallback($$props["open"], false);
    let title = fallback($$props["title"], "");
    let subtitle = fallback($$props["subtitle"], "");
    let onClose = fallback($$props["onClose"], void 0);
    if (open) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="slide-over svelte-z5qsmq"><button class="slide-over__backdrop svelte-z5qsmq" type="button" aria-label="Schließen"></button> <div class="slide-over__panel svelte-z5qsmq" aria-modal="true" role="dialog"${attr("aria-label", title)}><header class="slide-over__header svelte-z5qsmq"><div class="slide-over__copy svelte-z5qsmq"><p class="slide-over__eyebrow svelte-z5qsmq">Termin-Erinnerung</p> <h2 class="slide-over__title svelte-z5qsmq">${escape_html(title)}</h2> `);
      if (subtitle) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="slide-over__subtitle svelte-z5qsmq">${escape_html(subtitle)}</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div> <button class="slide-over__close svelte-z5qsmq" type="button">Fertig</button></header> <div class="slide-over__body svelte-z5qsmq"><!--[-->`);
      slot($$renderer2, $$props, "default", {});
      $$renderer2.push(`<!--]--></div> `);
      if ($$slots.footer) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<footer class="slide-over__footer svelte-z5qsmq"><!--[-->`);
        slot($$renderer2, $$props, "footer", {});
        $$renderer2.push(`<!--]--></footer>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { open, title, subtitle, onClose });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let users = [];
    let settings = [];
    let rules = [];
    let quietStart = "21:00";
    let quietEnd = "06:00";
    let activeReminderId = null;
    let activeReminderPanel = null;
    let reminderWindowEnabled = {};
    let approvalRole = {};
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
    const repeatOptions = [
      { value: "", label: "Aus" },
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
    const repeatLabel = (value) => repeatOptions.find((option) => option.value === value)?.label ?? "Aus";
    const pendingUsers = () => users.filter((user) => user.status === "pending");
    const closeReminderPanel = () => {
      activeReminderId = null;
      activeReminderPanel = null;
    };
    const formatLeadSummary = (rule) => {
      const unitMap = { hours: "Stunde", days: "Tag", weeks: "Woche" };
      const pluralMap = { hours: "Stunden", days: "Tage", weeks: "Wochen" };
      const value = Number(rule.lead_value || 1);
      const unit = value === 1 ? unitMap[rule.lead_unit] : pluralMap[rule.lead_unit];
      const eventScope = rule.event_type ? `, nur ${rule.event_type}` : "";
      return `${value} ${unit} vorher${eventScope}`;
    };
    const formatRepeatSummary = (rule) => {
      if (!rule.schedule_every) return "Keine Wiederholung";
      const cooldown = Number(rule.cooldown_hours || 0);
      const parts = [repeatLabel(rule.schedule_every)];
      if (cooldown > 0) parts.push(`alle ${cooldown} Stunden`);
      if (rule.schedule_time) parts.push(`um ${rule.schedule_time}`);
      return parts.join(", ");
    };
    const formatAudienceSummary = (rule) => {
      const selectedUser = users.find((user) => user.id === rule.target_user_id);
      if (selectedUser) return selectedUser.email;
      return reminderRoleLabel(rule.target_role);
    };
    const formatMessageSummary = (rule) => {
      const title = rule.title_template || "Ohne Titel";
      const preview = (rule.body_template || "").trim().replace(/\s+/g, " ");
      if (!preview) return title;
      const shortened = preview.length > 44 ? `${preview.slice(0, 44)}...` : preview;
      return `${title} - ${shortened}`;
    };
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="page-stack"><section class="page-intro"><p class="page-kicker">Admin</p> <h1 class="page-title">Systemsteuerung fur Team und Hinweise.</h1> <p class="page-description">Rollen, Feature-Flags und Push-Regeln bleiben getrennt und gut lesbar organisiert.</p></section> `);
      if (!store_get($$store_subs ??= {}, "$session", session) || store_get($$store_subs ??= {}, "$session", session).role !== "admin") {
        $$renderer3.push("<!--[-->");
        Card($$renderer3, {
          title: "Kein Zugriff",
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
        $$renderer3.push(`<!--]--> `);
        Card($$renderer3, {
          title: "Benutzeranfragen",
          children: ($$renderer4) => {
            if (pendingUsers().length === 0) {
              $$renderer4.push("<!--[-->");
              $$renderer4.push(`<p class="text-muted">Zurzeit warten keine neuen Accounts auf Freigabe.</p>`);
            } else {
              $$renderer4.push("<!--[!-->");
              $$renderer4.push(`<div class="hairline-list"><!--[-->`);
              const each_array = ensure_array_like(pendingUsers());
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let user = each_array[$$index];
                $$renderer4.push(`<div class="approval-row svelte-1jef3w8"><div class="list-meta"><strong>${escape_html(user.email)}</strong> <span class="text-muted">Beantragt am ${escape_html(new Date(user.created_at).toLocaleString("de-DE"))}</span></div> <div class="approval-actions svelte-1jef3w8">`);
                $$renderer4.select(
                  { class: "select", value: approvalRole[user.id] },
                  ($$renderer5) => {
                    $$renderer5.option({ value: "user" }, ($$renderer6) => {
                      $$renderer6.push(`Nutzer`);
                    });
                    $$renderer5.option({ value: "materialwart" }, ($$renderer6) => {
                      $$renderer6.push(`Materialwart`);
                    });
                    $$renderer5.option({ value: "admin" }, ($$renderer6) => {
                      $$renderer6.push(`Admin`);
                    });
                  },
                  "svelte-1jef3w8"
                );
                $$renderer4.push(` <button class="btn btn-primary" type="button">Freigeben</button> <button class="btn btn-danger" type="button">Ablehnen</button></div></div>`);
              }
              $$renderer4.push(`<!--]--></div>`);
            }
            $$renderer4.push(`<!--]-->`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> <section class="split-grid">`);
        Card($$renderer3, {
          title: "Rollenverwaltung",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="hairline-list"><!--[-->`);
            const each_array_1 = ensure_array_like(users);
            for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
              let user = each_array_1[$$index_1];
              $$renderer4.push(`<div class="list-row"><div class="list-meta"><strong>${escape_html(user.email)}</strong> <span class="text-muted">Status: ${escape_html(user.status)}</span></div> `);
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
          title: "Funktionen",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="hairline-list"><!--[-->`);
            const each_array_2 = ensure_array_like(settings.filter((item) => item.key === "chat_enabled" || item.key === "nfc_enabled"));
            for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
              let item = each_array_2[$$index_2];
              $$renderer4.push(`<div class="toggle-row"><div class="list-meta"><strong>${escape_html(item.key === "chat_enabled" ? "Chat aktivieren" : "NFC aktivieren")}</strong> <span class="text-muted">${escape_html(item.key === "chat_enabled" ? "Interne Chatraume und Dateianhange fur freigegebene Mitglieder sichtbar machen." : "NFC-Kennungen fur Material anzeigen und schreiben.")}</span></div> <label class="toggle"><input type="checkbox"${attr("checked", item.value === "true", true)}/></label></div>`);
            }
            $$renderer4.push(`<!--]--></div>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></section> <section class="split-grid">`);
        Card($$renderer3, {
          title: "Ruhezeiten",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="split-grid"><div class="field"><label for="quietStart">Beginn</label> <input id="quietStart" class="input" type="time"${attr("value", quietStart)}/></div> <div class="field"><label for="quietEnd">Ende</label> <input id="quietEnd" class="input" type="time"${attr("value", quietEnd)}/></div></div> <div class="actions"><button class="btn btn-primary" type="button">Ruhezeiten speichern</button></div>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Card($$renderer3, {
          title: "Push-Test",
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
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="card-grid"><!--[-->`);
            const each_array_3 = ensure_array_like(rules);
            for (let $$index_7 = 0, $$length = each_array_3.length; $$index_7 < $$length; $$index_7++) {
              let rule = each_array_3[$$index_7];
              if (rule.rule_type === "event-reminder") {
                $$renderer4.push("<!--[-->");
                $$renderer4.push(`<section class="reminder-settings-page svelte-1jef3w8"><div class="reminder-hero svelte-1jef3w8"><div class="reminder-hero__copy svelte-1jef3w8"><p class="reminder-hero__kicker svelte-1jef3w8">Termin-Erinnerung</p> <h2 class="reminder-hero__title svelte-1jef3w8">Erinnerungen ruhig und klar einstellen.</h2> <p class="reminder-hero__text svelte-1jef3w8">Die wichtigsten Einstellungen sind als Liste aufgebaut und offnen sich nur bei Bedarf im Detail.</p></div> <div class="actions reminder-hero__actions"><button class="btn btn-primary" type="button">Speichern</button> <button class="btn btn-danger" type="button">Loschen</button></div></div> <div class="reminder-settings-card svelte-1jef3w8"><div class="reminder-toggle-row svelte-1jef3w8"><div class="list-meta"><strong>Erinnerung aktiv</strong> <span class="text-muted">${escape_html(rule.enabled ? "Die Erinnerung wird derzeit verschickt." : "Die Erinnerung ist pausiert.")}</span></div> <label class="toggle"><input type="checkbox"${attr("checked", rule.enabled, true)}/></label></div> `);
                SettingsRow($$renderer4, {
                  first: true,
                  title: "Erinnern",
                  subtitle: formatLeadSummary(rule)
                });
                $$renderer4.push(`<!----> `);
                SettingsRow($$renderer4, { title: "Wiederholen", subtitle: formatRepeatSummary(rule) });
                $$renderer4.push(`<!----> `);
                SettingsRow($$renderer4, { title: "Zielgruppe", subtitle: formatAudienceSummary(rule) });
                $$renderer4.push(`<!----> `);
                SettingsRow($$renderer4, {
                  last: true,
                  title: "Nachricht",
                  subtitle: formatMessageSummary(rule)
                });
                $$renderer4.push(`<!----></div> `);
                SlideOverDetail($$renderer4, {
                  open: activeReminderId === rule.id && activeReminderPanel === "remind",
                  title: "Wann soll erinnert werden?",
                  subtitle: "Lege fest, wie fruh die Nachricht vor dem Termin ankommt.",
                  onClose: closeReminderPanel,
                  children: ($$renderer5) => {
                    $$renderer5.push(`<div class="detail-group svelte-1jef3w8"><div class="field"><label${attr("for", `rule-lead-${rule.id}`)}>Wie lange vorher?</label> <input${attr("id", `rule-lead-${rule.id}`)} class="input" type="number" min="1"${attr("value", rule.lead_value)}/></div> <div class="field"><p class="fieldset-label">Einheit</p> `);
                    SegmentedControl($$renderer5, {
                      options: leadUnitOptions,
                      ariaLabel: "Einheit fur die Erinnerung",
                      get value() {
                        return rule.lead_unit;
                      },
                      set value($$value) {
                        rule.lead_unit = $$value;
                        $$settled = false;
                      }
                    });
                    $$renderer5.push(`<!----></div></div> <div class="detail-group svelte-1jef3w8"><div class="field"><p class="fieldset-label">Fur welche Termine?</p> `);
                    SegmentedControl($$renderer5, {
                      options: eventTypeOptions,
                      ariaLabel: "Terminart fur Erinnerung",
                      get value() {
                        return rule.event_type;
                      },
                      set value($$value) {
                        rule.event_type = $$value;
                        $$settled = false;
                      }
                    });
                    $$renderer5.push(`<!----></div></div> <div class="detail-group svelte-1jef3w8"><div class="toggle-row detail-inline-toggle svelte-1jef3w8"><div class="list-meta"><strong>Zeitfenster nutzen</strong> <span class="text-muted">Nur in einem ruhigen Zeitraum erinnern.</span></div> <label class="toggle"><input type="checkbox"${attr("checked", reminderWindowEnabled[rule.id] ?? false, true)}/></label></div> `);
                    if (reminderWindowEnabled[rule.id]) {
                      $$renderer5.push("<!--[-->");
                      $$renderer5.push(`<div class="field"><label${attr("for", `rule-send-start-${rule.id}`)}>Startzeit der Erinnerung</label> <input${attr("id", `rule-send-start-${rule.id}`)} class="input" type="time"${attr("value", rule.send_start)}/></div> <div class="field"><label${attr("for", `rule-send-end-${rule.id}`)}>Endzeit der Erinnerung</label> <input${attr("id", `rule-send-end-${rule.id}`)} class="input" type="time"${attr("value", rule.send_end)}/></div>`);
                    } else {
                      $$renderer5.push("<!--[!-->");
                    }
                    $$renderer5.push(`<!--]--></div>`);
                  },
                  $$slots: {
                    default: true,
                    footer: ($$renderer5) => {
                      $$renderer5.push(`<div slot="footer" class="actions reminder-footer svelte-1jef3w8"><button class="btn btn-outline" type="button">Abbrechen</button> <button class="btn btn-primary" type="button">Speichern</button></div>`);
                    }
                  }
                });
                $$renderer4.push(`<!----> `);
                SlideOverDetail($$renderer4, {
                  open: activeReminderId === rule.id && activeReminderPanel === "repeat",
                  title: "Wie soll erinnert werden?",
                  subtitle: "Wiederholungen bleiben verborgen, bis du sie wirklich brauchst.",
                  onClose: closeReminderPanel,
                  children: ($$renderer5) => {
                    $$renderer5.push(`<div class="detail-group svelte-1jef3w8"><div class="field"><p class="fieldset-label">Wiederholung</p> `);
                    SegmentedControl($$renderer5, {
                      options: repeatOptions,
                      ariaLabel: "Wiederholung",
                      get value() {
                        return rule.schedule_every;
                      },
                      set value($$value) {
                        rule.schedule_every = $$value;
                        $$settled = false;
                      }
                    });
                    $$renderer5.push(`<!----></div></div> `);
                    if (rule.schedule_every) {
                      $$renderer5.push("<!--[-->");
                      $$renderer5.push(`<div class="detail-group svelte-1jef3w8"><div class="field"><label${attr("for", `rule-start-date-${rule.id}`)}>Ab wann soll die Regel gelten?</label> <input${attr("id", `rule-start-date-${rule.id}`)} class="input" type="date"${attr("value", rule.schedule_start_date)}/></div> <div class="field"><label${attr("for", `rule-schedule-time-${rule.id}`)}>Wann soll gepruft werden?</label> <input${attr("id", `rule-schedule-time-${rule.id}`)} class="input" type="time"${attr("value", rule.schedule_time)}/></div> <div class="field"><label${attr("for", `rule-cooldown-${rule.id}`)}>Erinnerungsintervall</label> <input${attr("id", `rule-cooldown-${rule.id}`)} class="input" type="number" min="0"${attr("value", rule.cooldown_hours)}/> <p class="hint">So viele Stunden sollen mindestens zwischen zwei Erinnerungen liegen.</p></div></div>`);
                    } else {
                      $$renderer5.push("<!--[!-->");
                    }
                    $$renderer5.push(`<!--]-->`);
                  },
                  $$slots: {
                    default: true,
                    footer: ($$renderer5) => {
                      $$renderer5.push(`<div slot="footer" class="actions reminder-footer svelte-1jef3w8"><button class="btn btn-outline" type="button">Abbrechen</button> <button class="btn btn-primary" type="button">Speichern</button></div>`);
                    }
                  }
                });
                $$renderer4.push(`<!----> `);
                SlideOverDetail($$renderer4, {
                  open: activeReminderId === rule.id && activeReminderPanel === "audience",
                  title: "Wen mochtest du erinnern?",
                  subtitle: "Halte die Zielgruppe breit oder richte die Erinnerung an eine einzelne Person.",
                  onClose: closeReminderPanel,
                  children: ($$renderer5) => {
                    $$renderer5.push(`<div class="detail-group svelte-1jef3w8"><div class="field"><label${attr("for", `rule-role-${rule.id}`)}>Zielgruppe</label> `);
                    $$renderer5.select(
                      {
                        id: `rule-role-${rule.id}`,
                        class: "select",
                        value: rule.target_role
                      },
                      ($$renderer6) => {
                        $$renderer6.push(`<!--[-->`);
                        const each_array_4 = ensure_array_like(reminderAudienceOptions);
                        for (let $$index_3 = 0, $$length2 = each_array_4.length; $$index_3 < $$length2; $$index_3++) {
                          let option = each_array_4[$$index_3];
                          $$renderer6.option({ value: option.value }, ($$renderer7) => {
                            $$renderer7.push(`${escape_html(option.label)}`);
                          });
                        }
                        $$renderer6.push(`<!--]-->`);
                      }
                    );
                    $$renderer5.push(`</div> <div class="field"><label${attr("for", `rule-user-${rule.id}`)}>Bestimmte Person</label> `);
                    $$renderer5.select(
                      {
                        id: `rule-user-${rule.id}`,
                        class: "select",
                        value: rule.target_user_id
                      },
                      ($$renderer6) => {
                        $$renderer6.option({ value: "" }, ($$renderer7) => {
                          $$renderer7.push(`Nein, an alle passenden Personen senden`);
                        });
                        $$renderer6.push(`<!--[-->`);
                        const each_array_5 = ensure_array_like(users);
                        for (let $$index_4 = 0, $$length2 = each_array_5.length; $$index_4 < $$length2; $$index_4++) {
                          let user = each_array_5[$$index_4];
                          $$renderer6.option({ value: user.id }, ($$renderer7) => {
                            $$renderer7.push(`${escape_html(user.email)}`);
                          });
                        }
                        $$renderer6.push(`<!--]-->`);
                      }
                    );
                    $$renderer5.push(`</div></div>`);
                  },
                  $$slots: {
                    default: true,
                    footer: ($$renderer5) => {
                      $$renderer5.push(`<div slot="footer" class="actions reminder-footer svelte-1jef3w8"><button class="btn btn-outline" type="button">Abbrechen</button> <button class="btn btn-primary" type="button">Speichern</button></div>`);
                    }
                  }
                });
                $$renderer4.push(`<!----> `);
                SlideOverDetail($$renderer4, {
                  open: activeReminderId === rule.id && activeReminderPanel === "message",
                  title: "Wie soll die Nachricht wirken?",
                  subtitle: "Titel und Text bleiben kurz, freundlich und gut verstandlich.",
                  onClose: closeReminderPanel,
                  children: ($$renderer5) => {
                    $$renderer5.push(`<div class="detail-group svelte-1jef3w8"><div class="field"><label${attr("for", `rule-title-${rule.id}`)}>Titel</label> <input${attr("id", `rule-title-${rule.id}`)} class="input"${attr("value", rule.title_template)} placeholder="Erinnerung an den nachsten Termin"/></div> <div class="field"><label${attr("for", `rule-body-${rule.id}`)}>Nachricht</label> <textarea${attr("id", `rule-body-${rule.id}`)} class="textarea" rows="5"${attr("placeholder", `Denk bitte kurz an deine Ruckmeldung fur ${stringify(event.title)}.`)}>`);
                    const $$body = escape_html(rule.body_template);
                    if ($$body) {
                      $$renderer5.push(`${$$body}`);
                    }
                    $$renderer5.push(`</textarea> <p class="hint">Platzhalter wie {event.title} und {event.start} kannst du weiterhin verwenden.</p></div></div>`);
                  },
                  $$slots: {
                    default: true,
                    footer: ($$renderer5) => {
                      $$renderer5.push(`<div slot="footer" class="actions reminder-footer svelte-1jef3w8"><button class="btn btn-outline" type="button">Abbrechen</button> <button class="btn btn-primary" type="button">Speichern</button></div>`);
                    }
                  }
                });
                $$renderer4.push(`<!----></section>`);
              } else {
                $$renderer4.push("<!--[!-->");
                Card($$renderer4, {
                  title: ruleLabel(rule.rule_type),
                  interactive: true,
                  children: ($$renderer5) => {
                    $$renderer5.push(`<div class="split-grid">`);
                    Card($$renderer5, {
                      title: "Zeitraum",
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
                            const each_array_6 = ensure_array_like(ruleTypes);
                            for (let $$index_5 = 0, $$length2 = each_array_6.length; $$index_5 < $$length2; $$index_5++) {
                              let type = each_array_6[$$index_5];
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
                        $$renderer6.push(`</div> <div class="field"><label${attr("for", `rule-send-start-${rule.id}`)}>Startzeit der Erinnerung</label> <input${attr("id", `rule-send-start-${rule.id}`)} class="input" type="time"${attr("value", rule.send_start)}/></div> <div class="field"><label${attr("for", `rule-send-end-${rule.id}`)}>Endzeit der Erinnerung</label> <input${attr("id", `rule-send-end-${rule.id}`)} class="input" type="time"${attr("value", rule.send_end)}/></div> <div class="field"><p class="fieldset-label">Terminart</p> `);
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
                      children: ($$renderer6) => {
                        $$renderer6.push(`<div class="form-grid"><div class="field"><label${attr("for", `rule-start-date-${rule.id}`)}>Startdatum</label> <input${attr("id", `rule-start-date-${rule.id}`)} class="input" type="date"${attr("value", rule.schedule_start_date)}/></div> <div class="field"><p class="fieldset-label">Rhythmus</p> `);
                        SegmentedControl($$renderer6, {
                          options: repeatOptions,
                          ariaLabel: "Rhythmus",
                          get value() {
                            return rule.schedule_every;
                          },
                          set value($$value) {
                            rule.schedule_every = $$value;
                            $$settled = false;
                          }
                        });
                        $$renderer6.push(`<!----></div> <div class="field"><label${attr("for", `rule-schedule-time-${rule.id}`)}>Uhrzeit</label> <input${attr("id", `rule-schedule-time-${rule.id}`)} class="input" type="time"${attr("value", rule.schedule_time)}/></div> <div class="field"><label${attr("for", `rule-cooldown-${rule.id}`)}>Erinnerungsintervall</label> <input${attr("id", `rule-cooldown-${rule.id}`)} class="input" type="number" min="0"${attr("value", rule.cooldown_hours)}/></div> `);
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
                            const each_array_7 = ensure_array_like(users);
                            for (let $$index_6 = 0, $$length2 = each_array_7.length; $$index_6 < $$length2; $$index_6++) {
                              let user = each_array_7[$$index_6];
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
                          $$renderer6.push(`<div class="field"><label${attr("for", `rule-min-response-${rule.id}`)}>Mindest-Zusagen</label> <input${attr("id", `rule-min-response-${rule.id}`)} class="input" type="number" min="0" max="100"${attr("value", rule.min_response_percent)}/></div>`);
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
                      children: ($$renderer6) => {
                        $$renderer6.push(`<div class="form-grid"><div class="field"><label${attr("for", `rule-title-${rule.id}`)}>Titel</label> <input${attr("id", `rule-title-${rule.id}`)} class="input"${attr("value", rule.title_template)}/></div> <div class="field"><label${attr("for", `rule-body-${rule.id}`)}>Nachricht</label> <textarea${attr("id", `rule-body-${rule.id}`)} class="textarea" rows="4">`);
                        const $$body_1 = escape_html(rule.body_template);
                        if ($$body_1) {
                          $$renderer6.push(`${$$body_1}`);
                        }
                        $$renderer6.push(`</textarea></div></div>`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer5.push(`<!----></div>`);
                  },
                  $$slots: {
                    default: true,
                    actions: ($$renderer5) => {
                      $$renderer5.push(`<div slot="actions" class="actions"><span class="badge badge-secondary">${escape_html(rule.rule_type)}</span> <label class="toggle"><input type="checkbox"${attr("checked", rule.enabled, true)}/></label> <button class="btn btn-outline" type="button">Speichern</button> <button class="btn btn-danger" type="button">Loschen</button></div>`);
                    }
                  }
                });
              }
              $$renderer4.push(`<!--]-->`);
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
