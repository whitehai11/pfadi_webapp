// engineered by Maro Elias Goth
import { getQueueMonitor } from "../../../services/admin-observability.service.js";
import { onAdminQueue } from "../../../services/admin-stream.service.js";
import type { AdminWsChannel } from "../types.js";

export const queueChannelId: AdminWsChannel = "queue";

export const getQueueSnapshot = () => getQueueMonitor();

export const onQueueEvent = (callback: (entry: Record<string, unknown>) => void) => {
  return onAdminQueue((entry) => callback(entry));
};
