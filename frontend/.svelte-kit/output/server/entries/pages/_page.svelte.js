import { a0 as store_get, Z as attr, a4 as unsubscribe_stores } from "../../chunks/index2.js";
import { s as session } from "../../chunks/auth.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let username = "";
    let password = "";
    if (!store_get($$store_subs ??= {}, "$session", session)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<section class="auth-screen"><div class="auth-card"><form class="form-grid auth-form"><div class="field"><label for="username">Benutzername</label> <input id="username" class="input" type="text"${attr("value", username)} placeholder="z.B. max"/></div> <div class="field"><label for="password">Passwort</label> <input id="password" class="input" type="password"${attr("value", password)} placeholder="Mind. 8 Zeichen"/></div> <div class="actions"><button class="btn btn-primary" type="submit">Login</button> <button class="btn btn-outline" type="button">Registrieren</button></div> `);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></form></div></section>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<section class="card-grid grid-3"><div class="card"><h3 class="section-title">Kalender</h3> <p class="text-muted">Termine verwalten, abonnieren und synchron halten.</p> <a class="btn btn-outline" href="/calendar">Zum Kalender</a></div> <div class="card"><h3 class="section-title">Material</h3> <p class="text-muted">Material sauber erfassen, Lagerorte und Mengen im Blick behalten.</p> <a class="btn btn-outline" href="/inventory">Zum Material</a></div></section>`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
