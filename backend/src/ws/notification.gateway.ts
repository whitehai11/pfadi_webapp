// engineered by Maro Elias Goth
import { WebSocket, WebSocketServer } from "ws";
import type { FastifyInstance } from "fastify";
import type { IncomingMessage } from "node:http";
import { URL } from "node:url";
import { getApprovedUserById } from "../utils/guards.js";
import { getUnreadNotificationCount, setNotificationRealtimeEmitter } from "../services/notification.service.js";
import { recordWsBroadcast, setNotificationConnectionCount } from "../services/admin-monitor.service.js";
import {
  recordWsMessage as recordWsMetricMessage,
  setWsConnectedClients as setWsMetricConnectedClients
} from "../services/metrics-registry.service.js";

type ServerNotificationEnvelope =
  | {
      event: "notification:new";
      data: {
        id: string;
        type: string;
        title: string;
        message: string;
        metadata: Record<string, unknown> | null;
        is_read: boolean;
        read_at: string | null;
        created_at: string;
      };
    }
  | {
      event: "notification:unread_count";
      data: { unread_count: number };
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

export const setupNotificationGateway = (app: FastifyInstance) => {
  const wss = new WebSocketServer({ noServer: true });
  const socketsByUser = new Map<string, Set<WebSocket>>();
  const socketUser = new Map<WebSocket, string>();

  const sendEvent = (socket: WebSocket, payload: ServerNotificationEnvelope) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
  };

  const emitToUser = (userId: string, payload: ServerNotificationEnvelope) => {
    const targets = socketsByUser.get(userId);
    if (!targets) return;
    for (const socket of targets) {
      sendEvent(socket, payload);
    }
    recordWsBroadcast(payload.event);
    recordWsMetricMessage();
  };

  const detachSocket = (socket: WebSocket) => {
    const userId = socketUser.get(socket);
    if (!userId) return;
    socketUser.delete(socket);
    const set = socketsByUser.get(userId);
    if (!set) return;
    set.delete(socket);
    if (set.size === 0) {
      socketsByUser.delete(userId);
    }
    setNotificationConnectionCount(socketUser.size);
    setWsMetricConnectedClients("notifications", socketUser.size);
  };

  app.server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "/", "http://localhost");
    if (url.pathname !== "/ws/notifications") return;

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

    wss.handleUpgrade(request, socket, head, (ws) => {
      socketUser.set(ws, user.id);
      const current = socketsByUser.get(user.id) ?? new Set<WebSocket>();
      current.add(ws);
      socketsByUser.set(user.id, current);
      setNotificationConnectionCount(socketUser.size);
      setWsMetricConnectedClients("notifications", socketUser.size);

      sendEvent(ws, {
        event: "notification:unread_count",
        data: { unread_count: getUnreadNotificationCount(user.id) }
      });

      ws.on("close", () => detachSocket(ws));
      ws.on("error", () => detachSocket(ws));
    });
  });

  setNotificationRealtimeEmitter((userId, payload) => {
    emitToUser(userId, payload as ServerNotificationEnvelope);
  });

  return {
    close: () => {
      setNotificationRealtimeEmitter(null);
      for (const ws of socketUser.keys()) {
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
      wss.close();
      socketUser.clear();
      socketsByUser.clear();
      setNotificationConnectionCount(0);
      setWsMetricConnectedClients("notifications", 0);
    }
  };
};
