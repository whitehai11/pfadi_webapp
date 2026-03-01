// engineered by Maro Elias Goth
import { WebSocket, WebSocketServer } from "ws";
import type { FastifyInstance } from "fastify";
import type { IncomingMessage } from "node:http";
import { URL } from "node:url";
import { db } from "../db/database.js";
import { getRecentAdminLogs, onAdminError, onAdminLog, onAdminQueue, type LogLevel } from "../services/admin-stream.service.js";

type ClientState = {
  userId: string;
  paused: boolean;
  minLevel: LogLevel;
};

type LogEnvelope = {
  event: "logs:batch";
  data: {
    items: Array<{ ts: string; level: string; msg: string; context?: Record<string, unknown> }>;
  };
};

type GenericEnvelope = {
  event: "errors:new" | "queue:update";
  data: Record<string, unknown>;
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

const severityRank: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
};

const parseClientMessage = (raw: string) => {
  try {
    const parsed = JSON.parse(raw) as { event?: string; data?: Record<string, unknown> };
    return parsed;
  } catch {
    return null;
  }
};

export const setupAdminMonitorGateway = (app: FastifyInstance) => {
  const wss = new WebSocketServer({ noServer: true });
  const states = new Map<WebSocket, ClientState>();

  const send = (socket: WebSocket, payload: LogEnvelope | GenericEnvelope) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
  };

  const detach = (socket: WebSocket) => {
    states.delete(socket);
  };

  const broadcastLog = (entry: { ts: string; level: string; msg: string; context?: Record<string, unknown> }) => {
    for (const [socket, state] of states) {
      if (state.paused) continue;
      const level = entry.level as LogLevel;
      if ((severityRank[level] ?? 0) < severityRank[state.minLevel]) continue;
      send(socket, { event: "logs:batch", data: { items: [entry] } });
    }
  };

  const broadcastGeneric = (event: "errors:new" | "queue:update", data: Record<string, unknown>) => {
    for (const socket of states.keys()) {
      send(socket, { event, data });
    }
  };

  const offLog = onAdminLog((entry) => {
    broadcastLog(entry);
  });
  const offError = onAdminError((entry) => {
    broadcastGeneric("errors:new", entry);
  });
  const offQueue = onAdminQueue((entry) => {
    broadcastGeneric("queue:update", entry);
  });

  app.server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "/", "http://localhost");
    if (url.pathname !== "/ws/admin-monitor") return;

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
      states.set(ws, {
        userId: user.id,
        paused: false,
        minLevel: "info"
      });

      send(ws, {
        event: "logs:batch",
        data: { items: getRecentAdminLogs({ minLevel: "info", limit: 150 }) }
      });

      ws.on("close", () => detach(ws));
      ws.on("error", () => detach(ws));
      ws.on("message", (buffer) => {
        const state = states.get(ws);
        if (!state) return;
        const envelope = parseClientMessage(String(buffer));
        if (!envelope) return;
        if (envelope.event === "logs:config") {
          const paused = Boolean(envelope.data?.paused);
          const level = String(envelope.data?.level ?? "info") as LogLevel;
          const allowed: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
          state.paused = paused;
          state.minLevel = allowed.includes(level) ? level : "info";
          states.set(ws, state);
        }
      });
    });
  });

  return {
    close: () => {
      offLog();
      offError();
      offQueue();
      for (const ws of states.keys()) {
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
      states.clear();
      wss.close();
    }
  };
};
