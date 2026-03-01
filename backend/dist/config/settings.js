// engineered by Maro Elias Goth
import "dotenv/config";
import { z } from "zod";
const parseList = (value) => {
    if (!value)
        return [];
    return value
        .split(",")
        .map((item) => item.trim())
        .map((item) => item.toLowerCase())
        .filter(Boolean);
};
const toPositiveInt = (value, defaultValue) => {
    if (value === undefined || value === null || value === "")
        return defaultValue;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0)
        return Number.NaN;
    return parsed;
};
const envSchema = z.object({
    PORT: z.preprocess((value) => toPositiveInt(value, 4000), z.number().int().min(1).max(65535)),
    HOST: z.string().trim().min(1).default("0.0.0.0"),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    DATABASE_PATH: z.string().trim().min(1).default("./data/pfadi.db"),
    JWT_SECRET: z.string().trim().min(1).default("dev-secret-change-me"),
    ALLOWED_ORIGINS: z.string().optional(),
    VAPID_PUBLIC_KEY: z.string().default(""),
    VAPID_PRIVATE_KEY: z.string().default(""),
    VAPID_SUBJECT: z.string().trim().default("mailto:admin@example.org"),
    BASE_URL: z.string().url().default("http://localhost:3000"),
    ADMIN_EMAILS: z.string().optional(),
    ADMIN_BOOTSTRAP_TOKEN: z.string().trim().optional(),
    DATA_DIR: z.string().trim().min(1).default("./data"),
    CHAT_UPLOAD_MAX_BYTES: z.preprocess((value) => toPositiveInt(value, 10 * 1024 * 1024), z.number().int().min(1024)),
    SHUTDOWN_TIMEOUT_MS: z.preprocess((value) => toPositiveInt(value, 15000), z.number().int().min(1000).max(60000))
});
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    const details = parsedEnv.error.issues
        .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
        .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
}
const env = parsedEnv.data;
const deployEnvRaw = String(process.env.DEPLOY_ENV || process.env.APP_ENV || env.NODE_ENV).trim().toLowerCase();
const hardeningRequired = env.NODE_ENV === "production" || deployEnvRaw === "staging";
const weakSecrets = new Set(["dev-secret-change-me", "changeme", "default", "secret", "jwt-secret"]);
if (hardeningRequired) {
    if (env.JWT_SECRET.length < 32) {
        throw new Error("Invalid environment configuration: JWT_SECRET must be at least 32 characters in production/staging.");
    }
    if (weakSecrets.has(env.JWT_SECRET.toLowerCase())) {
        throw new Error("Invalid environment configuration: JWT_SECRET uses a weak/default value in production/staging.");
    }
}
const allowedOrigins = parseList(env.ALLOWED_ORIGINS).filter((origin) => {
    try {
        // validate configured origins early so CORS behavior is deterministic
        new URL(origin);
        return true;
    }
    catch {
        return false;
    }
});
if (env.NODE_ENV === "production" && allowedOrigins.length === 0) {
    throw new Error("Invalid environment configuration: ALLOWED_ORIGINS must be set in production.");
}
export const settings = {
    port: env.PORT,
    host: env.HOST,
    nodeEnv: env.NODE_ENV,
    logLevel: env.LOG_LEVEL,
    databasePath: env.DATABASE_PATH,
    jwtSecret: env.JWT_SECRET,
    allowedOrigins,
    vapidPublicKey: env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: env.VAPID_PRIVATE_KEY,
    vapidSubject: env.VAPID_SUBJECT,
    baseUrl: env.BASE_URL,
    adminEmails: parseList(env.ADMIN_EMAILS),
    adminBootstrapToken: env.ADMIN_BOOTSTRAP_TOKEN ?? "",
    dataDir: env.DATA_DIR,
    chatUploadMaxBytes: env.CHAT_UPLOAD_MAX_BYTES,
    shutdownTimeoutMs: env.SHUTDOWN_TIMEOUT_MS
};
