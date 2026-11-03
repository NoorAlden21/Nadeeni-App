const API_URL = process.env.NEXT_PUBLIC_API_URL || "/backend";
const TOKEN_KEY = "nadeeni.token";
const ADMIN_TOKEN_KEY = "nadeeni.admin.token";

export class ApiError extends Error {
  constructor(status, body) {
    super("api_error");
    this.status = status;
    this.body = body;
  }
}

export function readToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function writeToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function readAdminToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function writeAdminToken(token) {
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function apiFetch(path, { token, method = "GET", body, headers: extraHeaders } = {}) {
  const formData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = { Accept: "application/json", ...extraHeaders };
  let httpMethod = method;

  if (body !== undefined && !formData) {
    headers["Content-Type"] = "application/json";
  }

  // PHP 8.3 only fills uploaded files on POST. A multipart PATCH reaches Laravel
  // with no icon, and the restaurant comes back unchanged (icon_url null).
  // Laravel still routes this POST as the original method.
  if (formData && method !== "POST") {
    if (!body.has("_method")) {
      body.append("_method", method);
    }
    headers["X-HTTP-METHOD-OVERRIDE"] = method;
    httpMethod = "POST";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: httpMethod,
      headers,
      body: body === undefined || formData ? body : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, null);
  }

  const text = await response.text();
  let parsed = null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, parsed);
  }

  return parsed;
}
