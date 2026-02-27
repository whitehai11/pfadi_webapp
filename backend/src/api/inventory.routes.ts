import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createInventory,
  deleteInventory,
  getInventoryByTag,
  listInventory,
  updateInventory
} from "../services/inventory.service.js";
import { requireMaterialOrAdmin, requireAuth } from "../utils/guards.js";
import { parseOrReply, textField, uuidParamSchema } from "../utils/validation.js";

const idParamsSchema = z.object({ id: uuidParamSchema }).strict();
const tagParamsSchema = z.object({ tagId: z.string().trim().min(1).max(120) }).strict();

const inventorySchema = z
  .object({
    name: textField(140),
    category: textField(80),
    location: textField(140),
    quantity: z.number().int().nonnegative().max(100000),
    min_quantity: z.number().int().nonnegative().max(100000),
    condition: textField(80),
    tag_id: z.string().trim().max(120).optional().nullable()
  })
  .strict();

export const inventoryRoutes = async (app: FastifyInstance) => {
  app.get("/inventory", { preHandler: requireAuth }, async () => {
    return listInventory();
  });

  app.get("/inventory/tag/:tagId", { preHandler: requireAuth }, async (request, reply) => {
    const params = parseOrReply(reply, tagParamsSchema, request.params);
    if (!params) return;
    const item = getInventoryByTag(params.tagId);
    if (!item) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.send(item);
  });

  app.post("/inventory", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const parsed = parseOrReply(reply, inventorySchema, request.body);
    if (!parsed) return;
    const item = createInventory(parsed);
    return reply.code(201).send(item);
  });

  app.put("/inventory/:id", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, idParamsSchema, request.params);
    const parsed = parseOrReply(reply, inventorySchema, request.body);
    if (!params || !parsed) return;
    const item = updateInventory(params.id, parsed);
    if (!item) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.send(item);
  });

  app.delete("/inventory/:id", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, idParamsSchema, request.params);
    if (!params) return;
    const ok = deleteInventory(params.id);
    if (!ok) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.code(204).send();
  });
};
