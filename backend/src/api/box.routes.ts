import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireMaterialOrAdmin } from "../utils/guards.js";
import {
  createBox,
  deleteBox,
  getBoxByTag,
  isValidBoxTag,
  listBoxes,
  removeBoxMaterial,
  updateBox,
  upsertBoxMaterial
} from "../services/box.service.js";
import { parseOrReply, textField, uuidParamSchema } from "../utils/validation.js";

const idParamsSchema = z.object({ id: uuidParamSchema }).strict();
const materialParamsSchema = z.object({ id: uuidParamSchema, materialId: uuidParamSchema }).strict();
const tagParamsSchema = z.object({ tagId: z.string().trim().min(1).max(120) }).strict();

const boxSchema = z
  .object({
    name: textField(140),
    description: z.string().trim().max(600).optional().nullable()
  })
  .strict();

const boxMaterialSchema = z
  .object({
    material_id: uuidParamSchema,
    quantity: z.number().int().min(1).max(10000)
  })
  .strict();

export const boxRoutes = async (app: FastifyInstance) => {
  app.get("/boxes", { preHandler: requireAuth }, async () => {
    return listBoxes();
  });

  app.get("/boxes/tag/:tagId", { preHandler: requireAuth }, async (request, reply) => {
    const params = parseOrReply(reply, tagParamsSchema, request.params);
    if (!params) return;
    if (!isValidBoxTag(params.tagId)) {
      return reply.code(400).send({ error: "Ungultige Eingabe." });
    }
    const box = getBoxByTag(params.tagId);
    if (!box) {
      return reply.code(404).send({ error: "Nicht gefunden." });
    }
    return reply.send(box);
  });

  app.post("/boxes", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const parsed = parseOrReply(reply, boxSchema, request.body);
    if (!parsed) return;
    const box = createBox(parsed.name, parsed.description ?? null);
    return reply.code(201).send(box);
  });

  app.put("/boxes/:id", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, idParamsSchema, request.params);
    const parsed = parseOrReply(reply, boxSchema, request.body);
    if (!params || !parsed) return;
    const box = updateBox(params.id, parsed.name, parsed.description ?? null);
    if (!box) {
      return reply.code(404).send({ error: "Nicht gefunden." });
    }
    return reply.send(box);
  });

  app.delete("/boxes/:id", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, idParamsSchema, request.params);
    if (!params) return;
    const ok = deleteBox(params.id);
    if (!ok) {
      return reply.code(404).send({ error: "Nicht gefunden." });
    }
    return reply.code(204).send();
  });

  app.post("/boxes/:id/material", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, idParamsSchema, request.params);
    const parsed = parseOrReply(reply, boxMaterialSchema, request.body);
    if (!params || !parsed) return;
    const result = upsertBoxMaterial(params.id, parsed.material_id, parsed.quantity);
    return reply.code(201).send(result);
  });

  app.delete("/boxes/:id/material/:materialId", { preHandler: requireMaterialOrAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, materialParamsSchema, request.params);
    if (!params) return;
    const ok = removeBoxMaterial(params.id, params.materialId);
    if (!ok) {
      return reply.code(404).send({ error: "Nicht gefunden." });
    }
    return reply.code(204).send();
  });
};
