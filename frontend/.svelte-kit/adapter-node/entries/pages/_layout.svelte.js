import { Z as attr, _ as bind_props, $ as head, a0 as store_get, a1 as attr_class, a2 as clsx, a3 as slot, a4 as unsubscribe_stores } from "../../chunks/index2.js";
import { r as roleLabel, s as session } from "../../chunks/auth.js";
import "clsx";
import { f as fallback } from "../../chunks/context.js";
import { e as escape_html } from "../../chunks/escaping.js";
function Logo($$renderer, $$props) {
  let size = fallback($$props["size"], 48);
  $$renderer.push(`<svg class="logo"${attr("width", size)}${attr("height", size)} viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect x="6" y="6" width="52" height="52" rx="14" fill="currentColor"></rect><path d="M32 16l12 20h-8v16h-8V36h-8l12-20z" fill="#0a2540"></path><circle cx="32" cy="47" r="5" fill="#0a2540"></circle></svg>`);
  bind_props($$props, { size });
}
function LoadingScreen($$renderer) {
  $$renderer.push(`<div class="loading-screen" role="status" aria-live="polite"><div class="loading-logo logo-badge">`);
  Logo($$renderer, { size: 96 });
  $$renderer.push(`<!----></div></div>`);
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    head("12qhfyh", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Pfadfinder Orga</title>`);
      });
    });
    {
      $$renderer2.push("<!--[-->");
      LoadingScreen($$renderer2);
    }
    $$renderer2.push(`<!--]--> <div class="app-shell">`);
    if (store_get($$store_subs ??= {}, "$session", session)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<header class="topbar"><div class="topbar-inner"><nav class="nav"><a href="/">Übersicht</a> <a href="/calendar">Kalender</a> <a href="/inventory">Material</a> <a href="/nfc">NFC</a> <a href="/packlists">Packlisten</a> <a href="/settings">Einstellungen</a> `);
      if (store_get($$store_subs ??= {}, "$session", session)?.role === "admin") {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<a href="/admin">Admin</a>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></nav> <div class="user-menu"><span>${escape_html(store_get($$store_subs ??= {}, "$session", session).username)} (${escape_html(roleLabel(store_get($$store_subs ??= {}, "$session", session).role))})</span> <button class="btn btn-outline">Logout</button></div></div></header>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <main${attr_class(clsx(store_get($$store_subs ??= {}, "$session", session) ? "container" : "auth-container"))}><!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]--></main></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};
