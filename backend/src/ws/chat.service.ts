// engineered by Maro Elias Goth
import { randomUUID } from "node:crypto";
import { db, nowIso, runInTransaction } from "../db/database.js";
import type { ChatMessageRecord, WsUser } from "./chat.types.js";

const DEFAULT_CONVERSATION_ID = "00000000-0000-4000-8000-000000000001";

type ConversationRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type ConversationSummary = {
  id: string;
  name: string;
  type: "room" | "direct" | "group";
  created_at: string;
  updated_at: string;
  member_count: number;
  members: Array<{ id: string; username: string }>;
  last_message_at: string | null;
  last_message_preview: string | null;
};

export type ConversationMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  created_at: string;
  read_at: string | null;
  readers: string[];
};

const normalizeConversationType = (conversationId: string, memberCount: number, name: string) => {
  if (conversationId === DEFAULT_CONVERSATION_ID) return "room";
  if (memberCount === 2 && name.toLowerCase().startsWith("dm:")) return "direct";
  if (memberCount === 2 && name.toLowerCase() === "direct") return "direct";
  return memberCount > 2 ? "group" : "group";
};

const previewContent = (value: string) => {
  const line = String(value || "").replace(/\s+/g, " ").trim();
  if (!line) return null;
  return line.length > 120 ? `${line.slice(0, 120)}...` : line;
};

const ensureDefaultConversation = () => {
  const existing = db.prepare("SELECT id, name, created_at, updated_at FROM conversations WHERE id = ?").get(
    DEFAULT_CONVERSATION_ID
  ) as ConversationRow | undefined;
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

  return {
    id: DEFAULT_CONVERSATION_ID,
    name: "Allgemein",
    created_at: now,
    updated_at: now
  };
};

export const getApprovedUserById = (userId: string): WsUser | null => {
  const row = db
    .prepare("SELECT id, email as username, role FROM users WHERE id = ? AND status = 'approved' LIMIT 1")
    .get(userId) as WsUser | undefined;
  return row ?? null;
};

export const listApprovedUsersForChat = (userId: string) => {
  return db
    .prepare("SELECT id, email as username, role FROM users WHERE status = 'approved' AND id != ? ORDER BY email ASC")
    .all(userId) as Array<{ id: string; username: string; role: string }>;
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

export const listUserConversations = (userId: string): ConversationSummary[] => {
  ensureConversationMembershipForUser(userId);
  const rows = db
    .prepare(
      `SELECT
         c.id,
         c.name,
         c.created_at,
         c.updated_at,
         COUNT(cm_all.user_id) as member_count,
         MAX(m.created_at) as last_message_at
       FROM conversations c
       JOIN conversation_members cm_self ON cm_self.conversation_id = c.id AND cm_self.user_id = ?
       JOIN conversation_members cm_all ON cm_all.conversation_id = c.id
       LEFT JOIN messages m ON m.conversation_id = c.id
       GROUP BY c.id, c.name, c.created_at, c.updated_at
       ORDER BY COALESCE(MAX(m.created_at), c.updated_at, c.created_at) DESC`
    )
    .all(userId) as Array<{
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    member_count: number;
    last_message_at: string | null;
  }>;

  const membersQuery = db.prepare(
    `SELECT u.id, u.email as username
     FROM conversation_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.conversation_id = ?
     ORDER BY u.email ASC`
  );
  const lastMessageQuery = db.prepare(
    `SELECT content FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1`
  );

  return rows.map((row) => {
    const members = membersQuery.all(row.id) as Array<{ id: string; username: string }>;
    const last = lastMessageQuery.get(row.id) as { content: string } | undefined;
    const conversationType = normalizeConversationType(row.id, Number(row.member_count), row.name);

    let displayName = row.name;
    if (conversationType === "direct") {
      const other = members.find((member) => member.id !== userId);
      displayName = other?.username ?? row.name;
    }

    return {
      id: row.id,
      name: displayName,
      type: conversationType,
      created_at: row.created_at,
      updated_at: row.updated_at,
      member_count: Number(row.member_count),
      members,
      last_message_at: row.last_message_at,
      last_message_preview: previewContent(last?.content ?? "")
    };
  });
};

export const findOrCreateDirectConversation = (userId: string, otherUserId: string) => {
  if (userId === otherUserId) {
    throw new Error("Direktnachricht mit dir selbst ist nicht erlaubt.");
  }

  const otherUser = getApprovedUserById(otherUserId);
  if (!otherUser) {
    throw new Error("Empfänger nicht gefunden.");
  }

  const existing = db
    .prepare(
      `SELECT c.id
       FROM conversations c
       JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = ?
       JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = ?
       GROUP BY c.id
       HAVING COUNT(*) = 2
          AND (SELECT COUNT(*) FROM conversation_members cm WHERE cm.conversation_id = c.id) = 2
       LIMIT 1`
    )
    .get(userId, otherUserId) as { id: string } | undefined;
  if (existing) return existing.id;

  return runInTransaction(() => {
    const now = nowIso();
    const id = randomUUID();
    db.prepare("INSERT INTO conversations (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(
      id,
      "direct",
      now,
      now
    );
    const insertMember = db.prepare(
      "INSERT INTO conversation_members (id, conversation_id, user_id, created_at) VALUES (?, ?, ?, ?)"
    );
    insertMember.run(randomUUID(), id, userId, now);
    insertMember.run(randomUUID(), id, otherUserId, now);
    return id;
  });
};

export const createGroupConversation = (input: { creatorId: string; name: string; memberIds: string[] }) => {
  const creator = getApprovedUserById(input.creatorId);
  if (!creator) throw new Error("Benutzer nicht gefunden.");

  const trimmedName = input.name.trim();
  if (!trimmedName) throw new Error("Name ist erforderlich.");

  const normalizedMemberIds = Array.from(new Set(input.memberIds.map((id) => id.trim()).filter(Boolean)));
  const allMemberIds = Array.from(new Set([input.creatorId, ...normalizedMemberIds]));
  if (allMemberIds.length < 2) {
    throw new Error("Mindestens zwei Mitglieder erforderlich.");
  }

  const placeholders = allMemberIds.map(() => "?").join(", ");
  const found = db
    .prepare(`SELECT id FROM users WHERE status = 'approved' AND id IN (${placeholders})`)
    .all(...allMemberIds) as Array<{ id: string }>;
  if (found.length !== allMemberIds.length) {
    throw new Error("Mindestens ein Mitglied ist ungültig.");
  }

  return runInTransaction(() => {
    const now = nowIso();
    const id = randomUUID();
    db.prepare("INSERT INTO conversations (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(
      id,
      trimmedName,
      now,
      now
    );
    const insertMember = db.prepare(
      `INSERT INTO conversation_members (id, conversation_id, user_id, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(conversation_id, user_id) DO NOTHING`
    );
    for (const memberId of allMemberIds) {
      insertMember.run(randomUUID(), id, memberId, now);
    }
    return id;
  });
};

export const listConversationMessages = (conversationId: string, userId: string, limit = 200): ConversationMessage[] => {
  if (!isConversationMember(conversationId, userId)) return [];
  const safeLimit = Math.max(1, Math.min(400, Number(limit || 200)));
  const rows = db
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
       WHERE m.conversation_id = ?
       ORDER BY m.created_at DESC
       LIMIT ?`
    )
    .all(conversationId, safeLimit) as Array<{
    id: string;
    conversation_id: string;
    sender_id: string;
    sender_username: string;
    content: string;
    created_at: string;
  }>;

  const readRows = db
    .prepare(
      `SELECT rr.message_id, rr.user_id, rr.read_at
       FROM read_receipts rr
       JOIN messages m ON m.id = rr.message_id
       WHERE m.conversation_id = ?`
    )
    .all(conversationId) as Array<{ message_id: string; user_id: string; read_at: string }>;

  const readersByMessage = new Map<string, string[]>();
  const myReadAtByMessage = new Map<string, string>();
  for (const row of readRows) {
    const current = readersByMessage.get(row.message_id) ?? [];
    current.push(row.user_id);
    readersByMessage.set(row.message_id, current);
    if (row.user_id === userId) {
      myReadAtByMessage.set(row.message_id, row.read_at);
    }
  }

  return rows
    .reverse()
    .map((row) => ({
      ...row,
      read_at: myReadAtByMessage.get(row.id) ?? null,
      readers: readersByMessage.get(row.id) ?? []
    }));
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
    db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(now, input.conversationId);

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

