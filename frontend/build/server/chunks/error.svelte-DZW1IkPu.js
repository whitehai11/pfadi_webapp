import { e as escape_html } from './escaping-CqgfEcN3.js';
import './state.svelte-CU6PCHkq.js';
import '@sveltejs/kit/internal';
import './exports-CoK1Wwct.js';
import { w as writable } from './index-BzU1KQlH.js';
import '@sveltejs/kit/internal/server';
import { g as getContext } from './context-O3Xq51Z4.js';

function create_updated_store() {
  const { set, subscribe } = writable(false);
  {
    return {
      subscribe,
      // eslint-disable-next-line @typescript-eslint/require-await
      check: async () => false
    };
  }
}
const stores = {
  updated: /* @__PURE__ */ create_updated_store()
};
({
  check: stores.updated.check
});
function context() {
  return getContext("__request__");
}
const page$1 = {
  get error() {
    return context().page.error;
  },
  get status() {
    return context().page.status;
  }
};
const page = page$1;
function Error$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<h1>${escape_html(page.status)}</h1> <p>${escape_html(page.error?.message)}</p>`);
  });
}

export { Error$1 as default };
//# sourceMappingURL=error.svelte-DZW1IkPu.js.map
