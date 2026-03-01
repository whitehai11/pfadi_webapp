// engineered by Maro Elias Goth
export type WsUser = {
  id: string;
  username: string;
  role: "admin" | "user" | "materialwart";
};

export type ChatSendPayload = {
  conversationId: string;
  content: string;
  clientId?: string;
};

export type ChatTypingPayload = {
  conversationId: string;
  isTyping: boolean;
};

export type ChatReadPayload = {
  conversationId: string;
  messageId: string;
};

export type ClientEventMap = {
  "chat:send": ChatSendPayload;
  "chat:typing": ChatTypingPayload;
  "chat:read": ChatReadPayload;
};

export type ChatMessageRecord = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  created_at: string;
};

export type ConversationPresence = {
  conversationId: string;
  onlineUserIds: string[];
};

export type ServerEventMap = {
  "chat:receive": ChatMessageRecord;
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
  "chat:presence": ConversationPresence;
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

export type ClientEnvelope<E extends keyof ClientEventMap = keyof ClientEventMap> = {
  event: E;
  data: ClientEventMap[E];
};

export type ServerEnvelope<E extends keyof ServerEventMap = keyof ServerEventMap> = {
  event: E;
  data: ServerEventMap[E];
};
