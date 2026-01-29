import { z } from "zod";
import { createPacklist, getPacklistByEvent, listPacklistItems, updatePacklistItemStatus, upsertPacklistItems, deletePacklistItem } from "../services/packlist.service.js";
import { requireMaterialOrAdmin, requireAuth } from "../utils/guards.js";
const itemsSchema = z.object({
    items: z.array(z.object({
        inventory_item_id: z.string().min(1),
        status: z.enum(["missing", "prepared", "packed"])
    }))
});
const statusSchema = z.object({
    status: z.enum(["missing", "prepared", "packed"])
});
export const packlistRoutes = async (app) => {
    app.get("/packlists/:eventId", { preHandler: requireAuth }, async (request, reply) => {
        const { eventId } = request.params;
        const packlist = getPacklistByEvent(eventId);
        if (!packlist) {
            return reply.code(404).send({ error: "Not found" });
        }
        const items = listPacklistItems(packlist.id);
        return reply.send({ ...packlist, items });
    });
    app.post("/packlists/:eventId", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
        const { eventId } = request.params;
        const existing = getPacklistByEvent(eventId);
        if (existing) {
            return reply.code(409).send({ error: "Packlist already exists" });
        }
        const packlist = createPacklist(eventId);
        return reply.code(201).send(packlist);
    });
    app.put("/packlists/:packlistId/items", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
        const parsed = itemsSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: "Invalid input" });
        }
        const { packlistId } = request.params;
        const items = upsertPacklistItems(packlistId, parsed.data.items);
        return reply.send(items);
    });
    app.patch("/packlists/items/:id", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
        const parsed = statusSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: "Invalid input" });
        }
        const updated = updatePacklistItemStatus(request.params.id, parsed.data.status);
        if (!updated) {
            return reply.code(404).send({ error: "Not found" });
        }
        return reply.send(updated);
    });
    app.delete("/packlists/items/:id", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
        const ok = deletePacklistItem(request.params.id);
        if (!ok) {
            return reply.code(404).send({ error: "Not found" });
        }
        return reply.code(204).send();
    });
};
