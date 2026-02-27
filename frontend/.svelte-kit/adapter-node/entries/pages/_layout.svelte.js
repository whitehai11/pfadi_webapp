import { a as attr, b as attr_class, e as ensure_array_like, c as bind_props, s as store_get, h as head, d as clsx, f as slot, u as unsubscribe_stores } from "../../chunks/index2.js";
import { p as page } from "../../chunks/stores.js";
import { I as Icon } from "../../chunks/Icon.js";
import { L as Logo } from "../../chunks/Logo.js";
import { _ as fallback } from "../../chunks/context.js";
import { e as escape_html } from "../../chunks/escaping.js";
import { r as roleLabel, s as session, c as clearToken } from "../../chunks/auth.js";
import { r as resetAppSettings, a as appSettings } from "../../chunks/app-settings.js";
import { g as get } from "../../chunks/index.js";
function Navigation($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let items = fallback($$props["items"], () => [], true);
    let currentPath = fallback($$props["currentPath"], "/");
    let username = fallback($$props["username"], "");
    let role = fallback($$props["role"], "");
    let open = fallback($$props["open"], false);
    let onToggle = fallback($$props["onToggle"], void 0);
    let onLogout = fallback($$props["onLogout"], void 0);
    const isActive = (href) => {
      if (href === "/") return currentPath === "/";
      return currentPath === href || currentPath.startsWith(`${href}/`);
    };
    const initials = username.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    $$renderer2.push(`<header class="app-topbar"><div class="app-topbar__inner"><a class="app-brand" href="/"><span class="app-brand__mark">`);
    Logo($$renderer2, { size: 22 });
    $$renderer2.push(`<!----></span> <span><strong>Pfadfinder</strong> <small>Organisation</small></span></a> <button class="app-nav-toggle" type="button"${attr("aria-expanded", open)} aria-controls="main-nav">`);
    Icon($$renderer2, { name: "menu", size: 16 });
    $$renderer2.push(`<!----> <span>Menü</span></button> <nav id="main-nav"${attr_class("app-nav", void 0, { "open": open })}><!--[-->`);
    const each_array = ensure_array_like(items);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      $$renderer2.push(`<a${attr("href", item.href)}${attr_class("", void 0, { "active": isActive(item.href) })}>`);
      Icon($$renderer2, { name: item.icon, size: 16 });
      $$renderer2.push(`<!----> <span>${escape_html(item.label)}</span></a>`);
    }
    $$renderer2.push(`<!--]--></nav> <div class="app-user"><div class="app-user__meta"><strong>${escape_html(username)}</strong> <span>${escape_html(role)}</span></div> <div class="app-user__avatar" aria-hidden="true">${escape_html(initials || "P")}</div> <button class="icon-button subtle-button" type="button" aria-label="Abmelden">`);
    Icon($$renderer2, { name: "logout", size: 16 });
    $$renderer2.push(`<!----></button></div></div></header>`);
    bind_props($$props, { items, currentPath, username, role, open, onToggle, onLogout });
  });
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let visibleNavItems;
    let navOpen = false;
    const navItems = [
      { href: "/", label: "Ubersicht", icon: "home" },
      { href: "/calendar", label: "Kalender", icon: "calendar" },
      { href: "/inventory", label: "Material", icon: "inventory" },
      { href: "/chat", label: "Chat", icon: "chat" },
      { href: "/nfc", label: "NFC", icon: "nfc" },
      { href: "/packlists", label: "Packlisten", icon: "packlist" },
      { href: "/settings", label: "Einstellungen", icon: "settings" }
    ];
    if (!get(session)) {
      navOpen = false;
      resetAppSettings();
    }
    visibleNavItems = navItems.filter((item) => item.href !== "/chat" || store_get($$store_subs ??= {}, "$appSettings", appSettings).chatEnabled);
    head("12qhfyh", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Pfadfinder Orga</title>`);
      });
    });
    $$renderer2.push(`<div class="app-shell">`);
    if (store_get($$store_subs ??= {}, "$session", session)) {
      $$renderer2.push("<!--[-->");
      Navigation($$renderer2, {
        items: [
          ...visibleNavItems,
          ...store_get($$store_subs ??= {}, "$session", session).role === "admin" ? [{ href: "/admin", label: "Admin", icon: "admin" }] : []
        ],
        currentPath: store_get($$store_subs ??= {}, "$page", page).url.pathname,
        username: store_get($$store_subs ??= {}, "$session", session).username,
        role: roleLabel(store_get($$store_subs ??= {}, "$session", session).role),
        open: navOpen,
        onToggle: () => navOpen = !navOpen,
        onLogout: clearToken
      });
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <main${attr_class(clsx(store_get($$store_subs ??= {}, "$session", session) ? "app-main" : "auth-main"))}><div${attr_class(clsx(store_get($$store_subs ??= {}, "$session", session) ? "page-shell" : "auth-shell"))}><!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]--></div></main></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};
