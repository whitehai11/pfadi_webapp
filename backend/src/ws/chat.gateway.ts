// engineered by Maro Elias Goth
import { WebSocketServer, WebSocket } from "ws";
import type { FastifyInstance } from "fastify";
import type { IncomingMessage } from "node:http";
import { URL } from "node:url";
import { db } from "../db/database.js";
import {
  recordWsBroadcast,
  recordWsMessage,
  setChatConnectionCount,
  setOnlineUserCount
} from "../services/admin-monitor.service.js";
import {
  recordWsMessage as recordWsMetricMessage,
  setWsConnectedClients as setWsMetricConnectedClients
} from "../services/metrics-registry.service.js";
import {
  ensureConversationMembershipForUser,
  getApprovedUserById,
  isConversationMember,
  listConversationMemberIds,
  saveMessage,
  saveReadReceipt
} from "./chat.service.js";
import type { ClientEnvelope, ClientEventMap, ServerEnvelope, ServerEventMap, WsUser } from "./chat.types.js";

type SocketState = {
  socket: WebSocket;
  user: WsUser;
};

const parseTokenFromCookie = (cookieHeader: string | undefined) => {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (!part.startsWith("pfadi_token=")) continue;
    const value = part.slice("pfadi_token=".length).trim();
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
};

const parseBearerFromHeader = (value: string | undefined) => {
  if (!value) return null;
  const raw = value.trim();
  if (!raw.toLowerCase().startsWith("bearer ")) return null;
  const token = raw.slice(7).trim();
  return token || null;
};

const getTokenFromUpgrade = (request: IncomingMessage) => {
  const url = new URL(request.url || "/", "http://localhost");
  const fromQuery = url.searchParams.get("token");
  if (fromQuery?.trim()) return fromQuery.trim();

  const fromHeader = parseBearerFromHeader(
    typeof request.headers.authorization === "string" ? request.headers.authorization : undefined
  );
  if (fromHeader) return fromHeader;

  return parseTokenFromCookie(typeof request.headers.cookie === "string" ? request.headers.cookie : undefined);
};

const parseClientEnvelope = (raw: string): ClientEnvelope | null => {
  try {
    const parsed = JSON.parse(raw) as ClientEnvelope;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.event !== "string") return null;
    if (!("data" in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const setupChatGateway = (app: FastifyInstance) => {
  const wss = new WebSocketServer({ noServer: true });
  const socketsByUser = new Map<string, Set<WebSocket>>();
  const socketState = new Map<WebSocket, SocketState>();

  const sendEvent = <E extends keyof ServerEventMap>(socket: WebSocket, event: E, data: ServerEventMap[E]) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    const payload: ServerEnvelope<E> = { event, data };
    socket.send(JSON.stringify(payload));
  };

  const sendError = (socket: WebSocket, code: string, message: string) => {
    sendEvent(socket, "error", { code, message });
  };

  const listUserConversationIds = (userId: string) => {
    return db
      .prepare("SELECT conversation_id FROM conversation_members WHERE user_id = ?")
      .all(userId)
      .map((row) => (row as { conversation_id: string }).conversation_id);
  };

  const listOnlineUserIds = () => Array.from(socketsByUser.keys()).sort();

  const broadcastToConversationMembers = <E extends keyof ServerEventMap>(
    conversationId: string,
    event: E,
    data: ServerEventMap[E]
  ) => {
    const memberIds = listConversationMemberIds(conversationId);
    for (const memberId of memberIds) {
      const targets = socketsByUser.get(memberId);
      if (!targets) continue;
      for (const target of targets) {
        sendEvent(target, event, data);
      }
    }
    recordWsBroadcast(String(event));
  };

  const emitPresenceForConversation = (conversationId: string) => {
    const members = listConversationMemberIds(conversationId);
    const onlineSet = new Set(listOnlineUserIds());
    const onlineUserIds = members.filter((id) => onlineSet.has(id));
    broadcastToConversationMembers(conversationId, "chat:presence", {
      conversationId,
      onlineUserIds
    });
  };

  const emitPresenceForUser = (userId: string) => {
    const conversationIds = listUserConversationIds(userId);
    for (const conversationId of conversationIds) {
      emitPresenceForConversation(conversationId);
    }
  };

  const attachSocket = (socket: WebSocket, user: WsUser) => {
    socketState.set(socket, { socket, user });
    const current = socketsByUser.get(user.id) ?? new Set<WebSocket>();
    current.add(socket);
    socketsByUser.set(user.id, current);
    setChatConnectionCount(socketState.size);
    setOnlineUserCount(socketsByUser.size);
    setWsMetricConnectedClients("chat", socketState.size);
  };

  const detachSocket = (socket: WebSocket) => {
    const state = socketState.get(socket);
    if (!state) return;
    socketState.delete(socket);

    const userSockets = socketsByUser.get(state.user.id);
    if (userSockets) {
      userSockets.delete(socket);
      if (userSockets.size === 0) {
        socketsByUser.delete(state.user.id);
      }
    }
    setChatConnectionCount(socketState.size);
    setOnlineUserCount(socketsByUser.size);
    setWsMetricConnectedClients("chat", socketState.size);
    emitPresenceForUser(state.user.id);
  };

  app.server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "/", "http://localhost");
    if (url.pathname !== "/ws/chat") return;

    const token = getTokenFromUpgrade(request);
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    let decoded: { id?: string } | null = null;
    try {
      decoded = app.jwt.verify<{ id: string }>(token);
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const userId = String(decoded?.id ?? "").trim();
    if (!userId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const user = getApprovedUserById(userId);
    if (!user) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    ensureConversationMembershipForUser(user.id);

    wss.handleUpgrade(request, socket, head, (ws) => {
      attachSocket(ws, user);
      emitPresenceForUser(user.id);

      ws.on("close", () => detachSocket(ws));
      ws.on("error", () => detachSocket(ws));

      ws.on("message", (buffer) => {
        const state = socketState.get(ws);
        if (!state) return;

        const envelope = parseClientEnvelope(String(buffer));
        if (!envelope) {
          sendError(ws, "invalid_payload", "Ungueltiges Event-Payload.");
          return;
        }

        if (envelope.event === "chat:send") {
          const payload = envelope.data as ClientEventMap["chat:send"];
          const conversationId = String(payload.conversationId ?? "").trim();
          const content = String(payload.content ?? "").trim();
          const clientId = payload.clientId;

          if (!conversationId || !content) {
            sendError(ws, "validation_error", "conversationId und content sind erforderlich.");
            return;
          }
          if (!isConversationMember(conversationId, state.user.id)) {
            sendError(ws, "forbidden", "Kein Zugriff auf diese Konversation.");
            return;
          }

          const message = saveMessage({
            conversationId,
            senderId: state.user.id,
            content
          });

          broadcastToConversationMembers(conversationId, "chat:receive", message);
          recordWsMessage();
          recordWsMetricMessage();
          sendEvent(ws, "chat:delivery", {
            conversationId,
            messageId: message.id,
            clientId,
            deliveredAt: message.created_at
          });
          return;
        }

        if (envelope.event === "chat:typing") {
          const payload = envelope.data as ClientEventMap["chat:typing"];
          const conversationId = String(payload.conversationId ?? "").trim();
          const isTyping = Boolean(payload.isTyping);
          if (!conversationId) return;
          if (!isConversationMember(conversationId, state.user.id)) return;

          broadcastToConversationMembers(conversationId, "chat:typing", {
            conversationId,
            userId: state.user.id,
            isTyping
          });
          return;
        }

        if (envelope.event === "chat:read") {
          const payload = envelope.data as ClientEventMap["chat:read"];
          const conversationId = String(payload.conversationId ?? "").trim();
          const messageId = String(payload.messageId ?? "").trim();
          if (!conversationId || !messageId) return;
          if (!isConversationMember(conversationId, state.user.id)) return;

          const receipt = saveReadReceipt({ messageId, userId: state.user.id });
          if (!receipt || receipt.conversation_id !== conversationId) {
            sendError(ws, "not_found", "Nachricht nicht gefunden.");
            return;
          }

          broadcastToConversationMembers(conversationId, "chat:read", {
            conversationId,
            messageId: receipt.message_id,
            userId: receipt.user_id,
            readAt: receipt.read_at
          });
          return;
        }

        sendError(ws, "unsupported_event", "Event wird nicht unterstuetzt.");
      });
    });
  });

  return {
    close: () => {
      for (const ws of socketState.keys()) {
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
      wss.close();
      socketState.clear();
      socketsByUser.clear();
      setChatConnectionCount(0);
      setOnlineUserCount(0);
      setWsMetricConnectedClients("chat", 0);
    }
  };
};
