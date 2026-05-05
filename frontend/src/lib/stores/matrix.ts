// engineered by Maro Elias Goth
import { writable, get } from "svelte/store";
import type { MatrixClient } from "matrix-js-sdk";
import type { MxMessage, MatrixConfig } from "$lib/matrix/client";
import { apiFetch } from "$lib/api";

export type MxRoom = {
  roomId: string;
  name: string;
  isDM: boolean;
  dmPartnerId?: string;
  unread: number;
};

export type MatrixState = {
  status: "idle" | "connecting" | "ready" | "error";
  rooms: MxRoom[];
  activeRoomId: string | null;
  messages: Record<string, MxMessage[]>;
  typing: string[];
  homeserverUrl: string | null;
  userId: string | null;
  error: string | null;
};

const initial: MatrixState = {
  status: "idle",
  rooms: [],
  activeRoomId: null,
  messages: {},
  typing: [],
  homeserverUrl: null,
  userId: null,
  error: null
};

export const matrixStore = writable<MatrixState>(initial);

let _client: MatrixClient | null = null;
let _config: MatrixConfig | null = null;
let _synced = false;

function _sendBrowserNotification(sender: string, body: string, roomName: string) {
  if (!("Notification" in window)) return;
  const show = () => {
    const truncated = body.length > 80 ? body.slice(0, 80) + "…" : body;
    new Notification(`${sender} — ${roomName}`, {
      body: truncated,
      icon: "/favicon.png",
      tag: "matrix-msg"
    });
  };
  if (Notification.permission === "granted") {
    show();
  } else if (Notification.permission === "default") {
    Notification.requestPermission().then((p) => { if (p === "granted") show(); });
  }
}

function isDMRoom(client: MatrixClient, roomId: string, myUserId: string): { isDM: boolean; partnerId?: string } {
  const room = client.getRoom(roomId);
  if (!room) return { isDM: false };
  const members = room.getMembers().filter((m) => m.membership === "join" || m.membership === "invite");
  if (members.length === 2) {
    const partner = members.find((m) => m.userId !== myUserId);
    if (partner) return { isDM: true, partnerId: partner.userId };
  }
  return { isDM: false };
}

function getRoomName(client: MatrixClient, roomId: string, myUserId: string): string {
  const room = client.getRoom(roomId);
  if (!room) return roomId;
  const name = room.name;
  if (name && name !== roomId) return name;
  // For unnamed rooms, use partner name for DMs
  const { isDM, partnerId } = isDMRoom(client, roomId, myUserId);
  if (isDM && partnerId) {
    return partnerId.split(":")[0].replace("@", "");
  }
  return roomId.slice(1, 9);
}

function syncRooms(client: MatrixClient, myUserId: string) {
  const joined = client.getRooms().filter((r) => r.getMyMembership() === "join");
  const rooms: MxRoom[] = joined
    .map((r) => {
      const { isDM, partnerId } = isDMRoom(client, r.roomId, myUserId);
      // Skip self-DMs
      if (isDM && partnerId === myUserId) return null;
      return {
        roomId: r.roomId,
        name: getRoomName(client, r.roomId, myUserId),
        isDM,
        dmPartnerId: partnerId,
        unread: r.getUnreadNotificationCount() ?? 0
      };
    })
    .filter((r): r is MxRoom => r !== null);
  matrixStore.update((s) => ({ ...s, rooms }));
}

export async function startMatrix(): Promise<void> {
  if (get(matrixStore).status === "connecting" || get(matrixStore).status === "ready") return;
  matrixStore.update((s) => ({ ...s, status: "connecting", error: null }));

  try {
    const res = await apiFetch<MatrixConfig>("/api/matrix/config");
    _config = res;
    matrixStore.update((s) => ({
      ...s,
      activeRoomId: res.room_id,
      homeserverUrl: res.homeserver_url,
      userId: res.user_id
    }));

    const { createMatrixClient } = await import("$lib/matrix/client");
    _client = await createMatrixClient(res, {
      onSync: (state) => {
        if (state === "PREPARED" || state === "SYNCING") {
          matrixStore.update((s) => ({ ...s, status: "ready" }));
          if (_client && res.user_id) syncRooms(_client, res.user_id);
          if (state === "SYNCING") _synced = true;
        } else if (state === "ERROR") {
          matrixStore.update((s) => ({ ...s, status: "error", error: "Verbindungsfehler." }));
        }
      },
      onMessage: (msg, roomId) => {
        let isNew = false;
        matrixStore.update((s) => {
          const roomMsgs = s.messages[roomId] ?? [];
          const exists = roomMsgs.some((m) => m.eventId === msg.eventId);
          if (exists) return s;
          isNew = true;
          const updated = [...roomMsgs, msg].sort((a, b) => a.timestamp - b.timestamp);
          return { ...s, messages: { ...s.messages, [roomId]: updated } };
        });
        // sync room list on new message (updates last message / unread)
        if (_client && res.user_id) syncRooms(_client, res.user_id);
        // notifications for messages from others (only after initial sync)
        if (isNew && msg.senderId !== res.user_id && _synced) {
          const state = get(matrixStore);
          const room = _client?.getRoom(roomId);
          const roomName = room?.name ?? "Chat";
          const isActive = state.activeRoomId === roomId && document.visibilityState === "visible";
          if (!isActive) {
            _sendBrowserNotification(msg.senderName, msg.body, roomName);
          }
          // Web Push relay for users not currently in the browser
          void apiFetch("/api/matrix/push-relay", {
            method: "POST",
            body: JSON.stringify({ senderName: msg.senderName, roomName, body: msg.body }),
            toastOnError: false
          }).catch(() => undefined);
        }
      },
      onTyping: (users) => {
        matrixStore.update((s) => ({ ...s, typing: users }));
      }
    });
  } catch (e) {
    matrixStore.update((s) => ({
      ...s,
      status: "error",
      error: e instanceof Error ? e.message : "Matrix-Verbindung fehlgeschlagen."
    }));
  }
}

export function setActiveRoom(roomId: string) {
  matrixStore.update((s) => ({ ...s, typing: [], activeRoomId: roomId }));
}

export async function sendMessage(text: string): Promise<void> {
  if (!_client) return;
  const roomId = get(matrixStore).activeRoomId;
  if (!roomId) return;
  const { sendText } = await import("$lib/matrix/client");
  await sendText(_client, roomId, text);
}

export async function sendFile(file: File): Promise<void> {
  if (!_client) return;
  const roomId = get(matrixStore).activeRoomId;
  if (!roomId) return;
  const { uploadAndSend } = await import("$lib/matrix/client");
  await uploadAndSend(_client, roomId, file);
}

export async function setTyping(typing: boolean): Promise<void> {
  if (!_client) return;
  const roomId = get(matrixStore).activeRoomId;
  if (!roomId) return;
  const { sendTyping } = await import("$lib/matrix/client");
  await sendTyping(_client, roomId, typing).catch(() => undefined);
}

export async function createGroup(name: string): Promise<string> {
  if (!_client) throw new Error("Nicht verbunden");
  const res = await _client.createRoom({
    name,
    preset: "private_chat" as never,
    visibility: "private" as never
  });
  if (_config) syncRooms(_client, _config.user_id);
  return res.room_id;
}

export async function startDM(targetMatrixId: string): Promise<string> {
  if (!_client || !_config) throw new Error("Nicht verbunden");
  // Check if DM room already exists
  const existing = _client.getRooms().find((r) => {
    const members = r.getMembers();
    return (
      r.getMyMembership() === "join" &&
      members.length === 2 &&
      members.some((m) => m.userId === targetMatrixId)
    );
  });
  if (existing) return existing.roomId;

  const res = await _client.createRoom({
    invite: [targetMatrixId],
    preset: "private_chat" as never,
    is_direct: true,
    // Explicitly no encryption
    initial_state: [] as never
  });
  syncRooms(_client, _config.user_id);
  return res.room_id;
}

export function stopMatrix(): void {
  if (_client) {
    _client.stopClient();
    _client = null;
  }
  _config = null;
  _synced = false;
  matrixStore.set(initial);
}
