import { a as attr, b as bind_props, c as attr_class, e as ensure_array_like, h as head, s as store_get, d as clsx, f as slot, u as unsubscribe_stores } from "../../chunks/index2.js";
import { p as page } from "../../chunks/stores.js";
import { I as Icon } from "../../chunks/Icon.js";
import { _ as fallback } from "../../chunks/context.js";
import { e as escape_html } from "../../chunks/escaping.js";
import { r as roleLabel, s as session, c as clearToken } from "../../chunks/auth.js";
import { g as get } from "../../chunks/index.js";
function Logo($$renderer, $$props) {
  let size = fallback($$props["size"], 48);
  $$renderer.push(`<svg class="logo"${attr("width", size)}${attr("height", size)} viewBox="0 0 512 512" aria-hidden="true" focusable="false"><g fill="currentColor"><polygon points="141.788 352.225 255.996 352.225 370.212 352.225 370.212 321.898 255.996 321.898 141.788 321.898"></polygon><path d="M274.607 361.714h-37.222c0 18.466-8.673 73.956-47.726 92.186 9.108 13.012 27.337 19.526 41.655 16.918 0 0 2.8 30.632 24.682 41.182 21.884-10.549 24.683-41.182 24.683-41.182 14.317 2.609 32.547-3.905 41.654-16.918-39.053-18.229-47.726-73.72-47.726-92.186z"></path><path d="M177.6 311.784h36.582s.267-133.627-88.09-149.485C35.232 145.991-10.594 259.932 47.986 306.795c6.597-76.115 126.274-67.686 129.614 4.989z"></path><path d="M178.95 361.478c-3.127 22.128-23.958 33.844-42.18 33.844-19.526 0-33.843-19.534-39.053-28.642-22.136 32.547-12.228 65.734 22.127 76.81 40.358 13.012 92.423-28.634 92.423-82.012z"></path><path d="M385.908 162.299c-88.358 15.858-88.09 149.485-88.09 149.485H334.4c3.34-72.676 123.017-81.104 129.615-4.989 58.579-46.863 12.753-160.804-78.107-144.496z"></path><path d="M375.23 395.321c-18.222 0-39.053-11.716-42.18-33.844h-33.317c0 53.378 52.066 95.024 92.423 82.012 34.355-11.076 44.262-44.263 22.127-76.81-5.21 9.108-19.527 28.642-39.053 28.642z"></path><path d="M275.79 311.784c0-92.202 48.053-140.866 48.053-202.855 0-55.102-39.282-94.009-67.839-108.929-28.558 14.92-67.84 53.828-67.84 108.929 0 61.989 48.054 110.653 48.054 202.855z"></path></g></svg>`);
  bind_props($$props, { size });
}
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
    let navOpen = false;
    const navItems = [
      { href: "/", label: "Übersicht", icon: "home" },
      { href: "/calendar", label: "Kalender", icon: "calendar" },
      { href: "/inventory", label: "Material", icon: "inventory" },
      { href: "/nfc", label: "NFC", icon: "nfc" },
      { href: "/packlists", label: "Packlisten", icon: "packlist" },
      { href: "/settings", label: "Einstellungen", icon: "settings" }
    ];
    if (!get(session)) {
      navOpen = false;
    }
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
          ...navItems,
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
