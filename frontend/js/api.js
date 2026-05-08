import { API_BASE_URL } from "./config.js";

async function request(path, { method = "GET", query, body, headers } = {}) {
  const url = new URL(API_BASE_URL + path);

  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && payload.message) ||
      (typeof payload === "string" && payload) ||
      `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export const api = {
  baseUrl: API_BASE_URL,
  get: (path, options) => request(path, { ...(options || {}), method: "GET" }),
  post: (path, body, options) =>
    request(path, { ...(options || {}), method: "POST", body }),
  put: (path, body, options) =>
    request(path, { ...(options || {}), method: "PUT", body }),
  del: (path, options) => request(path, { ...(options || {}), method: "DELETE" }),
};

