import "dotenv/config";

export type AppSettings = {
  port: number;
  host: string;
  databasePath: string;
  jwtSecret: string;
  allowedOrigins: string[];
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
  baseUrl: string;
  adminEmails: string[];
  dataDir: string;
};

const parseList = (value: string | undefined): string[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const settings: AppSettings = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "0.0.0.0",
  databasePath: process.env.DATABASE_PATH ?? "./data/pfadi.db",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  allowedOrigins: parseList(process.env.ALLOWED_ORIGINS),
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:admin@example.org",
  baseUrl: process.env.BASE_URL ?? "http://localhost:3000",
  adminEmails: parseList(process.env.ADMIN_EMAILS),
  dataDir: process.env.DATA_DIR ?? "./data"
};

if (!settings.jwtSecret || settings.jwtSecret.length < 16) {
  console.warn("JWT_SECRET is weak; set a strong value in production.");
}
