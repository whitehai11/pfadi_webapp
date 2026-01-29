import { randomUUID } from "node:crypto";
import { db, nowIso, runInTransaction } from "../db/database.js";
export const getPacklistByEvent = (eventId) => {
    return db.prepare("SELECT * FROM packlists WHERE event_id = ?").get(eventId);
};
export const createPacklist = (eventId) => {
    const now = nowIso();
    const id = randomUUID();
    db.prepare("INSERT INTO packlists (id, event_id, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, eventId, now, now);
    return getPacklistByEvent(eventId);
};
export const listPacklistItems = (packlistId) => {
    return db
        .prepare("SELECT * FROM packlist_items WHERE packlist_id = ? ORDER BY created_at ASC")
        .all(packlistId);
};
export const upsertPacklistItems = (packlistId, items) => {
    return runInTransaction(() => {
        const now = nowIso();
        const existing = listPacklistItems(packlistId);
        const existingMap = new Map(existing.map((item) => [item.inventory_item_id, item]));
        for (const item of items) {
            const current = existingMap.get(item.inventory_item_id);
            if (current) {
                db.prepare("UPDATE packlist_items SET status = ?, updated_at = ? WHERE id = ?").run(item.status, now, current.id);
            }
            else {
                db.prepare(`INSERT INTO packlist_items (id, packlist_id, inventory_item_id, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`).run(randomUUID(), packlistId, item.inventory_item_id, item.status, now, now);
            }
        }
        return listPacklistItems(packlistId);
    });
};
export const updatePacklistItemStatus = (itemId, status) => {
    const now = nowIso();
    const result = db
        .prepare("UPDATE packlist_items SET status = ?, updated_at = ? WHERE id = ?")
        .run(status, now, itemId);
    if (result.changes === 0)
        return undefined;
    return db.prepare("SELECT * FROM packlist_items WHERE id = ?").get(itemId);
};
export const deletePacklistItem = (itemId) => {
    const result = db.prepare("DELETE FROM packlist_items WHERE id = ?").run(itemId);
    return result.changes > 0;
};
