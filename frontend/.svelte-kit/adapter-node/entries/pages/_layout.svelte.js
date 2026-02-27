import { a as attr, b as bind_props, c as attr_class, e as ensure_array_like, s as store_get, h as head, d as clsx, f as slot, u as unsubscribe_stores } from "../../chunks/index2.js";
import { p as page } from "../../chunks/stores.js";
import { _ as ssr_context, $ as fallback } from "../../chunks/context.js";
import { L as Logo } from "../../chunks/Logo.js";
import { e as escape_html } from "../../chunks/escaping.js";
import { a as apiFetch } from "../../chunks/api.js";
import { r as resetAppSettings, a as appSettings } from "../../chunks/app-settings.js";
import { r as roleLabel, s as session, c as clearToken } from "../../chunks/auth.js";
import "clsx";
import { g as get } from "../../chunks/index.js";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
function Icon($$renderer, $$props) {
  let name = fallback($$props["name"], "sparkles");
  let size = fallback($$props["size"], 18);
  $$renderer.push(`<svg${attr("width", size)}${attr("height", size)} viewBox="0 0 24 24" aria-hidden="true" focusable="false">`);
  if (name === "home") {
    $$renderer.push("<!--[-->");
    $$renderer.push(`<path fill="currentColor" d="M12 3l9 7v10a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2V10l9-7z"></path>`);
  } else {
    $$renderer.push("<!--[!-->");
    if (name === "calendar") {
      $$renderer.push("<!--[-->");
      $$renderer.push(`<path fill="currentColor" d="M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2h3V2zm13 8H4v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9z"></path>`);
    } else {
      $$renderer.push("<!--[!-->");
      if (name === "inventory" || name === "box") {
        $$renderer.push("<!--[-->");
        $$renderer.push(`<path fill="currentColor" d="M4 7.5L12 3l8 4.5v9L12 21l-8-4.5v-9zm8 3L6 7.3v7l6 3.4 6-3.4v-7L12 10.5z"></path>`);
      } else {
        $$renderer.push("<!--[!-->");
        if (name === "nfc") {
          $$renderer.push("<!--[-->");
          $$renderer.push(`<path fill="currentColor" d="M4 8a8 8 0 0 1 8-8v2a6 6 0 0 0-6 6H4zm0 4a12 12 0 0 1 12-12v2A10 10 0 0 0 6 12H4zm0 4A16 16 0 0 1 20 0v2A14 14 0 0 0 6 16H4zm6-3a2 2 0 1 1 4 0 2 2 0 0 1-4 0z"></path>`);
        } else {
          $$renderer.push("<!--[!-->");
          if (name === "packlist" || name === "checklist") {
            $$renderer.push("<!--[-->");
            $$renderer.push(`<path fill="currentColor" d="M9 3h6a2 2 0 0 1 2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2-2zm0 2v2h6V5H9zm1.4 8.8L8.5 12l-1.4 1.4 3.3 3.3 6.5-6.5-1.4-1.4-5.1 5.1z"></path>`);
          } else {
            $$renderer.push("<!--[!-->");
            if (name === "settings") {
              $$renderer.push("<!--[-->");
              $$renderer.push(`<path fill="currentColor" d="M19.4 13a7.7 7.7 0 0 0 .1-2l2-1.5-2-3.5-2.4 1a7.8 7.8 0 0 0-1.7-1L15 2h-6l-.4 4a7.8 7.8 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.7 7.7 0 0 0 .1 2l-2 1.5 2 3.5 2.4-1a7.8 7.8 0 0 0 1.7 1L9 22h6l.4-4a7.8 7.8 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z"></path>`);
            } else {
              $$renderer.push("<!--[!-->");
              if (name === "admin" || name === "users") {
                $$renderer.push("<!--[-->");
                $$renderer.push(`<path fill="currentColor" d="M9 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm8 1a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM9 13c3.3 0 6 1.8 6 4v2H3v-2c0-2.2 2.7-4 6-4zm8 1c2.2 0 4 1.3 4 3v2h-4.5v-1.5c0-1.1-.4-2.1-1.1-3 .2 0 .4-.5 1.6-.5z"></path>`);
              } else {
                $$renderer.push("<!--[!-->");
                if (name === "menu") {
                  $$renderer.push("<!--[-->");
                  $$renderer.push(`<path fill="currentColor" d="M4 7h16v2H4V7zm0 4h16v2H4v-2zm0 4h16v2H4v-2z"></path>`);
                } else {
                  $$renderer.push("<!--[!-->");
                  if (name === "logout") {
                    $$renderer.push("<!--[-->");
                    $$renderer.push(`<path fill="currentColor" d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5v-2H5V5h5V3zm8.6 8l-2.8-2.8-1.4 1.4 1.4 1.4H9v2h6.8l-1.4 1.4 1.4 1.4 2.8-2.8a1 1 0 0 0 0-1.4z"></path>`);
                  } else {
                    $$renderer.push("<!--[!-->");
                    if (name === "bell") {
                      $$renderer.push("<!--[-->");
                      $$renderer.push(`<path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2z"></path>`);
                    } else {
                      $$renderer.push("<!--[!-->");
                      if (name === "person") {
                        $$renderer.push("<!--[-->");
                        $$renderer.push(`<path fill="currentColor" d="M12 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0 2c4.4 0 8 2.2 8 5v3H4v-3c0-2.8 3.6-5 8-5z"></path>`);
                      } else {
                        $$renderer.push("<!--[!-->");
                        if (name === "chat") {
                          $$renderer.push("<!--[-->");
                          $$renderer.push(`<path fill="currentColor" d="M5 4h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9l-5 4v-4H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zm0 2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h1v1.8L8.2 16H19a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5z"></path>`);
                        } else {
                          $$renderer.push("<!--[!-->");
                          if (name === "chevron") {
                            $$renderer.push("<!--[-->");
                            $$renderer.push(`<path fill="currentColor" d="M8.6 5.6L15 12l-6.4 6.4 1.4 1.4L17.8 12 10 4.2 8.6 5.6z"></path>`);
                          } else {
                            $$renderer.push("<!--[!-->");
                            $$renderer.push(`<path fill="currentColor" d="M12 2l2.2 5.8L20 10l-5.8 2.2L12 18l-2.2-5.8L4 10l5.8-2.2L12 2z"></path>`);
                          }
                          $$renderer.push(`<!--]-->`);
                        }
                        $$renderer.push(`<!--]-->`);
                      }
                      $$renderer.push(`<!--]-->`);
                    }
                    $$renderer.push(`<!--]-->`);
                  }
                  $$renderer.push(`<!--]-->`);
                }
                $$renderer.push(`<!--]-->`);
              }
              $$renderer.push(`<!--]-->`);
            }
            $$renderer.push(`<!--]-->`);
          }
          $$renderer.push(`<!--]-->`);
        }
        $$renderer.push(`<!--]-->`);
      }
      $$renderer.push(`<!--]-->`);
    }
    $$renderer.push(`<!--]-->`);
  }
  $$renderer.push(`<!--]--></svg>`);
  bind_props($$props, { name, size });
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
function UpdateBanner($$renderer, $$props) {
  let visible = fallback($$props["visible"], false);
  let version = fallback($$props["version"], "");
  let onReload = fallback($$props["onReload"], () => {
  });
  let onDismiss = fallback($$props["onDismiss"], () => {
  });
  if (visible) {
    $$renderer.push("<!--[-->");
    $$renderer.push(`<div class="update-banner" role="status" aria-live="polite"><div class="update-banner__copy"><strong>Neue Version verfugbar</strong> `);
    if (version) {
      $$renderer.push("<!--[-->");
      $$renderer.push(`<span>Version ${escape_html(version)} steht bereit.</span>`);
    } else {
      $$renderer.push("<!--[!-->");
    }
    $$renderer.push(`<!--]--></div> <div class="update-banner__actions"><button class="btn btn-outline" type="button">Spater</button> <button class="btn btn-primary" type="button">Neu laden</button></div></div>`);
  } else {
    $$renderer.push("<!--[!-->");
  }
  $$renderer.push(`<!--]-->`);
  bind_props($$props, { visible, version, onReload, onDismiss });
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let visibleNavItems;
    let navOpen = false;
    let versionPollHandle = null;
    let currentVersion = "";
    let pendingVersion = "";
    let showUpdateBanner = false;
    const navItems = [
      { href: "/", label: "Ubersicht", icon: "home" },
      { href: "/calendar", label: "Kalender", icon: "calendar" },
      { href: "/inventory", label: "Material", icon: "inventory" },
      { href: "/chat", label: "Chat", icon: "chat" },
      { href: "/nfc", label: "NFC", icon: "nfc" },
      { href: "/packlists", label: "Packlisten", icon: "packlist" },
      { href: "/settings", label: "Einstellungen", icon: "settings" }
    ];
    const stopVersionPolling = () => {
      if (versionPollHandle !== null) {
        clearInterval(versionPollHandle);
        versionPollHandle = null;
      }
    };
    const fetchSystemVersion = async () => {
      if (typeof window === "undefined" || !navigator.onLine || !get(session)) return null;
      try {
        return await apiFetch("/api/system/version");
      } catch {
        return null;
      }
    };
    const checkForVersionUpdate = async () => {
      const versionInfo = await fetchSystemVersion();
      if (!versionInfo?.version) return;
      if (!currentVersion) {
        currentVersion = versionInfo.version;
        pendingVersion = "";
        showUpdateBanner = false;
        return;
      }
      if (versionInfo.version !== currentVersion) {
        pendingVersion = versionInfo.version;
        showUpdateBanner = true;
      }
    };
    const startVersionPolling = async () => {
      stopVersionPolling();
      currentVersion = "";
      pendingVersion = "";
      showUpdateBanner = false;
      await checkForVersionUpdate();
      if (typeof window === "undefined") return;
      versionPollHandle = window.setInterval(
        () => {
          void checkForVersionUpdate();
        },
        6e4
      );
    };
    onDestroy(() => {
      stopVersionPolling();
    });
    if (!get(session)) {
      navOpen = false;
      resetAppSettings();
      stopVersionPolling();
      currentVersion = "";
      pendingVersion = "";
      showUpdateBanner = false;
    }
    if (store_get($$store_subs ??= {}, "$session", session) && versionPollHandle === null) {
      void startVersionPolling();
    }
    visibleNavItems = navItems.filter((item) => item.href !== "/chat" || store_get($$store_subs ??= {}, "$appSettings", appSettings).chatEnabled);
    head("12qhfyh", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Pfadfinder Orga</title>`);
      });
    });
    $$renderer2.push(`<div class="app-shell">`);
    UpdateBanner($$renderer2, {
      visible: showUpdateBanner,
      version: pendingVersion,
      onDismiss: () => showUpdateBanner = false,
      onReload: () => window.location.reload()
    });
    $$renderer2.push(`<!----> `);
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
