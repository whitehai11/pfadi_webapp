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
  has_attachment: number;
  sender_username: string;
  sender_display_name: string;
  attachment_id: string | null;
  attachment_file_name: string | null;
  attachment_file_type: string | null;
  attachment_file_size: number | null;
};

export type ChatMessageInput = {
  roomId: string;
  userId: string;
  content: string;
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
       messages.has_attachment,
       users.email as sender_username,
       users.email as sender_display_name,
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

export const createChatMessage = (input: ChatMessageInput) => {
  return runInTransaction(() => {
    const now = nowIso();
    const messageId = randomUUID();

    db.prepare(
      "INSERT INTO chat_messages (id, room_id, user_id, content, created_at, has_attachment) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(messageId, input.roomId, input.userId, input.content, now, input.attachment ? 1 : 0);

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
         messages.has_attachment,
         users.email as sender_username,
         users.email as sender_display_name,
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
