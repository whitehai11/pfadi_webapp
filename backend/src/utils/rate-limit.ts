import type { FastifyReply, FastifyRequest } from "fastify";

type RateLimitOptions = {
  bucket: string;
  max: number;
  windowMs: number;
  message: string;
};

type Entry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Entry>();

export const createRateLimit = ({ bucket, max, windowMs, message }: RateLimitOptions) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const now = Date.now();
    const key = `${bucket}:${request.ip}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    if (current.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      reply.header("Retry-After", String(retryAfter));
      return reply.code(429).send({ error: message });
    }

    current.count += 1;
    buckets.set(key, current);
  };
};
