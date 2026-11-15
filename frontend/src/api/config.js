const DEVELOPMENT_API_URL = "http://localhost:8000/api/v1";

export function resolveApiBaseUrl(value, { production = false } = {}) {
  const configured = value?.trim();
  if (!configured && production)
    throw new Error(
      "Set VITE_API_BASE_URL to the deployed backend URL before building.",
    );

  let url;
  try {
    url = new URL(configured || DEVELOPMENT_API_URL);
  } catch {
    throw new Error(
      "VITE_API_BASE_URL must be an absolute HTTP or HTTPS backend URL.",
    );
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "VITE_API_BASE_URL must be an HTTP or HTTPS URL without credentials, query or fragment.",
    );

  const local =
    url.hostname === "localhost" ||
    url.hostname.endsWith(".localhost") ||
    url.hostname === "[::1]" ||
    url.hostname === "0.0.0.0" ||
    /^127\./.test(url.hostname);
  if (production && (url.protocol !== "https:" || local))
    throw new Error(
      "Production VITE_API_BASE_URL must use HTTPS and a deployed backend, not localhost.",
    );

  const path = url.pathname.replace(/\/+$/, "");
  if (path && path !== "/api/v1")
    throw new Error(
      "VITE_API_BASE_URL must be the backend origin or include /api/v1 exactly once.",
    );
  url.pathname = "/api/v1";
  return url.toString();
}

export function validateProductionEnvironment(env) {
  if (env.VITE_DEMO_MODE?.trim().toLowerCase() === "true")
    throw new Error("Set VITE_DEMO_MODE=false for production builds.");
  return resolveApiBaseUrl(env.VITE_API_BASE_URL, { production: true });
}
