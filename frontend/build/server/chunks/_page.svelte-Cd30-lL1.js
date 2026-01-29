import { a7 as store_get, ae as ensure_array_like, ab as unsubscribe_stores } from './index2-CWN8FtHA.js';
import { s as session } from './auth-C3DnexIj.js';
import { e as escape_html } from './escaping-CqgfEcN3.js';
import './context-O3Xq51Z4.js';
import './index-BzU1KQlH.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let settings = [];
    $$renderer2.push(`<section class="card-grid grid-2"><div class="card"><h2 class="page-title">Einstellungen</h2> <p class="text-muted">Push-Benachrichtigungen und Status.</p> <div class="actions"><button class="btn btn-primary">Push aktivieren</button> <button class="btn btn-outline">Push deaktivieren</button></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    if (store_get($$store_subs ??= {}, "$session", session)?.role === "admin") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="card"><h3 class="section-title">Feature-Status</h3> `);
      if (settings.length === 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="text-muted">Keine Feature-Daten verfügbar.</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<!--[-->`);
        const each_array = ensure_array_like(settings);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let item = each_array[$$index];
          $$renderer2.push(`<div class="actions actions-between"><span>${escape_html(item.key)}</span> <span class="badge badge-secondary">${escape_html(item.value)}</span></div>`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></section>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-Cd30-lL1.js.map
