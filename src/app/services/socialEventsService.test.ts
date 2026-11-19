import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseSocialEvent } from "./socialEventsService";

describe("parseSocialEvent", () => {
  it("aceita PROFILE_UPDATED completo e o devolve com discriminante", () => {
    expect(parseSocialEvent("PROFILE_UPDATED", {
      userId: "user-1",
      fullName: "Ana Silva",
      username: "ana",
      profilePicture: null,
    })).toEqual({
      type: "PROFILE_UPDATED",
      data: { userId: "user-1", fullName: "Ana Silva", username: "ana", profilePicture: null },
    });
  });

  it("aceita apenas o objeto vazio na invalidação genérica de visibilidade", () => {
    expect(parseSocialEvent("SOCIAL_VISIBILITY_CHANGED", {})).toEqual({ type: "SOCIAL_VISIBILITY_CHANGED", data: {} });
    expect(parseSocialEvent("SOCIAL_VISIBILITY_CHANGED", null)).toBeNull();
    expect(parseSocialEvent("SOCIAL_VISIBILITY_CHANGED", [])).toBeNull();
    expect(parseSocialEvent("SOCIAL_VISIBILITY_CHANGED", { userId: "user-1" })).toBeNull();
  });

  it("descarta payloads malformados e tipos desconhecidos", () => {
    expect(parseSocialEvent("POST_LIKED", { postId: "post-1", totalLikes: -1 })).toBeNull();
    expect(parseSocialEvent("PROFILE_UPDATED", { userId: "user-1", fullName: "Ana" })).toBeNull();
    expect(parseSocialEvent("EVENTO_DESCONHECIDO", {})).toBeNull();
  });
});

const API_URL = "http://api.test";
const FEED_URL = `${API_URL}/api/social/feed`;
const REFRESH_URL = `${API_URL}/auth/refresh`;
const LIKED_EVENT = { type: "POST_LIKED", data: { postId: "post-1", totalLikes: 2 } };

function eventStream() {
  return new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(`event: ${LIKED_EVENT.type}\ndata: ${JSON.stringify(LIKED_EVENT.data)}\n\n`));
    },
  }), { headers: { "Content-Type": "text/event-stream" } });
}

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((complete) => { resolve = complete; });
  return { promise, resolve };
}

function callsTo(url: string) {
  return vi.mocked(fetch).mock.calls.filter(([input]) => input === url);
}

function unauthorized() {
  return Response.json({ error: "TOKEN_EXPIRED" }, { status: 401 });
}

function rotatedSession() {
  return Response.json({ accessToken: "novo-jwt", refreshToken: "novo-refresh" });
}

describe("subscribeSocialEvents", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", API_URL);
    window.localStorage.clear();
    window.localStorage.setItem("beefit.auth.accessToken", "jwt-inicial");
    window.localStorage.setItem("beefit.auth.refreshToken", "refresh-inicial");
    window.localStorage.setItem("beefit.auth.deviceId", "device-1");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(async () => {
    (await import("./socialEventsService")).closeSocialEventsConnection();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each(["401 simultâneo", "401 atrasado"])("REST e SSE usam a mesma renovação (%s)", async (timing) => {
    const { apiClient } = await import("./apiClient");
    const { subscribeSocialEvents } = await import("./socialEventsService");
    const refresh = deferredResponse();
    const oldStream = deferredResponse();
    const restUrl = `${API_URL}/api/profile/me`;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const token = new Headers(init?.headers).get("Authorization");
      if (input === REFRESH_URL) return refresh.promise;
      if (input === FEED_URL) return token === "Bearer novo-jwt" ? eventStream() : oldStream.promise;
      if (input === restUrl) return token === "Bearer novo-jwt" ? Response.json({ ok: true }) : unauthorized();
      throw new Error("URL inesperada na fixture");
    });

    const listener = vi.fn();
    const subscriber = new AbortController();
    const done = subscribeSocialEvents(listener, subscriber.signal);
    const rest = apiClient.get("/api/profile/me", { auth: true });
    await vi.waitFor(() => {
      expect(callsTo(REFRESH_URL)).toHaveLength(1);
      expect(callsTo(FEED_URL)).toHaveLength(1);
    });

    if (timing === "401 simultâneo") oldStream.resolve(unauthorized());
    refresh.resolve(rotatedSession());
    await expect(rest).resolves.toEqual({ ok: true });
    if (timing === "401 atrasado") oldStream.resolve(unauthorized());

    await vi.waitFor(() => expect(listener).toHaveBeenCalledWith(LIKED_EVENT));
    expect(callsTo(REFRESH_URL)).toHaveLength(1);
    expect(callsTo(FEED_URL).map(([, init]) => new Headers(init?.headers).get("Authorization")))
      .toEqual(["Bearer jwt-inicial", "Bearer novo-jwt"]);
    subscriber.abort();
    await done;
  });

  it.each(["refresh recusado", "401 na conexão renovada"])("encerra o stream quando a sessão é inválida: %s", async (reason) => {
    const { AUTH_UNAUTHORIZED_EVENT } = await import("./apiClient");
    const { subscribeSocialEvents } = await import("./socialEventsService");
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (input === FEED_URL) return unauthorized();
      if (input === REFRESH_URL) return reason === "refresh recusado" ? unauthorized() : rotatedSession();
      throw new Error("URL inesperada na fixture");
    });
    const invalidSession = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, invalidSession, { once: true });
    const subscriber = new AbortController();
    try {
      const done = subscribeSocialEvents(vi.fn(), subscriber.signal);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(invalidSession).toHaveBeenCalledOnce();
      await expect(done).resolves.toBeUndefined();
      expect(callsTo(REFRESH_URL)).toHaveLength(1);
      expect(callsTo(FEED_URL)).toHaveLength(reason === "refresh recusado" ? 1 : 2);
    } finally {
      subscriber.abort();
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, invalidSession);
    }
  });

  it("reconecta com backoff após refresh indisponível sem aplicar o timeout REST ao stream", async () => {
    const { AUTH_UNAUTHORIZED_EVENT } = await import("./apiClient");
    const { subscribeSocialEvents } = await import("./socialEventsService");
    vi.useFakeTimers();
    let refreshAttempts = 0;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (input === REFRESH_URL) {
        return ++refreshAttempts === 1 ? new Response(null, { status: 503 }) : rotatedSession();
      }
      if (input === FEED_URL) {
        return new Headers(init?.headers).get("Authorization") === "Bearer novo-jwt" ? eventStream() : unauthorized();
      }
      throw new Error("URL inesperada na fixture");
    });
    const invalidSession = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, invalidSession);
    const subscriber = new AbortController();
    try {
      const listener = vi.fn();
      const done = subscribeSocialEvents(listener, subscriber.signal);
      await vi.advanceTimersByTimeAsync(500);
      expect(callsTo(REFRESH_URL)).toHaveLength(1);
      expect(callsTo(FEED_URL)).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(2_000);
      expect(listener).toHaveBeenCalledWith(LIKED_EVENT);
      expect(callsTo(REFRESH_URL)).toHaveLength(2);
      const signal = callsTo(FEED_URL).at(-1)?.[1]?.signal;
      await vi.advanceTimersByTimeAsync(30_000);
      expect(signal?.aborted).toBe(false);
      expect(invalidSession).not.toHaveBeenCalled();
      subscriber.abort();
      await done;
      expect(signal?.aborted).toBe(true);
    } finally {
      subscriber.abort();
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, invalidSession);
    }
  });

  it("cancelar o último assinante não repete o SSE nem interrompe o refresh do REST", async () => {
    const { apiClient } = await import("./apiClient");
    const { subscribeSocialEvents } = await import("./socialEventsService");
    const refresh = deferredResponse();
    const restUrl = `${API_URL}/api/profile/me`;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (input === REFRESH_URL) return refresh.promise;
      if (input === FEED_URL) return unauthorized();
      if (input === restUrl) {
        return new Headers(init?.headers).get("Authorization") === "Bearer novo-jwt"
          ? Response.json({ ok: true }) : unauthorized();
      }
      throw new Error("URL inesperada na fixture");
    });
    const controller = new AbortController();
    const done = subscribeSocialEvents(vi.fn(), controller.signal);
    await vi.waitFor(() => expect(callsTo(REFRESH_URL)).toHaveLength(1));
    const rest = apiClient.get("/api/profile/me", { auth: true });
    await vi.waitFor(() => expect(callsTo(restUrl)).toHaveLength(1));
    controller.abort();
    await done;

    refresh.resolve(rotatedSession());
    await expect(rest).resolves.toEqual({ ok: true });
    expect(callsTo(REFRESH_URL)).toHaveLength(1);
    expect(callsTo(FEED_URL)).toHaveLength(1);
  });

  it("o refresh em voo no logout não grava o par antigo nem segura a renovação da nova conta", async () => {
    vi.stubEnv("VITE_DEV_AUTH_BYPASS", "false");
    const { authService } = await import("./authService");
    const { apiClient, AUTH_UNAUTHORIZED_EVENT } = await import("./apiClient");
    const { subscribeSocialEvents } = await import("./socialEventsService");
    const refreshA = deferredResponse();
    const userB = { id: "user-b", fullName: "Conta B", email: "b@example.test" };
    const restUrl = `${API_URL}/api/profile/me`;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const bearer = new Headers(init?.headers).get("Authorization");
      if (input === REFRESH_URL) {
        return JSON.parse(String(init?.body)).refreshToken === "refresh-inicial" ? refreshA.promise : rotatedSession();
      }
      if (input === FEED_URL) return bearer === "Bearer novo-jwt" ? eventStream() : unauthorized();
      if (input === restUrl) return unauthorized();
      if (input === `${API_URL}/auth/logout`) return new Response(null, { status: 204 });
      if (input === `${API_URL}/auth/login`) return Response.json({ accessToken: "jwt-b", refreshToken: "refresh-b", user: userB });
      if (input === `${API_URL}/auth/me`) return Response.json(userB);
      throw new Error("URL inesperada na fixture");
    });
    const invalidSession = vi.fn();
    const oldListener = vi.fn();
    const subscriber = new AbortController();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, invalidSession);
    try {
      const oldSubscription = subscribeSocialEvents(oldListener, subscriber.signal);
      const oldRest = apiClient.get("/api/profile/me", { auth: true }).catch((error) => error);
      await vi.waitFor(() => {
        expect(callsTo(REFRESH_URL)).toHaveLength(1);
        expect(callsTo(restUrl)).toHaveLength(1);
      });
      await authService.logout();
      await oldSubscription;
      await authService.login({ email: userB.email, password: "senha-fixture" });
      const newListener = vi.fn();
      void subscribeSocialEvents(newListener, subscriber.signal);
      await vi.waitFor(() => expect(newListener).toHaveBeenCalledWith(LIKED_EVENT));
      expect(callsTo(REFRESH_URL)).toHaveLength(2);

      refreshA.resolve(Response.json({ accessToken: "jwt-a-atrasado", refreshToken: "refresh-a-atrasado" }));
      await expect(oldRest).resolves.toHaveProperty("name", "AbortError");
      expect(oldListener).not.toHaveBeenCalled();
      expect(invalidSession).not.toHaveBeenCalled();
      const { sessionStorage, getSessionSignal } = await import("../storage/sessionStorage");
      await expect(sessionStorage.getTokens(getSessionSignal()!)).resolves.toEqual({ accessToken: "novo-jwt", refreshToken: "novo-refresh" });
    } finally {
      subscriber.abort();
      refreshA.resolve(rotatedSession());
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, invalidSession);
    }
  });
});
