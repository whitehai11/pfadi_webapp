import crypto from "node:crypto";
import { db, nowIso } from "../db/database.js";
import { sendToUser } from "./push.service.js";

export type Rule = {
  id: string;
  rule_type: string;
  enabled: number;
  lead_time_hours: number;
  target_user_id: string | null;
  target_role: string | null;
  title_template: string | null;
  body_template: string | null;
  min_response_percent: number | null;
  event_type: string | null;
  send_start: string | null;
  send_end: string | null;
  schedule_start_date: string | null;
  schedule_every: string | null;
  schedule_time: string | null;
  cooldown_hours: number | null;
  title: string | null;
  message: string | null;
  notification_type: "instant" | "recurring";
  target_type: "all" | "role" | "user";
  target_id: string | null;
  is_recurring: number;
  interval_value: number | null;
  interval_unit: "hours" | "days" | "weeks" | null;
  start_date: string | null;
  end_date: string | null;
  last_sent_at: string | null;
  is_active: number;
};

export type EventContext = {
  id: string;
  title: string;
  start_at: string;
  end_at?: string;
  type?: string;
  location?: string;
  description?: string;
};

export type ItemContext = {
  id: string;
  name: string;
  category: string;
  location: string;
  quantity: number;
  min_quantity: number;
  tag_id?: string | null;
};

type UserContext = {
  id: string;
  username: string;
  role: string;
};

const getQuietHours = () => {
  const rows = db
    .prepare("SELECT key, value FROM settings WHERE key IN ('quiet_hours_start','quiet_hours_end')")
    .all() as { key: string; value: string }[];
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return {
    start: map.get("quiet_hours_start") ?? "21:00",
    end: map.get("quiet_hours_end") ?? "06:00"
  };
};

const isWithinWindow = (date: Date, start: string, end: string) => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const minutes = date.getHours() * 60 + date.getMinutes();
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (startMin < endMin) {
    return minutes >= startMin && minutes < endMin;
  }
  return minutes >= startMin || minutes < endMin;
};

const isQuietHours = (date: Date) => {
  const { start, end } = getQuietHours();
  return isWithinWindow(date, start, end);
};

const isScheduleDue = (rule: Rule, date: Date) => {
  if (!rule.schedule_start_date || !rule.schedule_every) return true;
  const startDate = new Date(rule.schedule_start_date);
  if (Number.isNaN(startDate.getTime())) return true;
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const diffDays = Math.floor((dateOnly.getTime() - startOnly.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return false;

  if (rule.schedule_time) {
    const [hh, mm] = rule.schedule_time.split(":").map(Number);
    const targetMinutes = hh * 60 + mm;
    const currentMinutes = date.getHours() * 60 + date.getMinutes();
    const delta = Math.abs(currentMinutes - targetMinutes);
    if (delta > 30) return false;
  }

  if (rule.schedule_every === "daily") return true;
  if (rule.schedule_every === "weekly") return diffDays % 7 === 0;
  if (rule.schedule_every === "monthly") {
    return date.getDate() === startDate.getDate();
  }
  return true;
};

const shouldSendNow = (rule: Rule, date: Date, ignoreSchedule: boolean) => {
  if (isQuietHours(date)) return false;
  if (rule.send_start && rule.send_end) {
    return isWithinWindow(date, rule.send_start, rule.send_end);
  }
  if (!ignoreSchedule && !isScheduleDue(rule, date)) return false;
  return true;
};

const formatDate = (value?: string) => {
  if (!value) return "";
  return new Date(value).toLocaleString("de-DE");
};

const roleLabel = (role?: string) => {
  if (role === "user") return "Nutzer";
  if (role === "admin") return "Admin";
  if (role === "materialwart") return "Materialwart";
  return role ?? "";
};

const renderTemplate = (
  template: string,
  event: EventContext | null,
  user: UserContext | null,
  item: ItemContext | null
) => {
  const replacements: Record<string, string> = {
    "{event.title}": event?.title ?? "",
    "{event.start}": formatDate(event?.start_at),
    "{event.end}": formatDate(event?.end_at),
    "{event.type}": event?.type ?? "",
    "{event.location}": event?.location ?? "",
    "{event.description}": event?.description ?? "",
    "{user.name}": user?.username ?? "",
    "{user.role}": roleLabel(user?.role),
    "{item.name}": item?.name ?? "",
    "{item.category}": item?.category ?? "",
    "{item.location}": item?.location ?? "",
    "{item.quantity}": item ? String(item.quantity) : "",
    "{item.min_quantity}": item ? String(item.min_quantity) : "",
    "{item.tag}": item?.tag_id ?? ""
  };
  let output = template;
  for (const [key, value] of Object.entries(replacements)) {
    output = output.replaceAll(key, value);
  }
  return output;
};

const listTargetUsers = (rule: Rule): UserContext[] => {
  if (rule.target_type === "user" && rule.target_id) {
    const row = db
      .prepare("SELECT id, email as username, role FROM users WHERE id = ? AND status = 'approved'")
      .get(rule.target_id) as UserContext | undefined;
    return row ? [row] : [];
  }
  if (rule.target_type === "role" && rule.target_id) {
    return db
      .prepare("SELECT id, email as username, role FROM users WHERE role = ? AND status = 'approved' ORDER BY email ASC")
      .all(rule.target_id) as UserContext[];
  }
  if (rule.target_user_id) {
    const row = db
      .prepare("SELECT id, email as username, role FROM users WHERE id = ? AND status = 'approved'")
      .get(rule.target_user_id) as UserContext | undefined;
    return row ? [row] : [];
  }
  if (rule.target_role) {
    return db
      .prepare("SELECT id, email as username, role FROM users WHERE role = ? AND status = 'approved' ORDER BY email ASC")
      .all(rule.target_role) as UserContext[];
  }
  return db
    .prepare("SELECT id, email as username, role FROM users WHERE status = 'approved' ORDER BY email ASC")
    .all() as UserContext[];
};

const wasSentRecently = (ruleId: string, eventId: string | null, userId: string, cooldownHours: number) => {
  const since = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();
  const row = db
    .prepare(
      "SELECT id FROM push_delivery_log WHERE rule_id = ? AND user_id = ? AND COALESCE(event_id, '') = COALESCE(?, '') AND sent_at >= ?"
    )
    .get(ruleId, userId, eventId ?? null, since) as { id: string } | undefined;
  return Boolean(row);
};

const logSent = (ruleId: string, eventId: string | null, userId: string) => {
  db.prepare("INSERT INTO push_delivery_log (id, rule_id, event_id, user_id, sent_at) VALUES (?, ?, ?, ?, ?)").run(
    crypto.randomUUID(),
    ruleId,
    eventId,
    userId,
    nowIso()
  );
};

const intervalToMilliseconds = (value: number, unit: "hours" | "days" | "weeks") => {
  if (unit === "hours") return value * 60 * 60 * 1000;
  if (unit === "days") return value * 24 * 60 * 60 * 1000;
  return value * 7 * 24 * 60 * 60 * 1000;
};

export const getRules = (ruleType: string): Rule[] => {
  return db
    .prepare("SELECT * FROM push_rules WHERE rule_type = ? AND enabled = 1")
    .all(ruleType) as Rule[];
};

export const listCustomPushRules = (): Rule[] => {
  return db
    .prepare("SELECT * FROM push_rules WHERE rule_type = 'custom-notification' ORDER BY created_at DESC")
    .all() as Rule[];
};

export const getCustomPushRule = (ruleId: string): Rule | undefined => {
  return db
    .prepare("SELECT * FROM push_rules WHERE id = ? AND rule_type = 'custom-notification'")
    .get(ruleId) as Rule | undefined;
};

export const updateCustomPushRuleLastSent = (ruleId: string) => {
  db.prepare("UPDATE push_rules SET last_sent_at = ?, updated_at = ? WHERE id = ?").run(nowIso(), nowIso(), ruleId);
};

export const isCustomRuleDue = (rule: Rule, now: Date) => {
  if (rule.rule_type !== "custom-notification") return false;
  if (rule.notification_type !== "recurring") return false;
  if (!rule.is_recurring || !rule.is_active) return false;
  if (!rule.interval_value || !rule.interval_unit) return false;

  if (rule.start_date) {
    const start = new Date(`${rule.start_date}T00:00:00`);
    if (!Number.isNaN(start.getTime()) && now.getTime() < start.getTime()) return false;
  }

  if (rule.end_date) {
    const end = new Date(`${rule.end_date}T23:59:59.999`);
    if (!Number.isNaN(end.getTime()) && now.getTime() > end.getTime()) return false;
  }

  if (isQuietHours(now)) return false;

  if (!rule.last_sent_at) return true;
  const lastSent = new Date(rule.last_sent_at);
  if (Number.isNaN(lastSent.getTime())) return true;
  const threshold = lastSent.getTime() + intervalToMilliseconds(rule.interval_value, rule.interval_unit);
  return now.getTime() >= threshold;
};

export const sendRuleToUsers = async (
  rule: Rule,
  users: UserContext[],
  payload: { type: string; event?: EventContext | null; item?: ItemContext | null; ignoreSchedule?: boolean }
) => {
  const now = new Date();
  if (!shouldSendNow(rule, now, payload.ignoreSchedule === true)) return;
  const cooldown = rule.cooldown_hours ?? 24;
  const event = payload.event ?? null;
  const item = payload.item ?? null;
  const titleTemplate = rule.title_template || "";
  const bodyTemplate = rule.body_template || "";

  for (const user of users) {
    if (wasSentRecently(rule.id, event?.id ?? null, user.id, cooldown)) continue;
    const title = renderTemplate(titleTemplate, event, user, item) || "Hinweis";
    const body = renderTemplate(bodyTemplate, event, user, item);
    await sendToUser(user.id, {
      title,
      body,
      eventId: event?.id,
      type: payload.type
    });
    logSent(rule.id, event?.id ?? null, user.id);
  }
};

export const sendCustomPushRule = async (rule: Rule, options?: { updateLastSent?: boolean }) => {
  const users = listTargetUsers(rule);
  const title = (rule.title ?? "").trim() || "Hinweis";
  const body = (rule.message ?? "").trim();

  for (const user of users) {
    await sendToUser(user.id, {
      title,
      body,
      type: "custom-notification",
      ruleId: rule.id
    });
    logSent(rule.id, null, user.id);
  }

  if (options?.updateLastSent !== false) {
    updateCustomPushRuleLastSent(rule.id);
  }
};

export const sendRulesForEvent = async (ruleType: string, event: EventContext) => {
  const rules = getRules(ruleType);
  for (const rule of rules) {
    if (rule.event_type && rule.event_type !== event.type) continue;
    const users = listTargetUsers(rule);
    await sendRuleToUsers(rule, users, { type: ruleType, event, ignoreSchedule: true });
  }
};

export const listUsersForRule = (rule: Rule) => listTargetUsers(rule);
