// engineered by Maro Elias Goth
import { browser } from "$app/environment";
import { derived, get, writable, type Readable } from "svelte/store";
import { session, getToken } from "$lib/auth";
import { createReconnectingWebSocketClient, type WebSocketState } from "$lib/websocket";

type ClientEventMap = {
  "chat:send": {
    conversationId: string;
    content: string;
    clientId?: string;
  };
  "chat:typing": {
    conversationId: string;
    isTyping: boolean;
  };
  "chat:read": {
    conversationId: string;
    messageId: string;
  };
};

type ServerEventMap = {
  "chat:receive": {
    id: string;
    conversation_id: string;
    sender_id: string;
    sender_username: string;
    content: string;
    created_at: string;
  };
  "chat:typing": {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  };
  "chat:read": {
    conversationId: string;
    messageId: string;
    userId: string;
    readAt: string;
  };
  "chat:presence": {
    conversationId: string;
    onlineUserIds: string[];
  };
  "chat:delivery": {
    conversationId: string;
    messageId: string;
    clientId?: string;
    deliveredAt: string;
  };
  error: {
    code: string;
    message: string;
  };
};

type ClientEnvelope<E extends keyof ClientEventMap = keyof ClientEventMap> = {
  event: E;
  data: ClientEventMap[E];
};

type ServerEnvelope<E extends keyof ServerEventMap = keyof ServerEventMap> = {
  event: E;
  data: ServerEventMap[E];
};

export type ChatMessageUi = {
  localId: string;
  id: string | null;
  clientId: string | null;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  status: "sending" | "delivered" | "read" | "failed";
  readBy: string[];
};

type ChatState = {
  conversationId: string;
  messages: ChatMessageUi[];
  typingUserIds: string[];
  onlineUserIds: string[];
  socketState: WebSocketState;
  connected: boolean;
  lastError: string;
};

const DEFAULT_CONVERSATION_ID = "00000000-0000-4000-8000-000000000001";

const initialState: ChatState = {
  conversationId: DEFAULT_CONVERSATION_ID,
  messages: [],
  typingUserIds: [],
  onlineUserIds: [],
  socketState: "idle",
  connected: false,
  lastError: ""
};

const chatState = writable<ChatState>(initialState);

let started = false;
let sessionUnsub: (() => void) | null = null;
let wsStateUnsub: (() => void) | null = null;

const randomId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const sortMessages = (messages: ChatMessageUi[]) =>
  [...messages].sort((a, b) => {
    const left = new Date(a.createdAt).getTime();
    const right = new Date(b.createdAt).getTime();
    if (left !== right) return left - right;
    return a.localId.localeCompare(b.localId);
  });

const wsClient = createReconnectingWebSocketClient({
  getUrl: () => {
    if (!browser) return null;
    const token = getToken();
    if (!token) return null;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}/ws/chat?token=${encodeURIComponent(token)}`;
  },
  onMessage: (raw) => {
    let envelope: ServerEnvelope | null = null;
    try {
      envelope = JSON.parse(raw) as ServerEnvelope;
    } catch {
      return;
    }
    if (!envelope || !envelope.event) return;

    if (envelope.event === "error") {
      chatState.update((state) => ({ ...state, lastError: envelope!.data.message || "Chat-Fehler." }));
      return;
    }

    if (envelope.event === "chat:presence") {
      const payload = envelope.data as ServerEventMap["chat:presence"];
      chatState.update((state) => {
        if (payload.conversationId !== state.conversationId) return state;
        return { ...state, onlineUserIds: payload.onlineUserIds ?? [] };
      });
      return;
    }

    if (envelope.event === "chat:typing") {
      const payload = envelope.data as ServerEventMap["chat:typing"];
      chatState.update((state) => {
        if (payload.conversationId !== state.conversationId) return state;
        const current = new Set(state.typingUserIds);
        const myUserId = get(session)?.id;
        if (payload.userId === myUserId) return state;
        if (payload.isTyping) current.add(payload.userId);
        else current.delete(payload.userId);
        return { ...state, typingUserIds: Array.from(current) };
      });
      return;
    }

    if (envelope.event === "chat:delivery") {
      const payload = envelope.data as ServerEventMap["chat:delivery"];
      chatState.update((state) => {
        if (payload.conversationId !== state.conversationId) return state;
        const next = state.messages.map((msg) => {
          const byClientId = payload.clientId && msg.clientId === payload.clientId;
          const byMessageId = msg.id === payload.messageId;
          if (!byClientId && !byMessageId) return msg;
          return {
            ...msg,
            id: payload.messageId,
            status: msg.status === "read" ? "read" : "delivered",
            createdAt: payload.deliveredAt || msg.createdAt
          };
        });
        return { ...state, messages: sortMessages(next) };
      });
      return;
    }

    if (envelope.event === "chat:read") {
      const payload = envelope.data as ServerEventMap["chat:read"];
      chatState.update((state) => {
        if (payload.conversationId !== state.conversationId) return state;
        const next = state.messages.map((msg) => {
          if (msg.id !== payload.messageId) return msg;
          const readBy = Array.from(new Set([...msg.readBy, payload.userId]));
          const isMine = msg.senderId === get(session)?.id;
          return {
            ...msg,
            readBy,
            status: isMine ? "read" : msg.status
          };
        });
        return { ...state, messages: next };
      });
      return;
    }

    if (envelope.event === "chat:receive") {
      const payload = envelope.data as ServerEventMap["chat:receive"];
      chatState.update((state) => {
        if (payload.conversation_id !== state.conversationId) return state;
        if (state.messages.some((m) => m.id === payload.id)) return state;

        const myUserId = get(session)?.id;
        const ownPendingIndex = state.messages.findIndex(
          (m) =>
            m.status === "sending" &&
            m.senderId === myUserId &&
            m.content === payload.content &&
            Math.abs(new Date(payload.created_at).getTime() - new Date(m.createdAt).getTime()) < 15_000
        );

        if (ownPendingIndex >= 0) {
          const next = [...state.messages];
          const pending = next[ownPendingIndex];
          next[ownPendingIndex] = {
            ...pending,
            id: payload.id,
            senderName: payload.sender_username,
            createdAt: payload.created_at,
            status: pending.status === "read" ? "read" : "delivered"
          };
          return { ...state, messages: sortMessages(next) };
        }

        const incoming: ChatMessageUi = {
          localId: payload.id,
          id: payload.id,
          clientId: null,
          conversationId: payload.conversation_id,
          senderId: payload.sender_id,
          senderName: payload.sender_username,
          content: payload.content,
          createdAt: payload.created_at,
          status: "delivered",
          readBy: []
        };

        return { ...state, messages: sortMessages([...state.messages, incoming]) };
      });
    }
  },
  onError: (message) => {
    chatState.update((state) => ({ ...state, lastError: message }));
  }
});

const sendEvent = <E extends keyof ClientEventMap>(event: E, data: ClientEventMap[E]) => {
  const envelope: ClientEnvelope<E> = { event, data };
  return wsClient.send(envelope);
};

const connectIfPossible = () => {
  const current = get(session);
  if (!current?.id) return;
  wsClient.connect();
};

export const startChatRealtime = () => {
  if (!browser || started) return;
  started = true;

  wsStateUnsub = wsClient.state.subscribe((state) => {
    chatState.update((prev) => ({
      ...prev,
      socketState: state,
      connected: state === "connected"
    }));
  });

  sessionUnsub = session.subscribe((current) => {
    if (!current?.id) {
      wsClient.disconnect();
      chatState.set(initialState);
      return;
    }
    connectIfPossible();
  });

  connectIfPossible();
};

export const stopChatRealtime = () => {
  wsClient.disconnect();
  sessionUnsub?.();
  wsStateUnsub?.();
  sessionUnsub = null;
  wsStateUnsub = null;
  started = false;
};

export const sendChatMessage = (content: string) => {
  const trimmed = String(content || "").trim();
  if (!trimmed) return;
  const user = get(session);
  if (!user?.id) return;

  const clientId = randomId();
  const optimistic: ChatMessageUi = {
    localId: `local-${clientId}`,
    id: null,
    clientId,
    conversationId: DEFAULT_CONVERSATION_ID,
    senderId: user.id,
    senderName: user.username,
    content: trimmed,
    createdAt: new Date().toISOString(),
    status: "sending",
    readBy: []
  };

  chatState.update((state) => ({
    ...state,
    messages: sortMessages([...state.messages, optimistic]),
    lastError: ""
  }));

  const sent = sendEvent("chat:send", {
    conversationId: DEFAULT_CONVERSATION_ID,
    content: trimmed,
    clientId
  });

  if (!sent) {
    chatState.update((state) => ({
      ...state,
      messages: state.messages.map((message) =>
        message.localId === optimistic.localId ? { ...message, status: "failed" } : message
      ),
      lastError: "Nachricht konnte nicht gesendet werden."
    }));
  }
};

export const retryChatMessage = (localId: string) => {
  const current = get(chatState);
  const target = current.messages.find((message) => message.localId === localId);
  if (!target) return;
  if (target.status !== "failed") return;
  sendChatMessage(target.content);
  chatState.update((state) => ({
    ...state,
    messages: state.messages.filter((message) => message.localId !== localId)
  }));
};

export const sendTypingState = (isTyping: boolean) => {
  if (!get(session)?.id) return;
  sendEvent("chat:typing", {
    conversationId: DEFAULT_CONVERSATION_ID,
    isTyping
  });
};

export const sendReadReceipt = (messageId: string) => {
  if (!messageId) return;
  if (!get(session)?.id) return;
  sendEvent("chat:read", {
    conversationId: DEFAULT_CONVERSATION_ID,
    messageId
  });
};

export const chatStore: Readable<ChatState> = {
  subscribe: chatState.subscribe
};

export const typingUsers = derived([chatStore], ([$chatStore]) => $chatStore.typingUserIds);
