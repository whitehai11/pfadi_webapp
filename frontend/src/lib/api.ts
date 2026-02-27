import { authHeader } from "./auth";

const baseUrl = "";

export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...authHeader(),
    ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {})
  } as Record<string, string>;

  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    const text = await response.text();
    let parsed: { error?: string; message?: string } | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    throw new Error(parsed?.error || parsed?.message || text || "Request failed");
  }
  if (response.status === 204) return null;
  return response.json();
};
