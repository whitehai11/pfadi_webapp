import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { settings } from "../config/settings.js";
const ensureDir = (filePath) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};
ensureDir(settings.databasePath);
export const db = new Database(settings.databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
export const nowIso = () => new Date().toISOString();
export const runInTransaction = (fn) => {
    const transaction = db.transaction(fn);
    return transaction();
};
