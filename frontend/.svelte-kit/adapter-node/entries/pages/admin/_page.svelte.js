import { b as bind_props, a as attr, e as ensure_array_like, s as store_get, u as unsubscribe_stores } from "../../../chunks/index2.js";
import { C as Card } from "../../../chunks/Card.js";
import { S as SegmentedControl } from "../../../chunks/SegmentedControl.js";
import { $ as fallback } from "../../../chunks/context.js";
import { e as escape_html } from "../../../chunks/escaping.js";
import { a as apiFetch } from "../../../chunks/api.js";
import { s as session } from "../../../chunks/auth.js";
function PushRuleCard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let rule = $$props["rule"];
    let users = fallback($$props["users"], () => [], true);
    let onSave = fallback($$props["onSave"], void 0);
    let onDelete = fallback($$props["onDelete"], void 0);
    let onSend = fallback($$props["onSend"], void 0);
    const targetTypeOptions = [
      { value: "all", label: "Alle" },
      { value: "role", label: "Rolle" },
      { value: "user", label: "Person" }
    ];
    const intervalUnitOptions = [
      { value: "hours", label: "Stunden" },
      { value: "days", label: "Tage" },
      { value: "weeks", label: "Wochen" }
    ];
    const roleOptions = [
      { value: "user", label: "Nutzer" },
      { value: "materialwart", label: "Materialwart" },
      { value: "admin", label: "Admin" }
    ];
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<article class="push-rule-card svelte-fbz8p4"><div class="form-grid"><div class="field"><label${attr("for", `push-title-${rule.id}`)}>Titel</label> <input${attr("id", `push-title-${rule.id}`)} class="input"${attr("value", rule.title)}/></div> <div class="field"><label${attr("for", `push-message-${rule.id}`)}>Nachricht</label> <textarea${attr("id", `push-message-${rule.id}`)} class="textarea" rows="4">`);
      const $$body = escape_html(rule.message);
      if ($$body) {
        $$renderer3.push(`${$$body}`);
      }
      $$renderer3.push(`</textarea></div> <div class="field"><p class="fieldset-label">Empfänger-Auswahl</p> `);
      SegmentedControl($$renderer3, {
        options: targetTypeOptions,
        ariaLabel: "Empfängerauswahl",
        get value() {
          return rule.target_type;
        },
        set value($$value) {
          rule.target_type = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----></div> `);
      if (rule.target_type === "role") {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="field"><label${attr("for", `push-role-${rule.id}`)}>Rolle</label> `);
        $$renderer3.select(
          {
            id: `push-role-${rule.id}`,
            class: "select",
            value: rule.target_id
          },
          ($$renderer4) => {
            $$renderer4.push(`<!--[-->`);
            const each_array = ensure_array_like(roleOptions);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let option = each_array[$$index];
              $$renderer4.option({ value: option.value }, ($$renderer5) => {
                $$renderer5.push(`${escape_html(option.label)}`);
              });
            }
            $$renderer4.push(`<!--]-->`);
          }
        );
        $$renderer3.push(`</div>`);
      } else {
        $$renderer3.push("<!--[!-->");
        if (rule.target_type === "user") {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<div class="field"><label${attr("for", `push-user-${rule.id}`)}>Person</label> `);
          $$renderer3.select(
            {
              id: `push-user-${rule.id}`,
              class: "select",
              value: rule.target_id
            },
            ($$renderer4) => {
              $$renderer4.push(`<!--[-->`);
              const each_array_1 = ensure_array_like(users);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let user = each_array_1[$$index_1];
                $$renderer4.option({ value: user.id }, ($$renderer5) => {
                  $$renderer5.push(`${escape_html(user.email)}`);
                });
              }
              $$renderer4.push(`<!--]-->`);
            }
          );
          $$renderer3.push(`</div>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]-->`);
      }
      $$renderer3.push(`<!--]--> <div class="toggle-row push-rule-toggle svelte-fbz8p4"><div class="list-meta"><strong>Erinnerung</strong></div> <label class="toggle"><input type="checkbox"${attr("checked", rule.notification_type === "recurring", true)}/></label></div> `);
      if (rule.notification_type === "recurring") {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="toggle-row push-rule-toggle svelte-fbz8p4"><div class="list-meta"><strong>Wiederholung aktiv</strong></div> <label class="toggle"><input type="checkbox"${attr("checked", rule.is_active, true)}/></label></div> <div class="field push-rule-interval"><label${attr("for", `push-interval-value-${rule.id}`)}>Intervall</label> <div class="push-rule-interval__controls svelte-fbz8p4"><input${attr("id", `push-interval-value-${rule.id}`)} class="input" type="number" min="1"${attr("value", rule.interval_value)}/> `);
        SegmentedControl($$renderer3, {
          options: intervalUnitOptions,
          ariaLabel: "Intervall-Einheit",
          get value() {
            return rule.interval_unit;
          },
          set value($$value) {
            rule.interval_unit = $$value;
            $$settled = false;
          }
        });
        $$renderer3.push(`<!----></div></div> <div class="split-grid push-rule-dates"><div class="field"><label${attr("for", `push-start-${rule.id}`)}>Startdatum</label> <input${attr("id", `push-start-${rule.id}`)} class="input" type="date"${attr("value", rule.start_date)}/></div> <div class="field"><label${attr("for", `push-end-${rule.id}`)}>Enddatum</label> <input${attr("id", `push-end-${rule.id}`)} class="input" type="date"${attr("value", rule.end_date)}/></div></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div> <div class="actions push-rule-actions svelte-fbz8p4"><button class="btn btn-primary" type="button">Speichern</button> `);
      if (rule.notification_type === "instant") {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<button class="btn btn-outline" type="button">Jetzt senden</button>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <button class="btn btn-danger" type="button">Löschen</button></div></article>`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { rule, users, onSave, onDelete, onSend });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let users = [];
    let settings = [];
    let rules = [];
    let error = "";
    let statusMessage = "";
    let quietStart = "21:00";
    let quietEnd = "06:00";
    let approvalRole = {};
    const pendingUsers = () => users.filter((user) => user.status === "pending");
    const customRules = () => rules.filter((rule) => rule.rule_type === "custom-notification");
    const normalizeRule = (rule) => ({
      ...rule,
      enabled: rule.enabled === 1 || rule.enabled === true,
      target_user_id: rule.target_user_id ?? "",
      target_role: rule.target_role ?? "",
      title: rule.title ?? "",
      message: rule.message ?? "",
      notification_type: rule.notification_type ?? "instant",
      target_type: rule.target_type ?? "all",
      target_id: rule.target_id ?? "",
      is_recurring: rule.is_recurring === 1 || rule.is_recurring === true,
      interval_value: rule.interval_value ?? 1,
      interval_unit: rule.interval_unit ?? "days",
      start_date: rule.start_date ?? "",
      end_date: rule.end_date ?? "",
      last_sent_at: rule.last_sent_at ?? null,
      is_active: rule.is_active === 1 || rule.is_active === true
    });
    const load = async () => {
      error = "";
      try {
        users = await apiFetch("/api/admin/users");
        settings = await apiFetch("/api/admin/settings");
        rules = (await apiFetch("/api/admin/push-rules")).map(normalizeRule);
        const map = new Map(settings.map((item) => [item.key, item.value]));
        quietStart = map.get("quiet_hours_start") ?? "21:00";
        quietEnd = map.get("quiet_hours_end") ?? "06:00";
        approvalRole = users.reduce((acc, user) => ({ ...acc, [user.id]: user.role || "user" }), {});
      } catch {
        error = "Admin-Daten konnten nicht geladen werden.";
      }
    };
    const saveRule = async (rule) => {
      statusMessage = "";
      await apiFetch(`/api/admin/push-rules/${rule.id}`, {
        method: "PUT",
        body: JSON.stringify({
          rule_type: "custom-notification",
          enabled: rule.notification_type === "recurring" ? Boolean(rule.is_active) : true,
          lead_time_hours: 0,
          target_user_id: rule.target_type === "user" ? rule.target_id || null : null,
          target_role: rule.target_type === "role" ? rule.target_id || null : null,
          title_template: null,
          body_template: null,
          min_response_percent: null,
          event_type: null,
          send_start: null,
          send_end: null,
          schedule_start_date: null,
          schedule_every: null,
          schedule_time: null,
          cooldown_hours: 0,
          title: rule.title || null,
          message: rule.message || null,
          notification_type: rule.notification_type,
          target_type: rule.target_type,
          target_id: rule.target_type === "all" ? null : rule.target_id || null,
          is_recurring: rule.notification_type === "recurring",
          interval_value: rule.notification_type === "recurring" ? Number(rule.interval_value || 1) : null,
          interval_unit: rule.notification_type === "recurring" ? rule.interval_unit : null,
          start_date: rule.notification_type === "recurring" ? rule.start_date || null : null,
          end_date: rule.notification_type === "recurring" ? rule.end_date || null : null,
          last_sent_at: rule.last_sent_at || null,
          is_active: rule.notification_type === "recurring" ? Boolean(rule.is_active) : true
        })
      });
      statusMessage = "Push-Regel gespeichert.";
      await load();
    };
    const deleteRule = async (id) => {
      if (!confirm("Push-Regel wirklich loschen?")) return;
      await apiFetch(`/api/admin/push-rules/${id}`, { method: "DELETE" });
      statusMessage = "Push-Regel geloscht.";
      await load();
    };
    const sendRuleNow = async (id) => {
      await apiFetch(`/api/admin/push-rules/${id}/send`, { method: "POST" });
      statusMessage = "Push wurde gesendet.";
      await load();
    };
    $$renderer2.push(`<div class="page-stack"><section class="page-intro"><p class="page-kicker">Admin</p> <h1 class="page-title">Admin</h1></section> `);
    if (!store_get($$store_subs ??= {}, "$session", session) || store_get($$store_subs ??= {}, "$session", session).role !== "admin") {
      $$renderer2.push("<!--[-->");
      Card($$renderer2, {
        title: "Kein Zugriff",
        children: ($$renderer3) => {
          $$renderer3.push(`<p class="text-muted">Bitte mit einem Administrationskonto anmelden.</p>`);
        },
        $$slots: { default: true }
      });
    } else {
      $$renderer2.push("<!--[!-->");
      if (error) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="status-banner error">${escape_html(error)}</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (statusMessage) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="status-banner success">${escape_html(statusMessage)}</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      Card($$renderer2, {
        title: "Benutzeranfragen",
        children: ($$renderer3) => {
          if (pendingUsers().length === 0) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<p class="text-muted">Zurzeit warten keine neuen Accounts auf Freigabe.</p>`);
          } else {
            $$renderer3.push("<!--[!-->");
            $$renderer3.push(`<div class="hairline-list"><!--[-->`);
            const each_array = ensure_array_like(pendingUsers());
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let user = each_array[$$index];
              $$renderer3.push(`<div class="approval-row svelte-1jef3w8"><div class="list-meta"><strong>${escape_html(user.email)}</strong> <span class="text-muted">Beantragt am ${escape_html(new Date(user.created_at).toLocaleString("de-DE"))}</span></div> <div class="approval-actions svelte-1jef3w8">`);
              $$renderer3.select(
                { class: "select", value: approvalRole[user.id] },
                ($$renderer4) => {
                  $$renderer4.option({ value: "user" }, ($$renderer5) => {
                    $$renderer5.push(`Nutzer`);
                  });
                  $$renderer4.option({ value: "materialwart" }, ($$renderer5) => {
                    $$renderer5.push(`Materialwart`);
                  });
                  $$renderer4.option({ value: "admin" }, ($$renderer5) => {
                    $$renderer5.push(`Admin`);
                  });
                },
                "svelte-1jef3w8"
              );
              $$renderer3.push(` <button class="btn btn-primary" type="button">Freigeben</button> <button class="btn btn-danger" type="button">Ablehnen</button></div></div>`);
            }
            $$renderer3.push(`<!--]--></div>`);
          }
          $$renderer3.push(`<!--]-->`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> <section class="split-grid">`);
      Card($$renderer2, {
        title: "Rollenverwaltung",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="hairline-list"><!--[-->`);
          const each_array_1 = ensure_array_like(users);
          for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
            let user = each_array_1[$$index_1];
            $$renderer3.push(`<div class="list-row"><div class="list-meta"><strong>${escape_html(user.email)}</strong> <span class="text-muted">Status: ${escape_html(user.status)}</span></div> `);
            $$renderer3.select({ class: "select", value: user.role }, ($$renderer4) => {
              $$renderer4.option({ value: "user" }, ($$renderer5) => {
                $$renderer5.push(`Nutzer`);
              });
              $$renderer4.option({ value: "materialwart" }, ($$renderer5) => {
                $$renderer5.push(`Materialwart`);
              });
              $$renderer4.option({ value: "admin" }, ($$renderer5) => {
                $$renderer5.push(`Admin`);
              });
            });
            $$renderer3.push(`</div>`);
          }
          $$renderer3.push(`<!--]--></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Card($$renderer2, {
        title: "Funktionen",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="hairline-list"><!--[-->`);
          const each_array_2 = ensure_array_like(settings.filter((item) => item.key === "chat_enabled" || item.key === "nfc_enabled"));
          for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
            let item = each_array_2[$$index_2];
            $$renderer3.push(`<div class="toggle-row"><div class="list-meta"><strong>${escape_html(item.key === "chat_enabled" ? "Chat aktivieren" : "NFC aktivieren")}</strong></div> <label class="toggle"><input type="checkbox"${attr("checked", item.value === "true", true)}/></label></div>`);
          }
          $$renderer3.push(`<!--]--></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----></section> `);
      Card($$renderer2, {
        title: "Ruhezeiten",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="split-grid"><div class="field"><label for="quietStart">Beginn</label> <input id="quietStart" class="input" type="time"${attr("value", quietStart)}/></div> <div class="field"><label for="quietEnd">Ende</label> <input id="quietEnd" class="input" type="time"${attr("value", quietEnd)}/></div></div> <div class="actions"><button class="btn btn-primary" type="button">Speichern</button></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Card($$renderer2, {
        title: "Push-Regel",
        children: ($$renderer3) => {
          if (customRules().length === 0) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<p class="text-muted">Noch keine Push-Regel vorhanden.</p>`);
          } else {
            $$renderer3.push("<!--[!-->");
            $$renderer3.push(`<div class="card-grid"><!--[-->`);
            const each_array_3 = ensure_array_like(customRules());
            for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
              let rule = each_array_3[$$index_3];
              PushRuleCard($$renderer3, {
                rule,
                users,
                onSave: saveRule,
                onDelete: deleteRule,
                onSend: sendRuleNow
              });
            }
            $$renderer3.push(`<!--]--></div>`);
          }
          $$renderer3.push(`<!--]-->`);
        },
        $$slots: {
          default: true,
          actions: ($$renderer3) => {
            $$renderer3.push(`<div slot="actions" class="actions"><button class="btn btn-primary" type="button">Neue Regel</button></div>`);
          }
        }
      });
      $$renderer2.push(`<!---->`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
