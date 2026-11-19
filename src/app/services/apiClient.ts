import {
  assertSessionActive,
  getSessionSignal,
  sessionStorage,
  throwIfAborted,
  withSessionRefreshLock,
  withSessionStorage,
} from "../storage/sessionStorage";
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
// Cobre sessão restaurada do cache com profileComplete desatualizado.
export const PROFILE_INCOMPLETE_EVENT = "beefit:profile-incomplete";
let refreshRequest: { session: AbortSignal; promise: Promise<string | null> } | null = null;

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

async function untilAbort<T>(signal: AbortSignal, run: () => Promise<T>): Promise<T> {
  throwIfAborted(signal);
  let onAbort!: () => void;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(new DOMException("Operação cancelada.", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([aborted, run()]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

async function withRequestDeadline<T>(timeoutMs: number, session: AbortSignal | null, run: (signal: AbortSignal) => Promise<T>) {
  if (session) assertSessionActive(session);
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = window.setTimeout(abort, timeoutMs);
  session?.addEventListener("abort", abort, { once: true });
  try {
    return await untilAbort(controller.signal, () => run(controller.signal));
  } catch (error) {
    if (session) assertSessionActive(session);
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      controller.signal.aborted
        ? "A requisição demorou demais. Verifique sua conexão e tente novamente."
        : "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
      0,
      error,
    );
  } finally {
    window.clearTimeout(timeout);
    session?.removeEventListener("abort", abort);
  }
}

async function fetchResponse(url: string, init: RequestInit & { signal: AbortSignal }) {
  const response = await fetch(url, init);
  if (init.signal.aborted) {
    discardBody(response);
    throwIfAborted(init.signal);
  }
  return response;
}

function discardBody(response: Response) {
  void response.body?.cancel().catch(() => undefined);
}

async function runRefreshRequest(session: AbortSignal, rejectedToken: string | null): Promise<string | null> {
  const [{ accessToken: initialToken, refreshToken }, deviceId] = await withSessionStorage(() => Promise.all([
    sessionStorage.getTokens(session), sessionStorage.getDeviceId(),
  ]));
  assertSessionActive(session);
  if (initialToken && initialToken !== rejectedToken) return initialToken;
  if (!refreshToken || !deviceId) return null;

  const refreshed = await withRequestDeadline(DEFAULT_TIMEOUT_MS, session, async (signal) => {
    const response = await fetchResponse(buildUrl("/auth/refresh"), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken, deviceId }),
      signal,
    });
    // Só uma recusa definitiva (ou a falta de credenciais) invalida a sessão.
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      discardBody(response);
      return null;
    }
    const { responseData } = await parseResponseBody(response);
    if (!response.ok) {
      throw new ApiError(getErrorMessage(responseData, "Não foi possível renovar a sessão."), response.status, responseData);
    }
    return { data: responseData };
  });
  return withSessionStorage(async () => {
    const current = await sessionStorage.getTokens(session);
    assertSessionActive(session);
    // Outra aba pode ter concluído a rotação enquanto esta renovação estava em voo.
    if (current.accessToken && current.refreshToken !== refreshToken) return current.accessToken;
    if (!refreshed) return null;
    const tokens = refreshed.data as Partial<RefreshSessionResponse> | null;
    if (typeof tokens?.accessToken !== "string" || !tokens.accessToken ||
        typeof tokens.refreshToken !== "string" || !tokens.refreshToken) {
      throw new ApiError("Resposta inválida ao renovar a sessão.", 0, null);
    }
    await sessionStorage.replaceTokens(session, tokens.accessToken, tokens.refreshToken);
    return tokens.accessToken;
  });
}

async function fetchWithAuthRetry(
  session: AbortSignal,
  send: (accessToken: string | null) => Promise<Response>,
  streamSignal?: AbortSignal,
): Promise<Response | null> {
  function ensureCurrent() {
    assertSessionActive(session);
    throwIfAborted(streamSignal);
  }

  async function sendCurrent(accessToken: string | null) {
    ensureCurrent();
    const response = await send(accessToken).catch((error: unknown) => {
      ensureCurrent();
      throw error;
    });
    try {
      ensureCurrent();
    } catch (error) {
      discardBody(response);
      throw error;
    }
    return response;
  }

  const accessToken = await withSessionStorage(async () => {
    ensureCurrent();
    return sessionStorage.getToken(session);
  });
  ensureCurrent();
  if (streamSignal && !accessToken) return null;

  const response = await sendCurrent(accessToken);
  if (response.status !== 401) return response;

  let renewed: string | null;
  try {
    const pending = await withSessionStorage(async () => {
      ensureCurrent();
      if (refreshRequest?.session === session) return refreshRequest;
      const currentToken = await sessionStorage.getToken(session);
      ensureCurrent();
      // Um 401 atrasado pode ter saído com o JWT anterior a uma rotação já concluída.
      if (currentToken && currentToken !== accessToken) return { promise: Promise.resolve(currentToken) };
      // runRefreshRequest relê o par depois de obter o lock e só o libera após persistir a rotação.
      const promise = withSessionRefreshLock(session, () => runRefreshRequest(session, accessToken)).finally(() => {
        if (refreshRequest?.promise === promise) refreshRequest = null;
      });
      refreshRequest = { session, promise };
      // Pode não sobrar assinante para aguardar esta promessa após o cancelamento.
      void promise.catch(() => undefined);
      return refreshRequest;
    });
    // Espera de rede fora da fila de armazenamento; cancelar um assinante não
    // cancela a renovação que outra requisição já está usando.
    renewed = await untilAbort(streamSignal ?? session, () => pending.promise);
    ensureCurrent();
  } catch (error) {
    discardBody(response);
    ensureCurrent();
    throw error;
  }
  if (!renewed) return response;
  discardBody(response);
  return sendCurrent(renewed);
}

export async function openAuthenticatedEventStream(path: string, session: AbortSignal, signal: AbortSignal) {
  const response = await fetchWithAuthRetry(session, (token) => fetch(buildUrl(path), {
    headers: { Accept: "text/event-stream", Authorization: `Bearer ${token}` },
    signal,
  }), signal);
  if (!response) return null;
  try {
    assertSessionActive(session);
    throwIfAborted(signal);
  } catch (error) {
    discardBody(response);
    throw error;
  }
  if (!response.ok) {
    discardBody(response);
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
      return null;
    }
    throw new ApiError("Não foi possível conectar aos eventos sociais.", response.status, null);
  }
  return response;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = false, logoutOnUnauthorized = auth, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && !isFormData) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const session = auth ? getSessionSignal() : null;
  if (auth) assertSessionActive(session);
  const cache = auth && options.responseType === "blob" ? "no-store" : undefined;
  const requestBody = body === undefined ? undefined : isFormData ? body : JSON.stringify(body);
  const send = (token: string | null) => withRequestDeadline(timeoutMs, session, (signal) => fetchResponse(buildUrl(path), {
    method,
    headers: token ? { ...finalHeaders, Authorization: `Bearer ${token}` } : finalHeaders,
    body: requestBody,
    signal,
    ...(cache && { cache }),
  }));
  const response = session ? await fetchWithAuthRetry(session, send) : await send(null);
  if (!response) throw new DOMException("Sessão encerrada.", "AbortError");
  if (session) {
    try {
      assertSessionActive(session);
    } catch (error) {
      discardBody(response);
      throw error;
    }
  }

  async function readBody<U>(read: () => Promise<U>) {
    if (!session) return read();
    try {
      return await untilAbort(session, read);
    } finally {
      assertSessionActive(session);
    }
  }

  if (response.status === 204 || response.status === 205) {
    return null as T;
  }

  if (response.ok && options.responseType === "blob") {
    const blob = await readBody(() => response.blob());
    if (session) assertSessionActive(session);
    return blob as T;
  }

  const { responseData } = await readBody(() => parseResponseBody(response));
  if (session) assertSessionActive(session);

  if (!response.ok) {
    if (response.status === 401 && logoutOnUnauthorized) {
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
    } else if (session && response.status === 403 && responseData && typeof responseData === "object" &&
      "error" in responseData && responseData.error === "PROFILE_INCOMPLETE") {
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
