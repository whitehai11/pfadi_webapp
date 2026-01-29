import { z } from "zod";
import { requireAuth } from "../utils/guards.js";
import { settings } from "../config/settings.js";
import { deleteSubscription, saveSubscription } from "../services/push.service.js";
const subscriptionSchema = z.object({
    endpoint: z.string().min(1),
    keys: z.object({
        p256dh: z.string().min(1),
        auth: z.string().min(1)
    })
});
export const pushRoutes = async (app) => {
    app.get("/push/vapid-public-key", async () => {
        return { publicKey: settings.vapidPublicKey };
    });
    app.post("/push/subscribe", { preHandler: requireAuth }, async (request, reply) => {
        const parsed = subscriptionSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: "Invalid input" });
        }
        const user = request.user;
        const id = saveSubscription(user.id, parsed.data);
        return reply.code(201).send({ id });
    });
    app.post("/push/unsubscribe", { preHandler: requireAuth }, async (request, reply) => {
        const parsed = subscriptionSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: "Invalid input" });
        }
        const user = request.user;
        const ok = deleteSubscription(user.id, parsed.data.endpoint);
        return reply.send({ ok });
    });
};
