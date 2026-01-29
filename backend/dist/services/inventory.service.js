import { randomUUID } from "node:crypto";
import { db, nowIso } from "../db/database.js";
const isTaggingEnabled = () => {
    const rows = db
        .prepare("SELECT key, value FROM settings WHERE key IN ('nfc_enabled','qr_enabled')")
        .all();
    const map = new Map(rows.map((row) => [row.key, row.value]));
    return map.get("nfc_enabled") === "true" || map.get("qr_enabled") === "true";
};
const nextBoxTag = () => {
    const rows = db
        .prepare("SELECT tag_id FROM inventory_items WHERE tag_id LIKE 'box-%'")
        .all();
    let max = 0;
    for (const row of rows) {
        const match = row.tag_id?.match(/^box-(\d+)$/i);
        if (!match)
            continue;
        const num = Number(match[1]);
        if (Number.isFinite(num))
            max = Math.max(max, num);
    }
    const next = String(max + 1).padStart(3, "0");
    return `box-${next}`;
};
export const listInventory = () => {
    return db.prepare("SELECT * FROM inventory_items ORDER BY name ASC").all();
};
export const getInventory = (id) => {
    return db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(id);
};
export const getInventoryByTag = (tagId) => {
    return db
        .prepare("SELECT * FROM inventory_items WHERE tag_id = ?")
        .get(tagId);
};
export const createInventory = (input) => {
    const id = randomUUID();
    const now = nowIso();
    const tagId = input.tag_id ?? (isTaggingEnabled() ? nextBoxTag() : null);
    db.prepare(`INSERT INTO inventory_items (id, name, category, location, quantity, min_quantity, condition, tag_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, input.name, input.category, input.location, input.quantity, input.min_quantity, input.condition, tagId, now, now);
    return getInventory(id);
};
export const updateInventory = (id, input) => {
    const now = nowIso();
    const result = db.prepare(`UPDATE inventory_items
     SET name = ?, category = ?, location = ?, quantity = ?, min_quantity = ?, condition = ?, tag_id = ?, updated_at = ?
     WHERE id = ?`).run(input.name, input.category, input.location, input.quantity, input.min_quantity, input.condition, input.tag_id ?? null, now, id);
    if (result.changes === 0)
        return undefined;
    return getInventory(id);
};
export const deleteInventory = (id) => {
    const result = db.prepare("DELETE FROM inventory_items WHERE id = ?").run(id);
    return result.changes > 0;
};
