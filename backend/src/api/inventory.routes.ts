import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createInventory,
  deleteInventory,
  listInventory,
  updateInventory,
  getInventoryByTag
} from "../services/inventory.service.js";
import { requireMaterialOrAdmin, requireAuth } from "../utils/guards.js";

const inventorySchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  location: z.string().min(1),
  quantity: z.number().int().nonnegative(),
  min_quantity: z.number().int().nonnegative(),
  condition: z.string().min(1),
  tag_id: z.string().optional().nullable()
});

export const inventoryRoutes = async (app: FastifyInstance) => {
  app.get("/inventory", { preHandler: requireAuth }, async () => {
    return listInventory();
  });

  app.get("/inventory/tag/:tagId", { preHandler: requireAuth }, async (request, reply) => {
    const { tagId } = request.params as { tagId: string };
    const item = getInventoryByTag(tagId);
    if (!item) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.send(item);
  });

  app.post("/inventory", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const parsed = inventorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }
    const item = createInventory(parsed.data);
    return reply.code(201).send(item);
  });

  app.put("/inventory/:id", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const parsed = inventorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }
    const item = updateInventory((request.params as { id: string }).id, parsed.data);
    if (!item) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.send(item);
  });

  app.delete("/inventory/:id", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const ok = deleteInventory((request.params as { id: string }).id);
    if (!ok) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.code(204).send();
  });
};
