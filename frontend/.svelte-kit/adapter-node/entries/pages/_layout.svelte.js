import { a as attr, b as bind_props, s as store_get, c as attr_class, e as ensure_array_like, u as unsubscribe_stores, h as head, d as clsx, f as slot } from "../../chunks/index2.js";
import { p as page } from "../../chunks/stores.js";
import { Z as fallback } from "../../chunks/utils2.js";
import { L as Logo } from "../../chunks/Logo.js";
import { d as derived, w as writable, g as get } from "../../chunks/index.js";
import { t as toasts } from "../../chunks/toast.js";
import { c as createReconnectingWebSocketClient } from "../../chunks/websocket.js";
import { e as escape_html } from "../../chunks/escaping.js";
import { A as Avatar } from "../../chunks/Avatar.js";
import { o as onDestroy, t as tick } from "../../chunks/index-server.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
import { a as apiFetch } from "../../chunks/api.js";
import { r as roleLabel, s as setToken, c as clearToken, a as session } from "../../chunks/auth.js";
import { t as toggleTheme, a as appliedTheme } from "../../chunks/theme.js";
function Icon($$renderer, $$props) {
  let name = fallback($$props["name"], "sparkles");
  let size = fallback($$props["size"], 16);
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
                          if (name === "moon") {
                            $$renderer.push("<!--[-->");
                            $$renderer.push(`<path fill="currentColor" d="M14.7 2.3a8.5 8.5 0 1 0 7 12.6 1 1 0 0 0-1.2-1.4A6.5 6.5 0 0 1 12 4.9a6.6 6.6 0 0 1 1.3-3.9 1 1 0 0 0-1.3-1.4 8.4 8.4 0 0 0 2.7 1.7z"></path>`);
                          } else {
                            $$renderer.push("<!--[!-->");
                            if (name === "sun") {
                              $$renderer.push("<!--[-->");
                              $$renderer.push(`<path fill="currentColor" d="M12 4a1 1 0 0 0 1-1V1h-2v2a1 1 0 0 0 1 1zm0 16a1 1 0 0 0-1 1v2h2v-2a1 1 0 0 0-1-1zm8-9h2V9h-2a1 1 0 0 0 0 2zM2 11h2a1 1 0 0 0 0-2H2v2zm15.7-5.3l1.4-1.4-1.4-1.4-1.4 1.4a1 1 0 1 0 1.4 1.4zM6.3 17.7l-1.4 1.4 1.4 1.4 1.4-1.4a1 1 0 1 0-1.4-1.4zm11.4 1.4l1.4 1.4 1.4-1.4-1.4-1.4a1 1 0 1 0-1.4 1.4zM6.3 6.3a1 1 0 0 0 1.4-1.4L6.3 3.5 4.9 4.9l1.4 1.4zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"></path>`);
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
      $$renderer.push(`<!--]-->`);
    }
    $$renderer.push(`<!--]-->`);
  }
  $$renderer.push(`<!--]--></svg>`);
  bind_props($$props, { name, size });
}
const initialState$1 = {
  items: [],
  unreadCount: 0,
  loading: false,
  error: "",
  socketState: "idle"
};
const notificationState = writable(initialState$1);
let sessionUnsub = null;
let wsStateUnsub = null;
const wsClient = createReconnectingWebSocketClient({});
const resetState = () => {
  notificationState.set(initialState$1);
};
const stopNotificationsRealtime = () => {
  wsClient.disconnect();
  sessionUnsub?.();
  wsStateUnsub?.();
  sessionUnsub = null;
  wsStateUnsub = null;
  resetState();
};
const notificationsStore = {
  subscribe: notificationState.subscribe
};
const unreadNotificationCount = derived(notificationsStore, ($state) => $state.unreadCount);
const overlayState = writable(null);
const activeOverlayId = {
  subscribe: overlayState.subscribe
};
const closeOverlay = (id) => {
  {
    overlayState.set(null);
    return;
  }
};
const toggleOverlay = (id) => {
  if (get(overlayState) === id) {
    overlayState.set(null);
    return;
  }
  overlayState.set(id);
};
function NotificationMenu($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const OVERLAY_ID = "notification-menu";
    let open = false;
    const formatTime = (createdAt) => new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit"
    }).format(new Date(createdAt));
    open = store_get($$store_subs ??= {}, "$activeOverlayId", activeOverlayId) === OVERLAY_ID;
    $$renderer2.push(`<div class="notification-menu"><button${attr_class(`icon-button subtle-button notification-trigger ${store_get($$store_subs ??= {}, "$unreadNotificationCount", unreadNotificationCount) > 0 ? "has-unread" : ""}`)} type="button"${attr("aria-expanded", open)} aria-label="Benachrichtigungen">`);
    Icon($$renderer2, { name: "bell", size: 16 });
    $$renderer2.push(`<!----> `);
    if (store_get($$store_subs ??= {}, "$unreadNotificationCount", unreadNotificationCount) > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="notification-badge">${escape_html(store_get($$store_subs ??= {}, "$unreadNotificationCount", unreadNotificationCount))}</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></button> `);
    if (open) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="notification-backdrop" type="button" aria-label="Schließen"></button> <div class="notification-panel" role="dialog" aria-label="Benachrichtigungen"><div class="notification-panel__handle" aria-hidden="true"></div> <header class="notification-panel__header"><div class="notification-panel__title"><strong>Benachrichtigungen</strong> `);
      if (store_get($$store_subs ??= {}, "$unreadNotificationCount", unreadNotificationCount) > 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span class="badge badge-info">${escape_html(store_get($$store_subs ??= {}, "$unreadNotificationCount", unreadNotificationCount))} neu</span>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div> <div class="notification-panel__actions"><button class="btn btn-outline" type="button">Alle gelesen</button></div></header> `);
      if (store_get($$store_subs ??= {}, "$notificationsStore", notificationsStore).loading) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="notification-empty"><p class="text-muted">Lade Benachrichtigungen...</p></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        if (store_get($$store_subs ??= {}, "$notificationsStore", notificationsStore).items.length === 0) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="notification-empty"><p class="text-muted">Keine Benachrichtigungen vorhanden.</p></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<div class="notification-list"><!--[-->`);
          const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$notificationsStore", notificationsStore).items);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let item = each_array[$$index];
            $$renderer2.push(`<button${attr_class(`notification-item ${item.is_read ? "is-read" : "is-unread"}`)} type="button"><div class="notification-item__copy"><strong>${escape_html(item.title)}</strong> <small>${escape_html(item.message)}</small> <small>${escape_html(formatTime(item.created_at))}</small></div> `);
            if (!item.is_read) {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<span class="notification-dot" aria-hidden="true"></span>`);
            } else {
              $$renderer2.push("<!--[!-->");
            }
            $$renderer2.push(`<!--]--></button>`);
          }
          $$renderer2.push(`<!--]--></div>`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function Navigation($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let items = fallback($$props["items"], () => [], true);
    let currentPath = fallback($$props["currentPath"], "/");
    let username = fallback($$props["username"], "");
    let role = fallback($$props["role"], "");
    let avatarUrl = fallback($$props["avatarUrl"], null);
    let open = fallback($$props["open"], false);
    let onToggle = fallback($$props["onToggle"], void 0);
    let onLogout = fallback($$props["onLogout"], void 0);
    let theme = fallback($$props["theme"], "light");
    let onToggleTheme = fallback($$props["onToggleTheme"], void 0);
    let overlayId = fallback($$props["overlayId"], "");
    const isActive = (href) => {
      if (href === "/") return currentPath === "/";
      return currentPath === href || currentPath.startsWith(`${href}/`);
    };
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
    $$renderer2.push(`<!--]--></nav> <div class="app-user">`);
    NotificationMenu($$renderer2);
    $$renderer2.push(`<!----> <button class="icon-button subtle-button" type="button"${attr("aria-label", theme === "dark" ? "Helles Theme aktivieren" : "Dunkles Theme aktivieren")}>`);
    Icon($$renderer2, { name: theme === "dark" ? "sun" : "moon", size: 16 });
    $$renderer2.push(`<!----></button> <div class="app-user__meta"><strong>${escape_html(username)}</strong> <span>${escape_html(role)}</span></div> `);
    Avatar($$renderer2, { name: username, avatarUrl, size: 40 });
    $$renderer2.push(`<!----> <button class="icon-button subtle-button" type="button" aria-label="Abmelden">`);
    Icon($$renderer2, { name: "logout", size: 16 });
    $$renderer2.push(`<!----></button></div></div></header>`);
    bind_props($$props, {
      items,
      currentPath,
      username,
      role,
      avatarUrl,
      open,
      onToggle,
      onLogout,
      theme,
      onToggleTheme,
      overlayId
    });
  });
}
const initialState = {
  loading: false,
  loadedAt: 0,
  items: []
};
const commandIndex = writable(initialState);
const normalize = (value) => (value || "").trim();
const createQuickEntries = (isAdmin) => {
  const quick = [
    {
      id: "quick:new-event",
      type: "quick",
      group: "Aktionen",
      title: "New Event",
      subtitle: "Kalender: neuen Termin erstellen",
      href: "/calendar#new-event-form",
      keywords: "new event neuer termin kalender"
    },
    {
      id: "quick:new-box",
      type: "quick",
      group: "Aktionen",
      title: "New Box",
      subtitle: "Material: neue Box erstellen",
      href: "/inventory#new-box-form",
      keywords: "new box neue box material"
    },
    {
      id: "quick:create-task",
      type: "quick",
      group: "Aktionen",
      title: "Create Task",
      subtitle: "Packlisten öffnen",
      href: "/packlists",
      keywords: "create task aufgabe packliste packlisten"
    }
  ];
  if (isAdmin) {
    quick.push({
      id: "quick:send-push",
      type: "quick",
      group: "Aktionen",
      title: "Send Push",
      subtitle: "Admin: Push-Regeln öffnen",
      href: "/admin#push-rules",
      keywords: "send push push senden admin"
    });
  }
  return quick;
};
const createPageEntries = (isAdmin) => {
  const base = [
    {
      id: "page:overview",
      type: "page",
      group: "Seiten",
      title: "Übersicht",
      subtitle: "Startseite",
      href: "/",
      keywords: "übersicht dashboard startseite"
    },
    {
      id: "page:calendar",
      type: "page",
      group: "Seiten",
      title: "Kalender",
      subtitle: "Termine",
      href: "/calendar",
      keywords: "kalender termine event"
    },
    {
      id: "page:inventory",
      type: "page",
      group: "Seiten",
      title: "Material",
      subtitle: "Boxen und Bestand",
      href: "/inventory",
      keywords: "material inventar boxen"
    },
    {
      id: "page:chat",
      type: "page",
      group: "Seiten",
      title: "Chat",
      subtitle: "Räume und Nachrichten",
      href: "/chat",
      keywords: "chat raum nachrichten"
    },
    {
      id: "page:packlists",
      type: "page",
      group: "Seiten",
      title: "Packlisten",
      subtitle: "Packlisten je Termin",
      href: "/packlists",
      keywords: "packliste packlisten task aufgaben"
    },
    {
      id: "page:settings",
      type: "page",
      group: "Seiten",
      title: "Einstellungen",
      subtitle: "Systemstatus und Push",
      href: "/settings",
      keywords: "einstellungen settings system"
    }
  ];
  if (isAdmin) {
    base.push({
      id: "page:admin",
      type: "page",
      group: "Seiten",
      title: "Admin",
      subtitle: "Benutzer und Push-Regeln",
      href: "/admin",
      keywords: "admin benutzer push regeln"
    });
  }
  return base;
};
const loadCommandIndex = async (options) => {
  let shouldLoad = true;
  commandIndex.update((state) => {
    if (!options.force && state.loading) {
      shouldLoad = false;
      return state;
    }
    const fresh = Date.now() - state.loadedAt < 6e4;
    if (!options.force && fresh && state.items.length > 0) {
      shouldLoad = false;
      return state;
    }
    return { ...state, loading: true };
  });
  if (!shouldLoad) return;
  const [events, boxes, chats, users] = await Promise.all([
    apiFetch("/api/calendar", { toastOnError: false }).catch(() => []),
    apiFetch("/api/boxes", { toastOnError: false }).catch(() => []),
    apiFetch("/api/chat/rooms", { toastOnError: false }).catch(() => []),
    options.isAdmin ? apiFetch("/api/admin/users?role=all", { toastOnError: false }).catch(() => []) : Promise.resolve([])
  ]);
  const items = [
    ...createQuickEntries(options.isAdmin),
    ...createPageEntries(options.isAdmin),
    ...users.map((user) => ({
      id: `user:${user.id}`,
      type: "entity",
      group: "Nutzer",
      title: normalize(user.email) || "Nutzer",
      subtitle: `${normalize(user.role)} · ${normalize(user.status)}`,
      href: `/admin?user=${encodeURIComponent(user.id)}`,
      keywords: `${normalize(user.email)} ${normalize(user.role)} ${normalize(user.status)}`.toLowerCase()
    })),
    ...events.map((event) => ({
      id: `event:${event.id}`,
      type: "entity",
      group: "Termine",
      title: normalize(event.title) || "Termin",
      subtitle: `${normalize(event.location)} · ${normalize(event.start_at)}`,
      href: `/calendar?event=${encodeURIComponent(event.id)}`,
      keywords: `${normalize(event.title)} ${normalize(event.location)} ${normalize(event.type)}`.toLowerCase()
    })),
    ...boxes.map((box) => ({
      id: `box:${box.id}`,
      type: "entity",
      group: "Boxen",
      title: normalize(box.name) || "Box",
      subtitle: normalize(box.nfc_tag) || "Material",
      href: `/inventory?box=${encodeURIComponent(box.id)}`,
      keywords: `${normalize(box.name)} ${normalize(box.nfc_tag)} ${normalize(box.description)}`.toLowerCase()
    })),
    ...chats.map((room) => ({
      id: `chat:${room.id}`,
      type: "entity",
      group: "Chats",
      title: normalize(room.name) || "Chat",
      subtitle: `${Number(room.message_count ?? 0)} Nachrichten`,
      href: `/chat?room=${encodeURIComponent(room.id)}`,
      keywords: `${normalize(room.name)} chat raum nachrichten`.toLowerCase()
    }))
  ];
  commandIndex.set({
    loading: false,
    loadedAt: Date.now(),
    items
  });
};
function CommandPalette($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let isAdmin = fallback($$props["isAdmin"], false);
    let enabled = fallback($$props["enabled"], true);
    const OVERLAY_ID = "command-palette";
    const MAX_RESULTS = 12;
    let query = "";
    let selectedIndex = 0;
    let open = false;
    let results = [];
    const scoreResult = (item, normalized) => {
      const title = item.title.toLowerCase();
      const subtitle = item.subtitle.toLowerCase();
      const keywords = item.keywords.toLowerCase();
      if (!normalized) return 100;
      if (title.startsWith(normalized)) return 90;
      if (title.includes(normalized)) return 70;
      if (keywords.includes(normalized)) return 50;
      if (subtitle.includes(normalized)) return 40;
      return 0;
    };
    const recalc = (items) => {
      const normalized = query.trim().toLowerCase();
      const ranked = items.map((item) => ({ item, score: scoreResult(item, normalized) })).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title)).map((entry) => entry.item);
      results = ranked.slice(0, MAX_RESULTS);
      if (selectedIndex >= results.length) {
        selectedIndex = Math.max(0, results.length - 1);
      }
    };
    const ensureLoaded = async () => {
      if (!enabled) return;
      await loadCommandIndex({ isAdmin });
    };
    const onTogglePalette = async () => {
      if (!enabled) return;
      toggleOverlay(OVERLAY_ID);
      if (store_get($$store_subs ??= {}, "$activeOverlayId", activeOverlayId) !== OVERLAY_ID) return;
      await ensureLoaded();
      await tick();
    };
    const onGlobalKeyDown = async (event) => {
      if (!enabled) return;
      const isToggle = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (!isToggle) return;
      event.preventDefault();
      await onTogglePalette();
    };
    onDestroy(() => {
      window.removeEventListener("keydown", onGlobalKeyDown);
    });
    open = store_get($$store_subs ??= {}, "$activeOverlayId", activeOverlayId) === OVERLAY_ID;
    recalc(store_get($$store_subs ??= {}, "$commandIndex", commandIndex).items);
    if (open) {
      void ensureLoaded();
    }
    if (open) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="command-palette-layer"><button class="command-palette-backdrop" type="button" aria-label="Schließen"></button> <div class="command-palette" role="dialog" aria-modal="true" aria-label="Command Palette"><header class="command-palette__header"><input class="input command-palette__input" type="text"${attr("value", query)} placeholder="Suche nach Seiten, Nutzern, Terminen, Boxen, Chats..." aria-label="Suche"/></header> <div class="command-palette__results">`);
      if (store_get($$store_subs ??= {}, "$commandIndex", commandIndex).loading) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="text-muted">Index wird geladen...</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
        if (results.length === 0) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="text-muted">Keine Treffer.</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<!--[-->`);
          const each_array = ensure_array_like(results);
          for (let index = 0, $$length = each_array.length; index < $$length; index++) {
            let item = each_array[index];
            $$renderer2.push(`<button${attr_class(`command-palette__item ${index === selectedIndex ? "is-active" : ""}`)} type="button"><div class="list-meta"><strong>${escape_html(item.title)}</strong> <span class="text-muted">${escape_html(item.subtitle)}</span></div> <span class="badge badge-secondary">${escape_html(item.group)}</span></button>`);
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></div></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { isAdmin, enabled });
  });
}
function Toaster($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    $$renderer2.push(`<div class="toast-stack" aria-live="polite" aria-atomic="true"><!--[-->`);
    const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$toasts", toasts));
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let toast = each_array[$$index];
      $$renderer2.push(`<button${attr_class(`toast toast-${toast.type}`)} type="button">${escape_html(toast.message)}</button>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
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
const defaultState = {
  chatEnabled: false,
  nfcEnabled: false
};
const appSettings = writable(defaultState);
const resetAppSettings = () => {
  appSettings.set(defaultState);
};
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let visibleNavItems;
    const NAV_OVERLAY_ID = "main-navigation";
    let navOpen = false;
    let previousPath = "";
    let versionPollHandle = null;
    let tokenRefreshHandle = null;
    let currentVersion = "";
    let pendingVersion = "";
    let showUpdateBanner = false;
    String("").trim().toLowerCase() === "true";
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
    const stopTokenRefresh = () => {
      if (tokenRefreshHandle !== null) {
        clearInterval(tokenRefreshHandle);
        tokenRefreshHandle = null;
      }
    };
    const refreshToken = async () => {
      if (!get(session)) return;
      try {
        const result = await apiFetch("/api/auth/refresh", { method: "POST", toastOnError: false });
        if (result?.token) {
          setToken(result.token);
        }
      } catch {
        clearToken();
        resetAppSettings();
        stopVersionPolling();
        stopTokenRefresh();
      }
    };
    const startTokenRefresh = () => {
      stopTokenRefresh();
      tokenRefreshHandle = window.setInterval(
        () => {
          void refreshToken();
        },
        10 * 60 * 1e3
      );
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
      stopTokenRefresh();
      stopNotificationsRealtime();
    });
    if (!get(session)) {
      closeOverlay();
      resetAppSettings();
      stopVersionPolling();
      stopTokenRefresh();
      currentVersion = "";
      pendingVersion = "";
      showUpdateBanner = false;
    }
    if (store_get($$store_subs ??= {}, "$session", session) && versionPollHandle === null) {
      void startVersionPolling();
    }
    if (store_get($$store_subs ??= {}, "$session", session) && tokenRefreshHandle === null) {
      startTokenRefresh();
    }
    visibleNavItems = navItems.filter((item) => item.href !== "/chat" || store_get($$store_subs ??= {}, "$appSettings", appSettings).chatEnabled);
    navOpen = store_get($$store_subs ??= {}, "$activeOverlayId", activeOverlayId) === NAV_OVERLAY_ID;
    if (store_get($$store_subs ??= {}, "$page", page).url.pathname !== previousPath) {
      previousPath = store_get($$store_subs ??= {}, "$page", page).url.pathname;
      closeOverlay();
    }
    head("12qhfyh", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Pfadfinder Orga</title>`);
      });
    });
    $$renderer2.push(`<div class="app-shell">`);
    Toaster($$renderer2);
    $$renderer2.push(`<!----> `);
    if (store_get($$store_subs ??= {}, "$session", session)) {
      $$renderer2.push("<!--[-->");
      CommandPalette($$renderer2, {
        isAdmin: store_get($$store_subs ??= {}, "$session", session).role === "admin",
        enabled: true
      });
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
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
        avatarUrl: store_get($$store_subs ??= {}, "$session", session).avatarUrl ?? null,
        overlayId: NAV_OVERLAY_ID,
        open: navOpen,
        onToggle: () => toggleOverlay(NAV_OVERLAY_ID),
        onLogout: async () => {
          closeOverlay();
          try {
            await apiFetch("/api/auth/logout", { method: "POST", toastOnError: false });
          } catch {
          }
          clearToken();
        },
        theme: store_get($$store_subs ??= {}, "$appliedTheme", appliedTheme),
        onToggleTheme: toggleTheme
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
