import { randomUUID } from "node:crypto";
import { db, nowIso } from "../db/database.js";
export const upsertAvailability = (eventId, userId, status) => {
    const now = nowIso();
    const existing = db
        .prepare("SELECT id FROM event_availability WHERE event_id = ? AND user_id = ?")
        .get(eventId, userId);
    if (existing) {
        db.prepare("UPDATE event_availability SET status = ?, updated_at = ? WHERE id = ?")
            .run(status, now, existing.id);
        return existing.id;
    }
    const id = randomUUID();
    db.prepare(`INSERT INTO event_availability (id, event_id, user_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`).run(id, eventId, userId, status, now, now);
    return id;
};
export const listAvailability = (eventId) => {
    return db
        .prepare(`SELECT ea.id, ea.event_id, ea.user_id, ea.status, ea.created_at, ea.updated_at, u.email
       FROM event_availability ea
       JOIN users u ON u.id = ea.user_id
       WHERE ea.event_id = ?
       ORDER BY ea.updated_at DESC`)
        .all(eventId);
};
export const getUserAvailability = (eventId, userId) => {
    const row = db
        .prepare("SELECT status FROM event_availability WHERE event_id = ? AND user_id = ?")
        .get(eventId, userId);
    return row?.status ?? null;
};
