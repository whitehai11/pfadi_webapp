import { randomUUID } from "node:crypto";
import { db, nowIso } from "../db/database.js";
const createTag = (id) => `pfadi-box:${id}`;
export const listBoxes = () => {
    const boxes = db.prepare("SELECT * FROM boxes ORDER BY name ASC").all();
    const materials = db.prepare(`SELECT bm.box_id, bm.quantity as assigned_quantity, m.*
     FROM box_material bm
     JOIN inventory_items m ON m.id = bm.material_id`).all();
    return boxes.map((box) => ({
        ...box,
        materials: materials.filter((entry) => entry.box_id === box.id)
    }));
};
export const getBoxById = (id) => {
    const box = db.prepare("SELECT * FROM boxes WHERE id = ?").get(id);
    if (!box)
        return undefined;
    const materials = db.prepare(`SELECT bm.box_id, bm.quantity as assigned_quantity, m.*
     FROM box_material bm
     JOIN inventory_items m ON m.id = bm.material_id
     WHERE bm.box_id = ?`).all(id);
    return { ...box, materials };
};
export const getBoxByTag = (tag) => {
    const box = db.prepare("SELECT * FROM boxes WHERE nfc_tag = ?").get(tag);
    if (!box)
        return undefined;
    return getBoxById(box.id);
};
export const createBox = (name, description) => {
    const id = randomUUID();
    const now = nowIso();
    const tag = createTag(id);
    db.prepare(`INSERT INTO boxes (id, name, description, nfc_tag, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`).run(id, name, description ?? null, tag, now, now);
    return db.prepare("SELECT * FROM boxes WHERE id = ?").get(id);
};
export const updateBox = (id, name, description) => {
    const now = nowIso();
    const result = db
        .prepare("UPDATE boxes SET name = ?, description = ?, updated_at = ? WHERE id = ?")
        .run(name, description ?? null, now, id);
    if (result.changes === 0)
        return undefined;
    return db.prepare("SELECT * FROM boxes WHERE id = ?").get(id);
};
export const deleteBox = (id) => {
    const result = db.prepare("DELETE FROM boxes WHERE id = ?").run(id);
    return result.changes > 0;
};
export const upsertBoxMaterial = (boxId, materialId, quantity) => {
    const existing = db
        .prepare("SELECT * FROM box_material WHERE box_id = ? AND material_id = ?")
        .get(boxId, materialId);
    const now = nowIso();
    if (existing) {
        db.prepare("UPDATE box_material SET quantity = ?, updated_at = ? WHERE id = ?").run(quantity, now, existing.id);
        return { ...existing, quantity };
    }
    const id = randomUUID();
    db.prepare(`INSERT INTO box_material (id, box_id, material_id, quantity, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`).run(id, boxId, materialId, quantity, now, now);
    return { id, box_id: boxId, material_id: materialId, quantity };
};
export const removeBoxMaterial = (boxId, materialId) => {
    const result = db.prepare("DELETE FROM box_material WHERE box_id = ? AND material_id = ?").run(boxId, materialId);
    return result.changes > 0;
};
export const isValidBoxTag = (tag) => /^pfadi-box:[0-9a-f-]{36}$/i.test(tag);
