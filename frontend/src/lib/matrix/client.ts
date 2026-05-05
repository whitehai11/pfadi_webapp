// engineered by Maro Elias Goth
import type { MatrixClient, Room, MatrixEvent } from "matrix-js-sdk";

export type MatrixConfig = {
  homeserver_url: string;
  user_id: string;
  access_token: string;
  room_id: string;
};

export type MxMessage = {
  eventId: string;
  senderId: string;
  senderName: string;
  body: string;
  msgtype: string;
  timestamp: number;
  mxcUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
};

export type MxClientEvents = {
  onSync: (state: string) => void;
  onMessage: (msg: MxMessage, roomId: string) => void;
  onTyping: (users: string[]) => void;
};

let _sdk: typeof import("matrix-js-sdk") | null = null;

async function getSdk() {
  if (!_sdk) _sdk = await import("matrix-js-sdk");
  return _sdk;
}

export function eventToMessage(event: MatrixEvent, room: Room): MxMessage | null {
  if (event.getType() !== "m.room.message") return null;
  const content = event.getContent() as {
    msgtype?: string;
    body?: string;
    url?: string;
    filename?: string;
    info?: { mimetype?: string; size?: number };
  };
  if (!content.msgtype) return null;

  const sender = event.getSender() ?? "";
  const member = room.getMember(sender);
  return {
    eventId: event.getId() ?? "",
    senderId: sender,
    senderName: member?.name ?? sender.split(":")[0].replace("@", ""),
    body: content.body ?? "",
    msgtype: content.msgtype,
    timestamp: event.getTs(),
    mxcUrl: content.url ?? null,
    fileName: content.filename ?? content.body ?? null,
    fileType: content.info?.mimetype ?? null,
    fileSize: content.info?.size ?? null
  };
}

export async function createMatrixClient(config: MatrixConfig, handlers: MxClientEvents): Promise<MatrixClient> {
  const sdk = await getSdk();

  const client = sdk.createClient({
    baseUrl: config.homeserver_url,
    accessToken: config.access_token,
    userId: config.user_id,
    useAuthorizationHeader: true
  });

  client.on(sdk.ClientEvent.Sync as never, (state: string) => {
    handlers.onSync(state);
  });

  // Timeline fires for both historical (during initial sync) and live events.
  // The store deduplicates by eventId, so this is safe.
  client.on(sdk.RoomEvent.Timeline as never, (event: MatrixEvent, room: Room | undefined) => {
    if (!room) return;
    if (event.isRedacted()) return;
    const msg = eventToMessage(event, room);
    if (msg) handlers.onMessage(msg, room.roomId);
  });

  client.on(sdk.RoomEvent.MyMembership as never, (room: Room, membership: string) => {
    if (membership === "invite") {
      client.joinRoom(room.roomId).catch(() => undefined);
    }
  });

  client.on(sdk.RoomMemberEvent.Typing as never, (_event: MatrixEvent, member: { roomId: string; typing: boolean; name: string; userId: string }) => {
    if (member.roomId !== config.room_id) return;
    const room = client.getRoom(config.room_id);
    if (!room) return;
    const typing = room
      .getMembersWithMembership("join")
      .filter((m) => m.typing && m.userId !== config.user_id)
      .map((m) => m.name ?? m.userId);
    handlers.onTyping(typing);
  });

  await client.startClient({ initialSyncLimit: 80 });
  // Auto-join the pfadi room
  client.joinRoom(config.room_id).catch(() => undefined);

  return client;
}

export async function sendText(client: MatrixClient, roomId: string, text: string): Promise<void> {
  await client.sendTextMessage(roomId, text);
}

export async function sendTyping(client: MatrixClient, roomId: string, typing: boolean): Promise<void> {
  await client.sendTyping(roomId, typing, 5000);
}

export async function uploadAndSend(
  client: MatrixClient,
  roomId: string,
  file: File
): Promise<void> {
  const sdk = await getSdk();

  const uploadRes = await client.uploadContent(file, {
    name: file.name,
    type: file.type,
    progressHandler: () => undefined
  });

  const mxcUrl = uploadRes.content_uri;
  const isImage = file.type.startsWith("image/");

  if (isImage) {
    await client.sendImageMessage(roomId, mxcUrl, {
      mimetype: file.type,
      size: file.size
    }, file.name);
  } else {
    await client.sendMessage(roomId, {
      msgtype: sdk.MsgType.File,
      body: file.name,
      filename: file.name,
      url: mxcUrl,
      info: { mimetype: file.type, size: file.size }
    });
  }
}

export function mxcToHttp(mxcUrl: string, homeserverUrl: string): string {
  const stripped = mxcUrl.replace("mxc://", "");
  return `${homeserverUrl}/_matrix/media/v3/download/${stripped}`;
}
