// engineered by Maro Elias Goth
import { browser } from "$app/environment";
import { apiFetch } from "$lib/api";
import { getToken, session } from "$lib/auth";
import { pushToast } from "$lib/toast";
import { createReconnectingWebSocketClient, type WebSocketState } from "$lib/websocket";
import { derived, get, writable, type Readable } from "svelte/store";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

type NotificationState = {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string;
  socketState: WebSocketState;
};

type NotificationsResponse = {
  items: NotificationItem[];
  unread_count: number;
};

type NotificationEventEnvelope =
  | { event: "notification:new"; data: NotificationItem }
  | { event: "notification:unread_count"; data: { unread_count: number } };

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  loading: false,
  error: "",
  socketState: "idle"
};

const notificationState = writable<NotificationState>(initialState);
let started = false;
let sessionUnsub: (() => void) | null = null;
let wsStateUnsub: (() => void) | null = null;

const wsClient = createReconnectingWebSocketClient({
  getUrl: () => {
    if (!browser) return null;
    const token = getToken();
    if (!token) return null;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}/ws/notifications?token=${encodeURIComponent(token)}`;
  },
  onMessage: (raw) => {
    let envelope: NotificationEventEnvelope | null = null;
    try {
      envelope = JSON.parse(raw) as NotificationEventEnvelope;
    } catch {
      return;
    }
    if (!envelope || !envelope.event) return;

    if (envelope.event === "notification:unread_count") {
      notificationState.update((state) => ({
        ...state,
        unreadCount: Number(envelope!.data.unread_count ?? 0)
      }));
      return;
    }

    if (envelope.event === "notification:new") {
      const incoming = envelope.data;
      notificationState.update((state) => {
        if (state.items.some((item) => item.id === incoming.id)) return state;
        return {
          ...state,
          items: [incoming, ...state.items].slice(0, 100),
          unreadCount: state.unreadCount + (incoming.is_read ? 0 : 1)
        };
      });
      const text = incoming.message ? `${incoming.title}: ${incoming.message}` : incoming.title;
      pushToast(text, "info");
    }
  },
  onError: (message) => {
    notificationState.update((state) => ({ ...state, error: message }));
  }
});

const resetState = () => {
  notificationState.set(initialState);
};

const connectIfPossible = () => {
  const currentSession = get(session);
  if (!currentSession?.id) return;
  wsClient.connect();
};

export const fetchNotifications = async (limit = 40) => {
  if (!get(session)?.id) return;
  notificationState.update((state) => ({ ...state, loading: true, error: "" }));
  try {
    const response = await apiFetch<NotificationsResponse>(`/api/notifications?limit=${Math.max(1, Math.min(100, limit))}`);
    notificationState.update((state) => ({
      ...state,
      items: response.items ?? [],
      unreadCount: Number(response.unread_count ?? 0),
      loading: false,
      error: ""
    }));
  } catch (error) {
    notificationState.update((state) => ({
      ...state,
      loading: false,
      error: error instanceof Error ? error.message : "Benachrichtigungen konnten nicht geladen werden."
    }));
  }
};

export const markNotificationsAsRead = async (ids?: string[]) => {
  if (!get(session)?.id) return;
  const payload =
    Array.isArray(ids) && ids.length > 0
      ? { ids: ids.slice(0, 200) }
      : { all: true };
  await apiFetch<{ unread_count: number }>("/api/notifications/mark-read", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  notificationState.update((state) => {
    const idSet = new Set(Array.isArray(ids) ? ids : []);
    const now = new Date().toISOString();
    return {
      ...state,
      items: state.items.map((item) => {
        const shouldRead = payload.all || idSet.has(item.id);
        if (!shouldRead || item.is_read) return item;
        return { ...item, is_read: true, read_at: now };
      }),
      unreadCount: payload.all
        ? 0
        : state.items.reduce((count, item) => {
            if (item.is_read) return count;
            if (idSet.has(item.id)) return count;
            return count + 1;
          }, 0)
    };
  });
};

export const markNotificationAsRead = async (id: string) => {
  if (!id) return;
  await markNotificationsAsRead([id]);
};

export const markAllNotificationsAsRead = async () => {
  await markNotificationsAsRead();
};

export const startNotificationsRealtime = () => {
  if (!browser || started) return;
  started = true;

  wsStateUnsub = wsClient.state.subscribe((state) => {
    notificationState.update((current) => ({
      ...current,
      socketState: state
    }));
  });

  sessionUnsub = session.subscribe((current) => {
    if (!current?.id) {
      wsClient.disconnect();
      resetState();
      return;
    }
    void fetchNotifications();
    connectIfPossible();
  });

  if (get(session)?.id) {
    void fetchNotifications();
    connectIfPossible();
  }
};

export const stopNotificationsRealtime = () => {
  wsClient.disconnect();
  sessionUnsub?.();
  wsStateUnsub?.();
  sessionUnsub = null;
  wsStateUnsub = null;
  started = false;
  resetState();
};

export const notificationsStore: Readable<NotificationState> = {
  subscribe: notificationState.subscribe
};

export const unreadNotificationCount = derived(notificationsStore, ($state) => $state.unreadCount);
