// engineered by Maro Elias Goth
import { EventEmitter } from "node:events";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type AdminStreamLog = {
  ts: string;
  level: LogLevel;
  msg: string;
  context?: Record<string, unknown>;
};

export type AdminStreamError = Record<string, unknown>;
export type AdminStreamQueue = Record<string, unknown>;
export type AdminStreamDocker = Record<string, unknown>;
export type AdminStreamRedis = Record<string, unknown>;
export type AdminStreamApiMetrics = Record<string, unknown>;

type AdminStreamEvents = {
  log: (entry: AdminStreamLog) => void;
  error: (entry: AdminStreamError) => void;
  queue: (entry: AdminStreamQueue) => void;
  docker: (entry: AdminStreamDocker) => void;
  redis: (entry: AdminStreamRedis) => void;
  "api-metrics": (entry: AdminStreamApiMetrics) => void;
};

const emitter = new EventEmitter();
const logBuffer: AdminStreamLog[] = [];
const errorBuffer: AdminStreamError[] = [];
const queueBuffer: AdminStreamQueue[] = [];
const dockerBuffer: AdminStreamDocker[] = [];
const redisBuffer: AdminStreamRedis[] = [];
const apiMetricsBuffer: AdminStreamApiMetrics[] = [];
const maxBuffer = 1000;
let currentSecond = Math.floor(Date.now() / 1000);
let emittedThisSecond = 0;
const maxPerSecond = 300;

const severityRank: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
};

const shouldEmit = () => {
  const sec = Math.floor(Date.now() / 1000);
  if (sec !== currentSecond) {
    currentSecond = sec;
    emittedThisSecond = 0;
  }
  if (emittedThisSecond >= maxPerSecond) return false;
  emittedThisSecond += 1;
  return true;
};

export const publishAdminLog = (entry: AdminStreamLog) => {
  logBuffer.push(entry);
  if (logBuffer.length > maxBuffer) {
    logBuffer.splice(0, logBuffer.length - maxBuffer);
  }
  if (!shouldEmit()) return;
  emitter.emit("log", entry);
};

export const publishAdminError = (entry: Record<string, unknown>) => {
  errorBuffer.push(entry);
  if (errorBuffer.length > maxBuffer) {
    errorBuffer.splice(0, errorBuffer.length - maxBuffer);
  }
  emitter.emit("error", entry);
};

export const publishAdminQueue = (entry: Record<string, unknown>) => {
  queueBuffer.push(entry);
  if (queueBuffer.length > maxBuffer) {
    queueBuffer.splice(0, queueBuffer.length - maxBuffer);
  }
  emitter.emit("queue", entry);
};

export const publishAdminDocker = (entry: AdminStreamDocker) => {
  dockerBuffer.push(entry);
  if (dockerBuffer.length > maxBuffer) {
    dockerBuffer.splice(0, dockerBuffer.length - maxBuffer);
  }
  emitter.emit("docker", entry);
};

export const publishAdminRedis = (entry: AdminStreamRedis) => {
  redisBuffer.push(entry);
  if (redisBuffer.length > maxBuffer) {
    redisBuffer.splice(0, redisBuffer.length - maxBuffer);
  }
  emitter.emit("redis", entry);
};

export const publishAdminApiMetrics = (entry: AdminStreamApiMetrics) => {
  apiMetricsBuffer.push(entry);
  if (apiMetricsBuffer.length > maxBuffer) {
    apiMetricsBuffer.splice(0, apiMetricsBuffer.length - maxBuffer);
  }
  emitter.emit("api-metrics", entry);
};

export const getRecentAdminLogs = (options?: { minLevel?: LogLevel; limit?: number }) => {
  const limit = Math.max(1, Math.min(500, Number(options?.limit ?? 150)));
  const minLevel = options?.minLevel ?? "trace";
  const minRank = severityRank[minLevel];
  const filtered = logBuffer.filter((entry) => severityRank[entry.level] >= minRank);
  return filtered.slice(-limit);
};

export const getRecentAdminErrors = (limit = 100) => {
  const safeLimit = Math.max(1, Math.min(500, Number(limit)));
  return errorBuffer.slice(-safeLimit);
};

export const getRecentAdminQueue = (limit = 100) => {
  const safeLimit = Math.max(1, Math.min(500, Number(limit)));
  return queueBuffer.slice(-safeLimit);
};

export const getRecentAdminDocker = (limit = 30) => {
  const safeLimit = Math.max(1, Math.min(200, Number(limit)));
  return dockerBuffer.slice(-safeLimit);
};

export const getRecentAdminRedis = (limit = 30) => {
  const safeLimit = Math.max(1, Math.min(200, Number(limit)));
  return redisBuffer.slice(-safeLimit);
};

export const getRecentAdminApiMetrics = (limit = 30) => {
  const safeLimit = Math.max(1, Math.min(200, Number(limit)));
  return apiMetricsBuffer.slice(-safeLimit);
};

export const onAdminLog = (listener: AdminStreamEvents["log"]) => {
  emitter.on("log", listener);
  return () => emitter.off("log", listener);
};

export const onAdminError = (listener: AdminStreamEvents["error"]) => {
  emitter.on("error", listener);
  return () => emitter.off("error", listener);
};

export const onAdminQueue = (listener: AdminStreamEvents["queue"]) => {
  emitter.on("queue", listener);
  return () => emitter.off("queue", listener);
};

export const onAdminDocker = (listener: AdminStreamEvents["docker"]) => {
  emitter.on("docker", listener);
  return () => emitter.off("docker", listener);
};

export const onAdminRedis = (listener: AdminStreamEvents["redis"]) => {
  emitter.on("redis", listener);
  return () => emitter.off("redis", listener);
};

export const onAdminApiMetrics = (listener: AdminStreamEvents["api-metrics"]) => {
  emitter.on("api-metrics", listener);
  return () => emitter.off("api-metrics", listener);
};
