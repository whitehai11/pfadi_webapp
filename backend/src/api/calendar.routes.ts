// engineered by Maro Elias Goth
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createEvent, deleteEvent, getEvent, listEvents, updateEvent } from "../services/calendar.service.js";
import { generateIcs } from "../services/ics.service.js";
import { requireAdmin, requireAuth } from "../utils/guards.js";
import { sendRulesForEvent } from "../services/push-rules.service.js";
import { listAvailability, upsertAvailability } from "../services/availability.service.js";
import { parseOrReply, textField, uuidParamSchema } from "../utils/validation.js";

const idParamsSchema = z.object({ id: uuidParamSchema }).strict();

const eventSchema = z
  .object({
    title: textField(140),
    type: z.enum(["Gruppenstunde", "Lager", "Aktion", "Sonstiges"]),
    start_at: z.string().datetime(),
    end_at: z.string().datetime(),
    location: textField(140),
    description: z.string().trim().max(4000).default(""),
    packlist_required: z.boolean().default(false)
  })
  .strict()
  .refine((value) => new Date(value.end_at).getTime() >= new Date(value.start_at).getTime(), {
    message: "invalid date range"
  });

const availabilitySchema = z
  .object({
    status: z.enum(["yes", "maybe", "no"])
  })
  .strict();

export const calendarRoutes = async (app: FastifyInstance) => {
  app.get("/calendar", { preHandler: requireAuth }, async () => {
    return listEvents();
  });

  app.post("/calendar", { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = parseOrReply(reply, eventSchema, request.body);
    if (!parsed) return;
    const event = createEvent({
      ...parsed,
      description: parsed.description ?? "",
      packlist_required: parsed.packlist_required ?? false
    });
    generateIcs();
    await sendRulesForEvent("event-created", event);
    return reply.code(201).send(event);
  });

  app.put("/calendar/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, idParamsSchema, request.params);
    const parsed = parseOrReply(reply, eventSchema, request.body);
    if (!params || !parsed) return;
    const event = updateEvent(params.id, {
      ...parsed,
      description: parsed.description ?? "",
      packlist_required: parsed.packlist_required ?? false
    });
    if (!event) {
      return reply.code(404).send({ error: "Not found" });
    }
    generateIcs();
    await sendRulesForEvent("event-updated", event);
    return reply.send(event);
  });

  app.delete("/calendar/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, idParamsSchema, request.params);
    if (!params) return;
    const event = getEvent(params.id);
    if (!event) {
      return reply.code(404).send({ error: "Not found" });
    }
    const ok = deleteEvent(event.id);
    if (!ok) {
      return reply.code(404).send({ error: "Not found" });
    }
    generateIcs();
    await sendRulesForEvent("event-canceled", event);
    return reply.code(204).send();
  });

  app.get("/calendar/:id/availability", { preHandler: requireAuth }, async (request, reply) => {
    const params = parseOrReply(reply, idParamsSchema, request.params);
    if (!params) return;
    const entries = listAvailability(params.id);
    const counts = entries.reduce(
      (acc, entry) => {
        acc[entry.status] += 1;
        return acc;
      },
      { yes: 0, maybe: 0, no: 0 }
    );
    return reply.send({ entries, counts });
  });

  app.post("/calendar/:id/availability", { preHandler: requireAuth }, async (request, reply) => {
    const params = parseOrReply(reply, idParamsSchema, request.params);
    const parsed = parseOrReply(reply, availabilitySchema, request.body);
    if (!params || !parsed) return;
    const user = request.user as { id: string };
    const id = upsertAvailability(params.id, user.id, parsed.status);
    return reply.send({ id });
  });
};
