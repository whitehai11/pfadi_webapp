// engineered by Maro Elias Goth
import { settings } from "../config/settings.js";
import { publishAdminLog } from "../services/admin-stream.service.js";

type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

const severity: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
};

const threshold = severity[settings.logLevel];

const writeLog = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
  if (severity[level] < threshold) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(context ?? {})
  };
  publishAdminLog({
    ts: String(entry.ts),
    level,
    msg: message,
    context
  });
  const line = `${JSON.stringify(entry)}\n`;
  if (level === "error" || level === "fatal") {
    process.stderr.write(line);
    return;
  }
  process.stdout.write(line);
};

export const logger = {
  trace: (message: string, context?: Record<string, unknown>) => writeLog("trace", message, context),
  debug: (message: string, context?: Record<string, unknown>) => writeLog("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => writeLog("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => writeLog("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => writeLog("error", message, context),
  fatal: (message: string, context?: Record<string, unknown>) => writeLog("fatal", message, context)
};
