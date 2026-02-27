import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { z } from "zod";
import { requireChatFeature, getApprovedUserFromRequest } from "../utils/guards.js";
import {
  createChatMessage,
  ensureDefaultChatRoom,
  getChatAttachment,
  getChatRoom,
  getChatUploadDir,
  listChatMessages,
  listChatRecipients,
  listChatRooms
} from "../services/chat.service.js";
import { settings } from "../config/settings.js";
import { sendToUser } from "../services/push.service.js";
import { parseOrReply } from "../utils/validation.js";

const MAX_CHAT_FILE_SIZE = settings.chatUploadMaxBytes;

const roomParamsSchema = z
  .object({
    roomId: z.string().uuid()
  })
  .strict();

const attachmentParamsSchema = z
  .object({
    attachmentId: z.string().uuid()
  })
  .strict();

const jsonMessageSchema = z
  .object({
    content: z.string().trim().max(4000).default("")
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

const saveAttachment = async (file: MultipartFile) => {
  if (!file.filename) {
    throw new Error("Anhang ohne Dateinamen ist nicht erlaubt.");
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of file.file) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bufferChunk.length;
    if (size > MAX_CHAT_FILE_SIZE) {
      throw new Error("Datei ist zu gross. Maximal 10 MB sind erlaubt.");
    }
    chunks.push(bufferChunk);
  }

  const buffer = Buffer.concat(chunks);
  const mimeType = detectMimeType(buffer, file.filename, file.mimetype);
  if (!mimeType) {
    throw new Error("Dateityp nicht erlaubt. Erlaubt sind Bilder, PDF und einfache Dokumente.");
  }

  const uploadDir = getChatUploadDir();
  const extension = getAttachmentExtension(mimeType, file.filename);
  const storageName = `${randomUUID()}${extension}`;
  const absolutePath = path.join(uploadDir, storageName);
  await fs.promises.writeFile(absolutePath, buffer);

  return {
    filePath: absolutePath,
    fileName: file.filename,
    fileType: mimeType,
    fileSize: size
  };
};

const parseMultipartMessage = async (request: FastifyRequest) => {
  let content = "";
  let seenContent = false;
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

    if (part.fieldname !== "content" || seenContent) {
      throw new Error("Ungultige Eingabe.");
    }

    content = String(part.value ?? "");
    seenContent = true;
  }

  return {
    content: normalizeMessageContent(content),
    attachment
  };
};

export const chatRoutes = async (app: FastifyInstance) => {
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
        has_attachment: Boolean(message.has_attachment),
        sender: {
          username: message.sender_username,
          display_name: message.sender_display_name
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

  app.post("/chat/rooms/:roomId/messages", { preHandler: requireChatFeature }, async (request, reply) => {
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

      if (request.isMultipart()) {
        const parsed = await parseMultipartMessage(request);
        content = parsed.content;
        preparedAttachment = parsed.attachment;
      } else {
        const parsed = parseOrReply(reply, jsonMessageSchema, request.body);
        if (!parsed) return;
        content = normalizeMessageContent(parsed.content ?? "");
      }

      if (!content && !preparedAttachment) {
        return reply.code(400).send({ error: "Bitte Nachricht oder Anhang senden." });
      }

      const user = getApprovedUserFromRequest(request);
      if (!user) {
        return reply.code(403).send({ error: "Forbidden" });
      }

      const message = createChatMessage({
        roomId: params.roomId,
        userId: user.id,
        content,
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

      return reply.code(201).send({
        id: message.id,
        room_id: message.room_id,
        user_id: message.user_id,
        content: message.content,
        created_at: message.created_at,
        has_attachment: Boolean(message.has_attachment),
        sender: {
          username: message.sender_username,
          display_name: message.sender_display_name
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
    } catch (error) {
      if (preparedAttachment?.filePath) {
        await fs.promises.rm(preparedAttachment.filePath, { force: true });
      }
      const message = error instanceof Error ? error.message : "Nachricht konnte nicht gesendet werden.";
      return reply.code(400).send({ error: message });
    }
  });

  app.get("/chat/attachments/:attachmentId", { preHandler: requireChatFeature }, async (request, reply) => {
    const parsed = parseOrReply(reply, attachmentParamsSchema, request.params);
    if (!parsed) return;

    const attachment = getChatAttachment(parsed.attachmentId);
    if (!attachment || !fs.existsSync(attachment.file_path)) {
      return reply.code(404).send({ error: "Anhang nicht gefunden." });
    }

    const disposition = safeInlineTypes.has(attachment.file_type) ? "inline" : "attachment";
    reply.header(
      "Content-Disposition",
      `${disposition}; filename*=UTF-8''${encodeURIComponent(attachment.file_name)}`
    );
    reply.header("Content-Type", attachment.file_type);
    reply.header("Content-Length", String(attachment.file_size));

    return reply.send(fs.createReadStream(attachment.file_path));
  });
};
