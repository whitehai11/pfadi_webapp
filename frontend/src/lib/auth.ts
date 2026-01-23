import { writable } from "svelte/store";

export type UserSession = {
  id: string;
  username: string;
  role: "admin" | "user" | "materialwart";
};

const tokenKey = "pfadi_token";

export const session = writable<UserSession | null>(null);

export const getToken = (): string | null => {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(tokenKey);
};

export const setToken = (token: string) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(tokenKey, token);
  session.set(parseToken(token));
};

export const clearToken = () => {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(tokenKey);
  session.set(null);
};

export const restoreSession = () => {
  const token = getToken();
  if (token) {
    session.set(parseToken(token));
  }
};

const parseToken = (token: string): UserSession | null => {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return { id: decoded.id, username: decoded.username ?? decoded.email, role: decoded.role } as UserSession;
  } catch {
    return null;
  }
};

export const authHeader = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
