// engineered by Maro Elias Goth
import { writable, type Readable } from "svelte/store";
import { createReconnectingWebSocketClient, type WebSocketState } from "$lib/websocket";

export type ChatWsClientMessage =
  | { type: "ping"; payload?: { ts?: string } }
  | { type: "room.join"; payload: { conversationId: string } }
  | { type: "room.leave"; payload: { conversationId: string } }
  | { type: "chat.send"; payload: { conversationId: string; content: string; clientId?: string } }
  | { type: "chat.typing"; payload: { conversationId: string; isTyping: boolean } }
  | { type: "chat.read"; payload: { conversationId: string; messageId: string } };

export type ChatWsServerMessage =
  | { type: "system.ready"; payload: { userId: string; heartbeatMs: number } }
  | { type: "pong"; payload: { ts: string } }
  | { type: "room.joined"; payload: { conversationId: string } }
  | { type: "room.left"; payload: { conversationId: string } }
  | {
      type: "chat.message";
      payload: {
        id: string;
        conversation_id: string;
        sender_id: string;
        sender_username: string;
        content: string;
        created_at: string;
      };
    }
  | { type: "chat.delivery"; payload: { conversationId: string; messageId: string; clientId?: string; deliveredAt: string } }
  | { type: "chat.typing"; payload: { conversationId: string; userId: string; isTyping: boolean } }
  | { type: "chat.read"; payload: { conversationId: string; messageId: string; userId: string; readAt: string } }
  | { type: "chat.presence"; payload: { conversationId: string; onlineUserIds: string[] } }
  | { type: "error"; payload: { code: string; message: string } };

export type ChatSocketDebugEvent = {
  ts: string;
  direction: "in" | "out" | "state" | "error";
  type: string;
  payload: unknown;
};

export const createChatSocket = (options: {
  getUrl: () => string | null;
  onMessage: (message: ChatWsServerMessage) => void;
  onError?: (message: string) => void;
  enableDebug?: () => boolean;
}) => {
  const debugEvents = writable<ChatSocketDebugEvent[]>([]);

  const addDebug = (event: ChatSocketDebugEvent) => {
    if (!options.enableDebug?.()) return;
    debugEvents.update((events) => [...events.slice(-299), event]);
  };

  const client = createReconnectingWebSocketClient({
    getUrl: options.getUrl,
    onMessage: (raw) => {
      let parsed: ChatWsServerMessage | null = null;
      try {
        parsed = JSON.parse(raw) as ChatWsServerMessage;
      } catch {
        return;
      }
      if (!parsed || typeof parsed.type !== "string") return;
      addDebug({
        ts: new Date().toISOString(),
        direction: "in",
        type: parsed.type,
        payload: parsed.payload
      });
      options.onMessage(parsed);
    },
    onError: (message) => {
      addDebug({
        ts: new Date().toISOString(),
        direction: "error",
        type: "socket.error",
        payload: { message }
      });
      options.onError?.(message);
    }
  });

  const state: Readable<WebSocketState> = {
    subscribe: (run) =>
      client.state.subscribe((value) => {
        addDebug({
          ts: new Date().toISOString(),
          direction: "state",
          type: "socket.state",
          payload: { value }
        });
        run(value);
      })
  };

  const send = (message: ChatWsClientMessage) => {
    addDebug({
      ts: new Date().toISOString(),
      direction: "out",
      type: message.type,
      payload: message.payload ?? null
    });
    return client.send(message);
  };

  return {
    state,
    debugEvents,
    connect: client.connect,
    disconnect: client.disconnect,
    send,
    joinRoom: (conversationId: string) => send({ type: "room.join", payload: { conversationId } }),
    leaveRoom: (conversationId: string) => send({ type: "room.leave", payload: { conversationId } })
  };
};

