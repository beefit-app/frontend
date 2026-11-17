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
  timeoutMs?: number;
  responseType?: "json" | "blob";
}

interface ParsedResponse {
  responseData: unknown;
  rawResponse: string;
}

export const API_BASE_URL = import.meta.env?.VITE_API_URL?.replace(/\/$/, "") ?? "";
const DEFAULT_TIMEOUT_MS = 15_000;
export const AUTH_UNAUTHORIZED_EVENT = "beefit:auth-unauthorized";
// Disparado quando o backend recusa uma rota /api/** porque a conta (criada via
// login social) ainda não completou o cadastro — ver ProfileCompletionFilter.
// Cobre sessão restaurada do cache com profileComplete desatualizado.
export const PROFILE_INCOMPLETE_EVENT = "beefit:profile-incomplete";
let refreshRequest: Promise<string | null> | null = null;

function buildUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  if (!API_BASE_URL) {
    throw new ApiError("A URL da API não está configurada para este ambiente.", 0, null);
  }
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
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

/**
 * Extrai `fields` do corpo de erro como um mapa campo -> mensagem.
 *
 * O backend responde com `{ fields: [{ field, message }] }` tanto na validacao
 * (400) quanto no conflito de e-mail e username (409). Sem isto, a unica coisa
 * que sobra e a mensagem geral, e o formulario nao tem como marcar o input que
 * causou o erro.
 *
 * Nunca lanca: e chamado dentro de tratamento de erro, onde o corpo pode ser
 * qualquer coisa — inclusive HTML de proxy ou string vazia.
 */
export function extractFieldErrors(error: unknown): Record<string, string> {
  if (!error || typeof error !== "object") return {};

  // Aceita o ApiError ou o corpo cru. A checagem e estrutural de proposito:
  // instanceof quebra quando o modulo e reinstanciado ou quando o erro atravessa
  // um limite que perde a identidade da classe.
  const payload = "data" in error ? (error as { data: unknown }).data : error;
  const data = payload && typeof payload === "object" ? payload : error;
  if (!data || typeof data !== "object") return {};

  const maybeFields = "fields" in data ? (data as Record<string, unknown>).fields : null;
  if (!Array.isArray(maybeFields)) return {};

  const fieldErrors: Record<string, string> = {};
  for (const item of maybeFields) {
    if (!item || typeof item !== "object") continue;
    const { field, message } = item as Record<string, unknown>;
    if (typeof field !== "string" || !field.trim()) continue;
    if (typeof message !== "string" || !message.trim()) continue;
    // Primeira mensagem por campo: o Bean Validation pode devolver mais de uma
    // restricao violada para o mesmo campo, e empilhar so polui a tela.
    if (!(field in fieldErrors)) fieldErrors[field] = message;
  }

  return fieldErrors;
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

async function performFetch(
  requestUrl: string,
  method: HttpMethod,
  finalHeaders: Record<string, string>,
  body: unknown,
  timeoutMs: number,
) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(requestUrl, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function runRefreshRequest(): Promise<string | null> {
  const refreshToken = await sessionStorage.getRefreshToken();
  const deviceId = await sessionStorage.getDeviceId();

  if (!refreshToken || !deviceId) {
    return null;
  }

  try {
    const response = await performFetch(
      buildUrl("/auth/refresh"),
      "POST",
      { Accept: "application/json", "Content-Type": "application/json" },
      { refreshToken, deviceId },
      DEFAULT_TIMEOUT_MS,
    );
    const { responseData } = await parseResponseBody(response);
    if (!response.ok || !responseData || typeof responseData !== "object") return null;
    if (
      typeof (responseData as RefreshSessionResponse).accessToken !== "string" ||
      typeof (responseData as RefreshSessionResponse).refreshToken !== "string"
    ) return null;
    await sessionStorage.setToken((responseData as RefreshSessionResponse).accessToken);
    await sessionStorage.setRefreshToken((responseData as RefreshSessionResponse).refreshToken);
    return (responseData as RefreshSessionResponse).accessToken;
  } catch {
    return null;
  }
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
  const { method = "GET", body, auth = false, logoutOnUnauthorized = false, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
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

  let response: Response;
  try {
    response = await performFetch(buildUrl(path), method, finalHeaders, body, timeoutMs);
  } catch (error) {
    throw new ApiError(
      error instanceof DOMException && error.name === "AbortError"
        ? "A requisição demorou demais. Verifique sua conexão e tente novamente."
        : "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
      0,
      error,
    );
  }

  if (response.status === 204 || response.status === 205) {
    return null as T;
  }

  if (response.ok && options.responseType === "blob") {
    return (await response.blob()) as T;
  }

  const { responseData } = await parseResponseBody(response);

  if (!response.ok) {
    const errorCode = getErrorCode(responseData);

    if (
      response.status === 401 &&
      auth &&
      !hasRetriedAfterRefresh
    ) {
      const refreshedAccessToken = await refreshAccessToken();
      if (refreshedAccessToken) {
        return request<T>(path, options, true);
      }
      // Se não conseguiu renovar o token, a sessão é inválida e o usuário DEVE ser deslogado.
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
    } else if (response.status === 401 && (logoutOnUnauthorized || hasRetriedAfterRefresh)) {
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
    } else if (response.status === 403 && errorCode === "PROFILE_INCOMPLETE") {
      window.dispatchEvent(new CustomEvent(PROFILE_INCOMPLETE_EVENT));
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

  getBlob(path: string, options?: Omit<RequestOptions, "method" | "body" | "responseType">) {
    return request<Blob>(path, { ...options, method: "GET", responseType: "blob" });
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
