export const API_BASE_URL = (globalThis.localStorage?.getItem("API_BASE_URL") ||
  globalThis.API_BASE_URL ||
  "http://localhost:3001").replace(/\/+$/, "");

