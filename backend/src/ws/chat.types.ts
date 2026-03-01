// engineered by Maro Elias Goth
export type WsUser = {
  id: string;
  username: string;
  role: "admin" | "dev" | "user" | "materialwart";
};

export type ChatMessageRecord = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  created_at: string;
};

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
  | { type: "chat.message"; payload: ChatMessageRecord }
  | {
      type: "chat.delivery";
      payload: { conversationId: string; messageId: string; clientId?: string; deliveredAt: string };
    }
  | { type: "chat.typing"; payload: { conversationId: string; userId: string; isTyping: boolean } }
  | { type: "chat.read"; payload: { conversationId: string; messageId: string; userId: string; readAt: string } }
  | { type: "chat.presence"; payload: { conversationId: string; onlineUserIds: string[] } }
  | { type: "error"; payload: { code: string; message: string } };

