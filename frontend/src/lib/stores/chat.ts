// engineered by Maro Elias Goth
import { browser } from "$app/environment";
import { get, writable, type Readable } from "svelte/store";
import { apiFetch } from "$lib/api";
import { session, getToken } from "$lib/auth";
import type { WebSocketState } from "$lib/websocket";
import { createChatSocket, type ChatSocketDebugEvent, type ChatWsServerMessage } from "$lib/realtime/chat-socket";

export type ChatConversation = {
  id: string;
  name: string;
  type: "room" | "direct" | "group";
  member_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  members: Array<{ id: string; username: string }>;
};

export type ChatUser = {
  id: string;
  username: string;
  role: string;
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
  readAt: string | null;
  readers: string[];
};

type ChatState = {
  conversations: ChatConversation[];
  users: ChatUser[];
  activeConversationId: string | null;
  messagesByConversation: Record<string, ChatMessageUi[]>;
  typingByConversation: Record<string, string[]>;
  onlineByConversation: Record<string, string[]>;
  socketState: WebSocketState;
  connected: boolean;
  lastError: string;
  debugEvents: ChatSocketDebugEvent[];
};

const initialState: ChatState = {
  conversations: [],
  users: [],
  activeConversationId: null,
  messagesByConversation: {},
  typingByConversation: {},
  onlineByConversation: {},
  socketState: "idle",
  connected: false,
  lastError: "",
  debugEvents: []
};

const chatState = writable<ChatState>(initialState);
let started = false;
let sessionUnsub: (() => void) | null = null;
let wsStateUnsub: (() => void) | null = null;
let wsDebugUnsub: (() => void) | null = null;
let heartbeatTimer: number | null = null;
let lastPongAt = 0;

const randomId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const sortMessages = (messages: ChatMessageUi[]) =>
  [...messages].sort((a, b) => {
    const l = new Date(a.createdAt).getTime();
    const r = new Date(b.createdAt).getTime();
    if (l !== r) return l - r;
    return a.localId.localeCompare(b.localId);
  });

const getActiveConversationId = () => get(chatState).activeConversationId;

const chatSocket = createChatSocket({
  getUrl: () => {
    if (!browser) return null;
    const token = getToken();
    if (!token) return null;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}/ws/chat?token=${encodeURIComponent(token)}`;
  },
  onMessage: (message) => handleServerMessage(message),
  onError: (message) => {
    chatState.update((state) => ({ ...state, lastError: message }));
  },
  enableDebug: () => get(session)?.role === "dev"
});

const stopHeartbeat = () => {
  if (heartbeatTimer !== null) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
};

const sendPing = () => chatSocket.send({ type: "ping", payload: { ts: new Date().toISOString() } });

const startHeartbeat = () => {
  if (!browser) return;
  stopHeartbeat();
  heartbeatTimer = window.setInterval(() => {
    if (get(chatState).socketState !== "connected") return;
    const sent = sendPing();
    if (!sent) return;
    if (Date.now() - lastPongAt > 90_000) {
      chatSocket.disconnect();
      chatSocket.connect();
    }
  }, 25_000);
};

const refreshUsers = async () => {
  const payload = await apiFetch<{ users: ChatUser[] }>("/api/chat/users", { toastOnError: false });
  chatState.update((state) => ({ ...state, users: payload.users ?? [] }));
};

const loadMessages = async (conversationId: string) => {
  const payload = await apiFetch<{
    messages: Array<{
      id: string;
      conversation_id: string;
      sender_id: string;
      sender_username: string;
      content: string;
      created_at: string;
      read_at: string | null;
      readers: string[];
    }>;
  }>(`/api/chat/conversations/${encodeURIComponent(conversationId)}/messages?limit=250`, { toastOnError: false });

  const me = get(session)?.id;
  const mapped = (payload.messages ?? []).map((item) => ({
    localId: item.id,
    id: item.id,
    clientId: null,
    conversationId: item.conversation_id,
    senderId: item.sender_id,
    senderName: item.sender_username,
    content: item.content,
    createdAt: item.created_at,
    status:
      item.sender_id === me && Array.isArray(item.readers) && item.readers.some((id) => id !== item.sender_id)
        ? ("read" as const)
        : ("delivered" as const),
    readAt: item.read_at,
    readers: item.readers ?? []
  }));

  chatState.update((state) => ({
    ...state,
    messagesByConversation: {
      ...state.messagesByConversation,
      [conversationId]: sortMessages(mapped)
    }
  }));
};

const refreshConversations = async () => {
  const payload = await apiFetch<{ conversations: ChatConversation[] }>("/api/chat/conversations", { toastOnError: false });
  const list = payload.conversations ?? [];
  const prevActive = get(chatState).activeConversationId;
  const nextActive = prevActive && list.some((c) => c.id === prevActive) ? prevActive : list[0]?.id ?? null;
  chatState.update((state) => ({
    ...state,
    conversations: list,
    activeConversationId: nextActive
  }));
  if (nextActive) {
    await loadMessages(nextActive);
    chatSocket.joinRoom(nextActive);
  }
};

const handleServerMessage = (envelope: ChatWsServerMessage) => {
  if (envelope.type === "system.ready") {
    lastPongAt = Date.now();
    return;
  }
  if (envelope.type === "pong") {
    lastPongAt = Date.now();
    return;
  }
  if (envelope.type === "error") {
    chatState.update((state) => ({ ...state, lastError: envelope.payload.message || "Chat-Fehler." }));
    return;
  }
  if (envelope.type === "chat.presence") {
    chatState.update((state) => ({
      ...state,
      onlineByConversation: {
        ...state.onlineByConversation,
        [envelope.payload.conversationId]: envelope.payload.onlineUserIds ?? []
      }
    }));
    return;
  }
  if (envelope.type === "chat.typing") {
    const me = get(session)?.id;
    if (envelope.payload.userId === me) return;
    chatState.update((state) => {
      const current = new Set(state.typingByConversation[envelope.payload.conversationId] ?? []);
      if (envelope.payload.isTyping) current.add(envelope.payload.userId);
      else current.delete(envelope.payload.userId);
      return {
        ...state,
        typingByConversation: {
          ...state.typingByConversation,
          [envelope.payload.conversationId]: Array.from(current)
        }
      };
    });
    return;
  }
  if (envelope.type === "chat.delivery") {
    chatState.update((state) => {
      const list = state.messagesByConversation[envelope.payload.conversationId] ?? [];
      const next = list.map((message) => {
        const byClient = envelope.payload.clientId && message.clientId === envelope.payload.clientId;
        const byId = message.id === envelope.payload.messageId;
        if (!byClient && !byId) return message;
        return {
          ...message,
          id: envelope.payload.messageId,
          createdAt: envelope.payload.deliveredAt || message.createdAt,
          status: message.status === "read" ? "read" : "delivered"
        };
      });
      return {
        ...state,
        messagesByConversation: {
          ...state.messagesByConversation,
          [envelope.payload.conversationId]: sortMessages(next)
        }
      };
    });
    return;
  }
  if (envelope.type === "chat.read") {
    chatState.update((state) => {
      const list = state.messagesByConversation[envelope.payload.conversationId] ?? [];
      const next = list.map((message) => {
        if (message.id !== envelope.payload.messageId) return message;
        const readers = Array.from(new Set([...(message.readers ?? []), envelope.payload.userId]));
        const mine = message.senderId === get(session)?.id;
        return {
          ...message,
          readers,
          status: mine && readers.some((id) => id !== message.senderId) ? "read" : message.status
        };
      });
      return {
        ...state,
        messagesByConversation: {
          ...state.messagesByConversation,
          [envelope.payload.conversationId]: next
        }
      };
    });
    return;
  }
  if (envelope.type === "chat.message") {
    const payload = envelope.payload;
    chatState.update((state) => {
      const list = state.messagesByConversation[payload.conversation_id] ?? [];
      if (list.some((message) => message.id === payload.id)) return state;
      const myId = get(session)?.id;
      const optimisticIndex = list.findIndex(
        (message) =>
          message.status === "sending" &&
          message.senderId === myId &&
          message.content === payload.content &&
          Math.abs(new Date(payload.created_at).getTime() - new Date(message.createdAt).getTime()) < 20_000
      );
      let next = list;
      if (optimisticIndex >= 0) {
        next = [...list];
        const base = next[optimisticIndex];
        next[optimisticIndex] = {
          ...base,
          id: payload.id,
          senderName: payload.sender_username,
          createdAt: payload.created_at,
          status: base.status === "read" ? "read" : "delivered"
        };
      } else {
        next = [
          ...list,
          {
            localId: payload.id,
            id: payload.id,
            clientId: null,
            conversationId: payload.conversation_id,
            senderId: payload.sender_id,
            senderName: payload.sender_username,
            content: payload.content,
            createdAt: payload.created_at,
            status: "delivered",
            readAt: null,
            readers: []
          }
        ];
      }
      return {
        ...state,
        messagesByConversation: {
          ...state.messagesByConversation,
          [payload.conversation_id]: sortMessages(next)
        }
      };
    });
    void refreshConversations();
  }
};

export const startChatRealtime = () => {
  if (!browser || started) return;
  started = true;
  lastPongAt = Date.now();

  wsStateUnsub = chatSocket.state.subscribe((socketState) => {
    chatState.update((state) => ({
      ...state,
      socketState,
      connected: socketState === "connected"
    }));
    if (socketState === "connected") {
      lastPongAt = Date.now();
      startHeartbeat();
      void refreshConversations();
      void refreshUsers();
    }
  });

  wsDebugUnsub = chatSocket.debugEvents.subscribe((debugEvents) => {
    chatState.update((state) => ({ ...state, debugEvents }));
  });

  sessionUnsub = session.subscribe((current) => {
    if (!current?.id) {
      chatSocket.disconnect();
      stopHeartbeat();
      chatState.set(initialState);
      return;
    }
    chatSocket.connect();
    void refreshConversations();
    void refreshUsers();
  });

  chatSocket.connect();
};

export const stopChatRealtime = () => {
  chatSocket.disconnect();
  stopHeartbeat();
  sessionUnsub?.();
  wsStateUnsub?.();
  wsDebugUnsub?.();
  sessionUnsub = null;
  wsStateUnsub = null;
  wsDebugUnsub = null;
  started = false;
};

export const refreshChatData = async () => {
  await refreshConversations();
  await refreshUsers();
};

export const selectConversation = async (conversationId: string) => {
  const previous = getActiveConversationId();
  if (previous && previous !== conversationId) {
    chatSocket.leaveRoom(previous);
  }
  chatState.update((state) => ({ ...state, activeConversationId: conversationId }));
  await loadMessages(conversationId);
  chatSocket.joinRoom(conversationId);
};

export const createDirectConversation = async (userId: string) => {
  const payload = await apiFetch<{ conversation_id: string }>("/api/chat/conversations/direct", {
    method: "POST",
    body: JSON.stringify({ user_id: userId })
  });
  await refreshConversations();
  if (payload.conversation_id) {
    await selectConversation(payload.conversation_id);
  }
};

export const createGroupConversation = async (name: string, memberIds: string[]) => {
  const payload = await apiFetch<{ conversation_id: string }>("/api/chat/conversations/group", {
    method: "POST",
    body: JSON.stringify({ name, member_ids: memberIds })
  });
  await refreshConversations();
  if (payload.conversation_id) {
    await selectConversation(payload.conversation_id);
  }
};

export const sendChatMessage = (content: string) => {
  const conversationId = getActiveConversationId();
  const me = get(session);
  const trimmed = String(content || "").trim();
  if (!conversationId || !me?.id || !trimmed) return;

  const clientId = randomId();
  const optimistic: ChatMessageUi = {
    localId: `local-${clientId}`,
    id: null,
    clientId,
    conversationId,
    senderId: me.id,
    senderName: me.username,
    content: trimmed,
    createdAt: new Date().toISOString(),
    status: "sending",
    readAt: null,
    readers: []
  };

  chatState.update((state) => {
    const list = state.messagesByConversation[conversationId] ?? [];
    return {
      ...state,
      lastError: "",
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: sortMessages([...list, optimistic])
      }
    };
  });

  const sent = chatSocket.send({
    type: "chat.send",
    payload: { conversationId, content: trimmed, clientId }
  });
  if (!sent) {
    chatState.update((state) => ({
      ...state,
      lastError: "Nachricht konnte nicht gesendet werden.",
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: (state.messagesByConversation[conversationId] ?? []).map((message) =>
          message.localId === optimistic.localId ? { ...message, status: "failed" } : message
        )
      }
    }));
  } else {
    void refreshConversations();
  }
};

export const retryChatMessage = (localId: string) => {
  const state = get(chatState);
  const conversationId = state.activeConversationId;
  if (!conversationId) return;
  const message = (state.messagesByConversation[conversationId] ?? []).find((item) => item.localId === localId);
  if (!message || message.status !== "failed") return;
  sendChatMessage(message.content);
  chatState.update((nextState) => ({
    ...nextState,
    messagesByConversation: {
      ...nextState.messagesByConversation,
      [conversationId]: (nextState.messagesByConversation[conversationId] ?? []).filter(
        (item) => item.localId !== localId
      )
    }
  }));
};

export const sendTypingState = (isTyping: boolean) => {
  const conversationId = getActiveConversationId();
  if (!conversationId) return;
  if (!get(session)?.id) return;
  chatSocket.send({
    type: "chat.typing",
    payload: { conversationId, isTyping }
  });
};

export const sendReadReceipt = (messageId: string) => {
  const conversationId = getActiveConversationId();
  if (!conversationId || !messageId) return;
  if (!get(session)?.id) return;
  chatSocket.send({
    type: "chat.read",
    payload: { conversationId, messageId }
  });
};

export const chatStore: Readable<ChatState> = {
  subscribe: chatState.subscribe
};

