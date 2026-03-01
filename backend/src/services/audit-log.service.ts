// engineered by Maro Elias Goth
import { randomUUID } from "node:crypto";
import { db, nowIso } from "../db/database.js";

type AuditLogInput = {
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  actor_username: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  target_type: string | null;
  target_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata_json: string | null;
  timestamp: string;
  created_at: string;
};

export const writeAuditLog = (input: AuditLogInput) => {
  const ts = nowIso();
  db.prepare(
    `INSERT INTO audit_logs (
      id, actor_user_id, action, entity_type, entity_id, target_type, target_id, ip_address, user_agent, metadata_json, timestamp, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    input.actorUserId ?? null,
    input.action,
    input.entityType ?? input.targetType ?? null,
    input.entityId ?? input.targetId ?? null,
    input.targetType ?? null,
    input.targetId ?? null,
    input.ipAddress ?? null,
    input.userAgent ?? null,
    input.metadata ? JSON.stringify(input.metadata) : null,
    ts,
    ts
  );
};

export const listAuditLogs = (options?: {
  page?: number;
  pageSize?: number;
  user?: string | null;
  action?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string | null;
}) => {
  const page = Math.max(1, Number(options?.page ?? 1));
  const pageSize = Math.max(1, Math.min(100, Number(options?.pageSize ?? 20)));
  const offset = (page - 1) * pageSize;
  const where: string[] = [];
  const params: unknown[] = [];

  const user = String(options?.user ?? "").trim().toLowerCase();
  const action = String(options?.action ?? "").trim().toLowerCase();
  const dateFrom = String(options?.dateFrom ?? "").trim();
  const dateTo = String(options?.dateTo ?? "").trim();
  const search = String(options?.search ?? "").trim().toLowerCase();

  if (user) {
    where.push("LOWER(COALESCE(u.email, '')) LIKE ?");
    params.push(`%${user}%`);
  }
  if (action) {
    where.push("LOWER(a.action) LIKE ?");
    params.push(`%${action}%`);
  }
  if (dateFrom) {
    where.push("a.created_at >= ?");
    params.push(dateFrom);
  }
  if (dateTo) {
    where.push("a.created_at <= ?");
    params.push(dateTo);
  }
  if (search) {
    where.push(
      "(LOWER(a.action) LIKE ? OR LOWER(COALESCE(a.target_type, '')) LIKE ? OR LOWER(COALESCE(a.target_id, '')) LIKE ? OR LOWER(COALESCE(a.metadata_json, '')) LIKE ?)"
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_user_id
       ${whereSql}`
    )
    .get(...params) as { count: number };

  const rows = db
    .prepare(
      `SELECT
         a.id,
         a.actor_user_id,
         u.email as actor_username,
         a.action,
         a.entity_type,
         a.entity_id,
         a.target_type,
         a.target_id,
         a.ip_address,
         a.user_agent,
         a.metadata_json,
         COALESCE(a.timestamp, a.created_at) as timestamp,
         a.created_at
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_user_id
       ${whereSql}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset) as AuditLogRow[];

  return {
    page,
    pageSize,
    total: Number(totalRow?.count ?? 0),
    items: rows.map((row) => {
      let metadata: Record<string, unknown> | null = null;
      if (row.metadata_json) {
        try {
          metadata = JSON.parse(row.metadata_json) as Record<string, unknown>;
        } catch {
          metadata = null;
        }
      }
      return {
        id: row.id,
        user: row.actor_username,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        target_type: row.target_type,
        target_id: row.target_id,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        metadata,
        timestamp: row.timestamp ?? row.created_at,
        created_at: row.created_at
      };
    })
  };
};
