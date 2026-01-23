import type { FastifyInstance } from "fastify";
import { createEvent, deleteEvent, getEvent, listEvents, updateEvent } from "../services/calendar.service.js";
import { generateIcs } from "../services/ics.service.js";
import { requireAdmin, requireAuth } from "../utils/guards.js";
import { sendRulesForEvent } from "../services/push-rules.service.js";
import { listAvailability, upsertAvailability } from "../services/availability.service.js";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["Gruppenstunde", "Lager", "Aktion", "Sonstiges"]),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  location: z.string().min(1),
  description: z.string().default(""),
  packlist_required: z.boolean().default(false)
});

const availabilitySchema = z.object({
  status: z.enum(["yes", "maybe", "no"])
});

export const calendarRoutes = async (app: FastifyInstance) => {
  app.get("/calendar", { preHandler: requireAuth }, async () => {
    return listEvents();
  });

  app.post("/calendar", { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = eventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }
    const event = createEvent(parsed.data);
    generateIcs();
    await sendRulesForEvent("event-created", event);
    return reply.code(201).send(event);
  });

  app.put("/calendar/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = eventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }
    const event = updateEvent((request.params as { id: string }).id, parsed.data);
    if (!event) {
      return reply.code(404).send({ error: "Not found" });
    }
    generateIcs();
    await sendRulesForEvent("event-updated", event);
    return reply.send(event);
  });

  app.delete("/calendar/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const event = getEvent((request.params as { id: string }).id);
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
    const eventId = (request.params as { id: string }).id;
    const entries = listAvailability(eventId);
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
    const parsed = availabilitySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }
    const user = request.user as { id: string };
    const eventId = (request.params as { id: string }).id;
    const id = upsertAvailability(eventId, user.id, parsed.data.status);
    return reply.send({ id });
  });
};
