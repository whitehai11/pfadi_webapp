// engineered by Maro Elias Goth
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../utils/guards.js";
import { settings } from "../config/settings.js";
import { deleteSubscription, saveSubscription, sendToUser } from "../services/push.service.js";
import { parseOrReply } from "../utils/validation.js";
import { createRateLimit, rateLimitKeyByUserOrIp } from "../utils/rate-limit.js";

const pushSubscribeRateLimit = createRateLimit({
  bucket: "push-subscribe",
  max: 20,
  windowMs: 5 * 60 * 1000,
  message: "Zu viele Abo-Anfragen. Bitte spaeter erneut versuchen.",
  keyGenerator: rateLimitKeyByUserOrIp
});

const pushUnsubscribeRateLimit = createRateLimit({
  bucket: "push-unsubscribe",
  max: 20,
  windowMs: 5 * 60 * 1000,
  message: "Zu viele Abmelde-Anfragen. Bitte spaeter erneut versuchen.",
  keyGenerator: rateLimitKeyByUserOrIp
});

const pushTestRateLimit = createRateLimit({
  bucket: "push-test",
  max: 10,
  windowMs: 60 * 60 * 1000,
  message: "Zu viele Test-Benachrichtigungen. Bitte spaeter erneut versuchen.",
  keyGenerator: rateLimitKeyByUserOrIp
});

const subscriptionSchema = z
  .object({
    endpoint: z.string().url().max(2048),
    keys: z
      .object({
        p256dh: z.string().min(16).max(512),
        auth: z.string().min(8).max(128)
      })
      .strict()
  })
  .strict();

export const pushRoutes = async (app: FastifyInstance) => {
  app.get("/push/vapid-public-key", async () => {
    return { publicKey: settings.vapidPublicKey };
  });

  app.post("/push/subscribe", { preHandler: [requireAuth, pushSubscribeRateLimit] }, async (request, reply) => {
    const parsed = parseOrReply(reply, subscriptionSchema, request.body);
    if (!parsed) return;
    try {
      const user = request.user as { id: string };
      const id = saveSubscription(user.id, parsed);
      return reply.code(201).send({ id });
    } catch (error) {
      request.log.error({ err: error, userId: (request.user as { id?: string } | undefined)?.id ?? null }, "Push subscribe failed");
      return reply.code(500).send({ error: "Push-Abo konnte nicht gespeichert werden." });
    }
  });

  app.post("/push/unsubscribe", { preHandler: [requireAuth, pushUnsubscribeRateLimit] }, async (request, reply) => {
    const parsed = parseOrReply(reply, subscriptionSchema, request.body);
    if (!parsed) return;
    try {
      const user = request.user as { id: string };
      const ok = deleteSubscription(user.id, parsed.endpoint);
      return reply.send({ ok });
    } catch (error) {
      request.log.error({ err: error, userId: (request.user as { id?: string } | undefined)?.id ?? null }, "Push unsubscribe failed");
      return reply.code(500).send({ error: "Push-Abo konnte nicht entfernt werden." });
    }
  });

  app.post("/push/test", { preHandler: [requireAdmin, pushTestRateLimit] }, async (request, reply) => {
    try {
      const user = request.user as { id: string };
      await sendToUser(user.id, {
        title: "Test-Benachrichtigung",
        body: "Dies ist eine Test-Benachrichtigung.",
        type: "test"
      });
      return reply.send({ ok: true });
    } catch (error) {
      request.log.error({ err: error, userId: (request.user as { id?: string } | undefined)?.id ?? null }, "Push test send failed");
      return reply.code(500).send({ error: "Test-Benachrichtigung konnte nicht gesendet werden." });
    }
  });
};
