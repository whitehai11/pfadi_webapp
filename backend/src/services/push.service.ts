import webpush from "web-push";
import { randomUUID } from "node:crypto";
import { db, nowIso } from "../db/database.js";
import { settings } from "../config/settings.js";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

const ensureVapid = () => {
  if (!settings.vapidPublicKey || !settings.vapidPrivateKey) {
    console.warn("VAPID keys missing; skipping push send.");
    return false;
  }
  webpush.setVapidDetails(settings.vapidSubject, settings.vapidPublicKey, settings.vapidPrivateKey);
  return true;
};

export const saveSubscription = (userId: string, sub: PushSubscriptionInput) => {
  const existing = db
    .prepare("SELECT * FROM push_subscriptions WHERE endpoint = ? AND user_id = ?")
    .get(sub.endpoint, userId) as { id: string } | undefined;
  const now = nowIso();
  if (existing) {
    db.prepare(
      "UPDATE push_subscriptions SET keys_p256dh = ?, keys_auth = ?, updated_at = ? WHERE id = ?"
    ).run(sub.keys.p256dh, sub.keys.auth, now, existing.id);
    return existing.id;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, keys_p256dh, keys_auth, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth, now, now);
  return id;
};

export const deleteSubscription = (userId: string, endpoint: string) => {
  const result = db
    .prepare("DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?")
    .run(userId, endpoint);
  return result.changes > 0;
};

export const sendToUser = async (userId: string, payload: object) => {
  if (!ensureVapid()) return;
  const subscriptions = db
    .prepare("SELECT * FROM push_subscriptions WHERE user_id = ?")
    .all(userId) as { endpoint: string; keys_p256dh: string; keys_auth: string }[];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth
          }
        },
        JSON.stringify(payload)
      );
    } catch (err) {
      console.error("Push send failed", err);
    }
  }
};

export const sendToAll = async (payload: object) => {
  if (!ensureVapid()) return;
  const subscriptions = db
    .prepare("SELECT * FROM push_subscriptions")
    .all() as { endpoint: string; keys_p256dh: string; keys_auth: string }[];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth
          }
        },
        JSON.stringify(payload)
      );
    } catch (err) {
      console.error("Push send failed", err);
    }
  }
};
