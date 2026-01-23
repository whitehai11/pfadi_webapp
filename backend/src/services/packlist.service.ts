import { randomUUID } from "node:crypto";
import { db, nowIso, runInTransaction } from "../db/database.js";

export type Packlist = {
  id: string;
  event_id: string;
  created_at: string;
  updated_at: string;
};

export type PacklistItem = {
  id: string;
  packlist_id: string;
  inventory_item_id: string;
  status: "missing" | "prepared" | "packed";
  created_at: string;
  updated_at: string;
};

export const getPacklistByEvent = (eventId: string): Packlist | undefined => {
  return db.prepare("SELECT * FROM packlists WHERE event_id = ?").get(eventId) as Packlist | undefined;
};

export const createPacklist = (eventId: string): Packlist => {
  const now = nowIso();
  const id = randomUUID();
  db.prepare("INSERT INTO packlists (id, event_id, created_at, updated_at) VALUES (?, ?, ?, ?)").run(
    id,
    eventId,
    now,
    now
  );
  return getPacklistByEvent(eventId)!;
};

export const listPacklistItems = (packlistId: string): PacklistItem[] => {
  return db
    .prepare("SELECT * FROM packlist_items WHERE packlist_id = ? ORDER BY created_at ASC")
    .all(packlistId) as PacklistItem[];
};

export const upsertPacklistItems = (
  packlistId: string,
  items: { inventory_item_id: string; status: PacklistItem["status"] }[]
): PacklistItem[] => {
  return runInTransaction(() => {
    const now = nowIso();
    const existing = listPacklistItems(packlistId);
    const existingMap = new Map(existing.map((item) => [item.inventory_item_id, item]));

    for (const item of items) {
      const current = existingMap.get(item.inventory_item_id);
      if (current) {
        db.prepare(
          "UPDATE packlist_items SET status = ?, updated_at = ? WHERE id = ?"
        ).run(item.status, now, current.id);
      } else {
        db.prepare(
          `INSERT INTO packlist_items (id, packlist_id, inventory_item_id, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(randomUUID(), packlistId, item.inventory_item_id, item.status, now, now);
      }
    }

    return listPacklistItems(packlistId);
  });
};

export const updatePacklistItemStatus = (
  itemId: string,
  status: PacklistItem["status"]
): PacklistItem | undefined => {
  const now = nowIso();
  const result = db
    .prepare("UPDATE packlist_items SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, now, itemId);
  if (result.changes === 0) return undefined;
  return db.prepare("SELECT * FROM packlist_items WHERE id = ?").get(itemId) as PacklistItem;
};

export const deletePacklistItem = (itemId: string): boolean => {
  const result = db.prepare("DELETE FROM packlist_items WHERE id = ?").run(itemId);
  return result.changes > 0;
};
