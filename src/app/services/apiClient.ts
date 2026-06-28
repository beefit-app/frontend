import { sessionStorage } from "../storage/sessionStorage";
import type { RefreshSessionResponse } from "../types/auth";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
  logoutOnUnauthorized?: boolean;
  headers?: Record<string, string>;
}

interface ParsedResponse {
  responseData: unknown;
  rawResponse: string;
}

const API_BASE_URL = import.meta.env?.VITE_API_URL?.replace(/\/$/, "") ?? "";
export const AUTH_UNAUTHORIZED_EVENT = "beefit:auth-unauthorized";
let refreshRequest: Promise<string | null> | null = null;

function buildUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildFallbackUrl(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function getErrorMessage(data: unknown, fallbackMessage: string) {
  if (typeof data === "string") {
    const trimmed = data.trim();

    if (!trimmed) return fallbackMessage;

    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        return getErrorMessage(JSON.parse(trimmed), fallbackMessage);
      } catch {
        return trimmed;
      }
    }

    return trimmed;
  }

  if (!data || typeof data !== "object") return fallbackMessage;

  const maybeMessage = "message" in data ? data.message : null;
  if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage;

  const maybeError = "error" in data ? data.error : null;
  if (typeof maybeError === "string" && maybeError.trim()) return maybeError;

  const maybeFields = "fields" in data ? data.fields : null;
  if (Array.isArray(maybeFields) && maybeFields.length > 0) {
    const firstField = maybeFields[0];
    if (firstField && typeof firstField === "object" && "message" in firstField) {
      const fieldMessage = (firstField as Record<string, unknown>).message;
      if (typeof fieldMessage === "string" && fieldMessage.trim()) return fieldMessage;
    }
  }

  return fallbackMessage;
}

function getErrorCode(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const maybeError = "error" in data ? data.error : null;
  return typeof maybeError === "string" && maybeError.trim() ? maybeError : null;
}

async function parseResponseBody(response: Response): Promise<ParsedResponse> {
  const contentType = response.headers.get("content-type") ?? "";
  const rawResponse = await response.text();
  let responseData: unknown = rawResponse;

  if (contentType.includes("application/json") && rawResponse.trim()) {
    try {
      responseData = JSON.parse(rawResponse);
    } catch {
      responseData = rawResponse;
    }
  }

  return { responseData, rawResponse };
}

async function performFetch(requestUrl: string, method: HttpMethod, finalHeaders: Record<string, string>, body: unknown) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  return fetch(requestUrl, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });
}

async function runRefreshRequest(): Promise<string | null> {
  const refreshToken = await sessionStorage.getRefreshToken();
  const deviceId = await sessionStorage.getDeviceId();

  if (!refreshToken || !deviceId) {
    return null;
  }

  const requestUrls = [buildUrl("/auth/refresh")];
  const fallbackUrl = buildFallbackUrl("/auth/refresh");
  if (requestUrls[0] !== fallbackUrl) {
    requestUrls.push(fallbackUrl);
  }

  for (const requestUrl of requestUrls) {
    try {
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken, deviceId }),
      });

      const { responseData } = await parseResponseBody(response);
      if (!response.ok) {
        continue;
      }

      if (
        !responseData ||
        typeof responseData !== "object" ||
        typeof (responseData as RefreshSessionResponse).accessToken !== "string" ||
        typeof (responseData as RefreshSessionResponse).refreshToken !== "string"
      ) {
        return null;
      }

      await sessionStorage.setToken((responseData as RefreshSessionResponse).accessToken);
      await sessionStorage.setRefreshToken((responseData as RefreshSessionResponse).refreshToken);
      return (responseData as RefreshSessionResponse).accessToken;
    } catch {
      // Tenta a URL de fallback antes de desistir.
    }
  }

  return null;
}

async function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = runRefreshRequest().finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
}

async function request<T>(path: string, options: RequestOptions = {}, hasRetriedAfterRefresh = false) {
  const { method = "GET", body, auth = false, logoutOnUnauthorized = false, headers = {} } = options;
  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && !isFormData) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = await sessionStorage.getToken();

    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const requestUrls = [buildUrl(path)];
  const fallbackUrl = buildFallbackUrl(path);

  if (requestUrls[0] !== fallbackUrl) {
    requestUrls.push(fallbackUrl);
  }

  let response: Response | null = null;
  let lastError: unknown = null;

  for (const requestUrl of requestUrls) {
    try {
      response = await performFetch(requestUrl, method, finalHeaders, body);
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!response) {
    throw new ApiError(
      "Não foi possível conectar ao servidor. Verifique a URL da API, o CORS e se o backend está em execução.",
      0,
      lastError,
    );
  }

  if (response.status === 204 || response.status === 205) {
    return null as T;
  }

  const { responseData } = await parseResponseBody(response);

  if (!response.ok) {
    const errorCode = getErrorCode(responseData);

    if (
      response.status === 401 &&
      auth &&
      !hasRetriedAfterRefresh &&
      (errorCode === "TOKEN_EXPIRED" || errorCode === "TOKEN_INVALID")
    ) {
      const refreshedAccessToken = await refreshAccessToken();
      if (refreshedAccessToken) {
        return request<T>(path, options, true);
      }
    }

    if (response.status === 401 && auth && logoutOnUnauthorized) {
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
    }

    throw new ApiError(
      getErrorMessage(responseData, "Não foi possível concluir a requisição."),
      response.status,
      responseData,
    );
  }

  return responseData as T;
}

export const apiClient = {
  get<T>(path: string, options?: Omit<RequestOptions, "method" | "body">) {
    return request<T>(path, { ...options, method: "GET" });
  },

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return request<T>(path, { ...options, method: "POST", body });
  },

  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return request<T>(path, { ...options, method: "PUT", body });
  },

  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return request<T>(path, { ...options, method: "PATCH", body });
  },

  delete<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return request<T>(path, { ...options, method: "DELETE", body });
  },
};
