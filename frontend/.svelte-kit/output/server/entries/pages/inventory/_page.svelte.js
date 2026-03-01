import { c as attr_class, s as store_get, a as attr, u as unsubscribe_stores } from "../../../chunks/index2.js";
import { a as session } from "../../../chunks/auth.js";
import "../../../chunks/toast.js";
import { e as escape_html } from "../../../chunks/escaping.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let boxContent = "";
    let boxCategory = "";
    let boxCondition = "";
    let boxNote = "";
    let boxSubmitting = false;
    let boxErrors = {};
    let activity = { type: "none", message: "Keine Änderungen" };
    const canEdit = (role) => role === "admin" || role === "materialwart";
    $$renderer2.push(`<div class="page-stack"><section class="page-intro"><h1 class="page-title">Material</h1></section> <section class="card activity-card"><div${attr_class(`activity-strip ${activity.type}`)}></div> <div class="activity-content"><span class="badge badge-secondary">Letzte Änderung</span> <div class="list-meta"><strong>${escape_html(activity.message)}</strong> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div></section> `);
    if (canEdit(store_get($$store_subs ??= {}, "$session", session)?.role)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<section id="new-box-form" class="page-stack"><h2 class="section-title">Neue Box</h2> <form class="split-grid"><div class="form-grid"><div class="field"><label for="boxContent">Name oder Inhalt</label> <input id="boxContent"${attr_class("input", void 0, { "input-invalid": Boolean(boxErrors.boxContent) })}${attr("value", boxContent)} required maxlength="140"/> `);
      if (boxErrors.boxContent) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="field-error">${escape_html(boxErrors.boxContent)}</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div> <div class="field"><label for="boxCategory">Kategorie</label> <input id="boxCategory"${attr_class("input", void 0, { "input-invalid": Boolean(boxErrors.boxCategory) })}${attr("value", boxCategory)} maxlength="120"/> `);
      if (boxErrors.boxCategory) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="field-error">${escape_html(boxErrors.boxCategory)}</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div></div> <div class="form-grid"><div class="field"><label for="boxCondition">Zustand</label> <input id="boxCondition"${attr_class("input", void 0, { "input-invalid": Boolean(boxErrors.boxCondition) })}${attr("value", boxCondition)} maxlength="120"/> `);
      if (boxErrors.boxCondition) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="field-error">${escape_html(boxErrors.boxCondition)}</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div> <div class="field"><label for="boxNote">Hinweis</label> <input id="boxNote"${attr_class("input", void 0, { "input-invalid": Boolean(boxErrors.boxNote) })}${attr("value", boxNote)} maxlength="300"/> `);
      if (boxErrors.boxNote) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="field-error">${escape_html(boxErrors.boxNote)}</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div></div> <div class="actions grid-span-all">`);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <button class="btn btn-primary" type="submit"${attr("disabled", boxSubmitting, true)}>`);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> ${escape_html("Box anlegen")}</button></div></form></section>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <section class="page-stack"><h2 class="section-title">Alle Boxen</h2> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-muted">Laden...</p>`);
    }
    $$renderer2.push(`<!--]--></section> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
