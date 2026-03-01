// engineered by Maro Elias Goth
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db, nowIso, runInTransaction } from "../db/database.js";
import { settings } from "../config/settings.js";

export type ChatRoom = {
  id: string;
  name: string;
  created_at: string;
  message_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
};

export type ChatAttachmentRecord = {
  id: string;
  message_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  client_message_id: string | null;
  has_attachment: number;
  sender_username: string;
  sender_display_name: string;
  sender_avatar_updated_at: string | null;
  attachment_id: string | null;
  attachment_file_name: string | null;
  attachment_file_type: string | null;
  attachment_file_size: number | null;
};

export type ChatMessageInput = {
  roomId: string;
  userId: string;
  content: string;
  clientMessageId?: string | null;
  attachment?:
    | {
        filePath: string;
        fileName: string;
        fileType: string;
        fileSize: number;
      }
    | null;
};

const ensureChatDir = () => {
  const dir = path.resolve(settings.dataDir, "uploads", "chat");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

export const getChatUploadDir = () => ensureChatDir();

export const ensureDefaultChatRoom = () => {
  const existing = db.prepare("SELECT id FROM chat_rooms LIMIT 1").get() as { id: string } | undefined;
  if (existing) return existing.id;

  const id = randomUUID();
  db.prepare("INSERT INTO chat_rooms (id, name, created_at) VALUES (?, ?, ?)").run(id, "Allgemein", nowIso());
  return id;
};

export const listChatRooms = (): ChatRoom[] => {
  return db.prepare(
    `SELECT
       rooms.id,
       rooms.name,
       rooms.created_at,
       COUNT(messages.id) as message_count,
       MAX(messages.created_at) as last_message_at,
       (
         SELECT CASE
           WHEN COALESCE(NULLIF(TRIM(m2.content), ''), '') != '' THEN substr(TRIM(m2.content), 1, 120)
           WHEN m2.has_attachment = 1 THEN 'Anhang'
           ELSE ''
         END
         FROM chat_messages m2
         WHERE m2.room_id = rooms.id
         ORDER BY m2.created_at DESC
         LIMIT 1
       ) as last_message_preview
     FROM chat_rooms rooms
     LEFT JOIN chat_messages messages ON messages.room_id = rooms.id
     GROUP BY rooms.id, rooms.name, rooms.created_at
     ORDER BY COALESCE(MAX(messages.created_at), rooms.created_at) DESC, rooms.name ASC`
  ).all() as ChatRoom[];
};

export const getChatRoom = (roomId: string) => {
  return db.prepare("SELECT id, name, created_at FROM chat_rooms WHERE id = ?").get(roomId) as
    | { id: string; name: string; created_at: string }
    | undefined;
};

export const listChatMessages = (roomId: string): ChatMessage[] => {
  return db.prepare(
    `SELECT
       messages.id,
       messages.room_id,
       messages.user_id,
       messages.content,
       messages.created_at,
       messages.client_message_id,
       messages.has_attachment,
       users.email as sender_username,
       users.email as sender_display_name,
       users.avatar_updated_at as sender_avatar_updated_at,
       attachments.id as attachment_id,
       attachments.file_name as attachment_file_name,
       attachments.file_type as attachment_file_type,
       attachments.file_size as attachment_file_size
     FROM chat_messages messages
     JOIN users ON users.id = messages.user_id
     LEFT JOIN chat_attachments attachments ON attachments.message_id = messages.id
     WHERE messages.room_id = ?
     ORDER BY messages.created_at ASC`
  ).all(roomId) as ChatMessage[];
};

export const getChatAttachment = (attachmentId: string): ChatAttachmentRecord | undefined => {
  return db.prepare("SELECT * FROM chat_attachments WHERE id = ?").get(attachmentId) as ChatAttachmentRecord | undefined;
};

export const findChatMessageByClientKey = (roomId: string, userId: string, clientMessageId: string) => {
  return db
    .prepare(
      `SELECT
         messages.id,
         messages.room_id,
         messages.user_id,
         messages.content,
         messages.created_at,
         messages.client_message_id,
         messages.has_attachment,
         users.email as sender_username,
         users.email as sender_display_name,
         users.avatar_updated_at as sender_avatar_updated_at,
         attachments.id as attachment_id,
         attachments.file_name as attachment_file_name,
         attachments.file_type as attachment_file_type,
         attachments.file_size as attachment_file_size
       FROM chat_messages messages
       JOIN users ON users.id = messages.user_id
       LEFT JOIN chat_attachments attachments ON attachments.message_id = messages.id
       WHERE messages.room_id = ? AND messages.user_id = ? AND messages.client_message_id = ?
       LIMIT 1`
    )
    .get(roomId, userId, clientMessageId) as ChatMessage | undefined;
};

export const createChatMessage = (input: ChatMessageInput) => {
  return runInTransaction(() => {
    const now = nowIso();
    const messageId = randomUUID();

    db.prepare(
      "INSERT INTO chat_messages (id, room_id, user_id, content, created_at, client_message_id, has_attachment) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      messageId,
      input.roomId,
      input.userId,
      input.content,
      now,
      input.clientMessageId ?? null,
      input.attachment ? 1 : 0
    );

    if (input.attachment) {
      db.prepare(
        "INSERT INTO chat_attachments (id, message_id, file_path, file_name, file_type, file_size) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(
        randomUUID(),
        messageId,
        input.attachment.filePath,
        input.attachment.fileName,
        input.attachment.fileType,
        input.attachment.fileSize
      );
    }

    return db.prepare(
      `SELECT
         messages.id,
         messages.room_id,
         messages.user_id,
         messages.content,
         messages.created_at,
         messages.client_message_id,
         messages.has_attachment,
         users.email as sender_username,
         users.email as sender_display_name,
         users.avatar_updated_at as sender_avatar_updated_at,
         attachments.id as attachment_id,
         attachments.file_name as attachment_file_name,
         attachments.file_type as attachment_file_type,
         attachments.file_size as attachment_file_size
       FROM chat_messages messages
       JOIN users ON users.id = messages.user_id
       LEFT JOIN chat_attachments attachments ON attachments.message_id = messages.id
       WHERE messages.id = ?`
    ).get(messageId) as ChatMessage;
  });
};

export const listChatRecipients = (senderId: string) => {
  return db
    .prepare("SELECT id FROM users WHERE status = 'approved' AND id != ? ORDER BY email ASC")
    .all(senderId) as { id: string }[];
};

const allowedReactionValues = new Set(["plus_one", "thanks", "ok", "seen"]);

export const setMessageReaction = (messageId: string, userId: string, reaction: string | null) => {
  return runInTransaction(() => {
    const message = db
      .prepare("SELECT id, room_id FROM chat_messages WHERE id = ?")
      .get(messageId) as { id: string; room_id: string } | undefined;
    if (!message) return null;

    if (!reaction) {
      db.prepare("DELETE FROM chat_message_reactions WHERE message_id = ? AND user_id = ?").run(messageId, userId);
      return { roomId: message.room_id, messageId, reaction: null };
    }

    if (!allowedReactionValues.has(reaction)) {
      throw new Error("Ungultige Reaktion.");
    }

    db.prepare(
      `INSERT INTO chat_message_reactions (id, message_id, user_id, reaction, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(message_id, user_id)
       DO UPDATE SET reaction = excluded.reaction, created_at = excluded.created_at`
    ).run(randomUUID(), messageId, userId, reaction, nowIso());

    return { roomId: message.room_id, messageId, reaction };
  });
};

export const getRoomReactionSnapshot = (roomId: string, userId: string) => {
  const rows = db
    .prepare(
      `SELECT
         reactions.message_id,
         reactions.user_id,
         reactions.reaction
       FROM chat_message_reactions reactions
       JOIN chat_messages messages ON messages.id = reactions.message_id
       WHERE messages.room_id = ?`
    )
    .all(roomId) as { message_id: string; user_id: string; reaction: string }[];

  const counts: Record<string, Record<string, number>> = {};
  const mine: Record<string, string> = {};

  for (const row of rows) {
    counts[row.message_id] = counts[row.message_id] ?? {};
    counts[row.message_id][row.reaction] = (counts[row.message_id][row.reaction] ?? 0) + 1;
    if (row.user_id === userId) {
      mine[row.message_id] = row.reaction;
    }
  }

  return { counts, mine };
};

export const markRoomRead = (roomId: string, userId: string, lastReadMessageId: string | null) => {
  const now = nowIso();
  const existing = db
    .prepare("SELECT id FROM chat_read_receipts WHERE room_id = ? AND user_id = ?")
    .get(roomId, userId) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      "UPDATE chat_read_receipts SET last_read_message_id = ?, last_read_at = ?, updated_at = ? WHERE id = ?"
    ).run(lastReadMessageId, now, now, existing.id);
  } else {
    db.prepare(
      "INSERT INTO chat_read_receipts (id, room_id, user_id, last_read_message_id, last_read_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(randomUUID(), roomId, userId, lastReadMessageId, now, now, now);
  }

  return { roomId, userId, lastReadMessageId, lastReadAt: now };
};

export const getRoomReadReceiptSnapshot = (roomId: string) => {
  const rows = db
    .prepare(
      `SELECT
         messages.id as message_id,
         COUNT(receipts.id) as read_count
       FROM chat_messages messages
       LEFT JOIN chat_read_receipts receipts
         ON receipts.room_id = messages.room_id
         AND receipts.last_read_at IS NOT NULL
         AND receipts.last_read_at >= messages.created_at
       WHERE messages.room_id = ?
       GROUP BY messages.id`
    )
    .all(roomId) as { message_id: string; read_count: number }[];

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.message_id] = Number(row.read_count ?? 0);
  }
  return counts;
};
