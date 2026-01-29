import { a7 as store_get, ab as unsubscribe_stores } from './index2-CWN8FtHA.js';
import { g as getContext } from './context-O3Xq51Z4.js';
import '@sveltejs/kit/internal';
import './exports-CoK1Wwct.js';
import '@sveltejs/kit/internal/server';
import './state.svelte-CU6PCHkq.js';
import './escaping-CqgfEcN3.js';

const getStores = () => {
  const stores$1 = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores$1.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores$1.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores$1.updated
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    store_get($$store_subs ??= {}, "$page", page).params.eventId;
    $$renderer2.push(`<section class="card"><h2 class="page-title">Packliste</h2> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></section> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="card">Lade Packliste...</div>`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-BQjMI3JJ.js.map
