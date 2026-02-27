import type { FastifyReply } from "fastify";
import { z } from "zod";

export const uuidParamSchema = z.string().uuid();
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const usernameSchema = z.string().trim().min(3).max(120).regex(/^[A-Za-z0-9._@+-]+$/);
export const passwordSchema = z.string().min(8).max(200);

export const textField = (max: number) => z.string().trim().min(1).max(max);
export const optionalTextField = (max: number) => z.string().trim().max(max).nullable().optional();

export const parseOrReply = <T>(
  reply: FastifyReply,
  schema: z.ZodType<T>,
  value: unknown,
  message = "Ungultige Eingabe."
) => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    reply.code(400).send({ error: message });
    return null;
  }
  return parsed.data;
};
