import { randomUUID } from "node:crypto";
import { db, nowIso } from "../db/database.js";

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  location: string;
  quantity: number;
  min_quantity: number;
  condition: string;
  tag_id: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryInput = {
  name: string;
  category: string;
  location: string;
  quantity: number;
  min_quantity: number;
  condition: string;
  tag_id?: string | null;
};

const isTaggingEnabled = () => {
  const rows = db
    .prepare("SELECT key, value FROM settings WHERE key IN ('nfc_enabled')")
    .all() as { key: string; value: string }[];
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return map.get("nfc_enabled") === "true";
};

const nextBoxTag = () => {
  const rows = db
    .prepare("SELECT tag_id FROM inventory_items WHERE tag_id LIKE 'box-%'")
    .all() as { tag_id: string }[];
  let max = 0;
  for (const row of rows) {
    const match = row.tag_id?.match(/^box-(\d+)$/i);
    if (!match) continue;
    const num = Number(match[1]);
    if (Number.isFinite(num)) max = Math.max(max, num);
  }
  const next = String(max + 1).padStart(3, "0");
  return `box-${next}`;
};

export const listInventory = (): InventoryItem[] => {
  return db.prepare("SELECT * FROM inventory_items ORDER BY name ASC").all() as InventoryItem[];
};

export const getInventory = (id: string): InventoryItem | undefined => {
  return db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(id) as InventoryItem | undefined;
};

export const getInventoryByTag = (tagId: string): InventoryItem | undefined => {
  return db
    .prepare("SELECT * FROM inventory_items WHERE tag_id = ?")
    .get(tagId) as InventoryItem | undefined;
};

export const createInventory = (input: InventoryInput): InventoryItem => {
  const id = randomUUID();
  const now = nowIso();
  const tagId =
    input.tag_id ?? (isTaggingEnabled() ? nextBoxTag() : null);
  db.prepare(
    `INSERT INTO inventory_items (id, name, category, location, quantity, min_quantity, condition, tag_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.name,
    input.category,
    input.location,
    input.quantity,
    input.min_quantity,
    input.condition,
    tagId,
    now,
    now
  );
  return getInventory(id)!;
};

export const updateInventory = (id: string, input: InventoryInput): InventoryItem | undefined => {
  const now = nowIso();
  const result = db.prepare(
    `UPDATE inventory_items
     SET name = ?, category = ?, location = ?, quantity = ?, min_quantity = ?, condition = ?, tag_id = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    input.name,
    input.category,
    input.location,
    input.quantity,
    input.min_quantity,
    input.condition,
    input.tag_id ?? null,
    now,
    id
  );
  if (result.changes === 0) return undefined;
  return getInventory(id);
};

export const deleteInventory = (id: string): boolean => {
  const result = db.prepare("DELETE FROM inventory_items WHERE id = ?").run(id);
  return result.changes > 0;
};
