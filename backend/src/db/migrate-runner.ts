import fs from "node:fs";
import path from "node:path";
import { db, nowIso } from "./database.js";

export const applyMigrations = () => {
  const migrationsDir = path.resolve("./src/db/migrations");
  db.exec(`CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL
  );`);

  const appliedRows = db.prepare("SELECT name FROM migrations").all() as { name: string }[];
  const applied = new Set(appliedRows.map((row) => row.name));
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const transaction = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO migrations (name, applied_at) VALUES (?, ?)").run(file, nowIso());
    });
    transaction();
    console.log(`Applied migration ${file}`);
  }
};
