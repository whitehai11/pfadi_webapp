// engineered by Maro Elias Goth
import fs from "node:fs";
import { db } from "../db/database.js";
import { getSystemVersion } from "./version.service.js";
import type { AdminStats } from "../types/admin-stats.js";

type AggregateRow = {
  total_users: number;
  total_events: number;
  total_chat_messages: number;
  messages_today: number;
};

const hasTable = (tableName: string) => {
  const row = db
    .prepare("SELECT 1 as ok FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
    .get(tableName) as { ok: number } | undefined;
  return Boolean(row?.ok);
};

const getActiveSessionsCount = (nowIso: string) => {
  if (hasTable("sessions")) {
    const row = db
      .prepare("SELECT COUNT(*) as count FROM sessions WHERE expires_at > ?")
      .get(nowIso) as { count: number };
    return Number(row.count ?? 0);
  }

  if (hasTable("auth_refresh_tokens")) {
    const row = db
      .prepare("SELECT COUNT(*) as count FROM auth_refresh_tokens WHERE expires_at > ? AND revoked_at IS NULL")
      .get(nowIso) as { count: number };
    return Number(row.count ?? 0);
  }

  return 0;
};

const getDockerContainerId = () => {
  try {
    if (fs.existsSync("/.dockerenv")) {
      const hostname = fs.readFileSync("/etc/hostname", "utf-8").trim();
      if (/^[a-f0-9]{12,64}$/i.test(hostname)) {
        return hostname;
      }
    }
  } catch {
    // ignore
  }

  try {
    const cgroup = fs.readFileSync("/proc/self/cgroup", "utf-8");
    const match = cgroup.match(/([a-f0-9]{64})/i);
    if (match?.[1]) {
      return match[1].slice(0, 12);
    }
  } catch {
    // ignore
  }

  return null;
};

const utcDayRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString()
  };
};

export const getAdminStats = (): AdminStats => {
  const nowIso = new Date().toISOString();
  const { startIso, endIso } = utcDayRange();

  const aggregate = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM users) as total_users,
         (SELECT COUNT(*) FROM events) as total_events,
         (SELECT COUNT(*) FROM chat_messages) as total_chat_messages,
         (SELECT COUNT(*) FROM chat_messages WHERE created_at >= ? AND created_at < ?) as messages_today`
    )
    .get(startIso, endIso) as AggregateRow;

  const version = getSystemVersion();
  const commit = version?.commit ?? "dev";
  const appVersion = version?.version ?? "dev";

  return {
    totalUsers: Number(aggregate.total_users ?? 0),
    activeSessions: getActiveSessionsCount(nowIso),
    totalEvents: Number(aggregate.total_events ?? 0),
    totalChatMessages: Number(aggregate.total_chat_messages ?? 0),
    messagesToday: Number(aggregate.messages_today ?? 0),
    serverUptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    appVersion,
    gitCommit: commit,
    dockerContainerId: getDockerContainerId()
  };
};
