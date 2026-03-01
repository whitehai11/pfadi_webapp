// engineered by Maro Elias Goth
import { getRedisMonitor } from "../../../services/admin-observability.service.js";
import { getRecentAdminRedis, onAdminRedis } from "../../../services/admin-stream.service.js";
import type { AdminWsChannel } from "../types.js";

export const redisChannelId: AdminWsChannel = "redis";

export const getRedisSnapshot = () => ({
  latest: getRecentAdminRedis(1)[0] ?? null,
  status: getRedisMonitor()
});

export const onRedisEvent = (callback: (entry: Record<string, unknown>) => void) => {
  return onAdminRedis((entry) => callback(entry));
};
