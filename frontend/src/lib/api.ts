import { authHeader } from "./auth";

const baseUrl = "";

export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const hasBody = options.body !== undefined && options.body !== null;
  const headers = {
    ...authHeader(),
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {})
  } as Record<string, string>;

  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }
  if (response.status === 204) return null;
  return response.json();
};
