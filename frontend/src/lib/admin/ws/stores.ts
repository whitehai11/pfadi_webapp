// engineered by Maro Elias Goth
import { writable } from "svelte/store";
import { adminWsClient, type AdminEnvelope, type AdminChannel } from "./AdminWsClient";

export type AdminLogItem = {
  ts: string;
  level: string;
  msg: string;
  context?: Record<string, unknown> | null;
};

export const adminLogsStore = writable<AdminLogItem[]>([]);
export const adminErrorsStore = writable<Record<string, unknown>[]>([]);
export const adminQueueStore = writable<Record<string, unknown> | null>(null);
export const adminDockerStore = writable<Record<string, unknown> | null>(null);
export const adminRedisStore = writable<Record<string, unknown> | null>(null);
export const adminApiMetricsStore = writable<Record<string, unknown> | null>(null);

let listenerBound = false;
let listenerCleanup: (() => void) | null = null;
const channelRefCount = new Map<AdminChannel, number>();

const bindListener = () => {
  if (listenerBound) return;
  listenerBound = true;
  listenerCleanup = adminWsClient.onMessage((message: AdminEnvelope) => {
    if (message.type !== "event" && message.type !== "snapshot") return;

    if (message.channel === "logs") {
      const payload = message.data as { items?: AdminLogItem[] };
      const items = Array.isArray(payload.items) ? payload.items : [];
      if (message.type === "snapshot") {
        adminLogsStore.set(items);
      } else {
        adminLogsStore.update((prev) => [...prev, ...(items.length ? items : [message.data as unknown as AdminLogItem])].slice(-1000));
      }
      return;
    }

    if (message.channel === "errors") {
      const payload = message.data as { items?: Record<string, unknown>[] };
      if (message.type === "snapshot") {
        adminErrorsStore.set(Array.isArray(payload.items) ? payload.items : []);
      } else {
        adminErrorsStore.update((prev) => [message.data, ...prev].slice(0, 500));
      }
      return;
    }

    if (message.channel === "queue") {
      adminQueueStore.set(message.data);
      return;
    }
    if (message.channel === "docker") {
      adminDockerStore.set(message.data);
      return;
    }
    if (message.channel === "redis") {
      adminRedisStore.set(message.data);
      return;
    }
    if (message.channel === "api-metrics") {
      adminApiMetricsStore.set(message.data);
    }
  });
};

const maybeUnbindListener = () => {
  const totalRefs = Array.from(channelRefCount.values()).reduce((sum, count) => sum + count, 0);
  if (totalRefs > 0) return;
  listenerCleanup?.();
  listenerCleanup = null;
  listenerBound = false;
};

export const subscribeAdminChannel = (channel: AdminChannel, filters: Record<string, unknown> = {}) => {
  bindListener();
  const current = channelRefCount.get(channel) ?? 0;
  channelRefCount.set(channel, current + 1);
  if (current === 0) {
    adminWsClient.subscribe(channel, filters);
  } else if (current > 0 && Object.keys(filters).length > 0) {
    adminWsClient.subscribe(channel, filters);
  }

  return () => {
    const count = channelRefCount.get(channel) ?? 0;
    const next = Math.max(0, count - 1);
    if (next === 0) {
      channelRefCount.delete(channel);
      adminWsClient.unsubscribe(channel);
    } else {
      channelRefCount.set(channel, next);
    }
    maybeUnbindListener();
  };
};
