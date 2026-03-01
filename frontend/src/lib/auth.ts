// engineered by Maro Elias Goth
import { writable } from "svelte/store";

export type UserSession = {
  id: string;
  username: string;
  role: "admin" | "dev" | "user" | "materialwart";
  status?: "approved";
  avatarUrl?: string | null;
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
  const parsed = parseToken(token);
  if (!parsed) {
    session.set(null);
    return;
  }
  session.update((current) => ({
    ...parsed,
    avatarUrl: current?.avatarUrl ?? null
  }));
};

export const clearToken = () => {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(tokenKey);
  session.set(null);
};

export const restoreSession = () => {
  const token = getToken();
  if (token) {
    const parsed = parseToken(token);
    if (!parsed) {
      clearToken();
      return;
    }
    session.update((current) => ({
      ...parsed,
      avatarUrl: current?.avatarUrl ?? null
    }));
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

export const setSessionProfile = (profile: { username?: string; role?: UserSession["role"]; avatarUrl?: string | null }) => {
  session.update((current) => {
    if (!current) return current;
    return {
      ...current,
      username: profile.username ?? current.username,
      role: profile.role ?? current.role,
      avatarUrl: profile.avatarUrl ?? null
    };
  });
};

export const roleLabel = (role: UserSession["role"]) => {
  if (role === "user") return "Nutzer";
  if (role === "admin") return "Admin";
  if (role === "dev") return "Dev";
  return "Materialwart";
};
