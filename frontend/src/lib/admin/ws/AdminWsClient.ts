// engineered by Maro Elias Goth
import { browser } from "$app/environment";
import { getToken } from "$lib/auth";

export type AdminChannel = "logs" | "errors" | "queue" | "docker" | "redis" | "api-metrics";
export type AdminEnvelope =
  | { type: "event"; channel: AdminChannel; data: Record<string, unknown> }
  | { type: "snapshot"; channel: AdminChannel; data: Record<string, unknown> }
  | { type: "pong"; ts: string }
  | { type: "error"; message: string };

type Listener = (message: AdminEnvelope) => void;

class AdminWsClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private reconnectAttempt = 0;
  private listeners = new Set<Listener>();
  private subscriptions = new Map<AdminChannel, Record<string, unknown>>();

  private clearTimers() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect() {
    if (!browser) return;
    if (this.reconnectTimer !== null) return;
    const delay = Math.min(15_000, 1000 * 2 ** Math.min(this.reconnectAttempt, 4));
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private send(payload: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(payload));
  }

  private syncSubscriptions() {
    for (const [channel, filters] of this.subscriptions) {
      this.send({ type: "subscribe", channel, filters });
    }
  }

  connect() {
    if (!browser) return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;
    if (this.subscriptions.size === 0) return;
    const token = getToken();
    if (!token) return;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    this.socket = new WebSocket(`${protocol}://${window.location.host}/ws/admin?token=${encodeURIComponent(token)}`);

    this.socket.addEventListener("open", () => {
      this.reconnectAttempt = 0;
      this.syncSubscriptions();
      this.clearTimers();
      this.pingTimer = window.setInterval(() => {
        this.send({ type: "ping" });
      }, 25_000);
    });

    this.socket.addEventListener("message", (event) => {
      let parsed: AdminEnvelope | null = null;
      try {
        parsed = JSON.parse(String(event.data ?? "")) as AdminEnvelope;
      } catch {
        return;
      }
      if (!parsed) return;
      for (const listener of this.listeners) {
        listener(parsed);
      }
    });

    this.socket.addEventListener("close", () => {
      this.clearTimers();
      this.socket = null;
      this.reconnectAttempt += 1;
      this.scheduleReconnect();
    });

    this.socket.addEventListener("error", () => {
      this.clearTimers();
      try {
        this.socket?.close();
      } catch {
        // ignore
      }
      this.socket = null;
      this.reconnectAttempt += 1;
      this.scheduleReconnect();
    });
  }

  disconnectIfIdle() {
    if (this.subscriptions.size > 0) return;
    this.clearTimers();
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // ignore
      }
      this.socket = null;
    }
  }

  subscribe(channel: AdminChannel, filters: Record<string, unknown> = {}) {
    this.subscriptions.set(channel, filters);
    this.connect();
    this.send({ type: "subscribe", channel, filters });
  }

  unsubscribe(channel: AdminChannel) {
    this.subscriptions.delete(channel);
    this.send({ type: "unsubscribe", channel });
    this.disconnectIfIdle();
  }

  onMessage(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const adminWsClient = new AdminWsClient();
