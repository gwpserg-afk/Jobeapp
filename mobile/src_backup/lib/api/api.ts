import { authClient } from "../auth/auth-client";

const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;

const request = async <T>(
  url: string,
  options: { method?: string; body?: string } = {}
): Promise<T> => {
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Cookie: authClient.getCookie(),
    },
  });

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const json = await response.json();
    if (!response.ok) {
      const message = json?.error?.message ?? json?.message ?? `Request failed with status ${response.status}`;
      throw new Error(message);
    }
    return json.data !== undefined ? json.data : json;
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return undefined as T;
};

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
};
