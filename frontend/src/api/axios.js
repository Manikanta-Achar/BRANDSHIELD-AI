import axios from "axios";
import { resolveApiBaseUrl } from "./config.js";

export const api = axios.create({
  baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL, {
    production: import.meta.env.PROD,
  }),
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});
// API tokens are scoped to this browser tab. Demo identities never reach the API.
export function setAccessToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.startsWith("/auth/"))
      window.dispatchEvent(new Event("brandshield:unauthorized"));
    const detail = error.response?.data?.detail;
    const validation = Array.isArray(detail)
      ? detail
          .map((item) => `${item.loc?.join(".") || "Request"}: ${item.msg}`)
          .join("; ")
      : "";
    const message =
      typeof detail === "string"
        ? detail
        : validation ||
          (error.response
            ? `API request failed (${error.response.status}). ${error.response.data?.message || "Please try again."}`
            : "Cannot reach the API. Check your connection or contact your administrator. No demo fallback was used.");
    return Promise.reject(new Error(message));
  },
);
