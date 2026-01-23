import crypto from "node:crypto";

const scryptAsync = (password: string, salt: string, keylen: number): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.randomBytes(16).toString("base64");
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}$${derived.toString("base64")}`;
};

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const [salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const derived = await scryptAsync(password, salt, 64);
  const hashBuf = Buffer.from(hash, "base64");
  if (hashBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(hashBuf, derived);
};
