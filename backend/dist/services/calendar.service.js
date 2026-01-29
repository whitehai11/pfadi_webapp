import { randomUUID } from "node:crypto";
import { db, nowIso } from "../db/database.js";
const mapRow = (row) => row;
export const listEvents = () => {
    const rows = db.prepare("SELECT * FROM events ORDER BY start_at ASC").all();
    return rows.map(mapRow);
};
export const getEvent = (id) => {
    const row = db.prepare("SELECT * FROM events WHERE id = ?").get(id);
    return row ? mapRow(row) : undefined;
};
export const createEvent = (input) => {
    const id = randomUUID();
    const now = nowIso();
    db.prepare(`INSERT INTO events (id, title, type, start_at, end_at, location, description, packlist_required, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, input.title, input.type, input.start_at, input.end_at, input.location, input.description, input.packlist_required ? 1 : 0, now, now);
    return getEvent(id);
};
export const updateEvent = (id, input) => {
    const now = nowIso();
    const result = db.prepare(`UPDATE events
     SET title = ?, type = ?, start_at = ?, end_at = ?, location = ?, description = ?, packlist_required = ?, updated_at = ?
     WHERE id = ?`).run(input.title, input.type, input.start_at, input.end_at, input.location, input.description, input.packlist_required ? 1 : 0, now, id);
    if (result.changes === 0)
        return undefined;
    return getEvent(id);
};
export const deleteEvent = (id) => {
    const result = db.prepare("DELETE FROM events WHERE id = ?").run(id);
    return result.changes > 0;
};
