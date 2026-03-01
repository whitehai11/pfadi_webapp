// engineered by Maro Elias Goth
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { db } from "../db/database.js";
import { settings } from "../config/settings.js";
import { getAdminStats } from "./stats.service.js";
import { getSystemVersion } from "./version.service.js";
import { getJobDashboard, getWsDashboard, sampleCpuUsagePercent } from "./admin-monitor.service.js";

const execAsync = promisify(exec);

const hasTable = (tableName: string) => {
  const row = db
    .prepare("SELECT 1 as ok FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
    .get(tableName) as { ok: number } | undefined;
  return Boolean(row?.ok);
};

export const getAdminSystemMonitor = () => {
  const stats = getAdminStats();
  return {
    cpuUsagePercent: Number(sampleCpuUsagePercent().toFixed(2)),
    memoryUsage: stats.memoryUsage,
    uptimeSeconds: stats.serverUptime,
    activeConnections: getWsDashboard().connectedClients,
    stats
  };
};

export const getAdminJobDashboard = () => getJobDashboard();

export const getAdminDockerStatus = () => {
  const version = getSystemVersion();
  const uptimeSeconds = Math.floor(process.uptime());
  const containerId = String(process.env.HOSTNAME || "").trim() || null;

  return {
    dockerAvailable: fs.existsSync("/.dockerenv"),
    containers: [
      {
        id: containerId,
        name: "pfadi-backend",
        status: "running",
        uptimeSeconds,
        imageVersion: version?.version ?? "dev"
      }
    ]
  };
};

export const restartDockerServices = async () => {
  if (String(process.env.ADMIN_DOCKER_RESTART_ENABLED || "").toLowerCase() !== "true") {
    throw new Error("Docker restart is disabled.");
  }
  const command = String(process.env.ADMIN_DOCKER_RESTART_CMD || "docker compose restart backend frontend nginx");
  const { stdout, stderr } = await execAsync(command, {
    cwd: path.resolve("."),
    timeout: 60_000
  });
  return {
    ok: true,
    stdout: stdout.trim(),
    stderr: stderr.trim()
  };
};

export const getAdminWebsocketDashboard = () => getWsDashboard();

export const saveFeatureFlags = (flags: { key: "chat_enabled" | "nfc_enabled"; enabled: boolean }[]) => {
  const now = new Date().toISOString();
  const insert = db.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
  );
  const tx = db.transaction(() => {
    for (const flag of flags) {
      insert.run(flag.key, String(flag.enabled), now);
    }
  });
  tx();
  return { ok: true };
};

export const getDbHealth = () => {
  const databasePath = settings.databasePath;
  const absolute = path.resolve(databasePath);
  let sizeBytes = 0;
  try {
    sizeBytes = fs.statSync(absolute).size;
  } catch {
    sizeBytes = 0;
  }

  let migrationVersion = "0";
  if (hasTable("migrations")) {
    const row = db
      .prepare("SELECT name FROM migrations ORDER BY id DESC LIMIT 1")
      .get() as { name: string } | undefined;
    migrationVersion = row?.name ?? "0";
  }

  return {
    status: "ok",
    activeConnections: 1,
    dbSizeBytes: sizeBytes,
    slowQueryCount: 0,
    migrationVersion
  };
};
