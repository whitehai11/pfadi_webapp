import { w as writable } from "./index.js";
const tokenKey = "pfadi_token";
const session = writable(null);
const getToken = () => {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(tokenKey);
};
const clearToken = () => {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(tokenKey);
  session.set(null);
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
  authHeader as a,
  clearToken as c,
  roleLabel as r,
  session as s
};
