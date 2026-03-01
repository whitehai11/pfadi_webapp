// engineered by Maro Elias Goth
import crypto from "node:crypto";
import { db, nowIso } from "../db/database.js";
import { sendToUser } from "./push.service.js";
const getQuietHours = () => {
    const rows = db
        .prepare("SELECT key, value FROM settings WHERE key IN ('quiet_hours_start','quiet_hours_end')")
        .all();
    const map = new Map(rows.map((row) => [row.key, row.value]));
    return {
        start: map.get("quiet_hours_start") ?? "21:00",
        end: map.get("quiet_hours_end") ?? "06:00"
    };
};
const isWithinWindow = (date, start, end) => {
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
const isQuietHours = (date) => {
    const { start, end } = getQuietHours();
    return isWithinWindow(date, start, end);
};
const isScheduleDue = (rule, date) => {
    if (!rule.schedule_start_date || !rule.schedule_every)
        return true;
    const startDate = new Date(rule.schedule_start_date);
    if (Number.isNaN(startDate.getTime()))
        return true;
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const diffDays = Math.floor((dateOnly.getTime() - startOnly.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays < 0)
        return false;
    if (rule.schedule_time) {
        const [hh, mm] = rule.schedule_time.split(":").map(Number);
        const targetMinutes = hh * 60 + mm;
        const currentMinutes = date.getHours() * 60 + date.getMinutes();
        const delta = Math.abs(currentMinutes - targetMinutes);
        if (delta > 30)
            return false;
    }
    if (rule.schedule_every === "daily")
        return true;
    if (rule.schedule_every === "weekly")
        return diffDays % 7 === 0;
    if (rule.schedule_every === "monthly") {
        return date.getDate() === startDate.getDate();
    }
    return true;
};
const shouldSendNow = (rule, date, ignoreSchedule) => {
    if (isQuietHours(date))
        return false;
    if (rule.send_start && rule.send_end) {
        return isWithinWindow(date, rule.send_start, rule.send_end);
    }
    if (!ignoreSchedule && !isScheduleDue(rule, date))
        return false;
    return true;
};
const formatDate = (value) => {
    if (!value)
        return "";
    return new Date(value).toLocaleString("de-DE");
};
const roleLabel = (role) => {
    if (role === "user")
        return "Nutzer";
    if (role === "admin")
        return "Admin";
    if (role === "materialwart")
        return "Materialwart";
    return role ?? "";
};
const renderTemplate = (template, event, user, item) => {
    const replacements = {
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
const listTargetUsers = (rule) => {
    if (rule.target_type === "user" && rule.target_id) {
        const row = db
            .prepare("SELECT id, email as username, role FROM users WHERE id = ? AND status = 'approved'")
            .get(rule.target_id);
        return row ? [row] : [];
    }
    if (rule.target_type === "role" && rule.target_id) {
        return db
            .prepare("SELECT id, email as username, role FROM users WHERE role = ? AND status = 'approved' ORDER BY email ASC")
            .all(rule.target_id);
    }
    if (rule.target_user_id) {
        const row = db
            .prepare("SELECT id, email as username, role FROM users WHERE id = ? AND status = 'approved'")
            .get(rule.target_user_id);
        return row ? [row] : [];
    }
    if (rule.target_role) {
        return db
            .prepare("SELECT id, email as username, role FROM users WHERE role = ? AND status = 'approved' ORDER BY email ASC")
            .all(rule.target_role);
    }
    return db
        .prepare("SELECT id, email as username, role FROM users WHERE status = 'approved' ORDER BY email ASC")
        .all();
};
const wasSentRecently = (ruleId, eventId, userId, cooldownHours) => {
    const since = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();
    const row = db
        .prepare("SELECT id FROM push_delivery_log WHERE rule_id = ? AND user_id = ? AND COALESCE(event_id, '') = COALESCE(?, '') AND sent_at >= ?")
        .get(ruleId, userId, eventId ?? null, since);
    return Boolean(row);
};
const logSent = (ruleId, eventId, userId) => {
    db.prepare("INSERT INTO push_delivery_log (id, rule_id, event_id, user_id, sent_at) VALUES (?, ?, ?, ?, ?)").run(crypto.randomUUID(), ruleId, eventId, userId, nowIso());
};
const intervalToMilliseconds = (value, unit) => {
    if (unit === "hours")
        return value * 60 * 60 * 1000;
    if (unit === "days")
        return value * 24 * 60 * 60 * 1000;
    return value * 7 * 24 * 60 * 60 * 1000;
};
export const getRules = (ruleType) => {
    return db
        .prepare("SELECT * FROM push_rules WHERE rule_type = ? AND enabled = 1")
        .all(ruleType);
};
export const listCustomPushRules = () => {
    return db
        .prepare("SELECT * FROM push_rules WHERE rule_type = 'custom-notification' ORDER BY created_at DESC")
        .all();
};
export const getCustomPushRule = (ruleId) => {
    return db
        .prepare("SELECT * FROM push_rules WHERE id = ? AND rule_type = 'custom-notification'")
        .get(ruleId);
};
export const updateCustomPushRuleLastSent = (ruleId) => {
    db.prepare("UPDATE push_rules SET last_sent_at = ?, updated_at = ? WHERE id = ?").run(nowIso(), nowIso(), ruleId);
};
export const isCustomRuleDue = (rule, now) => {
    if (rule.rule_type !== "custom-notification")
        return false;
    if (rule.notification_type !== "recurring")
        return false;
    if (!rule.is_recurring || !rule.is_active)
        return false;
    if (!rule.interval_value || !rule.interval_unit)
        return false;
    if (rule.start_date) {
        const start = new Date(`${rule.start_date}T00:00:00`);
        if (!Number.isNaN(start.getTime()) && now.getTime() < start.getTime())
            return false;
    }
    if (rule.end_date) {
        const end = new Date(`${rule.end_date}T23:59:59.999`);
        if (!Number.isNaN(end.getTime()) && now.getTime() > end.getTime())
            return false;
    }
    if (isQuietHours(now))
        return false;
    if (!rule.last_sent_at)
        return true;
    const lastSent = new Date(rule.last_sent_at);
    if (Number.isNaN(lastSent.getTime()))
        return true;
    const threshold = lastSent.getTime() + intervalToMilliseconds(rule.interval_value, rule.interval_unit);
    return now.getTime() >= threshold;
};
export const sendRuleToUsers = async (rule, users, payload) => {
    const now = new Date();
    if (!shouldSendNow(rule, now, payload.ignoreSchedule === true))
        return;
    const cooldown = rule.cooldown_hours ?? 24;
    const event = payload.event ?? null;
    const item = payload.item ?? null;
    const titleTemplate = rule.title_template || "";
    const bodyTemplate = rule.body_template || "";
    for (const user of users) {
        if (wasSentRecently(rule.id, event?.id ?? null, user.id, cooldown))
            continue;
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
export const sendCustomPushRule = async (rule, options) => {
    const users = listTargetUsers(rule);
    if (users.length === 0) {
        return { delivered: 0, skipped: 0, lastSentAt: rule.last_sent_at ?? null };
    }
    const title = (rule.title ?? "").trim() || "Hinweis";
    const body = (rule.message ?? "").trim();
    const now = new Date();
    const intervalWindowMs = rule.notification_type === "recurring" &&
        rule.is_recurring &&
        rule.interval_value &&
        rule.interval_unit
        ? intervalToMilliseconds(rule.interval_value, rule.interval_unit)
        : 60 * 1000;
    const sinceIso = new Date(now.getTime() - intervalWindowMs).toISOString();
    let delivered = 0;
    let skipped = 0;
    for (const user of users) {
        const duplicate = db
            .prepare("SELECT id FROM push_delivery_log WHERE rule_id = ? AND user_id = ? AND COALESCE(event_id, '') = '' AND sent_at >= ? LIMIT 1")
            .get(rule.id, user.id, sinceIso);
        if (duplicate) {
            skipped += 1;
            continue;
        }
        await sendToUser(user.id, {
            title,
            body,
            type: "custom-notification",
            ruleId: rule.id
        });
        logSent(rule.id, null, user.id);
        delivered += 1;
    }
    let lastSentAt = rule.last_sent_at ?? null;
    if (options?.updateLastSent !== false) {
        lastSentAt = nowIso();
        db.prepare("UPDATE push_rules SET last_sent_at = ?, updated_at = ? WHERE id = ?").run(lastSentAt, nowIso(), rule.id);
    }
    return { delivered, skipped, lastSentAt };
};
export const sendRulesForEvent = async (ruleType, event) => {
    const rules = getRules(ruleType);
    for (const rule of rules) {
        if (rule.event_type && rule.event_type !== event.type)
            continue;
        const users = listTargetUsers(rule);
        await sendRuleToUsers(rule, users, { type: ruleType, event, ignoreSchedule: true });
    }
};
export const listUsersForRule = (rule) => listTargetUsers(rule);
