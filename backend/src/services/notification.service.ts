// engineered by Maro Elias Goth
import { randomUUID } from "node:crypto";
import { db, nowIso, runInTransaction } from "../db/database.js";

export type NotificationType = "system" | "push" | "chat" | "admin";

export type NotificationItem = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata_json: string | null;
  is_read: number;
  read_at: string | null;
  created_at: string;
};

type NotificationRealtimeEvent =
  | { event: "notification:new"; data: NotificationResponse }
  | { event: "notification:unread_count"; data: { unread_count: number } };

type NotificationRealtimeEmitter = (userId: string, payload: NotificationRealtimeEvent) => void;

export type NotificationResponse = {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export type CreateNotificationInput = {
  userId: string;
  type?: NotificationType | string;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  emitRealtime?: boolean;
};

let realtimeEmitter: NotificationRealtimeEmitter | null = null;

const mapNotification = (row: NotificationItem): NotificationResponse => {
  let metadata: Record<string, unknown> | null = null;
  if (row.metadata_json) {
    try {
      metadata = JSON.parse(row.metadata_json) as Record<string, unknown>;
    } catch {
      metadata = null;
    }
  }

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    metadata,
    is_read: Boolean(row.is_read),
    read_at: row.read_at,
    created_at: row.created_at
  };
};

export const setNotificationRealtimeEmitter = (emitter: NotificationRealtimeEmitter | null) => {
  realtimeEmitter = emitter;
};

export const getUnreadNotificationCount = (userId: string) => {
  const row = db
    .prepare("SELECT COUNT(1) AS count FROM notifications WHERE user_id = ? AND is_read = 0")
    .get(userId) as { count: number };
  return Number(row?.count ?? 0);
};

export const listNotifications = (userId: string, options?: { limit?: number; before?: string | null }) => {
  const safeLimit = Math.max(1, Math.min(100, Number(options?.limit ?? 40)));
  const before = typeof options?.before === "string" && options.before.trim() ? options.before.trim() : null;

  const rows = before
    ? (db
        .prepare(
          `SELECT id, user_id, type, title, message, metadata_json, is_read, read_at, created_at
           FROM notifications
           WHERE user_id = ? AND created_at < ?
           ORDER BY created_at DESC
           LIMIT ?`
        )
        .all(userId, before, safeLimit) as NotificationItem[])
    : (db
        .prepare(
          `SELECT id, user_id, type, title, message, metadata_json, is_read, read_at, created_at
           FROM notifications
           WHERE user_id = ?
           ORDER BY created_at DESC
           LIMIT ?`
        )
        .all(userId, safeLimit) as NotificationItem[]);

  return {
    items: rows.map(mapNotification),
    unread_count: getUnreadNotificationCount(userId)
  };
};

export const createNotification = (input: CreateNotificationInput) => {
  const created = runInTransaction(() => {
    const id = randomUUID();
    const createdAt = nowIso();
    const type = String(input.type ?? "system").trim() || "system";
    const title = String(input.title || "").trim() || "Benachrichtigung";
    const message = String(input.message || "").trim() || title;
    const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

    db.prepare(
      `INSERT INTO notifications (id, user_id, type, title, message, metadata_json, is_read, read_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?)`
    ).run(id, input.userId, type, title, message, metadataJson, createdAt);

    const row = db
      .prepare(
        `SELECT id, user_id, type, title, message, metadata_json, is_read, read_at, created_at
         FROM notifications
         WHERE id = ?`
      )
      .get(id) as NotificationItem;

    return mapNotification(row);
  });

  if (input.emitRealtime !== false && realtimeEmitter) {
    try {
      realtimeEmitter(input.userId, { event: "notification:new", data: created });
      realtimeEmitter(input.userId, {
        event: "notification:unread_count",
        data: { unread_count: getUnreadNotificationCount(input.userId) }
      });
    } catch {
      // Best-effort realtime emit only.
    }
  }

  return created;
};

export const markNotificationsRead = (userId: string, options?: { ids?: string[]; all?: boolean }) => {
  const now = nowIso();
  const rawIds = Array.isArray(options?.ids) ? options?.ids : [];
  const ids = Array.from(new Set(rawIds.filter((id) => typeof id === "string" && id.trim()))).slice(0, 200);

  const changed = runInTransaction(() => {
    if (options?.all || ids.length === 0) {
      const result = db
        .prepare(
          "UPDATE notifications SET is_read = 1, read_at = ? WHERE user_id = ? AND is_read = 0"
        )
        .run(now, userId);
      return result.changes;
    }

    const placeholders = ids.map(() => "?").join(", ");
    const result = db
      .prepare(
        `UPDATE notifications
         SET is_read = 1, read_at = ?
         WHERE user_id = ? AND is_read = 0 AND id IN (${placeholders})`
      )
      .run(now, userId, ...ids);
    return result.changes;
  });

  const unreadCount = getUnreadNotificationCount(userId);
  if (realtimeEmitter) {
    try {
      realtimeEmitter(userId, {
        event: "notification:unread_count",
        data: { unread_count: unreadCount }
      });
    } catch {
      // Best-effort realtime emit only.
    }
  }

  return {
    changed,
    unread_count: unreadCount
  };
};
