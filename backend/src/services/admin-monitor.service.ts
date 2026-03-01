// engineered by Maro Elias Goth
import os from "node:os";
import { publishAdminQueue } from "./admin-stream.service.js";
import { recordQueueExecution } from "./metrics-registry.service.js";

export type AdminJobId = "calendar-refresh" | "reminders" | "packlist-check" | "custom-push-rules";
export type AdminJobStatus = "idle" | "running" | "success" | "failed";

type JobState = {
  id: AdminJobId;
  name: string;
  schedule: string;
  next_run: string | null;
  last_run: string | null;
  last_status: AdminJobStatus;
  last_duration_ms: number | null;
  last_error: string | null;
  running: boolean;
};

type CpuSnapshot = {
  at: number;
  usage: NodeJS.CpuUsage;
};

type WsStatsState = {
  chatConnections: number;
  notificationConnections: number;
  onlineUsers: number;
  messages: number[];
  lastBroadcastAt: string | null;
  lastBroadcastEvent: string | null;
};

const nowIso = () => new Date().toISOString();

const estimateNextRun = (jobId: AdminJobId) => {
  const now = new Date();
  if (jobId === "calendar-refresh") return new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  if (jobId === "reminders") return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  if (jobId === "custom-push-rules") return new Date(now.getTime() + 60 * 1000).toISOString();
  const next = new Date(now);
  next.setHours(7, 30, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.toISOString();
};

const jobs = new Map<AdminJobId, JobState>([
  [
    "calendar-refresh",
    {
      id: "calendar-refresh",
      name: "Calendar Refresh",
      schedule: "*/15 * * * *",
      next_run: estimateNextRun("calendar-refresh"),
      last_run: null,
      last_status: "idle",
      last_duration_ms: null,
      last_error: null,
      running: false
    }
  ],
  [
    "reminders",
    {
      id: "reminders",
      name: "Reminder Engine",
      schedule: "*/30 * * * *",
      next_run: estimateNextRun("reminders"),
      last_run: null,
      last_status: "idle",
      last_duration_ms: null,
      last_error: null,
      running: false
    }
  ],
  [
    "packlist-check",
    {
      id: "packlist-check",
      name: "Packlist Checks",
      schedule: "30 7 * * *",
      next_run: estimateNextRun("packlist-check"),
      last_run: null,
      last_status: "idle",
      last_duration_ms: null,
      last_error: null,
      running: false
    }
  ],
  [
    "custom-push-rules",
    {
      id: "custom-push-rules",
      name: "Custom Push Rules",
      schedule: "* * * * *",
      next_run: estimateNextRun("custom-push-rules"),
      last_run: null,
      last_status: "idle",
      last_duration_ms: null,
      last_error: null,
      running: false
    }
  ]
]);

const jobStarts = new Map<AdminJobId, number>();
const wsStats: WsStatsState = {
  chatConnections: 0,
  notificationConnections: 0,
  onlineUsers: 0,
  messages: [],
  lastBroadcastAt: null,
  lastBroadcastEvent: null
};

let cpuSnapshot: CpuSnapshot = {
  at: Date.now(),
  usage: process.cpuUsage()
};

export const markJobStart = (jobId: AdminJobId) => {
  const state = jobs.get(jobId);
  if (!state) return;
  state.running = true;
  state.last_status = "running";
  jobStarts.set(jobId, Date.now());
};

export const markJobFinish = (jobId: AdminJobId, error?: unknown) => {
  const state = jobs.get(jobId);
  if (!state) return;
  const start = jobStarts.get(jobId) ?? Date.now();
  const duration = Math.max(0, Date.now() - start);
  state.running = false;
  state.last_run = nowIso();
  state.last_duration_ms = duration;
  state.next_run = estimateNextRun(jobId);
  if (error) {
    state.last_status = "failed";
    state.last_error = error instanceof Error ? error.message : String(error);
    recordQueueExecution(false);
  } else {
    state.last_status = "success";
    state.last_error = null;
    recordQueueExecution(true);
  }
  jobStarts.delete(jobId);
  publishAdminQueue({
    jobId,
    status: state.last_status,
    lastRun: state.last_run,
    durationMs: state.last_duration_ms
  });
};

export const getJobDashboard = () => Array.from(jobs.values()).map((job) => ({ ...job }));

export const setChatConnectionCount = (count: number) => {
  wsStats.chatConnections = Math.max(0, count);
};

export const setNotificationConnectionCount = (count: number) => {
  wsStats.notificationConnections = Math.max(0, count);
};

export const setOnlineUserCount = (count: number) => {
  wsStats.onlineUsers = Math.max(0, count);
};

export const recordWsMessage = () => {
  const now = Date.now();
  wsStats.messages.push(now);
  const cutoff = now - 60_000;
  wsStats.messages = wsStats.messages.filter((ts) => ts >= cutoff);
};

export const recordWsBroadcast = (eventName: string) => {
  wsStats.lastBroadcastAt = nowIso();
  wsStats.lastBroadcastEvent = eventName;
};

export const getWsDashboard = () => {
  const now = Date.now();
  const cutoff = now - 60_000;
  wsStats.messages = wsStats.messages.filter((ts) => ts >= cutoff);
  return {
    connectedClients: wsStats.chatConnections + wsStats.notificationConnections,
    chatConnections: wsStats.chatConnections,
    notificationConnections: wsStats.notificationConnections,
    onlineUsers: wsStats.onlineUsers,
    messagesPerMinute: wsStats.messages.length,
    lastBroadcastAt: wsStats.lastBroadcastAt,
    lastBroadcastEvent: wsStats.lastBroadcastEvent
  };
};

export const sampleCpuUsagePercent = () => {
  const now = Date.now();
  const usage = process.cpuUsage();
  const elapsedMicros = (now - cpuSnapshot.at) * 1000;
  if (elapsedMicros <= 0) return 0;
  const userDelta = usage.user - cpuSnapshot.usage.user;
  const systemDelta = usage.system - cpuSnapshot.usage.system;
  cpuSnapshot = { at: now, usage };
  const totalDelta = userDelta + systemDelta;
  const cores = Math.max(1, os.cpus().length);
  const percent = (totalDelta / (elapsedMicros * cores)) * 100;
  return Math.max(0, Math.min(100, percent));
};
