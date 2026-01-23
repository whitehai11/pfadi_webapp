import { randomUUID } from "node:crypto";
import { db, nowIso } from "../db/database.js";

export type EventType = "Gruppenstunde" | "Lager" | "Aktion" | "Sonstiges";

export type CalendarEvent = {
  id: string;
  title: string;
  type: EventType;
  start_at: string;
  end_at: string;
  location: string;
  description: string;
  packlist_required: number;
  created_at: string;
  updated_at: string;
};

const mapRow = (row: CalendarEvent): CalendarEvent => row;

export const listEvents = (): CalendarEvent[] => {
  const rows = db.prepare("SELECT * FROM events ORDER BY start_at ASC").all() as CalendarEvent[];
  return rows.map(mapRow);
};

export const getEvent = (id: string): CalendarEvent | undefined => {
  const row = db.prepare("SELECT * FROM events WHERE id = ?").get(id) as CalendarEvent | undefined;
  return row ? mapRow(row) : undefined;
};

export type EventInput = {
  title: string;
  type: EventType;
  start_at: string;
  end_at: string;
  location: string;
  description: string;
  packlist_required: boolean;
};

export const createEvent = (input: EventInput): CalendarEvent => {
  const id = randomUUID();
  const now = nowIso();
  db.prepare(
    `INSERT INTO events (id, title, type, start_at, end_at, location, description, packlist_required, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.title,
    input.type,
    input.start_at,
    input.end_at,
    input.location,
    input.description,
    input.packlist_required ? 1 : 0,
    now,
    now
  );
  return getEvent(id)!;
};

export const updateEvent = (id: string, input: EventInput): CalendarEvent | undefined => {
  const now = nowIso();
  const result = db.prepare(
    `UPDATE events
     SET title = ?, type = ?, start_at = ?, end_at = ?, location = ?, description = ?, packlist_required = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    input.title,
    input.type,
    input.start_at,
    input.end_at,
    input.location,
    input.description,
    input.packlist_required ? 1 : 0,
    now,
    id
  );
  if (result.changes === 0) return undefined;
  return getEvent(id);
};

export const deleteEvent = (id: string): boolean => {
  const result = db.prepare("DELETE FROM events WHERE id = ?").run(id);
  return result.changes > 0;
};
