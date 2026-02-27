import { z } from "zod";
import { requireAdmin, requireAuth } from "../utils/guards.js";
import { settings } from "../config/settings.js";
import { deleteSubscription, saveSubscription, sendToUser } from "../services/push.service.js";
import { parseOrReply } from "../utils/validation.js";
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
export const pushRoutes = async (app) => {
    app.get("/push/vapid-public-key", async () => {
        return { publicKey: settings.vapidPublicKey };
    });
    app.post("/push/subscribe", { preHandler: requireAuth }, async (request, reply) => {
        const parsed = parseOrReply(reply, subscriptionSchema, request.body);
        if (!parsed)
            return;
        const user = request.user;
        const id = saveSubscription(user.id, parsed);
        return reply.code(201).send({ id });
    });
    app.post("/push/unsubscribe", { preHandler: requireAuth }, async (request, reply) => {
        const parsed = parseOrReply(reply, subscriptionSchema, request.body);
        if (!parsed)
            return;
        const user = request.user;
        const ok = deleteSubscription(user.id, parsed.endpoint);
        return reply.send({ ok });
    });
    app.post("/push/test", { preHandler: requireAdmin }, async (request, reply) => {
        const user = request.user;
        await sendToUser(user.id, {
            title: "Test-Benachrichtigung",
            body: "Dies ist eine Test-Benachrichtigung.",
            type: "test"
        });
        return reply.send({ ok: true });
    });
};
