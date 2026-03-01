// engineered by Maro Elias Goth
import { writable, type Readable } from "svelte/store";
import { browser } from "$app/environment";

export type WebSocketState = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected" | "error";

type SocketMessageHandler = (raw: string) => void;
type SocketErrorHandler = (message: string) => void;

type WebSocketClientOptions = {
  getUrl: () => string | null;
  onMessage: SocketMessageHandler;
  onError?: SocketErrorHandler;
  maxReconnectDelayMs?: number;
};

export type ReconnectingWebSocketClient = {
  state: Readable<WebSocketState>;
  connect: () => void;
  disconnect: () => void;
  send: (payload: unknown) => boolean;
};

export const createReconnectingWebSocketClient = (options: WebSocketClientOptions): ReconnectingWebSocketClient => {
  const state = writable<WebSocketState>("idle");
  const maxDelay = options.maxReconnectDelayMs ?? 15_000;

  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let reconnectAttempt = 0;
  let manuallyClosed = false;

  const clearReconnectTimer = () => {
    if (reconnectTimer === null) return;
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };

  const scheduleReconnect = () => {
    if (!browser || manuallyClosed) return;
    clearReconnectTimer();
    reconnectAttempt += 1;
    const delay = Math.min(maxDelay, 1000 * 2 ** Math.min(reconnectAttempt, 4));
    state.set("reconnecting");
    reconnectTimer = window.setTimeout(() => {
      connect();
    }, delay);
  };

  const connect = () => {
    if (!browser) return;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

    const url = options.getUrl();
    if (!url) {
      state.set("disconnected");
      return;
    }

    manuallyClosed = false;
    state.set(reconnectAttempt === 0 ? "connecting" : "reconnecting");
    socket = new WebSocket(url);

    socket.addEventListener("open", () => {
      reconnectAttempt = 0;
      clearReconnectTimer();
      state.set("connected");
    });

    socket.addEventListener("message", (event) => {
      options.onMessage(String(event.data ?? ""));
    });

    socket.addEventListener("error", () => {
      state.set("error");
      options.onError?.("WebSocket Verbindung fehlgeschlagen.");
    });

    socket.addEventListener("close", () => {
      socket = null;
      if (manuallyClosed) {
        state.set("disconnected");
        return;
      }
      scheduleReconnect();
    });
  };

  const disconnect = () => {
    manuallyClosed = true;
    clearReconnectTimer();
    reconnectAttempt = 0;
    if (socket) {
      try {
        socket.close();
      } catch {
        // ignore
      }
      socket = null;
    }
    state.set("disconnected");
  };

  const send = (payload: unknown) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    try {
      socket.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  };

  return {
    state,
    connect,
    disconnect,
    send
  };
};
