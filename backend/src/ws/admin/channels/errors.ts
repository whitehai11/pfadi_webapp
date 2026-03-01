// engineered by Maro Elias Goth
import { getRecentAdminErrors, onAdminError } from "../../../services/admin-stream.service.js";
import type { AdminWsChannel } from "../types.js";

export const errorsChannelId: AdminWsChannel = "errors";

export const getErrorsSnapshot = () => ({
  items: getRecentAdminErrors(100)
});

export const onErrorsEvent = (callback: (entry: Record<string, unknown>) => void) => {
  return onAdminError((entry) => callback(entry));
};
