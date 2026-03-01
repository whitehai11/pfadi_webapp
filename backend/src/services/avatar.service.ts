// engineered by Maro Elias Goth
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db, nowIso } from "../db/database.js";
import { settings } from "../config/settings.js";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

const ensureAvatarDir = () => {
  const dir = path.resolve(settings.dataDir, "uploads", "avatars");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

export const getAvatarUploadDir = () => ensureAvatarDir();

export const isAllowedAvatarMime = (mimeType: string) => allowedMimeTypes.has(mimeType);

const resolveUserAvatarPath = (avatarPath: string | null | undefined) => {
  if (!avatarPath) return null;
  const resolved = path.resolve(avatarPath);
  const uploadDir = path.resolve(getAvatarUploadDir());
  const relative = path.relative(uploadDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return resolved;
};

const removeAvatarFileSafe = async (avatarPath: string | null | undefined) => {
  const resolved = resolveUserAvatarPath(avatarPath);
  if (!resolved) return;
  await fs.promises.rm(resolved, { force: true });
};

export const storeUserAvatar = async (userId: string, input: { buffer: Buffer; mimeType: string }) => {
  if (!isAllowedAvatarMime(input.mimeType)) {
    throw new Error("Dateityp nicht erlaubt. Nur PNG, JPG oder WEBP.");
  }
  if (input.buffer.byteLength > AVATAR_MAX_BYTES) {
    throw new Error("Datei ist zu gross. Maximal 2 MB.");
  }

  const uploadDir = getAvatarUploadDir();
  const filename = `${randomUUID()}.webp`;
  const absolutePath = path.join(uploadDir, filename);

  const processed = await sharp(input.buffer, { failOn: "error" })
    .rotate()
    .resize(256, 256, {
      fit: "cover",
      position: "attention"
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  await fs.promises.writeFile(absolutePath, processed);

  const current = db
    .prepare("SELECT avatar_path FROM users WHERE id = ?")
    .get(userId) as { avatar_path: string | null } | undefined;

  if (!current) {
    await fs.promises.rm(absolutePath, { force: true });
    throw new Error("Benutzer nicht gefunden.");
  }

  const now = nowIso();
  db.prepare("UPDATE users SET avatar_path = ?, avatar_updated_at = ?, updated_at = ? WHERE id = ?").run(
    absolutePath,
    now,
    now,
    userId
  );

  if (current.avatar_path && current.avatar_path !== absolutePath) {
    await removeAvatarFileSafe(current.avatar_path);
  }

  return { avatarPath: absolutePath, avatarUpdatedAt: now };
};

export const deleteUserAvatar = async (userId: string) => {
  const current = db
    .prepare("SELECT avatar_path FROM users WHERE id = ?")
    .get(userId) as { avatar_path: string | null } | undefined;
  if (!current) {
    throw new Error("Benutzer nicht gefunden.");
  }

  if (current.avatar_path) {
    await removeAvatarFileSafe(current.avatar_path);
  }

  const now = nowIso();
  db.prepare("UPDATE users SET avatar_path = NULL, avatar_updated_at = ?, updated_at = ? WHERE id = ?").run(
    now,
    now,
    userId
  );
  return { avatarPath: null, avatarUpdatedAt: now };
};

export const getUserAvatarRecord = (userId: string) => {
  return db
    .prepare("SELECT id, avatar_path, avatar_updated_at FROM users WHERE id = ?")
    .get(userId) as { id: string; avatar_path: string | null; avatar_updated_at: string | null } | undefined;
};

export const getAvatarPublicUrl = (userId: string, avatarUpdatedAt: string | null | undefined) => {
  if (!avatarUpdatedAt) return null;
  return `/api/users/${encodeURIComponent(userId)}/avatar?v=${encodeURIComponent(avatarUpdatedAt)}`;
};

export const getAvatarFilePathForUser = (userId: string) => {
  const record = getUserAvatarRecord(userId);
  if (!record?.avatar_path) return null;
  const resolved = resolveUserAvatarPath(record.avatar_path);
  if (!resolved || !fs.existsSync(resolved)) return null;
  return resolved;
};
