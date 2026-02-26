import { s as store_get, a as attr, u as unsubscribe_stores, e as ensure_array_like } from "../../chunks/index2.js";
import { C as Card } from "../../chunks/Card.js";
import { I as Icon } from "../../chunks/Icon.js";
import { a as authHeader, s as session } from "../../chunks/auth.js";
import { e as escape_html } from "../../chunks/escaping.js";
const baseUrl = "";
const apiFetch = async (path, options = {}) => {
  const hasBody = options.body !== void 0 && options.body !== null;
  const headers = {
    ...authHeader(),
    ...hasBody ? { "Content-Type": "application/json" } : {},
    ...options.headers || {}
  };
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }
  if (response.status === 204) return null;
  return response.json();
};
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let username = "";
    let password = "";
    let loadingDashboard = false;
    let upcomingEvents = [];
    let lowStockItems = [];
    let openResponses = [];
    const loadDashboard = async () => {
      if (!store_get($$store_subs ??= {}, "$session", session)) return;
      loadingDashboard = true;
      try {
        const [events, inventory] = await Promise.all([
          apiFetch("/api/calendar"),
          apiFetch("/api/inventory").catch(() => [])
        ]);
        const now = Date.now();
        const futureEvents = events.filter((event) => new Date(event.end_at).getTime() >= now).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
        upcomingEvents = futureEvents.slice(0, 3);
        lowStockItems = inventory.filter((item) => Number(item.quantity) <= Number(item.min_quantity)).slice(0, 3);
        const responseChecks = await Promise.all(futureEvents.slice(0, 8).map(async (event) => {
          try {
            const availability = await apiFetch(`/api/calendar/${event.id}/availability`);
            const responded = (availability.entries ?? []).some((entry) => entry.user_id === store_get($$store_subs ??= {}, "$session", session)?.id);
            return responded ? null : event;
          } catch {
            return null;
          }
        }));
        openResponses = responseChecks.filter(Boolean);
      } catch {
        upcomingEvents = [];
        lowStockItems = [];
        openResponses = [];
      } finally {
        loadingDashboard = false;
      }
    };
    if (store_get($$store_subs ??= {}, "$session", session)) {
      loadDashboard();
    }
    if (!store_get($$store_subs ??= {}, "$session", session)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<section class="auth-screen"><div class="auth-card"><div class="auth-brand"><div class="logo-badge">`);
      Icon($$renderer2, { name: "sparkles", size: 26 });
      $$renderer2.push(`<!----></div> <div class="page-intro"><p class="page-kicker">Pfadfinder Organisation</p> <h1 class="page-title">Ruhig organisiert. Klar im Alltag.</h1> <p class="page-description">Die Webapp bündelt Termine, Material und Rückmeldungen in einer klaren Oberfläche.</p></div></div> <form class="auth-form"><div class="field"><label for="username">Benutzername</label> <input id="username" class="input" type="text"${attr("value", username)} placeholder="z. B. max"/></div> <div class="field"><label for="password">Passwort</label> <input id="password" class="input" type="password"${attr("value", password)} placeholder="Mindestens 8 Zeichen"/></div> <div class="actions"><button class="btn btn-primary" type="submit">Einloggen</button> <button class="btn btn-outline" type="button">Registrieren</button></div> `);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></form></div></section>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="page-stack"><section class="page-intro"><p class="page-kicker">Übersicht</p> <h1 class="page-title">Alles Wichtige auf einen Blick.</h1> <p class="page-description">Der Startbereich bündelt die nächsten Termine, Materialthemen und offene Rückmeldungen.</p></section> <section class="dashboard-grid">`);
      Card($$renderer2, {
        title: "Nächste Termine",
        description: "Die nächsten gemeinsamen Einsätze und Treffen.",
        interactive: true,
        children: ($$renderer3) => {
          if (loadingDashboard) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<p class="text-muted">Lade Übersicht...</p>`);
          } else {
            $$renderer3.push("<!--[!-->");
            if (upcomingEvents.length === 0) {
              $$renderer3.push("<!--[-->");
              $$renderer3.push(`<p class="text-muted">Keine anstehenden Termine.</p>`);
            } else {
              $$renderer3.push("<!--[!-->");
              $$renderer3.push(`<div class="hairline-list"><!--[-->`);
              const each_array = ensure_array_like(upcomingEvents);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let event = each_array[$$index];
                $$renderer3.push(`<div class="list-row"><div class="list-meta"><strong>${escape_html(event.title)}</strong> <span class="text-muted">${escape_html(new Date(event.start_at).toLocaleString("de-DE"))}</span></div> <a class="subtle-button btn" href="/calendar">Öffnen</a></div>`);
              }
              $$renderer3.push(`<!--]--></div>`);
            }
            $$renderer3.push(`<!--]-->`);
          }
          $$renderer3.push(`<!--]-->`);
        },
        $$slots: {
          default: true,
          actions: ($$renderer3) => {
            $$renderer3.push(`<div slot="actions"><span class="count-pill">${escape_html(upcomingEvents.length)}</span></div>`);
          }
        }
      });
      $$renderer2.push(`<!----> `);
      Card($$renderer2, {
        title: "Material Status",
        description: "Artikel unter Mindestmenge werden hier priorisiert.",
        interactive: true,
        children: ($$renderer3) => {
          if (loadingDashboard) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<p class="text-muted">Material wird geladen...</p>`);
          } else {
            $$renderer3.push("<!--[!-->");
            if (lowStockItems.length === 0) {
              $$renderer3.push("<!--[-->");
              $$renderer3.push(`<p class="text-muted">Aktuell keine kritischen Bestände.</p>`);
            } else {
              $$renderer3.push("<!--[!-->");
              $$renderer3.push(`<div class="hairline-list"><!--[-->`);
              const each_array_1 = ensure_array_like(lowStockItems);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let item = each_array_1[$$index_1];
                $$renderer3.push(`<div class="list-row"><div class="list-meta"><strong>${escape_html(item.name)}</strong> <span class="text-muted">${escape_html(item.quantity)} von ${escape_html(item.min_quantity)} verfügbar</span></div> <span class="badge badge-warning">Beobachten</span></div>`);
              }
              $$renderer3.push(`<!--]--></div>`);
            }
            $$renderer3.push(`<!--]-->`);
          }
          $$renderer3.push(`<!--]-->`);
        },
        $$slots: {
          default: true,
          actions: ($$renderer3) => {
            $$renderer3.push(`<div slot="actions"><span class="count-pill">${escape_html(lowStockItems.length)}</span></div>`);
          }
        }
      });
      $$renderer2.push(`<!----> `);
      Card($$renderer2, {
        title: "Offene Rückmeldungen",
        description: "Termine, bei denen deine Antwort noch fehlt.",
        interactive: true,
        children: ($$renderer3) => {
          if (loadingDashboard) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<p class="text-muted">Rückmeldungen werden geladen...</p>`);
          } else {
            $$renderer3.push("<!--[!-->");
            if (openResponses.length === 0) {
              $$renderer3.push("<!--[-->");
              $$renderer3.push(`<p class="text-muted">Alles beantwortet.</p>`);
            } else {
              $$renderer3.push("<!--[!-->");
              $$renderer3.push(`<div class="hairline-list"><!--[-->`);
              const each_array_2 = ensure_array_like(openResponses.slice(0, 3));
              for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
                let event = each_array_2[$$index_2];
                $$renderer3.push(`<div class="list-row"><div class="list-meta"><strong>${escape_html(event.title)}</strong> <span class="text-muted">${escape_html(new Date(event.start_at).toLocaleDateString("de-DE"))}</span></div> <span class="badge badge-info">Offen</span></div>`);
              }
              $$renderer3.push(`<!--]--></div>`);
            }
            $$renderer3.push(`<!--]-->`);
          }
          $$renderer3.push(`<!--]-->`);
        },
        $$slots: {
          default: true,
          actions: ($$renderer3) => {
            $$renderer3.push(`<div slot="actions"><span class="count-pill">${escape_html(openResponses.length)}</span></div>`);
          }
        }
      });
      $$renderer2.push(`<!----></section></div>`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
