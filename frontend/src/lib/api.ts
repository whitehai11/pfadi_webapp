// engineered by Maro Elias Goth
import { authHeader, clearToken, setToken } from "./auth";
import { pushToast } from "./toast";

const baseUrl = "";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type ApiFetchOptions = RequestInit & {
  toastOnError?: boolean;
  skipAuthRefresh?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

const shouldSkipRefreshForPath = (path: string) =>
  path.startsWith("/api/auth/login") ||
  path.startsWith("/api/auth/register") ||
  path.startsWith("/api/auth/refresh") ||
  path.startsWith("/api/auth/logout");

const parseErrorMessage = async (response: Response) => {
  const text = await response.text();
  let parsed: { error?: string; message?: string } | null = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  return parsed?.error || parsed?.message || text || "Request failed";
};

const refreshAccessToken = async (): Promise<boolean> => {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
      if (!response.ok) {
        clearToken();
        return false;
      }
      const json = (await response.json()) as ApiEnvelope<{ token?: string }> | { token?: string };
      const token =
        json && typeof json === "object" && "success" in json
          ? (json as ApiEnvelope<{ token?: string }>).data?.token
          : (json as { token?: string })?.token;
      if (!token) {
        clearToken();
        return false;
      }
      setToken(token);
      return true;
    } catch {
      clearToken();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

export const apiFetch = async <T = any>(path: string, options: ApiFetchOptions = {}): Promise<T> => {
  const { toastOnError = true, skipAuthRefresh = false, ...requestOptions } = options;
  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const buildHeaders = () =>
    ({
      ...authHeader(),
      ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(requestOptions.headers || {})
    }) as Record<string, string>;

  let response = await fetch(`${baseUrl}${path}`, { ...requestOptions, headers: buildHeaders() });
  if (
    response.status === 401 &&
    !skipAuthRefresh &&
    !shouldSkipRefreshForPath(path)
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await fetch(`${baseUrl}${path}`, { ...requestOptions, headers: buildHeaders() });
    }
  }
  if (!response.ok) {
    const errorMessage = await parseErrorMessage(response);
    if (toastOnError) {
      pushToast(errorMessage, "error");
    }
    throw new Error(errorMessage);
  }
  if (response.status === 204) return null as T;

  const json = (await response.json()) as ApiEnvelope<T> | T;
  if (json && typeof json === "object" && "success" in json) {
    const envelope = json as ApiEnvelope<T>;
    if (envelope.success === false) {
      const errorMessage = envelope.message || "Request failed";
      if (toastOnError) {
        pushToast(errorMessage, "error");
      }
      throw new Error(errorMessage);
    }
    return (envelope.data as T) ?? (null as T);
  }
  return json as T;
};
