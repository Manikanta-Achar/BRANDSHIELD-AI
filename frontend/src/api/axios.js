import axios from "axios";
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});
// API tokens are session-only. Demo identities are never sent to the API.
export function setAccessToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
            : "Cannot reach the API. Start your FastAPI service. No demo fallback was used.");
    return Promise.reject(new Error(message));
  },
);
