import { a1 as attr_class, a0 as store_get, Z as attr, a5 as ensure_array_like, a4 as unsubscribe_stores } from "../../../chunks/index2.js";
import { s as session } from "../../../chunks/auth.js";
import { e as escape_html } from "../../../chunks/escaping.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let items = [];
    let boxes = [];
    let name = "";
    let category = "";
    let location = "";
    let quantity = 1;
    let minQuantity = 0;
    let condition = "";
    let boxMessage = {};
    let activity = { type: "none", message: "Noch keine Änderungen." };
    let sortKey = "name";
    let sortDir = "asc";
    const canEdit = (role) => role === "admin" || role === "materialwart";
    const compare = (a, b) => {
      const dir = 1;
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "de") * dir;
    };
    let boxName = "";
    let boxDescription = "";
    const selectedMaterial = {};
    const selectedQuantity = {};
    [...items].sort(compare);
    $$renderer2.push(`<section class="card activity-card"><div${attr_class(`activity-strip ${activity.type}`)}></div> <div class="activity-content"><span class="badge badge-secondary">Letzte Änderung</span> <div><strong>${escape_html(activity.message)}</strong> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div></section> <section class="card-grid grid-2">`);
    if (canEdit(store_get($$store_subs ??= {}, "$session", session)?.role)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="card"><h3 class="section-title">Material anlegen</h3> <form class="form-grid"><div class="field"><label for="name">Name</label> <input id="name" class="input"${attr("value", name)} required/></div> <div class="field"><label for="category">Kategorie</label> <input id="category" class="input"${attr("value", category)} required/></div> <div class="field"><label for="location">Lagerort</label> <input id="location" class="input"${attr("value", location)} required/></div> <div class="field"><label for="quantity">Menge</label> <input id="quantity" class="input" type="number" min="0"${attr("value", quantity)}/></div> <div class="field"><label for="minQuantity">Mindestmenge</label> <input id="minQuantity" class="input" type="number" min="0"${attr("value", minQuantity)}/></div> <div class="field"><label for="condition">Zustand</label> <input id="condition" class="input"${attr("value", condition)} required/></div> `);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <button class="btn btn-primary" type="submit">Material anlegen</button></form></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="card"><h3 class="section-title">Sortierung</h3> <div class="form-grid"><div class="field"><label for="sortKey">Sortieren nach</label> `);
    $$renderer2.select({ id: "sortKey", class: "select", value: sortKey }, ($$renderer3) => {
      $$renderer3.option({ value: "name" }, ($$renderer4) => {
        $$renderer4.push(`Name`);
      });
      $$renderer3.option({ value: "category" }, ($$renderer4) => {
        $$renderer4.push(`Kategorie`);
      });
      $$renderer3.option({ value: "location" }, ($$renderer4) => {
        $$renderer4.push(`Lagerort`);
      });
      $$renderer3.option({ value: "quantity" }, ($$renderer4) => {
        $$renderer4.push(`Menge`);
      });
      $$renderer3.option({ value: "min_quantity" }, ($$renderer4) => {
        $$renderer4.push(`Mindestmenge`);
      });
      $$renderer3.option({ value: "condition" }, ($$renderer4) => {
        $$renderer4.push(`Zustand`);
      });
      $$renderer3.option({ value: "tag_id" }, ($$renderer4) => {
        $$renderer4.push(`Kennung`);
      });
    });
    $$renderer2.push(`</div> <div class="field"><label for="sortDir">Richtung</label> `);
    $$renderer2.select({ id: "sortDir", class: "select", value: sortDir }, ($$renderer3) => {
      $$renderer3.option({ value: "asc" }, ($$renderer4) => {
        $$renderer4.push(`Aufsteigend`);
      });
      $$renderer3.option({ value: "desc" }, ($$renderer4) => {
        $$renderer4.push(`Absteigend`);
      });
    });
    $$renderer2.push(`</div></div></div></section> <section class="card">`);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p>Lade Material...</p>`);
    }
    $$renderer2.push(`<!--]--></section> <section class="card-grid grid-2">`);
    if (canEdit(store_get($$store_subs ??= {}, "$session", session)?.role)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="card"><h3 class="section-title">Box anlegen</h3> <form class="form-grid"><div class="field"><label for="boxName">Name</label> <input id="boxName" class="input"${attr("value", boxName)} required/></div> <div class="field"><label for="boxDescription">Beschreibung</label> <input id="boxDescription" class="input"${attr("value", boxDescription)}/></div> <button class="btn btn-primary" type="submit">Box anlegen</button></form></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="card"><h3 class="section-title">Boxen</h3> `);
    if (boxes.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p>Keine Daten vorhanden.</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="card-grid"><!--[-->`);
      const each_array_1 = ensure_array_like(boxes);
      for (let $$index_3 = 0, $$length = each_array_1.length; $$index_3 < $$length; $$index_3++) {
        let box = each_array_1[$$index_3];
        $$renderer2.push(`<div class="card"><div class="actions actions-between"><div><strong>${escape_html(box.name)}</strong> <p class="text-muted">${escape_html(box.description || "-")}</p></div> `);
        if (canEdit(store_get($$store_subs ??= {}, "$session", session)?.role)) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<button class="icon-btn" type="button" aria-label="Löschen"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2z"></path></svg></button>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div> <div class="actions"><span class="badge badge-secondary">${escape_html(box.nfc_tag)}</span> `);
        {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div> `);
        {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (boxMessage[box.id]) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="hint">${escape_html(boxMessage[box.id])}</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <div class="card-grid"><div class="field"><label${attr("for", `box-${box.id}-material`)}>Material</label> `);
        $$renderer2.select(
          {
            id: `box-${box.id}-material`,
            class: "select",
            value: selectedMaterial[box.id]
          },
          ($$renderer3) => {
            $$renderer3.option({ value: "" }, ($$renderer4) => {
              $$renderer4.push(`Auswahl`);
            });
            $$renderer3.push(`<!--[-->`);
            const each_array_2 = ensure_array_like(items);
            for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
              let material = each_array_2[$$index_1];
              $$renderer3.option({ value: material.id }, ($$renderer4) => {
                $$renderer4.push(`${escape_html(material.name)}`);
              });
            }
            $$renderer3.push(`<!--]-->`);
          }
        );
        $$renderer2.push(`</div> <div class="field"><label${attr("for", `box-${box.id}-quantity`)}>Menge</label> <input${attr("id", `box-${box.id}-quantity`)} class="input" type="number" min="1"${attr("value", selectedQuantity[box.id])}/></div> <button class="btn btn-outline" type="button">Zuordnen</button></div> <div class="card-grid">`);
        if (box.materials?.length) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<!--[-->`);
          const each_array_3 = ensure_array_like(box.materials);
          for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
            let entry = each_array_3[$$index_2];
            $$renderer2.push(`<div class="actions actions-between"><span>${escape_html(entry.name)}</span> <div class="actions"><span class="badge badge-secondary">${escape_html(entry.assigned_quantity)}</span> `);
            if (canEdit(store_get($$store_subs ??= {}, "$session", session)?.role)) {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<button class="btn btn-outline" type="button">Entfernen</button>`);
            } else {
              $$renderer2.push("<!--[!-->");
            }
            $$renderer2.push(`<!--]--></div></div>`);
          }
          $$renderer2.push(`<!--]-->`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<p class="text-muted">Keine Daten vorhanden.</p>`);
        }
        $$renderer2.push(`<!--]--></div></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div></section> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
