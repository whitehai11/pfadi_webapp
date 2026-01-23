import cron from "node-cron";
import { db } from "../db/database.js";
import { getRules, listUsersForRule, sendRuleToUsers } from "../services/push-rules.service.js";

const listUsers = () => db.prepare("SELECT id, email as username, role FROM users").all() as {
  id: string;
  username: string;
  role: string;
}[];

export const scheduleReminders = () => {
  cron.schedule("*/30 * * * *", async () => {
    const now = new Date();
    const users = listUsers();
    const totalUsers = users.length;

    // Termin-Erinnerungen
    const reminderRules = getRules("event-reminder");
    for (const rule of reminderRules) {
      const leadTimeMs = rule.lead_time_hours * 60 * 60 * 1000;
      const windowStart = new Date(now.getTime() + leadTimeMs - 60 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + leadTimeMs + 60 * 60 * 1000);
      const events = db
        .prepare("SELECT * FROM events WHERE start_at BETWEEN ? AND ?")
        .all(windowStart.toISOString(), windowEnd.toISOString()) as {
        id: string;
        title: string;
        start_at: string;
        end_at: string;
        type: string;
        location: string;
        description: string;
      }[];
      for (const event of events) {
        if (rule.event_type && rule.event_type !== event.type) continue;
        const targets = listUsersForRule(rule);
        await sendRuleToUsers(rule, targets, { type: "event-reminder", event });
      }
    }

    // Rückmeldung fehlt
    const availabilityRules = getRules("availability-missing");
    for (const rule of availabilityRules) {
      const leadTimeMs = rule.lead_time_hours * 60 * 60 * 1000;
      const windowStart = new Date(now.getTime());
      const windowEnd = new Date(now.getTime() + leadTimeMs);
      const events = db
        .prepare("SELECT id, title, start_at, end_at, type, location, description FROM events WHERE start_at BETWEEN ? AND ?")
        .all(windowStart.toISOString(), windowEnd.toISOString()) as {
        id: string;
        title: string;
        start_at: string;
        end_at: string;
        type: string;
        location: string;
        description: string;
      }[];

      for (const event of events) {
        if (rule.event_type && rule.event_type !== event.type) continue;
        const responded = db
          .prepare("SELECT COUNT(*) as count FROM event_availability WHERE event_id = ?")
          .get(event.id) as { count: number };
        const percent = totalUsers === 0 ? 0 : Math.round((responded.count / totalUsers) * 100);
        if (rule.min_response_percent !== null && rule.min_response_percent !== undefined) {
          if (percent >= rule.min_response_percent) continue;
        }

        const missingUsers = db
          .prepare(
            "SELECT id, email as username, role FROM users WHERE id NOT IN (SELECT user_id FROM event_availability WHERE event_id = ?)"
          )
          .all(event.id) as { id: string; username: string; role: string }[];

        const targets = missingUsers.filter((user) => {
          if (rule.target_user_id && rule.target_user_id !== user.id) return false;
          if (rule.target_role && rule.target_role !== user.role) return false;
          return true;
        });

        await sendRuleToUsers(rule, targets, { type: "availability-missing", event });
      }
    }

    // Packliste fehlt
    const packlistMissingRules = getRules("packlist-missing");
    for (const rule of packlistMissingRules) {
      const leadTimeMs = rule.lead_time_hours * 60 * 60 * 1000;
      const windowStart = new Date(now.getTime());
      const windowEnd = new Date(now.getTime() + leadTimeMs);
      const events = db
        .prepare(
          "SELECT e.* FROM events e LEFT JOIN packlists p ON p.event_id = e.id WHERE e.packlist_required = 1 AND p.id IS NULL AND e.start_at BETWEEN ? AND ?"
        )
        .all(windowStart.toISOString(), windowEnd.toISOString()) as {
        id: string;
        title: string;
        start_at: string;
        end_at: string;
        type: string;
        location: string;
        description: string;
      }[];
      for (const event of events) {
        if (rule.event_type && rule.event_type !== event.type) continue;
        const targets = listUsersForRule(rule);
        await sendRuleToUsers(rule, targets, { type: "packlist-missing", event });
      }
    }

    // Packliste unvollständig
    const packlistIncompleteRules = getRules("packlist-incomplete");
    for (const rule of packlistIncompleteRules) {
      const leadTimeMs = rule.lead_time_hours * 60 * 60 * 1000;
      const windowStart = new Date(now.getTime());
      const windowEnd = new Date(now.getTime() + leadTimeMs);
      const events = db
        .prepare(
          "SELECT DISTINCT e.* FROM events e JOIN packlists p ON p.event_id = e.id JOIN packlist_items i ON i.packlist_id = p.id WHERE i.status = 'missing' AND e.start_at BETWEEN ? AND ?"
        )
        .all(windowStart.toISOString(), windowEnd.toISOString()) as {
        id: string;
        title: string;
        start_at: string;
        end_at: string;
        type: string;
        location: string;
        description: string;
      }[];
      for (const event of events) {
        if (rule.event_type && rule.event_type !== event.type) continue;
        const targets = listUsersForRule(rule);
        await sendRuleToUsers(rule, targets, { type: "packlist-incomplete", event });
      }
    }

    // Inventar unter Mindestmenge
    const inventoryRules = getRules("inventory-low");
    for (const rule of inventoryRules) {
      const items = db
        .prepare("SELECT * FROM inventory_items WHERE quantity < min_quantity")
        .all() as {
        id: string;
        name: string;
        category: string;
        location: string;
        quantity: number;
        min_quantity: number;
        tag_id: string | null;
      }[];
      if (items.length === 0) continue;
      const targets = listUsersForRule(rule);
      for (const item of items) {
        await sendRuleToUsers(rule, targets, { type: "inventory-low", item });
      }
    }

    // Wöchentliche Erinnerung (cooldown steuert Häufigkeit)
    const weeklyRules = getRules("weekly-admin");
    for (const rule of weeklyRules) {
      const targets = listUsersForRule(rule);
      await sendRuleToUsers(rule, targets, { type: "weekly-admin", event: null });
    }
  });
};
