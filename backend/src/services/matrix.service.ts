// engineered by Maro Elias Goth
import crypto from "node:crypto";
import { db } from "../db/database.js";
import { logger } from "../utils/logger.js";
import { settings } from "../config/settings.js";

const HOMESERVER = settings.matrixHomeserverUrl;
const SERVER_NAME = settings.matrixServerName;
const REG_TOKEN = settings.matrixRegistrationToken;
const BOT_LOCALPART = "pfadi_bot";

async function mxFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${HOMESERVER}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
}

async function registerUser(localpart: string, password: string): Promise<void> {
  // Step 1: start UIA session
  const r1 = await mxFetch("/_matrix/client/v3/register", {
    method: "POST",
    body: JSON.stringify({ kind: "user" })
  });
  const j1 = (await r1.json()) as { session?: string };
  if (!j1.session) throw new Error("Matrix registration: no session returned");

  // Step 2: complete with registration token
  const r2 = await mxFetch("/_matrix/client/v3/register", {
    method: "POST",
    body: JSON.stringify({
      username: localpart,
      password,
      inhibit_login: true,
      auth: {
        type: "m.login.registration_token",
        token: REG_TOKEN,
        session: j1.session
      }
    })
  });
  if (!r2.ok) {
    const err = (await r2.json()) as { error?: string };
    throw new Error(`Matrix registration failed: ${err.error ?? r2.status}`);
  }
}

async function loginUser(localpart: string, password: string): Promise<{ access_token: string; device_id: string }> {
  const r = await mxFetch("/_matrix/client/v3/login", {
    method: "POST",
    body: JSON.stringify({
      type: "m.login.password",
      identifier: { type: "m.id.user", user: localpart },
      password
    })
  });
  if (!r.ok) {
    const err = (await r.json()) as { error?: string };
    throw new Error(`Matrix login failed: ${err.error ?? r.status}`);
  }
  return (await r.json()) as { access_token: string; device_id: string };
}

async function resolveRoomAlias(alias: string): Promise<string | null> {
  const encoded = encodeURIComponent(alias);
  const r = await mxFetch(`/_matrix/client/v3/directory/room/${encoded}`);
  if (!r.ok) return null;
  const body = (await r.json()) as { room_id?: string };
  return body.room_id ?? null;
}

async function inviteUser(botToken: string, roomId: string, matrixUserId: string): Promise<void> {
  await mxFetch(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/invite`, {
    method: "POST",
    headers: { Authorization: `Bearer ${botToken}` },
    body: JSON.stringify({ user_id: matrixUserId })
  });
  // Errors (e.g. already in room) are silently ignored
}

async function joinRoom(token: string, roomId: string): Promise<void> {
  await mxFetch(`/_matrix/client/v3/join/${encodeURIComponent(roomId)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({})
  });
}

async function createPfadiRoom(botToken: string): Promise<string> {
  const alias = `#pfadi:${SERVER_NAME}`;
  const existing = await resolveRoomAlias(alias);
  if (existing) return existing;

  const r = await mxFetch("/_matrix/client/v3/createRoom", {
    method: "POST",
    headers: { Authorization: `Bearer ${botToken}` },
    body: JSON.stringify({
      room_alias_name: "pfadi",
      name: "Pfadi",
      topic: "Pfadi Organisation",
      preset: "public_chat",
      initial_state: [
        {
          type: "m.room.history_visibility",
          content: { history_visibility: "shared" }
        }
      ]
    })
  });
  if (!r.ok) {
    // might have been created between check and create
    const retry = await resolveRoomAlias(alias);
    if (retry) return retry;
    const err = (await r.json()) as { error?: string };
    throw new Error(`Matrix room creation failed: ${err.error ?? r.status}`);
  }
  const body = (await r.json()) as { room_id: string };
  return body.room_id;
}

async function ensureBot(): Promise<{ token: string; roomId: string }> {
  const now = new Date().toISOString();
  const tokenRow = db.prepare("SELECT value FROM settings WHERE key = 'matrix_bot_token'").get() as { value: string } | undefined;
  const roomRow = db.prepare("SELECT value FROM settings WHERE key = 'matrix_room_id'").get() as { value: string } | undefined;
  const pwRow = db.prepare("SELECT value FROM settings WHERE key = 'matrix_bot_password'").get() as { value: string } | undefined;

  let botToken: string;

  if (tokenRow) {
    botToken = tokenRow.value;
  } else {
    const botPassword = pwRow?.value ?? crypto.randomBytes(32).toString("hex");
    if (!pwRow) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('matrix_bot_password', ?, ?)").run(botPassword, now);
    }
    try {
      await registerUser(BOT_LOCALPART, botPassword);
    } catch (e) {
      // User likely already exists — try login anyway
      logger.warn("Matrix bot registration skipped", { reason: e instanceof Error ? e.message : String(e) });
    }
    const { access_token } = await loginUser(BOT_LOCALPART, botPassword);
    botToken = access_token;
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('matrix_bot_token', ?, ?)").run(botToken, now);
  }

  let roomId: string;
  if (roomRow) {
    roomId = roomRow.value;
  } else {
    roomId = await createPfadiRoom(botToken);
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('matrix_room_id', ?, ?)").run(roomId, now);
  }

  return { token: botToken, roomId };
}

function sanitizeLocalpart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 24);
}

export async function provisionMatrixUser(
  userId: string,
  username: string
): Promise<{ matrixUserId: string; accessToken: string; roomId: string; publicUrl: string }> {
  const { roomId } = await ensureBot();

  const existing = db
    .prepare("SELECT matrix_user_id, matrix_password FROM matrix_users WHERE user_id = ?")
    .get(userId) as { matrix_user_id: string; matrix_password: string } | undefined;

  let matrixUserId: string;
  let password: string;

  if (!existing) {
    const localpart = `${sanitizeLocalpart(username)}_${userId.slice(0, 8)}`;
    password = crypto.randomBytes(32).toString("hex");
    matrixUserId = `@${localpart}:${SERVER_NAME}`;

    await registerUser(localpart, password);
    db.prepare("INSERT INTO matrix_users (user_id, matrix_user_id, matrix_password, created_at) VALUES (?, ?, ?, ?)").run(
      userId,
      matrixUserId,
      password,
      new Date().toISOString()
    );
  } else {
    matrixUserId = existing.matrix_user_id;
    password = existing.matrix_password;
  }

  const localpart = matrixUserId.split(":")[0].replace("@", "");
  const { access_token } = await loginUser(localpart, password);

  // Ensure user is in the room
  const { token: botToken } = await ensureBot();
  await inviteUser(botToken, roomId, matrixUserId);
  await joinRoom(access_token, roomId);

  const publicUrl = settings.matrixPublicUrl;
  return { matrixUserId, accessToken: access_token, roomId, publicUrl };
}

export async function createManualMatrixUser(
  localpart: string,
  password: string
): Promise<{ matrixUserId: string }> {
  await registerUser(localpart, password);
  const matrixUserId = `@${localpart}:${SERVER_NAME}`;
  const { token: botToken, roomId } = await ensureBot();
  const { access_token } = await loginUser(localpart, password);
  await inviteUser(botToken, roomId, matrixUserId);
  await joinRoom(access_token, roomId);
  return { matrixUserId };
}
