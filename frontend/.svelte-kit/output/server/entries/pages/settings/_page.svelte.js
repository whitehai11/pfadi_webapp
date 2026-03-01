import { s as store_get, a as attr, e as ensure_array_like, c as attr_class, d as clsx, u as unsubscribe_stores } from "../../../chunks/index2.js";
import { S as SegmentedControl } from "../../../chunks/SegmentedControl.js";
import { A as Avatar } from "../../../chunks/Avatar.js";
import { a as session } from "../../../chunks/auth.js";
import { p as pushToast } from "../../../chunks/toast.js";
import { s as setThemePreference } from "../../../chunks/theme.js";
import { e as escape_html } from "../../../chunks/escaping.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const STORAGE = {
      language: "pfadi_language_preference"
    };
    const themeOptions = [
      { value: "light", label: "Hell" },
      { value: "dark", label: "Dunkel" },
      { value: "system", label: "System" }
    ];
    const languageOptions = [
      { value: "de", label: "Deutsch" },
      { value: "en", label: "English" }
    ];
    let pushLoading = "";
    let selectedTheme = "system";
    let selectedLanguage = "de";
    let chatSoundEnabled = true;
    let pushPrefs = { events: true, chat: true, tasks: true };
    let sessions = [];
    let devices = [];
    let previousTheme = null;
    let previousLanguage = null;
    let avatarRemoveLoading = false;
    const formatTimestamp = (value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "Unbekannt";
      return date.toLocaleString("de-DE");
    };
    previousTheme = selectedTheme;
    if (previousTheme !== null && selectedTheme !== previousTheme) {
      setThemePreference(selectedTheme);
      pushToast("Design gespeichert.", "success", 1e3);
    }
    previousLanguage = selectedLanguage;
    if (previousLanguage !== null && selectedLanguage !== previousLanguage) {
      localStorage.setItem(STORAGE.language, selectedLanguage);
      pushToast("Sprache gespeichert.", "success", 1e3);
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="page-stack"><section class="page-intro"><h1 class="page-title">Einstellungen</h1></section> <section class="settings-section svelte-1i19ct2"><h2 class="section-title">Profil</h2> <div class="settings-profile svelte-1i19ct2">`);
      Avatar($$renderer3, {
        name: store_get($$store_subs ??= {}, "$session", session)?.username || "User",
        avatarUrl: store_get($$store_subs ??= {}, "$session", session)?.avatarUrl || null,
        size: 96
      });
      $$renderer3.push(`<!----> <div class="settings-profile__actions svelte-1i19ct2"><input class="hidden-input svelte-1i19ct2" type="file" accept="image/png,image/jpeg,image/webp"/> <button class="btn btn-outline" type="button"${attr("disabled", avatarRemoveLoading, true)}>Bild wahlen</button> <button class="btn btn-primary" type="button"${attr("disabled", true, true)}>${escape_html("Speichern")}</button> <button class="btn btn-danger" type="button"${attr("disabled", !store_get($$store_subs ??= {}, "$session", session)?.avatarUrl && true, true)}>${escape_html("Entfernen")}</button></div></div> `);
      {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></section> <section class="settings-section svelte-1i19ct2"><h2 class="section-title">Design</h2> `);
      SegmentedControl($$renderer3, {
        options: themeOptions,
        ariaLabel: "Theme",
        get value() {
          return selectedTheme;
        },
        set value($$value) {
          selectedTheme = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----></section> <section class="settings-section svelte-1i19ct2"><h2 class="section-title">Benachrichtigungen</h2> <div class="actions"><button class="btn btn-primary" type="button"${attr("disabled", Boolean(pushLoading), true)}>${escape_html("Push aktivieren")}</button> <button class="btn btn-outline" type="button"${attr("disabled", Boolean(pushLoading), true)}>${escape_html("Push deaktivieren")}</button></div> <div class="hairline-list"><div class="toggle-row"><div class="list-meta"><strong>Termine</strong></div> <label class="toggle"><input type="checkbox"${attr("checked", pushPrefs.events, true)}${attr("disabled", true, true)}/></label></div> <div class="toggle-row"><div class="list-meta"><strong>Chat</strong></div> <label class="toggle"><input type="checkbox"${attr("checked", pushPrefs.chat, true)}${attr("disabled", true, true)}/></label></div> <div class="toggle-row"><div class="list-meta"><strong>Aufgaben</strong></div> <label class="toggle"><input type="checkbox"${attr("checked", pushPrefs.tasks, true)}${attr("disabled", true, true)}/></label></div> <div class="toggle-row"><div class="list-meta"><strong>Chat-Ton</strong></div> <label class="toggle"><input type="checkbox"${attr("checked", chatSoundEnabled, true)}/></label></div></div> `);
      {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></section> <section class="settings-section svelte-1i19ct2"><h2 class="section-title">Sitzungen</h2> <div class="hairline-list"><!--[-->`);
      const each_array = ensure_array_like(sessions);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let sessionItem = each_array[$$index];
        $$renderer3.push(`<div class="list-row"><div class="list-meta"><strong>${escape_html(sessionItem.label)}</strong> <span class="text-muted">Zuletzt aktiv: ${escape_html(formatTimestamp(sessionItem.lastActive))}</span></div> <span${attr_class(clsx(sessionItem.current ? "badge badge-success" : "badge badge-secondary"))}>${escape_html(sessionItem.current ? "Aktiv" : "Inaktiv")}</span></div>`);
      }
      $$renderer3.push(`<!--]--></div> `);
      {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></section> <section class="settings-section svelte-1i19ct2"><h2 class="section-title">Geraete</h2> <div class="hairline-list"><!--[-->`);
      const each_array_1 = ensure_array_like(devices);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let device = each_array_1[$$index_1];
        $$renderer3.push(`<div class="list-row"><div class="list-meta"><strong>${escape_html(device.name)}</strong> <span class="text-muted">${escape_html(device.browser)} · ${escape_html(device.platform)} · ${escape_html(device.language)}</span></div> <span${attr_class(clsx(device.current ? "badge badge-success" : "badge badge-secondary"))}>${escape_html(device.current ? "Dieses Geraet" : "Bekannt")}</span></div>`);
      }
      $$renderer3.push(`<!--]--></div></section> <section class="settings-section svelte-1i19ct2"><h2 class="section-title">Sprache</h2> `);
      SegmentedControl($$renderer3, {
        options: languageOptions,
        ariaLabel: "Sprache",
        get value() {
          return selectedLanguage;
        },
        set value($$value) {
          selectedLanguage = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----></section></div>`);
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
