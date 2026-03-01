import { w as writable } from "./index.js";
const tokenKey = "pfadi_token";
const session = writable(null);
const getToken = () => {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(tokenKey);
};
const setToken = (token) => {
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
const clearToken = () => {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(tokenKey);
  session.set(null);
};
const parseToken = (token) => {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return { id: decoded.id, username: decoded.username ?? decoded.email, role: decoded.role };
  } catch {
    return null;
  }
};
const authHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
const roleLabel = (role) => {
  if (role === "user") return "Nutzer";
  if (role === "admin") return "Admin";
  return "Materialwart";
};
export {
  session as a,
  authHeader as b,
  clearToken as c,
  roleLabel as r,
  setToken as s
};
