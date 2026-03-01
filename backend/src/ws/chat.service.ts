// engineered by Maro Elias Goth
import { randomUUID } from "node:crypto";
import { db, nowIso, runInTransaction } from "../db/database.js";
import type { ChatMessageRecord, WsUser } from "./chat.types.js";

const DEFAULT_CONVERSATION_ID = "00000000-0000-4000-8000-000000000001";

type ConversationRow = {
  id: string;
  name: string;
};

const ensureDefaultConversation = () => {
  const existing = db.prepare("SELECT id, name FROM conversations WHERE id = ?").get(DEFAULT_CONVERSATION_ID) as
    | ConversationRow
    | undefined;
  if (existing) return existing;

  const now = nowIso();
  db.prepare("INSERT INTO conversations (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(
    DEFAULT_CONVERSATION_ID,
    "Allgemein",
    now,
    now
  );

  const approvedUsers = db.prepare("SELECT id FROM users WHERE status = 'approved'").all() as { id: string }[];
  const insertMember = db.prepare(
    `INSERT INTO conversation_members (id, conversation_id, user_id, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(conversation_id, user_id) DO NOTHING`
  );
  for (const user of approvedUsers) {
    insertMember.run(randomUUID(), DEFAULT_CONVERSATION_ID, user.id, now);
  }

  return { id: DEFAULT_CONVERSATION_ID, name: "Allgemein" };
};

export const getApprovedUserById = (userId: string): WsUser | null => {
  const row = db
    .prepare("SELECT id, email as username, role FROM users WHERE id = ? AND status = 'approved' LIMIT 1")
    .get(userId) as WsUser | undefined;
  return row ?? null;
};

export const ensureConversationMembershipForUser = (userId: string) => {
  ensureDefaultConversation();
  const now = nowIso();
  db.prepare(
    `INSERT INTO conversation_members (id, conversation_id, user_id, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(conversation_id, user_id) DO NOTHING`
  ).run(randomUUID(), DEFAULT_CONVERSATION_ID, userId, now);
};

export const isConversationMember = (conversationId: string, userId: string) => {
  const row = db
    .prepare("SELECT 1 as ok FROM conversation_members WHERE conversation_id = ? AND user_id = ? LIMIT 1")
    .get(conversationId, userId) as { ok: number } | undefined;
  return Boolean(row?.ok);
};

export const listConversationMemberIds = (conversationId: string) => {
  return db
    .prepare("SELECT user_id FROM conversation_members WHERE conversation_id = ?")
    .all(conversationId)
    .map((row) => (row as { user_id: string }).user_id);
};

export const saveMessage = (input: { conversationId: string; senderId: string; content: string }) => {
  return runInTransaction(() => {
    const now = nowIso();
    const id = randomUUID();
    db.prepare("INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
      id,
      input.conversationId,
      input.senderId,
      input.content,
      now
    );

    return db
      .prepare(
        `SELECT
           m.id,
           m.conversation_id,
           m.sender_id,
           u.email as sender_username,
           m.content,
           m.created_at
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.id = ?
         LIMIT 1`
      )
      .get(id) as ChatMessageRecord;
  });
};

export const saveReadReceipt = (input: { messageId: string; userId: string }) => {
  return runInTransaction(() => {
    const now = nowIso();
    db.prepare(
      `INSERT INTO read_receipts (id, message_id, user_id, read_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(message_id, user_id) DO UPDATE SET read_at = excluded.read_at`
    ).run(randomUUID(), input.messageId, input.userId, now);

    const row = db
      .prepare(
        `SELECT
           m.conversation_id as conversation_id,
           rr.message_id as message_id,
           rr.user_id as user_id,
           rr.read_at as read_at
         FROM read_receipts rr
         JOIN messages m ON m.id = rr.message_id
         WHERE rr.message_id = ? AND rr.user_id = ?
         LIMIT 1`
      )
      .get(input.messageId, input.userId) as
      | { conversation_id: string; message_id: string; user_id: string; read_at: string }
      | undefined;

    return row ?? null;
  });
};
