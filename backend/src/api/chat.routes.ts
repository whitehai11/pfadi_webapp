// engineered by Maro Elias Goth
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { z } from "zod";
import { requireChatFeature, getApprovedUserFromRequest } from "../utils/guards.js";
import {
  createChatMessage,
  ensureDefaultChatRoom,
  findChatMessageByClientKey,
  getChatAttachment,
  getChatRoom,
  getChatUploadDir,
  getRoomReactionSnapshot,
  getRoomReadReceiptSnapshot,
  listChatMessages,
  listChatRecipients,
  listChatRooms,
  markRoomRead,
  setMessageReaction
} from "../services/chat.service.js";
import {
  createGroupConversation,
  findOrCreateDirectConversation,
  listApprovedUsersForChat,
  listConversationMessages,
  listUserConversations
} from "../ws/chat.service.js";
import { settings } from "../config/settings.js";
import { sendToUser } from "../services/push.service.js";
import { parseOrReply } from "../utils/validation.js";
import { getAvatarPublicUrl } from "../services/avatar.service.js";
import { createRateLimit, rateLimitKeyByIp, rateLimitKeyByUserOrIp } from "../utils/rate-limit.js";

const MAX_CHAT_FILE_SIZE = settings.chatUploadMaxBytes;
const MIME_SAMPLE_BYTES = 8192;

const chatMessageRateLimit = createRateLimit({
  bucket: "chat-send-message",
  max: 30,
  windowMs: 60 * 1000,
  message: "Zu viele Chat-Nachrichten. Bitte kurz warten.",
  keyGenerator: rateLimitKeyByUserOrIp
});

const chatUploadUserRateLimit = createRateLimit({
  bucket: "chat-upload-user",
  max: 12,
  windowMs: 60 * 1000,
  message: "Zu viele Uploads. Bitte kurz warten.",
  keyGenerator: rateLimitKeyByUserOrIp
});

const chatUploadIpRateLimit = createRateLimit({
  bucket: "chat-upload-ip",
  max: 20,
  windowMs: 60 * 1000,
  message: "Zu viele Uploads von dieser IP. Bitte spaeter erneut versuchen.",
  keyGenerator: rateLimitKeyByIp
});

const roomParamsSchema = z
  .object({
    roomId: z.string().uuid()
  })
  .strict();

const conversationParamsSchema = z
  .object({
    conversationId: z.string().uuid()
  })
  .strict();

const conversationQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(400).optional()
  })
  .strict();

const directConversationSchema = z
  .object({
    user_id: z.string().uuid()
  })
  .strict();

const groupConversationSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    member_ids: z.array(z.string().uuid()).min(1).max(100)
  })
  .strict();

const messageParamsSchema = z
  .object({
    messageId: z.string().uuid()
  })
  .strict();

const attachmentParamsSchema = z
  .object({
    attachmentId: z.string().uuid()
  })
  .strict();

const jsonMessageSchema = z
  .object({
    content: z.string().trim().max(4000).default(""),
    client_message_id: z.string().uuid().optional()
  })
  .strict();

const reactionSchema = z
  .object({
    reaction: z.enum(["plus_one", "thanks", "ok", "seen"]).nullable()
  })
  .strict();

const readSchema = z
  .object({
    last_read_message_id: z.string().uuid().nullable().optional()
  })
  .strict();

const typingSchema = z
  .object({
    typing: z.boolean()
  })
  .strict();

const officeMimeByExt: Record<string, string> = {
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation"
};

const safeInlineTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain"
]);

const normalizeMessageContent = (value: string) => value.replace(/\r\n/g, "\n").trim();

const previewMessage = (value: string) => {
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (!singleLine) return "Anhang gesendet";
  return singleLine.length > 100 ? `${singleLine.slice(0, 100)}...` : singleLine;
};

const detectTextMime = (buffer: Buffer) => {
  if (buffer.length === 0) return "text/plain";
  for (const byte of buffer) {
    const printable =
      byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126) || byte >= 160;
    if (!printable) return null;
  }
  return "text/plain";
};

const detectMimeType = (buffer: Buffer, originalName: string, declaredType: string) => {
  const lowerName = originalName.toLowerCase();
  const extension = path.extname(lowerName);

  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a") {
    return "image/gif";
  }
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    const officeMime = officeMimeByExt[extension];
    if (officeMime && declaredType === officeMime) return officeMime;
  }

  const detectedText = detectTextMime(buffer);
  if (detectedText && (declaredType === "text/plain" || extension === ".txt" || extension === ".md")) {
    return detectedText;
  }

  return null;
};

const getAttachmentExtension = (mimeType: string, originalName: string) => {
  const extension = path.extname(originalName).toLowerCase();
  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg") return extension === ".jpeg" ? ".jpeg" : ".jpg";
  if (mimeType === "image/gif") return ".gif";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "text/plain") return extension === ".md" ? ".md" : ".txt";
  return extension || "";
};

type UploadSecurityHooks = {
  scan?: (input: { filePath: string; mimeType: string; originalName: string; fileSize: number }) => Promise<void>;
};

const defaultUploadHooks: UploadSecurityHooks = {
  scan: async () => {}
};

const saveAttachment = async (file: MultipartFile, hooks: UploadSecurityHooks = defaultUploadHooks) => {
  if (!file.filename) {
    throw new Error("Anhang ohne Dateinamen ist nicht erlaubt.");
  }

  const uploadDir = getChatUploadDir();
  const tempPath = path.join(uploadDir, `${randomUUID()}.uploading`);
  const output = fs.createWriteStream(tempPath, { flags: "wx" });
  const sampleChunks: Buffer[] = [];
  let sampleBytes = 0;
  let size = 0;

  const meter = new Transform({
    transform(chunk, _encoding, callback) {
      const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bufferChunk.length;
      if (size > MAX_CHAT_FILE_SIZE) {
        callback(new Error("Datei ist zu gross. Maximal 10 MB sind erlaubt."));
        return;
      }

      if (sampleBytes < MIME_SAMPLE_BYTES) {
        const nextChunk = bufferChunk.subarray(0, Math.min(bufferChunk.length, MIME_SAMPLE_BYTES - sampleBytes));
        sampleChunks.push(nextChunk);
        sampleBytes += nextChunk.length;
      }
      callback(null, bufferChunk);
    }
  });

  let finalizedPath: string | null = null;
  try {
    await pipeline(file.file, meter, output);

    const sampleBuffer = Buffer.concat(sampleChunks);
    const mimeType = detectMimeType(sampleBuffer, file.filename, file.mimetype);
    if (!mimeType) {
      throw new Error("Dateityp nicht erlaubt. Erlaubt sind Bilder, PDF und einfache Dokumente.");
    }

    const extension = getAttachmentExtension(mimeType, file.filename);
    const storageName = `${randomUUID()}${extension}`;
    const absolutePath = path.join(uploadDir, storageName);
    await fs.promises.rename(tempPath, absolutePath);
    finalizedPath = absolutePath;

    await (hooks.scan ?? defaultUploadHooks.scan)!({
      filePath: absolutePath,
      mimeType,
      originalName: file.filename,
      fileSize: size
    });

    return {
      filePath: absolutePath,
      fileName: file.filename,
      fileType: mimeType,
      fileSize: size
    };
  } catch (error) {
    if (!output.destroyed) {
      output.destroy();
      await once(output, "close").catch(() => undefined);
    }
    if (finalizedPath) {
      await fs.promises.rm(finalizedPath, { force: true }).catch(() => undefined);
    } else {
      await fs.promises.rm(tempPath, { force: true }).catch(() => undefined);
    }
    throw error;
  }
};

const parseMultipartMessage = async (request: FastifyRequest) => {
  let content = "";
  let seenContent = false;
  let clientMessageId: string | null = null;
  let seenClientMessageId = false;
  let attachment:
    | {
        filePath: string;
        fileName: string;
        fileType: string;
        fileSize: number;
      }
    | null = null;

  for await (const part of request.parts()) {
    if (part.type === "file") {
      if (part.fieldname !== "attachment" || attachment) {
        throw new Error("Ungultiges Upload-Format.");
      }
      attachment = await saveAttachment(part);
      continue;
    }

    if (part.fieldname === "content") {
      if (seenContent) throw new Error("Ungultige Eingabe.");
      content = String(part.value ?? "");
      seenContent = true;
      continue;
    }

    if (part.fieldname === "client_message_id") {
      if (seenClientMessageId) throw new Error("Ungultige Eingabe.");
      const parsed = z.string().uuid().safeParse(String(part.value ?? "").trim());
      if (!parsed.success) throw new Error("Ungultige Nachricht-ID.");
      clientMessageId = parsed.data;
      seenClientMessageId = true;
      continue;
    }

    throw new Error("Ungultige Eingabe.");
  }

  return {
    content: normalizeMessageContent(content),
    attachment,
    clientMessageId
  };
};

type ChatRealtimeEvent =
  | { type: "message-created"; roomId: string; payload: Record<string, unknown> }
  | { type: "reaction-updated"; roomId: string; payload: Record<string, unknown> }
  | { type: "read-updated"; roomId: string; payload: Record<string, unknown> }
  | { type: "typing-updated"; roomId: string; payload: Record<string, unknown> };

const roomSubscribers = new Map<string, Set<(event: ChatRealtimeEvent) => void>>();
const typingState = new Map<string, { userId: string; username: string; displayName: string; expiresAt: number }>();

const typingKey = (roomId: string, userId: string) => `${roomId}:${userId}`;

const emitRealtime = (event: ChatRealtimeEvent) => {
  const subs = roomSubscribers.get(event.roomId);
  if (!subs) return;
  for (const send of subs) {
    send(event);
  }
};

const subscribeRoom = (roomId: string, handler: (event: ChatRealtimeEvent) => void) => {
  const current = roomSubscribers.get(roomId) ?? new Set<(event: ChatRealtimeEvent) => void>();
  current.add(handler);
  roomSubscribers.set(roomId, current);
  return () => {
    const set = roomSubscribers.get(roomId);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
      roomSubscribers.delete(roomId);
    }
  };
};

const setTyping = (roomId: string, userId: string, username: string, displayName: string, typing: boolean) => {
  const key = typingKey(roomId, userId);
  if (!typing) {
    typingState.delete(key);
    return;
  }
  typingState.set(key, {
    userId,
    username,
    displayName,
    expiresAt: Date.now() + 5000
  });
};

const listTyping = (roomId: string, currentUserId: string) => {
  const now = Date.now();
  const result: { user_id: string; username: string; display_name: string }[] = [];
  for (const [key, state] of typingState.entries()) {
    if (!key.startsWith(`${roomId}:`)) continue;
    if (state.expiresAt <= now) {
      typingState.delete(key);
      continue;
    }
    if (state.userId === currentUserId) continue;
    result.push({
      user_id: state.userId,
      username: state.username,
      display_name: state.displayName
    });
  }
  return result;
};

const messageToResponse = (message: ReturnType<typeof createChatMessage>) => ({
  id: message.id,
  room_id: message.room_id,
  user_id: message.user_id,
  content: message.content,
  created_at: message.created_at,
  client_message_id: message.client_message_id,
  has_attachment: Boolean(message.has_attachment),
  sender: {
    username: message.sender_username,
    display_name: message.sender_display_name,
    avatar_url: getAvatarPublicUrl(message.user_id, message.sender_avatar_updated_at)
  },
  attachment: message.attachment_id
    ? {
        id: message.attachment_id,
        file_name: message.attachment_file_name,
        file_type: message.attachment_file_type,
        file_size: message.attachment_file_size,
        download_url: `/api/chat/attachments/${message.attachment_id}`
      }
    : null
});

export const chatRoutes = async (app: FastifyInstance) => {
  app.get("/chat/users", { preHandler: requireChatFeature }, async (request, reply) => {
    const user = getApprovedUserFromRequest(request);
    if (!user) {
      return reply.code(403).send({ error: "Forbidden" });
    }
    return reply.send({ users: listApprovedUsersForChat(user.id) });
  });

  app.get("/chat/conversations", { preHandler: requireChatFeature }, async (request, reply) => {
    const user = getApprovedUserFromRequest(request);
    if (!user) {
      return reply.code(403).send({ error: "Forbidden" });
    }
    return reply.send({ conversations: listUserConversations(user.id) });
  });

  app.post("/chat/conversations/direct", { preHandler: requireChatFeature }, async (request, reply) => {
    const user = getApprovedUserFromRequest(request);
    if (!user) {
      return reply.code(403).send({ error: "Forbidden" });
    }
    const body = parseOrReply(reply, directConversationSchema, request.body);
    if (!body) return;

    try {
      const conversationId = findOrCreateDirectConversation(user.id, body.user_id);
      return reply.code(201).send({ conversation_id: conversationId });
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Konversation konnte nicht erstellt werden." });
    }
  });

  app.post("/chat/conversations/group", { preHandler: requireChatFeature }, async (request, reply) => {
    const user = getApprovedUserFromRequest(request);
    if (!user) {
      return reply.code(403).send({ error: "Forbidden" });
    }
    const body = parseOrReply(reply, groupConversationSchema, request.body);
    if (!body) return;

    try {
      const conversationId = createGroupConversation({
        creatorId: user.id,
        name: body.name,
        memberIds: body.member_ids
      });
      return reply.code(201).send({ conversation_id: conversationId });
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Gruppe konnte nicht erstellt werden." });
    }
  });

  app.get("/chat/conversations/:conversationId/messages", { preHandler: requireChatFeature }, async (request, reply) => {
    const user = getApprovedUserFromRequest(request);
    if (!user) return reply.code(403).send({ error: "Forbidden" });
    const params = parseOrReply(reply, conversationParamsSchema, request.params);
    const query = parseOrReply(reply, conversationQuerySchema, request.query ?? {});
    if (!params || !query) return;

    return reply.send({
      messages: listConversationMessages(params.conversationId, user.id, query.limit ?? 200)
    });
  });

  app.get("/chat/rooms", { preHandler: requireChatFeature }, async () => {
    ensureDefaultChatRoom();
    return listChatRooms();
  });

  app.get("/chat/rooms/:roomId/messages", { preHandler: requireChatFeature }, async (request, reply) => {
    const parsed = parseOrReply(reply, roomParamsSchema, request.params);
    if (!parsed) return;

    const room = getChatRoom(parsed.roomId);
    if (!room) {
      return reply.code(404).send({ error: "Chatraum nicht gefunden." });
    }

    return reply.send({
      room,
      messages: listChatMessages(parsed.roomId).map((message) => ({
        id: message.id,
        room_id: message.room_id,
        user_id: message.user_id,
        content: message.content,
        created_at: message.created_at,
        client_message_id: message.client_message_id,
        has_attachment: Boolean(message.has_attachment),
        sender: {
          username: message.sender_username,
          display_name: message.sender_display_name,
          avatar_url: getAvatarPublicUrl(message.user_id, message.sender_avatar_updated_at)
        },
        attachment: message.attachment_id
          ? {
              id: message.attachment_id,
              file_name: message.attachment_file_name,
              file_type: message.attachment_file_type,
              file_size: message.attachment_file_size,
              download_url: `/api/chat/attachments/${message.attachment_id}`
            }
          : null
      }))
    });
  });

  app.get("/chat/rooms/:roomId/reactions", { preHandler: requireChatFeature }, async (request, reply) => {
    const params = parseOrReply(reply, roomParamsSchema, request.params);
    if (!params) return;
    const user = getApprovedUserFromRequest(request);
    if (!user) {
      return reply.code(403).send({ error: "Forbidden" });
    }
    return reply.send(getRoomReactionSnapshot(params.roomId, user.id));
  });

  app.get("/chat/rooms/:roomId/read-receipts", { preHandler: requireChatFeature }, async (request, reply) => {
    const params = parseOrReply(reply, roomParamsSchema, request.params);
    if (!params) return;
    return reply.send({ counts: getRoomReadReceiptSnapshot(params.roomId) });
  });

  app.post("/chat/rooms/:roomId/read", { preHandler: requireChatFeature }, async (request, reply) => {
    const params = parseOrReply(reply, roomParamsSchema, request.params);
    const body = parseOrReply(reply, readSchema, request.body);
    if (!params || !body) return;
    const user = getApprovedUserFromRequest(request);
    if (!user) return reply.code(403).send({ error: "Forbidden" });

    const updated = markRoomRead(params.roomId, user.id, body.last_read_message_id ?? null);
    emitRealtime({
      type: "read-updated",
      roomId: params.roomId,
      payload: updated
    });
    return reply.send({ ok: true });
  });

  app.get("/chat/rooms/:roomId/typing", { preHandler: requireChatFeature }, async (request, reply) => {
    const params = parseOrReply(reply, roomParamsSchema, request.params);
    if (!params) return;
    const user = getApprovedUserFromRequest(request);
    if (!user) return reply.code(403).send({ error: "Forbidden" });
    return reply.send({ users: listTyping(params.roomId, user.id) });
  });

  app.post("/chat/rooms/:roomId/typing", { preHandler: requireChatFeature }, async (request, reply) => {
    const params = parseOrReply(reply, roomParamsSchema, request.params);
    const body = parseOrReply(reply, typingSchema, request.body);
    if (!params || !body) return;
    const user = getApprovedUserFromRequest(request);
    if (!user) return reply.code(403).send({ error: "Forbidden" });

    setTyping(params.roomId, user.id, user.email, user.email, body.typing);
    const users = listTyping(params.roomId, user.id);
    emitRealtime({
      type: "typing-updated",
      roomId: params.roomId,
      payload: { users }
    });
    return reply.send({ ok: true, users });
  });

  app.post("/chat/messages/:messageId/reaction", { preHandler: requireChatFeature }, async (request, reply) => {
    const params = parseOrReply(reply, messageParamsSchema, request.params);
    const body = parseOrReply(reply, reactionSchema, request.body);
    if (!params || !body) return;
    const user = getApprovedUserFromRequest(request);
    if (!user) return reply.code(403).send({ error: "Forbidden" });

    const updated = setMessageReaction(params.messageId, user.id, body.reaction);
    if (!updated) {
      return reply.code(404).send({ error: "Nachricht nicht gefunden." });
    }
    const snapshot = getRoomReactionSnapshot(updated.roomId, user.id);
    emitRealtime({
      type: "reaction-updated",
      roomId: updated.roomId,
      payload: {
        message_id: updated.messageId,
        counts: snapshot.counts[updated.messageId] ?? {},
        mine: snapshot.mine[updated.messageId] ?? null,
        user_id: user.id
      }
    });
    return reply.send({
      message_id: updated.messageId,
      counts: snapshot.counts[updated.messageId] ?? {},
      mine: snapshot.mine[updated.messageId] ?? null
    });
  });

  app.post("/chat/rooms/:roomId/messages", { preHandler: requireChatFeature }, async (request, reply) => {
    await chatMessageRateLimit(request, reply);
    if (reply.sent) return;

    const params = parseOrReply(reply, roomParamsSchema, request.params);
    if (!params) return;

    const room = getChatRoom(params.roomId);
    if (!room) {
      return reply.code(404).send({ error: "Chatraum nicht gefunden." });
    }

    let preparedAttachment:
      | {
          filePath: string;
          fileName: string;
          fileType: string;
          fileSize: number;
        }
      | null = null;

    try {
      let content = "";
      let clientMessageId: string | null = null;

      if (request.isMultipart()) {
        await chatUploadUserRateLimit(request, reply);
        if (reply.sent) return;
        await chatUploadIpRateLimit(request, reply);
        if (reply.sent) return;

        const parsed = await parseMultipartMessage(request);
        content = parsed.content;
        preparedAttachment = parsed.attachment;
        clientMessageId = parsed.clientMessageId ?? null;
      } else {
        const parsed = parseOrReply(reply, jsonMessageSchema, request.body);
        if (!parsed) return;
        content = normalizeMessageContent(parsed.content ?? "");
        clientMessageId = parsed.client_message_id ?? null;
      }

      if (!content && !preparedAttachment) {
        return reply.code(400).send({ error: "Bitte Nachricht oder Anhang senden." });
      }

      const user = getApprovedUserFromRequest(request);
      if (!user) {
        return reply.code(403).send({ error: "Forbidden" });
      }

      if (clientMessageId) {
        const existing = findChatMessageByClientKey(params.roomId, user.id, clientMessageId);
        if (existing) {
          return reply.send(messageToResponse(existing));
        }
      }

      const message = createChatMessage({
        roomId: params.roomId,
        userId: user.id,
        content,
        clientMessageId,
        attachment: preparedAttachment
      });

      const recipients = listChatRecipients(user.id);
      const preview = previewMessage(content);
      await Promise.all(
        recipients.map(({ id }) =>
          sendToUser(id, {
            title: "Neue Nachricht im Chat",
            body: `${user.email}: ${preview}`,
            type: "chat-message",
            roomId: room.id
          })
        )
      );

      const responseMessage = messageToResponse(message);
      emitRealtime({
        type: "message-created",
        roomId: params.roomId,
        payload: responseMessage
      });

      return reply.code(201).send(responseMessage);
    } catch (error) {
      if (preparedAttachment?.filePath) {
        await fs.promises.rm(preparedAttachment.filePath, { force: true }).catch(() => undefined);
      }
      request.log.error(
        {
          err: error,
          roomId: params.roomId,
          userId: (request.user as { id?: string } | undefined)?.id ?? null
        },
        "Chat message send failed"
      );

      if (error instanceof Error) {
        const safeClientErrors = new Set([
          "Anhang ohne Dateinamen ist nicht erlaubt.",
          "Datei ist zu gross. Maximal 10 MB sind erlaubt.",
          "Dateityp nicht erlaubt. Erlaubt sind Bilder, PDF und einfache Dokumente.",
          "Ungultiges Upload-Format.",
          "Ungultige Eingabe.",
          "Ungultige Nachricht-ID."
        ]);
        if (safeClientErrors.has(error.message)) {
          return reply.code(400).send({ error: error.message });
        }
      }

      return reply.code(500).send({ error: "Nachricht konnte nicht gesendet werden." });
    }
  });

  app.get("/chat/rooms/:roomId/stream", { preHandler: requireChatFeature }, async (request, reply) => {
    const params = parseOrReply(reply, roomParamsSchema, request.params);
    if (!params) return;

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.write(`event: ready\ndata: ${JSON.stringify({ room_id: params.roomId, ts: Date.now() })}\n\n`);

    const send = (event: ChatRealtimeEvent) => {
      if (event.roomId !== params.roomId) return;
      reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`);
    };
    const unsubscribe = subscribeRoom(params.roomId, send);
    const keepAlive = setInterval(() => {
      reply.raw.write(`event: ping\ndata: ${Date.now()}\n\n`);
    }, 25000);

    request.raw.on("close", () => {
      clearInterval(keepAlive);
      unsubscribe();
    });

    return reply;
  });

  app.get("/chat/attachments/:attachmentId", { preHandler: requireChatFeature }, async (request, reply) => {
    const parsed = parseOrReply(reply, attachmentParamsSchema, request.params);
    if (!parsed) return;

    const attachment = getChatAttachment(parsed.attachmentId);
    if (!attachment) {
      return reply.code(404).send({ error: "Anhang nicht gefunden." });
    }

    const uploadDir = path.resolve(getChatUploadDir());
    const resolvedPath = path.resolve(attachment.file_path);
    const relativePath = path.relative(uploadDir, resolvedPath);
    const escapedUploadDir =
      relativePath.startsWith("..") || path.isAbsolute(relativePath) || relativePath.length === 0;
    if (escapedUploadDir || !fs.existsSync(resolvedPath)) {
      return reply.code(404).send({ error: "Anhang nicht gefunden." });
    }

    const disposition = safeInlineTypes.has(attachment.file_type) ? "inline" : "attachment";
    reply.header("Cache-Control", "private, no-store");
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header(
      "Content-Disposition",
      `${disposition}; filename*=UTF-8''${encodeURIComponent(attachment.file_name)}`
    );
    reply.header("Content-Type", attachment.file_type);
    reply.header("Content-Length", String(attachment.file_size));

    return reply.send(fs.createReadStream(resolvedPath));
  });
};
