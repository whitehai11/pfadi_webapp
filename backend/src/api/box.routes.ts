import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireMaterialOrAdmin } from "../utils/guards.js";
import {
  createBox,
  deleteBox,
  getBoxById,
  getBoxByTag,
  isValidBoxTag,
  listBoxes,
  removeBoxMaterial,
  updateBox,
  upsertBoxMaterial
} from "../services/box.service.js";

const boxSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable()
});

const boxMaterialSchema = z.object({
  material_id: z.string().min(1),
  quantity: z.number().int().min(1)
});

export const boxRoutes = async (app: FastifyInstance) => {
  app.get("/boxes", { preHandler: requireAuth }, async () => {
    return listBoxes();
  });

  app.get("/boxes/tag/:tagId", { preHandler: requireAuth }, async (request, reply) => {
    const { tagId } = request.params as { tagId: string };
    if (!isValidBoxTag(tagId)) {
      return reply.code(400).send({ error: "Ungültige Eingabe." });
    }
    const box = getBoxByTag(tagId);
    if (!box) {
      return reply.code(404).send({ error: "Nicht gefunden." });
    }
    return reply.send(box);
  });

  app.post("/boxes", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const parsed = boxSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Ungültige Eingabe." });
    }
    const box = createBox(parsed.data.name, parsed.data.description ?? null);
    return reply.code(201).send(box);
  });

  app.put("/boxes/:id", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const parsed = boxSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Ungültige Eingabe." });
    }
    const box = updateBox((request.params as { id: string }).id, parsed.data.name, parsed.data.description ?? null);
    if (!box) {
      return reply.code(404).send({ error: "Nicht gefunden." });
    }
    return reply.send(box);
  });

  app.delete("/boxes/:id", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const ok = deleteBox((request.params as { id: string }).id);
    if (!ok) {
      return reply.code(404).send({ error: "Nicht gefunden." });
    }
    return reply.code(204).send();
  });

  app.post("/boxes/:id/material", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const parsed = boxMaterialSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Ungültige Eingabe." });
    }
    const boxId = (request.params as { id: string }).id;
    const result = upsertBoxMaterial(boxId, parsed.data.material_id, parsed.data.quantity);
    return reply.code(201).send(result);
  });

  app.delete("/boxes/:id/material/:materialId", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const { id, materialId } = request.params as { id: string; materialId: string };
    const ok = removeBoxMaterial(id, materialId);
    if (!ok) {
      return reply.code(404).send({ error: "Nicht gefunden." });
    }
    return reply.code(204).send();
  });
};
