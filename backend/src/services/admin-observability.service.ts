// engineered by Maro Elias Goth
import { randomUUID } from "node:crypto";
import { db, nowIso } from "../db/database.js";
import { getJobDashboard } from "./admin-monitor.service.js";
import { publishAdminApiMetrics, publishAdminError, publishAdminRedis } from "./admin-stream.service.js";

export const recordApiMetric = (input: {
  endpoint: string;
  method: string;
  responseTimeMs: number;
  statusCode: number;
}) => {
  const endpoint = String(input.endpoint || "").slice(0, 240) || "/";
  const method = String(input.method || "GET").slice(0, 16);
  const responseTimeMs = Math.max(0, Math.round(Number(input.responseTimeMs) || 0));
  const statusCode = Math.max(100, Math.min(599, Math.round(Number(input.statusCode) || 500)));

  db.prepare(
    `INSERT INTO request_metrics (id, endpoint, method, response_time_ms, status_code, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), endpoint, method, responseTimeMs, statusCode, nowIso());

  publishAdminApiMetrics({
    endpoint,
    method,
    responseTimeMs,
    statusCode,
    ts: nowIso()
  });
};

export const getApiHeatmap = () => {
  const rows = db
    .prepare(
      `SELECT
         endpoint,
         method,
         COUNT(*) as total_requests,
         AVG(response_time_ms) as avg_response_time,
         SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
         COUNT(*) / 60.0 as requests_per_minute
       FROM request_metrics
       WHERE timestamp >= datetime('now', '-60 minutes')
       GROUP BY endpoint, method
       ORDER BY total_requests DESC`
    )
    .all() as Array<{
    endpoint: string;
    method: string;
    total_requests: number;
    avg_response_time: number;
    error_count: number;
    requests_per_minute: number;
  }>;

  return rows.map((row) => {
    const total = Number(row.total_requests ?? 0);
    const errors = Number(row.error_count ?? 0);
    return {
      endpoint: row.endpoint,
      method: row.method,
      totalRequests: total,
      avgResponseTime: Number(row.avg_response_time ?? 0),
      errorRate: total > 0 ? Number(((errors / total) * 100).toFixed(2)) : 0,
      requestsPerMinute: Number(row.requests_per_minute ?? 0)
    };
  });
};

export const recordSystemError = (input: {
  message: string;
  stack?: string | null;
  route?: string | null;
  userId?: string | null;
  severity?: "error" | "fatal" | "warn";
}) => {
  const severity = input.severity ?? "error";
  const ts = nowIso();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO errors (id, message, stack, route, user_id, severity, resolved, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(
    id,
    String(input.message || "Unknown error").slice(0, 2000),
    input.stack ? String(input.stack).slice(0, 12000) : null,
    input.route ? String(input.route).slice(0, 500) : null,
    input.userId ?? null,
    severity,
    ts
  );
  publishAdminError({
    id,
    message: String(input.message || "Unknown error"),
    route: input.route ?? null,
    user_id: input.userId ?? null,
    severity,
    timestamp: ts
  });
  return {
    id,
    message: String(input.message || "Unknown error"),
    stack: input.stack ?? null,
    route: input.route ?? null,
    user_id: input.userId ?? null,
    severity,
    timestamp: ts,
    resolved: false
  };
};

export const listSystemErrors = (options?: {
  page?: number;
  pageSize?: number;
  severity?: string | null;
  resolved?: string | null;
}) => {
  const page = Math.max(1, Number(options?.page ?? 1));
  const pageSize = Math.max(1, Math.min(100, Number(options?.pageSize ?? 25)));
  const offset = (page - 1) * pageSize;
  const where: string[] = [];
  const params: unknown[] = [];

  const severity = String(options?.severity ?? "").trim().toLowerCase();
  const resolved = String(options?.resolved ?? "").trim().toLowerCase();
  if (severity) {
    where.push("LOWER(severity) = ?");
    params.push(severity);
  }
  if (resolved === "true" || resolved === "false") {
    where.push("resolved = ?");
    params.push(resolved === "true" ? 1 : 0);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = db
    .prepare(`SELECT COUNT(*) as count FROM errors ${whereSql}`)
    .get(...params) as { count: number };

  const rows = db
    .prepare(
      `SELECT id, message, stack, route, user_id, severity, resolved, timestamp
       FROM errors
       ${whereSql}
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset);

  return {
    page,
    pageSize,
    total: Number(totalRow?.count ?? 0),
    items: rows
  };
};

export const resolveSystemError = (id: string) => {
  const result = db.prepare("UPDATE errors SET resolved = 1 WHERE id = ?").run(id);
  return result.changes > 0;
};

export const getQueueMonitor = () => {
  const jobs = getJobDashboard();
  const active = jobs.filter((job) => job.running).length;
  const failed = jobs.filter((job) => job.last_status === "failed").length;
  const completed = jobs.filter((job) => job.last_status === "success").length;
  const pending = jobs.filter((job) => !job.last_run).length;
  const avgProcessingTime =
    jobs.length > 0
      ? jobs.reduce((sum, job) => sum + Number(job.last_duration_ms ?? 0), 0) / jobs.length
      : 0;
  return {
    activeJobs: active,
    pendingJobs: pending,
    failedJobs: failed,
    completedJobs: completed,
    avgProcessingTime: Number(avgProcessingTime.toFixed(2)),
    retries: 0,
    jobs
  };
};

export const getRedisMonitor = () => {
  const configured = Boolean(process.env.REDIS_URL);
  const payload = {
    connected: false,
    configured,
    memoryUsage: null,
    keyCount: null,
    uptimeSeconds: null,
    connectedClients: null,
    slowlogCount: null,
    message: configured ? "Redis client is not wired in this runtime." : "Redis is not configured."
  };
  publishAdminRedis(payload as unknown as Record<string, unknown>);
  return payload;
};
