import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createPacklist,
  deletePacklistItem,
  getPacklistByEvent,
  listPacklistItems,
  updatePacklistItemStatus,
  upsertPacklistItems
} from "../services/packlist.service.js";
import { requireMaterialOrAdmin, requireAuth } from "../utils/guards.js";
import { parseOrReply, uuidParamSchema } from "../utils/validation.js";

const eventParamsSchema = z.object({ eventId: uuidParamSchema }).strict();
const packlistParamsSchema = z.object({ packlistId: uuidParamSchema }).strict();
const itemParamsSchema = z.object({ id: uuidParamSchema }).strict();

const itemsSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            inventory_item_id: uuidParamSchema,
            status: z.enum(["missing", "prepared", "packed"])
          })
          .strict()
      )
      .max(500)
  })
  .strict();

const statusSchema = z
  .object({
    status: z.enum(["missing", "prepared", "packed"])
  })
  .strict();

export const packlistRoutes = async (app: FastifyInstance) => {
  app.get("/packlists/:eventId", { preHandler: requireAuth }, async (request, reply) => {
    const params = parseOrReply(reply, eventParamsSchema, request.params);
    if (!params) return;
    const packlist = getPacklistByEvent(params.eventId);
    if (!packlist) {
      return reply.code(404).send({ error: "Not found" });
    }
    const items = listPacklistItems(packlist.id);
    return reply.send({ ...packlist, items });
  });

  app.post("/packlists/:eventId", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, eventParamsSchema, request.params);
    if (!params) return;
    const existing = getPacklistByEvent(params.eventId);
    if (existing) {
      return reply.code(409).send({ error: "Packlist already exists" });
    }
    const packlist = createPacklist(params.eventId);
    return reply.code(201).send(packlist);
  });

  app.put("/packlists/:packlistId/items", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, packlistParamsSchema, request.params);
    const parsed = parseOrReply(reply, itemsSchema, request.body);
    if (!params || !parsed) return;
    const items = upsertPacklistItems(params.packlistId, parsed.items);
    return reply.send(items);
  });

  app.patch("/packlists/items/:id", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, itemParamsSchema, request.params);
    const parsed = parseOrReply(reply, statusSchema, request.body);
    if (!params || !parsed) return;
    const updated = updatePacklistItemStatus(params.id, parsed.status);
    if (!updated) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.send(updated);
  });

  app.delete("/packlists/items/:id", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, itemParamsSchema, request.params);
    if (!params) return;
    const ok = deletePacklistItem(params.id);
    if (!ok) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.code(204).send();
  });
};
