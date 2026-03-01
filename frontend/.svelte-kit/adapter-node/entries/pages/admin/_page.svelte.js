import { b as bind_props, a as attr, c as attr_class, e as ensure_array_like, s as store_get, d as clsx, u as unsubscribe_stores } from "../../../chunks/index2.js";
import { g as get } from "../../../chunks/index.js";
import { A as Avatar } from "../../../chunks/Avatar.js";
import { S as SegmentedControl } from "../../../chunks/SegmentedControl.js";
import { Z as fallback } from "../../../chunks/utils2.js";
import { e as escape_html } from "../../../chunks/escaping.js";
import { a as apiFetch } from "../../../chunks/api.js";
import { a as session } from "../../../chunks/auth.js";
import { a as activeOverlayId } from "../../../chunks/overlay.js";
import { p as pushToast } from "../../../chunks/toast.js";
function PushRuleCard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let rule = $$props["rule"];
    let users = fallback($$props["users"], () => [], true);
    let onSave = fallback($$props["onSave"], void 0);
    let onDelete = fallback($$props["onDelete"], void 0);
    let onSend = fallback($$props["onSend"], void 0);
    let fieldErrors = {};
    let deleteLoading = false;
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
    const formatLastExecuted = (value) => {
      if (!value) return "Noch nie";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "Unbekannt";
      return date.toLocaleString("de-DE");
    };
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<article class="push-rule-card svelte-fbz8p4"><div class="form-grid"><div class="toggle-row push-rule-toggle svelte-fbz8p4"><div class="list-meta"><strong>Aktiv</strong></div> <label class="toggle"><input type="checkbox"${attr("checked", rule.is_active, true)}/></label></div> <div class="field"><p class="fieldset-label">Regeltyp</p> `);
      SegmentedControl($$renderer3, {
        options: [
          { value: "instant", label: "Sofort" },
          { value: "recurring", label: "Wiederkehrend" }
        ],
        ariaLabel: "Regeltyp",
        get value() {
          return rule.notification_type;
        },
        set value($$value) {
          rule.notification_type = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----></div> <div class="field"><label${attr("for", `push-title-${rule.id}`)}>Titel</label> <input${attr("id", `push-title-${rule.id}`)}${attr_class("input", void 0, { "input-invalid": Boolean(fieldErrors.title) })}${attr("value", rule.title)} maxlength="160" required/> `);
      if (fieldErrors.title) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<p class="field-error">${escape_html(fieldErrors.title)}</p>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div> <div class="field"><label${attr("for", `push-message-${rule.id}`)}>Nachricht</label> <textarea${attr("id", `push-message-${rule.id}`)}${attr_class("textarea", void 0, { "input-invalid": Boolean(fieldErrors.message) })} rows="4" maxlength="1200" required>`);
      const $$body = escape_html(rule.message);
      if ($$body) {
        $$renderer3.push(`${$$body}`);
      }
      $$renderer3.push(`</textarea> `);
      if (fieldErrors.message) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<p class="field-error">${escape_html(fieldErrors.message)}</p>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div> <div class="field"><p class="fieldset-label">Empfanger-Auswahl</p> `);
      SegmentedControl($$renderer3, {
        options: targetTypeOptions,
        ariaLabel: "Empfangerauswahl",
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
          },
          void 0,
          { "input-invalid": Boolean(fieldErrors.target_id) }
        );
        $$renderer3.push(` `);
        if (fieldErrors.target_id) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="field-error">${escape_html(fieldErrors.target_id)}</p>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></div>`);
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
            },
            void 0,
            { "input-invalid": Boolean(fieldErrors.target_id) }
          );
          $$renderer3.push(` `);
          if (fieldErrors.target_id) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<p class="field-error">${escape_html(fieldErrors.target_id)}</p>`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--></div>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]-->`);
      }
      $$renderer3.push(`<!--]--> <div class="toggle-row push-rule-toggle svelte-fbz8p4"><div class="list-meta"><strong>Zuletzt ausgefuhrt</strong> <span class="text-muted">${escape_html(formatLastExecuted(rule.last_sent_at))}</span></div></div> `);
      if (rule.notification_type === "recurring") {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="field push-rule-interval"><label${attr("for", `push-interval-value-${rule.id}`)}>Intervall</label> <div class="push-rule-interval__controls svelte-fbz8p4"><input${attr("id", `push-interval-value-${rule.id}`)}${attr_class("input", void 0, { "input-invalid": Boolean(fieldErrors.interval_value) })} type="number" min="1"${attr("value", rule.interval_value)}/> `);
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
        $$renderer3.push(`<!----></div> `);
        if (fieldErrors.interval_value) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="field-error">${escape_html(fieldErrors.interval_value)}</p>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></div> <div class="split-grid push-rule-dates"><div class="field"><label${attr("for", `push-start-${rule.id}`)}>Startdatum</label> <input${attr("id", `push-start-${rule.id}`)} class="input" type="date"${attr("value", rule.start_date)}/></div> <div class="field"><label${attr("for", `push-end-${rule.id}`)}>Enddatum</label> <input${attr("id", `push-end-${rule.id}`)}${attr_class("input", void 0, { "input-invalid": Boolean(fieldErrors.end_date) })} type="date"${attr("value", rule.end_date)}/> `);
        if (fieldErrors.end_date) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="field-error">${escape_html(fieldErrors.end_date)}</p>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></div></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div> `);
      {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <div class="actions push-rule-actions svelte-fbz8p4"><button class="btn btn-primary" type="button"${attr("disabled", deleteLoading, true)}>`);
      {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> ${escape_html("Speichern")}</button> <button class="btn btn-outline" type="button"${attr("disabled", !rule.is_active, true)}>`);
      {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> ${escape_html("Jetzt senden")}</button> <button class="btn btn-danger" type="button"${attr("disabled", deleteLoading, true)}>`);
      {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> ${escape_html("Loschen")}</button></div></article>`);
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
    const CHANGELOG_STORAGE_KEY = "pfadi_admin_changelog";
    const DELETE_MODAL_OVERLAY_ID = "admin-user-delete-modal";
    let users = [];
    let settings = [];
    let rules = [];
    let error = "";
    let userLoadError = "";
    let statusMessage = "";
    let quietStart = "21:00";
    let quietEnd = "06:00";
    let quietHoursSaving = false;
    let rulesLoading = false;
    let versionInfo = null;
    let healthInfo = null;
    let changelog = [];
    let updatesLoading = false;
    let updateActionLoading = false;
    let selectedUserId = "";
    let userSearch = "";
    let roleFilter = "all";
    let statusFilter = "all";
    let userRoleDraft = "user";
    let userActionLoading = false;
    let deleteModalOpen = false;
    let deleteConfirmText = "";
    let deleteLoading = false;
    let adminLogs = [];
    const customRules = () => rules.filter((rule) => rule.rule_type === "custom-notification");
    const addAdminLog = (level, message) => {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ts: (/* @__PURE__ */ new Date()).toISOString(),
        level,
        message
      };
      adminLogs = [entry, ...adminLogs].slice(0, 40);
    };
    const normalizeRule = (rule) => ({
      ...rule,
      title: rule.title ?? "",
      message: rule.message ?? "",
      notification_type: rule.notification_type ?? "instant",
      target_type: rule.target_type ?? "all",
      target_id: rule.target_id ?? "",
      interval_value: rule.interval_value ?? 1,
      interval_unit: rule.interval_unit ?? "days",
      start_date: rule.start_date ?? "",
      end_date: rule.end_date ?? "",
      last_sent_at: rule.last_sent_at ?? null,
      is_active: rule.is_active === 1 || rule.is_active === true
    });
    const filteredUsers = () => {
      const search = userSearch.trim().toLowerCase();
      return users.filter(
        (user) => true
      ).filter((user) => true).filter((user) => search ? user.email.toLowerCase().includes(search) : true).sort((a, b) => a.email.localeCompare(b.email));
    };
    const selectedUser = () => users.find((user) => user.id === selectedUserId) ?? null;
    const statusLabel = (status) => {
      if (status === "approved") return "Freigegeben";
      if (status === "pending") return "Ausstehend";
      return "Abgelehnt";
    };
    const statusBadgeClass = (status) => {
      if (status === "approved") return "badge badge-success";
      if (status === "pending") return "badge badge-warning";
      return "badge badge-danger";
    };
    const healthBadgeClass = (status) => {
      if (status === "ok") return "badge badge-success";
      if (status === "shutting_down") return "badge badge-warning";
      return "badge badge-danger";
    };
    const healthLabel = (status) => {
      if (status === "ok") return "OK";
      if (status === "shutting_down") return "Wird beendet";
      if (status === "degraded") return "Gestort";
      return "Unbekannt";
    };
    const syncSelectedUser = () => {
      const currentFiltered = filteredUsers();
      if (!currentFiltered.length) {
        selectedUserId = "";
        return;
      }
      if (!currentFiltered.some((item) => item.id === selectedUserId)) {
        selectedUserId = currentFiltered[0].id;
      }
    };
    const formatDateTime = (value) => {
      if (!value) return "Unbekannt";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(date);
    };
    const formatUptime = (seconds) => {
      if (typeof seconds !== "number" || !Number.isFinite(seconds)) return "Unbekannt";
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor(seconds % 86400 / 3600);
      const minutes = Math.floor(seconds % 3600 / 60);
      if (days > 0) return `${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    };
    const loadChangelog = () => {
      if (typeof localStorage === "undefined") {
        changelog = [];
        return;
      }
      try {
        const parsed = JSON.parse(localStorage.getItem(CHANGELOG_STORAGE_KEY) || "[]");
        changelog = Array.isArray(parsed) ? parsed.slice(0, 15) : [];
      } catch {
        changelog = [];
      }
    };
    const storeChangelogEntry = (entry) => {
      if (!entry || typeof localStorage === "undefined") return;
      const normalized = {
        version: String(entry.version || "").trim(),
        commit: String(entry.commit || "").trim(),
        updated_at: String(entry.updated_at || "").trim()
      };
      if (!normalized.version || !normalized.commit || !normalized.updated_at) return;
      const next = [
        normalized,
        ...changelog.filter((item) => item.commit !== normalized.commit)
      ].slice(0, 15);
      changelog = next;
      localStorage.setItem(CHANGELOG_STORAGE_KEY, JSON.stringify(next));
    };
    const loadOverview = async () => {
      try {
        const [version, health] = await Promise.all([
          apiFetch("/api/system/version", { toastOnError: false }).catch(() => null),
          apiFetch("/api/health", { toastOnError: false }).catch(() => null)
        ]);
        versionInfo = version;
        healthInfo = health;
        storeChangelogEntry(version);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Systemstatus konnte nicht geladen werden.";
        addAdminLog("error", msg);
      }
    };
    const load = async () => {
      error = "";
      userLoadError = "";
      const currentSession = get(session);
      if (!currentSession || currentSession.role !== "admin") {
        users = [];
        selectedUserId = "";
        return;
      }
      try {
        const loadedUsers = await apiFetch("/api/admin/users?role=all");
        console.log("[admin/users] response", loadedUsers);
        users = loadedUsers;
        settings = await apiFetch("/api/admin/settings");
        rules = (await apiFetch("/api/admin/push-rules")).map(normalizeRule);
        const map = new Map(settings.map((item) => [item.key, item.value]));
        quietStart = map.get("quiet_hours_start") ?? "21:00";
        quietEnd = map.get("quiet_hours_end") ?? "06:00";
        syncSelectedUser();
        await loadOverview();
        addAdminLog("info", "Admin-Daten geladen.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Admin-Daten konnten nicht geladen werden.";
        userLoadError = `Benutzer konnten nicht geladen werden: ${message}`;
        error = "Admin-Daten konnten nicht geladen werden.";
        users = [];
        selectedUserId = "";
        addAdminLog("error", message);
        console.error("[admin/users] request failed", err);
      }
    };
    const saveRule = async (rule) => {
      statusMessage = "";
      try {
        await apiFetch(`/api/admin/push-rules/${rule.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: rule.title || "",
            message: rule.message || "",
            notification_type: rule.notification_type,
            target_type: rule.target_type,
            target_id: rule.target_type === "all" ? null : rule.target_id || null,
            interval_value: rule.notification_type === "recurring" ? Number(rule.interval_value || 1) : null,
            interval_unit: rule.notification_type === "recurring" ? rule.interval_unit : null,
            start_date: rule.notification_type === "recurring" ? rule.start_date || null : null,
            end_date: rule.notification_type === "recurring" ? rule.end_date || null : null,
            is_active: Boolean(rule.is_active)
          })
        });
        statusMessage = "Push-Regel gespeichert.";
        pushToast(statusMessage, "success", 1500);
        addAdminLog("info", "Push-Regel gespeichert.");
        await load();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Push-Regel konnte nicht gespeichert werden.";
        error = msg;
        pushToast(msg, "error");
        addAdminLog("error", msg);
        throw err;
      }
    };
    const deleteRule = async (id) => {
      if (!confirm("Push-Regel wirklich loschen?")) return;
      try {
        await apiFetch(`/api/admin/push-rules/${id}`, { method: "DELETE" });
        statusMessage = "Push-Regel geloscht.";
        pushToast(statusMessage, "success", 1500);
        addAdminLog("info", "Push-Regel geloescht.");
        await load();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Push-Regel konnte nicht geloscht werden.";
        error = msg;
        pushToast(msg, "error");
        addAdminLog("error", msg);
        throw err;
      }
    };
    const sendRuleNow = async (id) => {
      try {
        const result = await apiFetch(`/api/admin/push-rules/${id}/send`, { method: "POST" });
        statusMessage = `Push gesendet (Gesendet: ${result?.delivered ?? 0}, Ubersprungen: ${result?.skipped ?? 0}).`;
        pushToast(statusMessage, "success", 1500);
        addAdminLog("info", "Push sofort gesendet.");
        await load();
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Push konnte nicht gesendet werden.";
        error = msg;
        pushToast(msg, "error");
        addAdminLog("error", msg);
        throw err;
      }
    };
    {
      const current = selectedUser();
      if (current) {
        userRoleDraft = current.role;
      }
    }
    syncSelectedUser();
    if (store_get($$store_subs ??= {}, "$session", session)?.role === "admin") {
      loadChangelog();
      void load();
    }
    deleteModalOpen = store_get($$store_subs ??= {}, "$activeOverlayId", activeOverlayId) === DELETE_MODAL_OVERLAY_ID;
    $$renderer2.push(`<div class="page-stack"><section class="page-intro"><h1 class="page-title">Admin</h1></section> `);
    if (!store_get($$store_subs ??= {}, "$session", session) || store_get($$store_subs ??= {}, "$session", session).role !== "admin") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<section class="admin-console-section svelte-1jef3w8"><div class="list-row"><div class="list-meta"><strong>Kein Zugriff</strong></div> <span class="badge badge-danger">Admin erforderlich</span></div></section>`);
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
      $$renderer2.push(`<!--]--> <section class="admin-console-section svelte-1jef3w8"><h2 class="section-title">Overview</h2> <div class="hairline-list"><div class="list-row"><div class="list-meta"><strong>Version</strong></div> <span class="badge badge-secondary">${escape_html(versionInfo?.version ?? "Unbekannt")}</span></div> <div class="list-row"><div class="list-meta"><strong>Commit</strong></div> <span class="badge badge-secondary">${escape_html(versionInfo?.commit ?? "Unbekannt")}</span></div> <div class="list-row"><div class="list-meta"><strong>Uptime</strong></div> <span class="badge badge-secondary">${escape_html(formatUptime(healthInfo?.uptimeSeconds))}</span></div> <div class="list-row"><div class="list-meta"><strong>DB Status</strong></div> <span${attr_class(clsx(healthBadgeClass(healthInfo?.status)), "svelte-1jef3w8")}>${escape_html(healthLabel(healthInfo?.status))}</span></div></div></section> <section class="admin-console-section svelte-1jef3w8"><h2 class="section-title">Users</h2> <div class="admin-toolbar-grid svelte-1jef3w8"><div class="field"><label for="userSearch">Suche</label> <input id="userSearch" class="input"${attr("value", userSearch)} placeholder="E-Mail suchen"/></div> <div class="field"><label for="roleFilter">Rolle</label> `);
      $$renderer2.select({ id: "roleFilter", class: "select", value: roleFilter }, ($$renderer3) => {
        $$renderer3.option({ value: "all" }, ($$renderer4) => {
          $$renderer4.push(`Alle`);
        });
        $$renderer3.option({ value: "admin" }, ($$renderer4) => {
          $$renderer4.push(`Admin`);
        });
        $$renderer3.option({ value: "materialwart" }, ($$renderer4) => {
          $$renderer4.push(`Materialwart`);
        });
        $$renderer3.option({ value: "user" }, ($$renderer4) => {
          $$renderer4.push(`Nutzer`);
        });
      });
      $$renderer2.push(`</div> <div class="field"><label for="statusFilter">Status</label> `);
      $$renderer2.select({ id: "statusFilter", class: "select", value: statusFilter }, ($$renderer3) => {
        $$renderer3.option({ value: "all" }, ($$renderer4) => {
          $$renderer4.push(`Alle`);
        });
        $$renderer3.option({ value: "pending" }, ($$renderer4) => {
          $$renderer4.push(`Ausstehend`);
        });
        $$renderer3.option({ value: "approved" }, ($$renderer4) => {
          $$renderer4.push(`Freigegeben`);
        });
        $$renderer3.option({ value: "rejected" }, ($$renderer4) => {
          $$renderer4.push(`Abgelehnt`);
        });
      });
      $$renderer2.push(`</div></div> <div class="field"><label for="userSelect">Benutzer</label> `);
      $$renderer2.select({ id: "userSelect", class: "select", value: selectedUserId }, ($$renderer3) => {
        if (users.length === 0) {
          $$renderer3.push("<!--[-->");
          $$renderer3.option({ value: "" }, ($$renderer4) => {
            $$renderer4.push(`Keine Benutzer vorhanden`);
          });
        } else {
          $$renderer3.push("<!--[!-->");
          if (filteredUsers().length === 0) {
            $$renderer3.push("<!--[-->");
            $$renderer3.option({ value: "" }, ($$renderer4) => {
              $$renderer4.push(`Keine Treffer fuer aktuellen Filter`);
            });
          } else {
            $$renderer3.push("<!--[!-->");
            $$renderer3.push(`<!--[-->`);
            const each_array = ensure_array_like(filteredUsers());
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let user = each_array[$$index];
              $$renderer3.option({ value: user.id }, ($$renderer4) => {
                $$renderer4.push(`${escape_html(user.email)}`);
              });
            }
            $$renderer3.push(`<!--]-->`);
          }
          $$renderer3.push(`<!--]-->`);
        }
        $$renderer3.push(`<!--]-->`);
      });
      $$renderer2.push(`</div> `);
      if (filteredUsers().length > 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="admin-user-list svelte-1jef3w8"><!--[-->`);
        const each_array_1 = ensure_array_like(filteredUsers().slice(0, 8));
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let user = each_array_1[$$index_1];
          $$renderer2.push(`<button${attr_class(`list-row admin-user-list__item ${selectedUserId === user.id ? "is-active" : ""}`, "svelte-1jef3w8")} type="button"><div class="admin-user-list__meta svelte-1jef3w8">`);
          Avatar($$renderer2, {
            name: user.email,
            avatarUrl: user.avatar_url ?? null,
            size: 40
          });
          $$renderer2.push(`<!----> <div class="list-meta"><strong>${escape_html(user.email)}</strong> <span class="text-muted">${escape_html(user.role)}</span></div></div> <span${attr_class(clsx(statusBadgeClass(user.status)), "svelte-1jef3w8")}>${escape_html(statusLabel(user.status))}</span></button>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (userLoadError) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="status-banner error">${escape_html(userLoadError)}</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (selectedUser()) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="hairline-list"><div class="list-row"><div class="admin-selected-user svelte-1jef3w8">`);
        Avatar($$renderer2, {
          name: selectedUser()?.email || "User",
          avatarUrl: selectedUser()?.avatar_url ?? null,
          size: 96
        });
        $$renderer2.push(`<!----> <div class="list-meta"><strong>${escape_html(selectedUser()?.email)}</strong> <span class="text-muted">Erstellt am ${escape_html(formatDateTime(selectedUser()?.created_at))}</span></div></div> <span${attr_class(clsx(statusBadgeClass(selectedUser().status)), "svelte-1jef3w8")}>${escape_html(statusLabel(selectedUser().status))}</span></div> <div class="actions"><button class="btn btn-outline" type="button"${attr("disabled", userActionLoading, true)}>Freigeben</button> <button class="btn btn-outline" type="button"${attr("disabled", userActionLoading, true)}>Ablehnen</button> <button class="btn btn-outline" type="button"${attr("disabled", userActionLoading, true)}>Profilbild entfernen</button></div></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></section> <section class="admin-console-section svelte-1jef3w8"><h2 class="section-title">Roles</h2> `);
      if (selectedUser()) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="field"><label for="userRole">Rolle</label> `);
        $$renderer2.select({ id: "userRole", class: "select", value: userRoleDraft }, ($$renderer3) => {
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
        $$renderer2.push(`</div> <div class="actions"><button class="btn btn-primary" type="button"${attr("disabled", userActionLoading, true)}>Rolle speichern</button> <button class="btn btn-outline" type="button"${attr("disabled", userActionLoading, true)}>Force Logout</button> <button class="btn btn-danger" type="button"${attr("disabled", userActionLoading, true)}>Konto loschen</button></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<p class="text-muted">Kein Benutzer ausgewahlt.</p>`);
      }
      $$renderer2.push(`<!--]--></section> <section id="push-rules" class="admin-console-section svelte-1jef3w8"><div class="section-head svelte-1jef3w8"><h2 class="section-title">Push</h2> <button class="btn btn-primary" type="button"${attr("disabled", rulesLoading, true)}>`);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> ${escape_html("Neue Regel")}</button></div> `);
      if (customRules().length === 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="text-muted">Keine Push-Regeln vorhanden.</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="admin-rule-list svelte-1jef3w8"><!--[-->`);
        const each_array_2 = ensure_array_like(customRules());
        for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
          let rule = each_array_2[$$index_2];
          PushRuleCard($$renderer2, {
            rule,
            users,
            onSave: saveRule,
            onDelete: deleteRule,
            onSend: sendRuleNow
          });
        }
        $$renderer2.push(`<!--]--></div>`);
      }
      $$renderer2.push(`<!--]--></section> <section class="admin-console-section svelte-1jef3w8"><div class="section-head svelte-1jef3w8"><h2 class="section-title">Updates</h2> <div class="actions"><button class="btn btn-outline" type="button"${attr("disabled", updatesLoading, true)}>${escape_html("Prufen")}</button> <button class="btn btn-primary" type="button"${attr("disabled", updateActionLoading, true)}>${escape_html("Update starten")}</button></div></div> <div class="hairline-list"><div class="list-row"><div class="list-meta"><strong>Aktuelle Version</strong></div> <span class="badge badge-secondary">${escape_html(versionInfo?.version ?? "Unbekannt")}</span></div> <div class="list-row"><div class="list-meta"><strong>Letztes Update</strong></div> <span class="badge badge-secondary">${escape_html(formatDateTime(versionInfo?.updated_at))}</span></div></div> <div class="admin-changelog svelte-1jef3w8">`);
      if (changelog.length === 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="text-muted">Kein Changelog vorhanden.</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<!--[-->`);
        const each_array_3 = ensure_array_like(changelog);
        for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
          let entry = each_array_3[$$index_3];
          $$renderer2.push(`<div class="list-row"><div class="list-meta"><strong>${escape_html(entry.version)}</strong> <span class="text-muted">${escape_html(formatDateTime(entry.updated_at))}</span></div> <span class="badge badge-secondary">${escape_html(entry.commit)}</span></div>`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></div></section> <section class="admin-console-section svelte-1jef3w8"><h2 class="section-title">Backup</h2> <div class="actions"><button class="btn btn-outline" type="button">Backup erstellen</button> <button class="btn btn-outline" type="button">Backup herunterladen</button> <button class="btn btn-danger" type="button">Backup wiederherstellen</button></div></section> <section class="admin-console-section svelte-1jef3w8"><h2 class="section-title">Logs</h2> <div class="admin-log-list svelte-1jef3w8">`);
      if (adminLogs.length === 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="text-muted">Keine Eintrage.</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<!--[-->`);
        const each_array_4 = ensure_array_like(adminLogs);
        for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
          let entry = each_array_4[$$index_4];
          $$renderer2.push(`<div class="list-row"><div class="list-meta"><strong>${escape_html(entry.message)}</strong> <span class="text-muted">${escape_html(formatDateTime(entry.ts))}</span></div> <span${attr_class(clsx(entry.level === "error" ? "badge badge-danger" : "badge badge-secondary"))}>${escape_html(entry.level)}</span></div>`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></div></section> <section class="admin-console-section svelte-1jef3w8"><h2 class="section-title">Feature Flags</h2> <div class="hairline-list"><!--[-->`);
      const each_array_5 = ensure_array_like(settings.filter((item) => item.key === "chat_enabled" || item.key === "nfc_enabled"));
      for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
        let item = each_array_5[$$index_5];
        $$renderer2.push(`<div class="toggle-row"><div class="list-meta"><strong>${escape_html(item.key === "chat_enabled" ? "Chat aktivieren" : "NFC aktivieren")}</strong></div> <label class="toggle"><input type="checkbox"${attr("checked", item.value === "true", true)}/></label></div>`);
      }
      $$renderer2.push(`<!--]--></div> <div class="section-divider svelte-1jef3w8"></div> <h3 class="section-title section-title-small svelte-1jef3w8">Push Ruhezeiten</h3> <div class="split-grid"><div class="field"><label for="quietStart">Beginn</label> <input id="quietStart" class="input" type="time"${attr("value", quietStart)}/></div> <div class="field"><label for="quietEnd">Ende</label> <input id="quietEnd" class="input" type="time"${attr("value", quietEnd)}/></div></div> <div class="actions"><button class="btn btn-primary" type="button"${attr("disabled", quietHoursSaving, true)}>`);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> ${escape_html("Speichern")}</button></div> `);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></section>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    if (deleteModalOpen && selectedUser()) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="admin-modal svelte-1jef3w8" role="dialog" aria-modal="true" aria-label="Konto loschen"><button type="button" class="admin-modal__backdrop svelte-1jef3w8" aria-label="Schliessen"></button> <div class="admin-modal__panel svelte-1jef3w8"><h2 class="section-title">Konto loschen</h2> <p class="text-muted">Bestatige mit der E-Mail: <strong>${escape_html(selectedUser().email)}</strong></p> <input class="input"${attr("value", deleteConfirmText)} placeholder="E-Mail eingeben"/> <div class="actions"><button class="btn btn-outline" type="button"${attr("disabled", deleteLoading, true)}>Abbrechen</button> <button class="btn btn-danger" type="button"${attr("disabled", deleteLoading, true)}>`);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> ${escape_html("Endgultig loschen")}</button></div></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
