// engineered by Maro Elias Goth
import { getAdminDockerStatus } from "../../../services/admin-system.service.js";
import { getRecentAdminDocker, onAdminDocker } from "../../../services/admin-stream.service.js";
import type { AdminWsChannel } from "../types.js";

export const dockerChannelId: AdminWsChannel = "docker";

export const getDockerSnapshot = () => ({
  latest: getRecentAdminDocker(1)[0] ?? null,
  status: getAdminDockerStatus()
});

export const onDockerEvent = (callback: (entry: Record<string, unknown>) => void) => {
  return onAdminDocker((entry) => callback(entry));
};
