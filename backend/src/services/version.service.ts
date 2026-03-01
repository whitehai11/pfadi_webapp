// engineered by Maro Elias Goth
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { settings } from "../config/settings.js";

const versionSchema = z
  .object({
    version: z.string().trim().min(1).max(120),
    commit: z.string().trim().min(1).max(120),
    updated_at: z.string().trim().min(1).max(80)
  })
  .strict();

export type SystemVersion = z.infer<typeof versionSchema>;

const candidatePaths = () => [
  path.resolve(settings.dataDir, "version.json"),
  path.resolve(process.cwd(), "version.json"),
  path.resolve(process.cwd(), "..", "version.json"),
  "/app/version.json"
];

export const getSystemVersion = (): SystemVersion | null => {
  for (const filePath of candidatePaths()) {
    if (!fs.existsSync(filePath)) continue;

    try {
      const parsed = versionSchema.safeParse(JSON.parse(fs.readFileSync(filePath, "utf-8")));
      if (parsed.success) {
        return parsed.data;
      }
    } catch {
      continue;
    }
  }

  return null;
};
