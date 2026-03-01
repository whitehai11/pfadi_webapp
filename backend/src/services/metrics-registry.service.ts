// engineered by Maro Elias Goth
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db, nowIso } from "../db/database.js";
import { settings } from "../config/settings.js";
import { getQueueMonitor, getRedisMonitor } from "./admin-observability.service.js";
import { getDbHealth } from "./admin-system.service.js";

type MetricPoint = {
  ts: number;
  value: number;
};

type RequestTrace = {
  id: string;
  ts: number;
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
  userId: string | null;
  ip: string | null;
};

type WsEvent = {
  ts: number;
  dropped: boolean;
};

export type AlertOperator = "gt" | "lt";

export type AlertThreshold = {
  id: string;
  name: string;
  metric: string;
  operator: AlertOperator;
  threshold: number;
  window_seconds: number;
  is_active: number;
  last_triggered_at: string | null;
  last_value: number | null;
  created_at: string;
  updated_at: string;
};

const MAX_POINTS_PER_METRIC = 2880;
const MAX_TRACES = 3000;
const API_WINDOW_MS = 5 * 60 * 1000;
const WS_WINDOW_MS = 60 * 1000;

const timeseries = new Map<string, MetricPoint[]>();
const requestTraceBuffer: RequestTrace[] = [];
const wsEvents: WsEvent[] = [];
const wsConnections = new Map<string, number>();
let queueRetries = 0;
let samplerHandle: NodeJS.Timeout | null = null;
const queueExecutions: Array<{ ts: number; success: boolean }> = [];

const toNumber = (value: unknown, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const percentile = (values: number[], targetPercentile: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((targetPercentile / 100) * sorted.length) - 1));
  return sorted[index] ?? 0;
};

const parseRangeMs = (value: string | undefined) => {
  const raw = String(value ?? "1h").trim().toLowerCase();
  const match = raw.match(/^(\d+)(m|h|d)$/);
  if (!match) return 60 * 60 * 1000;
  const amount = Math.max(1, Number(match[1]));
  const unit = match[2];
  if (unit === "m") return amount * 60 * 1000;
  if (unit === "h") return amount * 60 * 60 * 1000;
  return amount * 24 * 60 * 60 * 1000;
};

const addPoint = (metric: string, value: number, ts = Date.now()) => {
  const key = metric.trim();
  if (!key) return;
  const points = timeseries.get(key) ?? [];
  points.push({ ts, value });
  if (points.length > MAX_POINTS_PER_METRIC) {
    points.splice(0, points.length - MAX_POINTS_PER_METRIC);
  }
  timeseries.set(key, points);
};

const getLatestPoint = (metric: string) => {
  const points = timeseries.get(metric);
  if (!points || points.length === 0) return null;
  return points[points.length - 1] ?? null;
};

const getPointsInRange = (metric: string, rangeMs: number) => {
  const points = timeseries.get(metric) ?? [];
  const cutoff = Date.now() - rangeMs;
  return points.filter((point) => point.ts >= cutoff);
};

const getDiskStats = () => {
  let diskTotalMb = 0;
  let diskUsedMb = 0;
  try {
    if (typeof fs.statfsSync === "function") {
      const stat = fs.statfsSync(path.resolve(settings.databasePath));
      const blockSize = toNumber((stat as unknown as { bsize?: number }).bsize, 0);
      const blocks = toNumber((stat as unknown as { blocks?: number }).blocks, 0);
      const blocksFree = toNumber((stat as unknown as { bfree?: number }).bfree, 0);
      if (blockSize > 0 && blocks > 0) {
        const totalBytes = blocks * blockSize;
        const freeBytes = blocksFree * blockSize;
        const usedBytes = Math.max(0, totalBytes - freeBytes);
        diskTotalMb = Number((totalBytes / (1024 * 1024)).toFixed(2));
        diskUsedMb = Number((usedBytes / (1024 * 1024)).toFixed(2));
      }
    }
  } catch {
    diskTotalMb = 0;
    diskUsedMb = 0;
  }
  return { diskTotalMb, diskUsedMb };
};

const evaluateAlertsForMetric = (metric: string, value: number) => {
  const rows = db
    .prepare(
      "SELECT id, name, metric, operator, threshold, window_seconds, is_active, last_triggered_at, last_value, created_at, updated_at FROM alert_thresholds WHERE is_active = 1 AND metric = ?"
    )
    .all(metric) as AlertThreshold[];
  if (rows.length === 0) return;

  const now = nowIso();
  for (const row of rows) {
    const operator = row.operator === "lt" ? "lt" : "gt";
    const triggered = operator === "gt" ? value > row.threshold : value < row.threshold;
    if (!triggered) continue;

    const lastTriggeredAt = row.last_triggered_at ? new Date(row.last_triggered_at).getTime() : 0;
    const cooldownMs = Math.max(30, Number(row.window_seconds || 300)) * 1000;
    if (lastTriggeredAt > 0 && Date.now() - lastTriggeredAt < cooldownMs) continue;

    db.prepare("UPDATE alert_thresholds SET last_triggered_at = ?, last_value = ?, updated_at = ? WHERE id = ?").run(
      now,
      Number(value.toFixed(4)),
      now,
      row.id
    );
  }
};

const sampleApiAggregates = () => {
  const cutoff = Date.now() - API_WINDOW_MS;
  const recent = requestTraceBuffer.filter((item) => item.ts >= cutoff);
  if (recent.length === 0) {
    addPoint("api.requests_per_min", 0);
    addPoint("api.error_rate", 0);
    addPoint("api.p95_latency_ms", 0);
    return;
  }
  const perMinute = recent.length / 5;
  const errors = recent.filter((item) => item.statusCode >= 400).length;
  const durations = recent.map((item) => item.durationMs);
  const errorRate = (errors / recent.length) * 100;
  const p95 = percentile(durations, 95);

  addPoint("api.requests_per_min", Number(perMinute.toFixed(2)));
  addPoint("api.error_rate", Number(errorRate.toFixed(2)));
  addPoint("api.p95_latency_ms", Number(p95.toFixed(2)));
  evaluateAlertsForMetric("api.error_rate", errorRate);
  evaluateAlertsForMetric("api.p95_latency_ms", p95);
};

const sampleWsAggregates = () => {
  const cutoff = Date.now() - WS_WINDOW_MS;
  while (wsEvents.length > 0 && wsEvents[0] && wsEvents[0].ts < cutoff) {
    wsEvents.shift();
  }
  const events = wsEvents.length;
  const dropped = wsEvents.filter((event) => event.dropped).length;
  const connected = Array.from(wsConnections.values()).reduce((sum, value) => sum + Math.max(0, value), 0);

  addPoint("ws.connected_clients", connected);
  addPoint("ws.messages_per_sec", Number((events / 60).toFixed(3)));
  addPoint("ws.dropped_messages", dropped);
  evaluateAlertsForMetric("ws.dropped_messages", dropped);
};

const sampleSystem = () => {
  const uptime = process.uptime();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = Math.max(0, totalMem - freeMem);
  const load = os.loadavg()[0] ?? 0;
  const { diskTotalMb, diskUsedMb } = getDiskStats();

  addPoint("system.cpu_load_1m", Number(load.toFixed(3)));
  addPoint("system.ram_used_mb", Number((usedMem / (1024 * 1024)).toFixed(2)));
  addPoint("system.ram_total_mb", Number((totalMem / (1024 * 1024)).toFixed(2)));
  addPoint("system.disk_used_mb", diskUsedMb);
  addPoint("system.disk_total_mb", diskTotalMb);
  addPoint("system.uptime_sec", Number(uptime.toFixed(0)));
};

const sampleDb = () => {
  const health = getDbHealth();
  const slowQueries = toNumber(health.slowQueryCount, 0);
  const poolUsage = toNumber(health.activeConnections, 1);

  addPoint("db.pool_usage", poolUsage);
  addPoint("db.slow_queries", slowQueries);
  evaluateAlertsForMetric("db.slow_queries", slowQueries);
};

const sampleQueue = () => {
  const queue = getQueueMonitor();
  const cutoff = Date.now() - API_WINDOW_MS;
  while (queueExecutions.length > 0 && queueExecutions[0] && queueExecutions[0].ts < cutoff) {
    queueExecutions.shift();
  }
  const throughput = Number((queueExecutions.length / 5).toFixed(2));
  const retries = queueRetries;
  const deadLetter = toNumber(queue.failedJobs, 0);

  addPoint("queue.throughput", throughput);
  addPoint("queue.retries", retries);
  addPoint("queue.dead_letter_count", deadLetter);
  evaluateAlertsForMetric("queue.dead_letter_count", deadLetter);
};

const sampleRedis = () => {
  const redis = getRedisMonitor() as {
    memoryUsage: number | null;
    keyCount: number | null;
    slowlogCount: number | null;
  };
  const memory = toNumber(redis.memoryUsage, 0);
  const hitRatio = 0;
  const evictions = toNumber(redis.slowlogCount, 0);
  const keys = toNumber(redis.keyCount, 0);

  addPoint("redis.memory_mb", memory);
  addPoint("redis.hit_ratio", hitRatio);
  addPoint("redis.evictions", evictions);
  addPoint("redis.keys", keys);
};

export const startMetricsSamplers = () => {
  if (samplerHandle) return { stop: () => stopMetricsSamplers() };
  try {
    sampleApiAggregates();
    sampleWsAggregates();
    sampleSystem();
    sampleDb();
    sampleQueue();
    sampleRedis();
  } catch {
    // best effort sampler
  }
  samplerHandle = setInterval(() => {
    try {
      sampleApiAggregates();
      sampleWsAggregates();
      sampleSystem();
      sampleDb();
      sampleQueue();
      sampleRedis();
    } catch {
      // best effort sampler
    }
  }, 15_000);
  return {
    stop: () => stopMetricsSamplers()
  };
};

export const stopMetricsSamplers = () => {
  if (!samplerHandle) return;
  clearInterval(samplerHandle);
  samplerHandle = null;
};

export const recordRequestMetric = (input: {
  route: string;
  method: string;
  statusCode: number;
  durationMs: number;
  requestId: string;
  userId?: string | null;
  ip?: string | null;
}) => {
  const route = String(input.route || "/").slice(0, 240);
  const method = String(input.method || "GET").toUpperCase().slice(0, 12);
  const statusCode = Math.max(100, Math.min(599, Math.trunc(input.statusCode || 500)));
  const durationMs = Math.max(0, Number(input.durationMs || 0));
  requestTraceBuffer.push({
    id: String(input.requestId || randomUUID()),
    ts: Date.now(),
    method,
    route,
    statusCode,
    durationMs,
    userId: input.userId ?? null,
    ip: input.ip ?? null
  });
  if (requestTraceBuffer.length > MAX_TRACES) {
    requestTraceBuffer.splice(0, requestTraceBuffer.length - MAX_TRACES);
  }
};

export const setWsConnectedClients = (source: string, count: number) => {
  wsConnections.set(source, Math.max(0, Math.trunc(count)));
};

export const recordWsMessage = (input?: { dropped?: boolean }) => {
  wsEvents.push({
    ts: Date.now(),
    dropped: Boolean(input?.dropped)
  });
  if (wsEvents.length > 50_000) {
    wsEvents.splice(0, wsEvents.length - 50_000);
  }
};

export const recordQueueRetry = () => {
  queueRetries += 1;
};

export const recordQueueExecution = (success: boolean) => {
  queueExecutions.push({ ts: Date.now(), success });
  if (queueExecutions.length > 20_000) {
    queueExecutions.splice(0, queueExecutions.length - 20_000);
  }
};

export const getMetricsSummary = () => {
  const cutoff = Date.now() - API_WINDOW_MS;
  const recent = requestTraceBuffer.filter((item) => item.ts >= cutoff);
  const byRoute = new Map<
    string,
    {
      requests: number;
      errors: number;
      durations: number[];
    }
  >();

  for (const trace of recent) {
    const key = `${trace.method} ${trace.route}`;
    const existing = byRoute.get(key) ?? { requests: 0, errors: 0, durations: [] };
    existing.requests += 1;
    if (trace.statusCode >= 400) existing.errors += 1;
    existing.durations.push(trace.durationMs);
    byRoute.set(key, existing);
  }

  const apiRoutes = Array.from(byRoute.entries()).map(([route, value]) => ({
    route,
    requestCount: value.requests,
    p95LatencyMs: Number(percentile(value.durations, 95).toFixed(2)),
    errorRate: value.requests > 0 ? Number(((value.errors / value.requests) * 100).toFixed(2)) : 0
  }));

  const wsConnected = getLatestPoint("ws.connected_clients")?.value ?? 0;
  const wsMessagesPerSec = getLatestPoint("ws.messages_per_sec")?.value ?? 0;
  const wsDropped = getLatestPoint("ws.dropped_messages")?.value ?? 0;
  const dbPool = getLatestPoint("db.pool_usage")?.value ?? 0;
  const dbSlow = getLatestPoint("db.slow_queries")?.value ?? 0;
  const queueThroughput = getLatestPoint("queue.throughput")?.value ?? 0;
  const queueRetry = getLatestPoint("queue.retries")?.value ?? 0;
  const queueDeadLetter = getLatestPoint("queue.dead_letter_count")?.value ?? 0;
  const redisMemory = getLatestPoint("redis.memory_mb")?.value ?? 0;
  const redisHitRatio = getLatestPoint("redis.hit_ratio")?.value ?? 0;
  const redisEvictions = getLatestPoint("redis.evictions")?.value ?? 0;
  const systemCpu = getLatestPoint("system.cpu_load_1m")?.value ?? 0;
  const systemRamUsed = getLatestPoint("system.ram_used_mb")?.value ?? 0;
  const systemRamTotal = getLatestPoint("system.ram_total_mb")?.value ?? 0;
  const systemDiskUsed = getLatestPoint("system.disk_used_mb")?.value ?? 0;
  const systemDiskTotal = getLatestPoint("system.disk_total_mb")?.value ?? 0;
  const systemUptime = getLatestPoint("system.uptime_sec")?.value ?? process.uptime();

  return {
    generatedAt: nowIso(),
    api: {
      requestCount: recent.length,
      p95LatencyMs: Number(percentile(recent.map((item) => item.durationMs), 95).toFixed(2)),
      errorRate: recent.length > 0 ? Number(((recent.filter((item) => item.statusCode >= 400).length / recent.length) * 100).toFixed(2)) : 0,
      byRoute: apiRoutes.sort((a, b) => b.requestCount - a.requestCount).slice(0, 30)
    },
    ws: {
      connectedClients: Number(wsConnected.toFixed(2)),
      messagesPerSec: Number(wsMessagesPerSec.toFixed(3)),
      droppedMessages: Number(wsDropped.toFixed(2))
    },
    db: {
      poolUsage: Number(dbPool.toFixed(2)),
      slowQueries: Number(dbSlow.toFixed(2)),
      migrationStatus: getDbHealth().migrationVersion
    },
    queue: {
      throughput: Number(queueThroughput.toFixed(2)),
      retries: Number(queueRetry.toFixed(2)),
      deadLetterCount: Number(queueDeadLetter.toFixed(2))
    },
    redis: {
      memoryMb: Number(redisMemory.toFixed(2)),
      hitRatio: Number(redisHitRatio.toFixed(2)),
      evictions: Number(redisEvictions.toFixed(2))
    },
    system: {
      cpuLoad1m: Number(systemCpu.toFixed(3)),
      ramUsedMb: Number(systemRamUsed.toFixed(2)),
      ramTotalMb: Number(systemRamTotal.toFixed(2)),
      diskUsedMb: Number(systemDiskUsed.toFixed(2)),
      diskTotalMb: Number(systemDiskTotal.toFixed(2)),
      uptimeSec: Number(systemUptime.toFixed(0))
    },
    traces: requestTraceBuffer.slice(-100).reverse()
  };
};

export const getMetricTimeseries = (metric: string, range?: string) => {
  const rangeMs = parseRangeMs(range);
  const points = getPointsInRange(metric, rangeMs);
  return {
    metric,
    range: range ?? "1h",
    points: points.map((point) => ({
      ts: new Date(point.ts).toISOString(),
      value: Number(point.value.toFixed(4))
    }))
  };
};

export const listAlerts = () => {
  const rows = db
    .prepare(
      "SELECT id, name, metric, operator, threshold, window_seconds, is_active, last_triggered_at, last_value, created_at, updated_at FROM alert_thresholds ORDER BY created_at DESC"
    )
    .all() as AlertThreshold[];
  return rows;
};

export const createAlert = (input: {
  name: string;
  metric: string;
  operator: AlertOperator;
  threshold: number;
  windowSeconds: number;
  isActive?: boolean;
}) => {
  const now = nowIso();
  const row: AlertThreshold = {
    id: randomUUID(),
    name: input.name.trim(),
    metric: input.metric.trim(),
    operator: input.operator === "lt" ? "lt" : "gt",
    threshold: Number(input.threshold),
    window_seconds: Math.max(30, Math.trunc(input.windowSeconds)),
    is_active: input.isActive === false ? 0 : 1,
    last_triggered_at: null,
    last_value: null,
    created_at: now,
    updated_at: now
  };
  db.prepare(
    "INSERT INTO alert_thresholds (id, name, metric, operator, threshold, window_seconds, is_active, last_triggered_at, last_value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    row.id,
    row.name,
    row.metric,
    row.operator,
    row.threshold,
    row.window_seconds,
    row.is_active,
    row.last_triggered_at,
    row.last_value,
    row.created_at,
    row.updated_at
  );
  return row;
};

export const testAlerts = () => {
  const alerts = listAlerts().filter((alert) => alert.is_active === 1);
  const summary = getMetricsSummary();
  const metricMap: Record<string, number> = {
    "api.error_rate": summary.api.errorRate,
    "api.p95_latency_ms": summary.api.p95LatencyMs,
    "ws.connected_clients": summary.ws.connectedClients,
    "ws.messages_per_sec": summary.ws.messagesPerSec,
    "ws.dropped_messages": summary.ws.droppedMessages,
    "db.pool_usage": summary.db.poolUsage,
    "db.slow_queries": summary.db.slowQueries,
    "queue.throughput": summary.queue.throughput,
    "queue.retries": summary.queue.retries,
    "queue.dead_letter_count": summary.queue.deadLetterCount,
    "redis.memory_mb": summary.redis.memoryMb,
    "redis.hit_ratio": summary.redis.hitRatio,
    "redis.evictions": summary.redis.evictions,
    "system.cpu_load_1m": summary.system.cpuLoad1m,
    "system.ram_used_mb": summary.system.ramUsedMb,
    "system.disk_used_mb": summary.system.diskUsedMb
  };

  const results = alerts.map((alert) => {
    const currentValue = metricMap[alert.metric] ?? getLatestPoint(alert.metric)?.value ?? 0;
    const triggered = alert.operator === "gt" ? currentValue > alert.threshold : currentValue < alert.threshold;
    return {
      id: alert.id,
      name: alert.name,
      metric: alert.metric,
      operator: alert.operator,
      threshold: alert.threshold,
      currentValue: Number(currentValue.toFixed(4)),
      triggered
    };
  });
  return { testedAt: nowIso(), results };
};

export const getMetricsReport = (format: "json" | "csv") => {
  const summary = getMetricsSummary();
  const alerts = listAlerts();
  if (format === "csv") {
    const rows = [
      ["section", "metric", "value"],
      ["api", "requestCount", String(summary.api.requestCount)],
      ["api", "p95LatencyMs", String(summary.api.p95LatencyMs)],
      ["api", "errorRate", String(summary.api.errorRate)],
      ["ws", "connectedClients", String(summary.ws.connectedClients)],
      ["ws", "messagesPerSec", String(summary.ws.messagesPerSec)],
      ["ws", "droppedMessages", String(summary.ws.droppedMessages)],
      ["db", "poolUsage", String(summary.db.poolUsage)],
      ["db", "slowQueries", String(summary.db.slowQueries)],
      ["queue", "throughput", String(summary.queue.throughput)],
      ["queue", "retries", String(summary.queue.retries)],
      ["queue", "deadLetterCount", String(summary.queue.deadLetterCount)],
      ["redis", "memoryMb", String(summary.redis.memoryMb)],
      ["redis", "hitRatio", String(summary.redis.hitRatio)],
      ["redis", "evictions", String(summary.redis.evictions)],
      ["system", "cpuLoad1m", String(summary.system.cpuLoad1m)],
      ["system", "ramUsedMb", String(summary.system.ramUsedMb)],
      ["system", "diskUsedMb", String(summary.system.diskUsedMb)],
      ["system", "uptimeSec", String(summary.system.uptimeSec)],
      ["alerts", "count", String(alerts.length)]
    ];
    return rows.map((row) => row.map((column) => `"${String(column).replace(/"/g, '""')}"`).join(",")).join("\n");
  }
  return JSON.stringify({ generatedAt: nowIso(), summary, alerts }, null, 2);
};
