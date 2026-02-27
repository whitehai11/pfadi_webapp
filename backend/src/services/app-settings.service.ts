import { db, nowIso } from "../db/database.js";

export const getSettingValue = (key: string): string | null => {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
};

export const getBooleanSetting = (key: string, fallback = false): boolean => {
  const value = getSettingValue(key);
  if (value === null) return fallback;
  return value === "true";
};

export const setBooleanSetting = (key: string, value: boolean) => {
  db.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
  ).run(key, value ? "true" : "false", nowIso());
};
