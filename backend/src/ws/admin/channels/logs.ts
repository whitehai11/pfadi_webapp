// engineered by Maro Elias Goth
import type { LogLevel } from "../../../services/admin-stream.service.js";
import { getRecentAdminLogs, onAdminLog } from "../../../services/admin-stream.service.js";
import type { AdminWsChannel } from "../types.js";

export type LogsFilter = {
  levels: LogLevel[];
};

const allowedLevels: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];

const normalizeLevels = (input: unknown): LogLevel[] => {
  if (!Array.isArray(input)) return ["info", "warn", "error", "fatal"];
  const normalized = input
    .map((value) => String(value).toLowerCase())
    .filter((value): value is LogLevel => allowedLevels.includes(value as LogLevel));
  if (normalized.length === 0) return ["info", "warn", "error", "fatal"];
  return Array.from(new Set(normalized));
};

export const normalizeLogsFilter = (filters: Record<string, unknown> | undefined): LogsFilter => {
  return {
    levels: normalizeLevels(filters?.level ?? filters?.levels)
  };
};

export const logsChannelId: AdminWsChannel = "logs";

export const getLogsSnapshot = (filters: LogsFilter) => {
  const minLevel = filters.levels.includes("trace")
    ? "trace"
    : filters.levels.includes("debug")
      ? "debug"
      : filters.levels.includes("info")
        ? "info"
        : filters.levels.includes("warn")
          ? "warn"
          : filters.levels.includes("error")
            ? "error"
            : "fatal";
  const items = getRecentAdminLogs({ minLevel, limit: 200 }).filter((entry) => filters.levels.includes(entry.level));
  return {
    items: items.map((entry) => ({
      ts: entry.ts,
      level: entry.level,
      msg: entry.msg,
      context: entry.context ?? null
    }))
  };
};

export const onLogsEvent = (
  callback: (entry: { ts: string; level: string; msg: string; context?: Record<string, unknown> }) => void
) => {
  return onAdminLog((entry) => {
    callback({
      ts: entry.ts,
      level: entry.level,
      msg: entry.msg,
      context: entry.context
    });
  });
};
