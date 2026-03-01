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
import type { ChatWsClientMessage, ChatWsServerMessage, WsUser } from "./chat.types.js";

type SocketState = {
  socket: WebSocket;
  user: WsUser;
  joinedRooms: Set<string>;
  lastSeenAt: number;
};

const backpressureLimitBytes = 512 * 1024;
const heartbeatIntervalMs = 25_000;
const heartbeatTimeoutMs = 70_000;

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

const parseClientMessage = (raw: string): ChatWsClientMessage | null => {
  try {
    const parsed = JSON.parse(raw) as ChatWsClientMessage;
    if (!parsed || typeof parsed !== "object") return null;
    if (!("type" in parsed) || typeof parsed.type !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
};

const getPeerIp = (request: IncomingMessage) => {
  const cf = request.headers["cf-connecting-ip"];
  if (typeof cf === "string" && cf.trim()) return cf.trim();
  const xff = request.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) return xff.split(",")[0]?.trim() || null;
  return request.socket.remoteAddress ?? null;
};

export const setupChatGateway = (app: FastifyInstance) => {
  const wss = new WebSocketServer({ noServer: true });
  const socketsByUser = new Map<string, Set<WebSocket>>();
  const socketState = new Map<WebSocket, SocketState>();

  const devLog = (state: SocketState, direction: "in" | "out", type: string, payload: unknown) => {
    if (state.user.role !== "dev") return;
    app.log.info(
      {
        ws: "chat",
        direction,
        type,
        payload,
        userId: state.user.id
      },
      "Chat websocket debug event"
    );
  };

  const send = (socket: WebSocket, message: ChatWsServerMessage) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    if (socket.bufferedAmount > backpressureLimitBytes) return;
    socket.send(JSON.stringify(message));
    recordWsMessage();
    recordWsMetricMessage();
    const state = socketState.get(socket);
    if (state) {
      devLog(state, "out", message.type, message.payload);
    }
  };

  const sendError = (socket: WebSocket, code: string, message: string) => {
    send(socket, { type: "error", payload: { code, message } });
  };

  const listUserConversationIds = (userId: string) => {
    return db
      .prepare("SELECT conversation_id FROM conversation_members WHERE user_id = ?")
      .all(userId)
      .map((row) => (row as { conversation_id: string }).conversation_id);
  };

  const listOnlineUserIds = () => Array.from(socketsByUser.keys()).sort();

  const broadcastToJoinedMembers = (conversationId: string, message: ChatWsServerMessage) => {
    const memberIds = listConversationMemberIds(conversationId);
    for (const memberId of memberIds) {
      const targets = socketsByUser.get(memberId);
      if (!targets) continue;
      for (const target of targets) {
        const targetState = socketState.get(target);
        if (!targetState) continue;
        if (!targetState.joinedRooms.has(conversationId)) continue;
        send(target, message);
      }
    }
    recordWsBroadcast(message.type);
  };

  const emitPresenceForConversation = (conversationId: string) => {
    const members = listConversationMemberIds(conversationId);
    const onlineSet = new Set(listOnlineUserIds());
    const onlineUserIds = members.filter((id) => onlineSet.has(id));
    broadcastToJoinedMembers(conversationId, {
      type: "chat.presence",
      payload: {
        conversationId,
        onlineUserIds
      }
    });
  };

  const emitPresenceForUser = (userId: string) => {
    const conversationIds = listUserConversationIds(userId);
    for (const conversationId of conversationIds) {
      emitPresenceForConversation(conversationId);
    }
  };

  const attachSocket = (socket: WebSocket, user: WsUser) => {
    socketState.set(socket, { socket, user, joinedRooms: new Set(), lastSeenAt: Date.now() });
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
    const joined = Array.from(state.joinedRooms);
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
    for (const conversationId of joined) {
      emitPresenceForConversation(conversationId);
    }
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
      const state = socketState.get(ws);
      if (!state) {
        ws.close();
        return;
      }

      app.log.info(
        {
          ws: "chat",
          userId: user.id,
          ip: getPeerIp(request)
        },
        "Chat websocket connected"
      );

      send(ws, {
        type: "system.ready",
        payload: { userId: user.id, heartbeatMs: heartbeatIntervalMs }
      });

      ws.on("close", () => detachSocket(ws));
      ws.on("error", () => detachSocket(ws));

      ws.on("message", (buffer) => {
        const current = socketState.get(ws);
        if (!current) return;
        current.lastSeenAt = Date.now();
        socketState.set(ws, current);

        const message = parseClientMessage(String(buffer));
        if (!message) {
          sendError(ws, "invalid_payload", "Ungültiges Payload.");
          return;
        }
        devLog(current, "in", message.type, "payload" in message ? message.payload : null);

        if (message.type === "ping") {
          send(ws, { type: "pong", payload: { ts: new Date().toISOString() } });
          return;
        }

        if (message.type === "room.join") {
          const conversationId = String(message.payload?.conversationId ?? "").trim();
          if (!conversationId) {
            sendError(ws, "validation_error", "conversationId ist erforderlich.");
            return;
          }
          if (!isConversationMember(conversationId, current.user.id)) {
            sendError(ws, "forbidden", "Kein Zugriff auf diese Konversation.");
            return;
          }
          current.joinedRooms.add(conversationId);
          socketState.set(ws, current);
          send(ws, { type: "room.joined", payload: { conversationId } });
          emitPresenceForConversation(conversationId);
          return;
        }

        if (message.type === "room.leave") {
          const conversationId = String(message.payload?.conversationId ?? "").trim();
          if (!conversationId) {
            sendError(ws, "validation_error", "conversationId ist erforderlich.");
            return;
          }
          current.joinedRooms.delete(conversationId);
          socketState.set(ws, current);
          send(ws, { type: "room.left", payload: { conversationId } });
          emitPresenceForConversation(conversationId);
          return;
        }

        if (message.type === "chat.send") {
          const conversationId = String(message.payload?.conversationId ?? "").trim();
          const content = String(message.payload?.content ?? "").trim();
          const clientId = message.payload?.clientId;
          if (!conversationId || !content) {
            sendError(ws, "validation_error", "conversationId und content sind erforderlich.");
            return;
          }
          if (!isConversationMember(conversationId, current.user.id)) {
            sendError(ws, "forbidden", "Kein Zugriff auf diese Konversation.");
            return;
          }

          const created = saveMessage({ conversationId, senderId: current.user.id, content });
          broadcastToJoinedMembers(conversationId, { type: "chat.message", payload: created });
          send(ws, {
            type: "chat.delivery",
            payload: { conversationId, messageId: created.id, clientId, deliveredAt: created.created_at }
          });
          return;
        }

        if (message.type === "chat.typing") {
          const conversationId = String(message.payload?.conversationId ?? "").trim();
          const isTyping = Boolean(message.payload?.isTyping);
          if (!conversationId) return;
          if (!isConversationMember(conversationId, current.user.id)) return;
          broadcastToJoinedMembers(conversationId, {
            type: "chat.typing",
            payload: { conversationId, userId: current.user.id, isTyping }
          });
          return;
        }

        if (message.type === "chat.read") {
          const conversationId = String(message.payload?.conversationId ?? "").trim();
          const messageId = String(message.payload?.messageId ?? "").trim();
          if (!conversationId || !messageId) return;
          if (!isConversationMember(conversationId, current.user.id)) return;

          const receipt = saveReadReceipt({ messageId, userId: current.user.id });
          if (!receipt || receipt.conversation_id !== conversationId) {
            sendError(ws, "not_found", "Nachricht nicht gefunden.");
            return;
          }
          broadcastToJoinedMembers(conversationId, {
            type: "chat.read",
            payload: { conversationId, messageId: receipt.message_id, userId: receipt.user_id, readAt: receipt.read_at }
          });
          return;
        }

        sendError(ws, "unsupported_event", "Event nicht unterstützt.");
      });
    });
  });

  const heartbeat = setInterval(() => {
    const now = Date.now();
    for (const [socket, state] of socketState.entries()) {
      if (now - state.lastSeenAt > heartbeatTimeoutMs) {
        try {
          socket.close();
        } catch {
          // ignore
        }
        continue;
      }
      send(socket, { type: "pong", payload: { ts: new Date().toISOString() } });
    }
  }, heartbeatIntervalMs);

  return {
    close: () => {
      clearInterval(heartbeat);
      for (const socket of socketState.keys()) {
        try {
          socket.close();
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

