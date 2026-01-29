import crypto from "node:crypto";
const scryptAsync = (password, salt, keylen) => {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
            if (err)
                reject(err);
            else
                resolve(derivedKey);
        });
    });
};
export const hashPassword = async (password) => {
    const salt = crypto.randomBytes(16).toString("base64");
    const derived = await scryptAsync(password, salt, 64);
    return `${salt}$${derived.toString("base64")}`;
};
export const verifyPassword = async (password, stored) => {
    const [salt, hash] = stored.split("$");
    if (!salt || !hash)
        return false;
    const derived = await scryptAsync(password, salt, 64);
    const hashBuf = Buffer.from(hash, "base64");
    if (hashBuf.length !== derived.length)
        return false;
    return crypto.timingSafeEqual(hashBuf, derived);
};
