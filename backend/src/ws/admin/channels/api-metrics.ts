// engineered by Maro Elias Goth
import { getApiHeatmap } from "../../../services/admin-observability.service.js";
import { getRecentAdminApiMetrics, onAdminApiMetrics } from "../../../services/admin-stream.service.js";
import type { AdminWsChannel } from "../types.js";

export const apiMetricsChannelId: AdminWsChannel = "api-metrics";

export const getApiMetricsSnapshot = () => ({
  latest: getRecentAdminApiMetrics(1)[0] ?? null,
  items: getApiHeatmap()
});

export const onApiMetricsEvent = (callback: (entry: Record<string, unknown>) => void) => {
  return onAdminApiMetrics((entry) => callback(entry));
};
