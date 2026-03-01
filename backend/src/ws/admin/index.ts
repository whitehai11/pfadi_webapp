// engineered by Maro Elias Goth
import { WebSocket, WebSocketServer } from "ws";
import type { FastifyInstance } from "fastify";
import type { IncomingMessage } from "node:http";
import { URL } from "node:url";
import { db } from "../../db/database.js";
import type { AdminWsChannel, AdminWsClientMessage, AdminWsServerMessage } from "./types.js";
import { getLogsSnapshot, normalizeLogsFilter, onLogsEvent } from "./channels/logs.js";
import { getErrorsSnapshot, onErrorsEvent } from "./channels/errors.js";
import { getQueueSnapshot, onQueueEvent } from "./channels/queue.js";
import { getDockerSnapshot, onDockerEvent } from "./channels/docker.js";
import { getRedisSnapshot, onRedisEvent } from "./channels/redis.js";
import { getApiMetricsSnapshot, onApiMetricsEvent } from "./channels/api-metrics.js";
import { recordWsMessage, setWsConnectedClients } from "../../services/metrics-registry.service.js";

type ClientSubscription = {
  filters?: Record<string, unknown>;
};

type ClientState = {
  userId: string;
  subscriptions: Map<AdminWsChannel, ClientSubscription>;
  lastSeenAt: number;
  windowStartAt: number;
  messagesInWindow: number;
};

const backpressureBytesLimit = 512 * 1024;
const controlRateWindowMs = 10_000;
const controlRateMaxMessages = 120;

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

const parseClientMessage = (raw: string): AdminWsClientMessage | null => {
  try {
    const parsed = JSON.parse(raw) as AdminWsClientMessage;
    if (!parsed || typeof parsed !== "object") return null;
    if (!("type" in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const isChannel = (value: unknown): value is AdminWsChannel => {
  const channel = String(value ?? "");
  return ["logs", "errors", "queue", "docker", "redis", "api-metrics"].includes(channel);
};

export const setupAdminGateway = (app: FastifyInstance) => {
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Map<WebSocket, ClientState>();

  const safeSend = (socket: WebSocket, payload: AdminWsServerMessage) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    if (socket.bufferedAmount > backpressureBytesLimit) {
      recordWsMessage({ dropped: true });
      return;
    }
    socket.send(JSON.stringify(payload));
    recordWsMessage();
  };

  const sendError = (socket: WebSocket, message: string) => {
    safeSend(socket, { type: "error", message });
  };

  const sendSnapshot = (socket: WebSocket, channel: AdminWsChannel, filters?: Record<string, unknown>) => {
    if (channel === "logs") {
      const parsed = normalizeLogsFilter(filters);
      safeSend(socket, {
        type: "snapshot",
        channel,
        data: getLogsSnapshot(parsed)
      });
      return;
    }
    if (channel === "errors") {
      safeSend(socket, { type: "snapshot", channel, data: getErrorsSnapshot() as Record<string, unknown> });
      return;
    }
    if (channel === "queue") {
      safeSend(socket, { type: "snapshot", channel, data: getQueueSnapshot() as Record<string, unknown> });
      return;
    }
    if (channel === "docker") {
      safeSend(socket, { type: "snapshot", channel, data: getDockerSnapshot() as Record<string, unknown> });
      return;
    }
    if (channel === "redis") {
      safeSend(socket, { type: "snapshot", channel, data: getRedisSnapshot() as Record<string, unknown> });
      return;
    }
    if (channel === "api-metrics") {
      safeSend(socket, { type: "snapshot", channel, data: getApiMetricsSnapshot() as Record<string, unknown> });
    }
  };

  const broadcastChannelEvent = (channel: AdminWsChannel, data: Record<string, unknown>) => {
    for (const [socket, state] of clients) {
      if (!state.subscriptions.has(channel)) continue;
      if (channel === "logs") {
        const filter = normalizeLogsFilter(state.subscriptions.get(channel)?.filters);
        const level = String(data.level ?? "").toLowerCase();
        if (!filter.levels.includes(level as never)) continue;
      }
      safeSend(socket, {
        type: "event",
        channel,
        data
      });
    }
  };

  const offLogs = onLogsEvent((entry) => {
    broadcastChannelEvent("logs", entry);
  });
  const offErrors = onErrorsEvent((entry) => {
    broadcastChannelEvent("errors", entry);
  });
  const offQueue = onQueueEvent((entry) => {
    broadcastChannelEvent("queue", entry);
  });
  const offDocker = onDockerEvent((entry) => {
    broadcastChannelEvent("docker", entry);
  });
  const offRedis = onRedisEvent((entry) => {
    broadcastChannelEvent("redis", entry);
  });
  const offApiMetrics = onApiMetricsEvent((entry) => {
    broadcastChannelEvent("api-metrics", entry);
  });

  const heartbeat = setInterval(() => {
    const now = Date.now();
    for (const [socket, state] of clients) {
      if (now - state.lastSeenAt > 70_000) {
        try {
          socket.close();
        } catch {
          // ignore
        }
        continue;
      }
      safeSend(socket, { type: "pong", ts: new Date().toISOString() });
    }
  }, 30_000);

  const snapshotInterval = setInterval(() => {
    for (const [socket, state] of clients) {
      for (const channel of state.subscriptions.keys()) {
        if (channel === "logs" || channel === "errors" || channel === "queue") continue;
        sendSnapshot(socket, channel, state.subscriptions.get(channel)?.filters);
      }
    }
  }, 10_000);

  app.server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "/", "http://localhost");
    if (url.pathname !== "/ws/admin") return;

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

    const user = db
      .prepare("SELECT id, role, status FROM users WHERE id = ? LIMIT 1")
      .get(userId) as { id: string; role: string; status: string } | undefined;
    if (!user || user.status !== "approved" || user.role !== "admin") {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      clients.set(ws, {
        userId: user.id,
        subscriptions: new Map(),
        lastSeenAt: Date.now(),
        windowStartAt: Date.now(),
        messagesInWindow: 0
      });
      setWsConnectedClients("admin", clients.size);

      ws.on("close", () => {
        clients.delete(ws);
        setWsConnectedClients("admin", clients.size);
      });
      ws.on("error", () => {
        clients.delete(ws);
        setWsConnectedClients("admin", clients.size);
      });
      ws.on("message", (buffer) => {
        recordWsMessage();
        const state = clients.get(ws);
        if (!state) return;

        const now = Date.now();
        state.lastSeenAt = now;
        if (now - state.windowStartAt > controlRateWindowMs) {
          state.windowStartAt = now;
          state.messagesInWindow = 0;
        }
        state.messagesInWindow += 1;
        if (state.messagesInWindow > controlRateMaxMessages) {
          sendError(ws, "Rate limit exceeded.");
          return;
        }

        const message = parseClientMessage(String(buffer));
        if (!message) {
          sendError(ws, "Invalid payload.");
          return;
        }

        if (message.type === "ping") {
          safeSend(ws, { type: "pong", ts: new Date().toISOString() });
          return;
        }

        if (!isChannel(message.channel)) {
          sendError(ws, "Invalid channel.");
          return;
        }

        if (message.type === "subscribe") {
          state.subscriptions.set(message.channel, {
            filters: message.filters ?? {}
          });
          clients.set(ws, state);
          sendSnapshot(ws, message.channel, message.filters ?? {});
          return;
        }

        if (message.type === "unsubscribe") {
          state.subscriptions.delete(message.channel);
          clients.set(ws, state);
          return;
        }
      });
    });
  });

  return {
    close: () => {
      clearInterval(heartbeat);
      clearInterval(snapshotInterval);
      offLogs();
      offErrors();
      offQueue();
      offDocker();
      offRedis();
      offApiMetrics();
      for (const ws of clients.keys()) {
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
      clients.clear();
      setWsConnectedClients("admin", 0);
      wss.close();
    }
  };
};
