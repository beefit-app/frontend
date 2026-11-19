import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const API_URL = "http://api.test";

function createJsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function stubWebLocks(locks: unknown) {
  const descriptor = Object.getOwnPropertyDescriptor(navigator, "locks");
  Object.defineProperty(navigator, "locks", { configurable: true, value: locks });
  return () => {
    if (descriptor) Object.defineProperty(navigator, "locks", descriptor);
    else Reflect.deleteProperty(navigator, "locks");
  };
}

describe("apiClient", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", API_URL);
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("não repete uma chamada na origem relativa quando a API falha", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const { apiClient } = await import("./apiClient");
    await expect(apiClient.post("/auth/register", { name: "Teste" })).rejects.toMatchObject({ status: 0 });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(`${API_URL}/auth/register`);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("expõe a mensagem quando a resposta de erro vem como texto", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Campos enviados inválidos" }), {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      }),
    );

    const { apiClient } = await import("./apiClient");

    await expect(apiClient.post("/auth/register", { name: "Teste" })).rejects.toMatchObject({
      message: "Campos enviados inválidos",
      status: 400,
    });
  });

  it("dispara logout global para 401 quando a chamada valida a sessão", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      createJsonResponse({ message: "Credenciais inválidas." }, { status: 401 }),
    );
    const listener = vi.fn();
    window.addEventListener("beefit:auth-unauthorized", listener);

    const { apiClient } = await import("./apiClient");

    await expect(
      apiClient.get("/auth/me", { auth: true, logoutOnUnauthorized: true }),
    ).rejects.toMatchObject({
      status: 401,
    });
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener("beefit:auth-unauthorized", listener);
  });

  it("renova o access token e repete a request quando a sessão expira", async () => {
    window.localStorage.setItem("beefit.auth.accessToken", "expired-token");
    window.localStorage.setItem("beefit.auth.refreshToken", "refresh-token");
    window.localStorage.setItem("beefit.auth.deviceId", "device-1");

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        createJsonResponse({ error: "TOKEN_EXPIRED", message: "Sua sessão expirou." }, { status: 401 }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({ accessToken: "new-token", refreshToken: "new-refresh-token" }),
      )
      .mockResolvedValueOnce(createJsonResponse({ ok: true }));

    const { apiClient } = await import("./apiClient");
    const response = await apiClient.get("/api/workout/active", { auth: true });

    expect(response).toEqual({ ok: true });
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toBe(`${API_URL}/auth/refresh`);
    expect(vi.mocked(fetch).mock.calls[2]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Authorization: "Bearer new-token",
      }),
    });
    const { sessionStorage, getSessionSignal } = await import("../storage/sessionStorage");
    await expect(sessionStorage.getTokens(getSessionSignal()!)).resolves.toEqual({ accessToken: "new-token", refreshToken: "new-refresh-token" });
  });

  it("funciona sem AbortSignal.throwIfAborted e cancela trabalho de uma sessão encerrada com AbortError", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(AbortSignal.prototype, "throwIfAborted");
    Object.defineProperty(AbortSignal.prototype, "throwIfAborted", { configurable: true, value: undefined });
    window.localStorage.setItem("beefit.auth.accessToken", "jwt-fixture");
    try {
      const { apiClient } = await import("./apiClient");
      const { authService } = await import("./authService");
      vi.mocked(fetch).mockResolvedValueOnce(createJsonResponse({ ok: true }));
      await expect(apiClient.get("/api/profile/me", { auth: true })).resolves.toEqual({ ok: true });

      let respond!: (response: Response) => void;
      vi.mocked(fetch).mockImplementationOnce(() => new Promise((resolve) => { respond = resolve; }));
      const pending = apiClient.get("/api/profile/me", { auth: true }).catch((error) => error);
      await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
      await authService.logout();
      respond(createJsonResponse({ ok: true }));
      const error = await pending;
      expect(error).toBeInstanceOf(DOMException);
      expect(error).toHaveProperty("name", "AbortError");
    } finally {
      if (descriptor) Object.defineProperty(AbortSignal.prototype, "throwIfAborted", descriptor);
      else Reflect.deleteProperty(AbortSignal.prototype, "throwIfAborted");
    }
  });

  it("limita o refresh até o fim do corpo e trata estouro de prazo como transitório", async () => {
    vi.useFakeTimers();
    window.localStorage.setItem("beefit.auth.accessToken", "jwt-expirado");
    window.localStorage.setItem("beefit.auth.refreshToken", "refresh-inicial");
    window.localStorage.setItem("beefit.auth.deviceId", "device-1");
    const { apiClient, AUTH_UNAUTHORIZED_EVENT } = await import("./apiClient");
    const invalid = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, invalid);
    let finishBody!: () => void;
    let refreshSignal: AbortSignal | null | undefined;
    try {
      vi.mocked(fetch)
        .mockResolvedValueOnce(createJsonResponse({}, { status: 401 }))
        .mockImplementationOnce(async (_url, init) => {
          refreshSignal = init?.signal;
          return new Response(new ReadableStream({
            start(controller) {
              finishBody = () => {
                controller.enqueue(new TextEncoder().encode(JSON.stringify({ accessToken: "jwt-atrasado", refreshToken: "refresh-atrasado" })));
                controller.close();
              };
            },
          }), { headers: { "Content-Type": "application/json" } });
        });
      const outcome = vi.fn();
      const request = apiClient.get("/api/profile/me", { auth: true }).then(outcome, outcome);
      await vi.advanceTimersByTimeAsync(15_000);
      expect(refreshSignal?.aborted).toBe(true);
      expect(outcome).toHaveBeenCalledWith(expect.objectContaining({ name: "ApiError", status: 0 }));
      finishBody();
      await request;
      expect(invalid).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledTimes(2);
      const { sessionStorage, getSessionSignal } = await import("../storage/sessionStorage");
      await expect(sessionStorage.getTokens(getSessionSignal()!)).resolves.toEqual({ accessToken: "jwt-expirado", refreshToken: "refresh-inicial" });
    } finally {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, invalid);
    }
  });

  it("bloqueia a sessão da aba antiga antes da entrega do evento de storage", async () => {
    vi.stubEnv("VITE_DEV_AUTH_BYPASS", "false");
    window.localStorage.setItem("beefit.auth.accessToken", "jwt-a");
    window.localStorage.setItem("beefit.auth.refreshToken", "refresh-a");
    const { apiClient: oldTab } = await import("./apiClient");
    const { authService: oldAuth } = await import("./authService");
    const { getSessionSignal, assertSessionActive } = await import("../storage/sessionStorage");
    vi.mocked(fetch).mockResolvedValueOnce(createJsonResponse({ account: "A" }));
    await expect(oldTab.get("/api/profile/me", { auth: true })).resolves.toEqual({ account: "A" });
    const oldSession = getSessionSignal();
    let finishOldRequest!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise((resolve) => { finishOldRequest = resolve; }));
    const pending = oldTab.get("/api/profile/me", { auth: true }).catch((error: unknown) => error);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    vi.resetModules();
    const { authService } = await import("./authService");
    const accountB = { id: "user-b", fullName: "Conta B", email: "b@example.test" };
    vi.mocked(fetch)
      .mockResolvedValueOnce(createJsonResponse({ accessToken: "jwt-b", refreshToken: "refresh-b", user: accountB }))
      .mockResolvedValueOnce(createJsonResponse(accountB));
    await authService.login({ email: accountB.email, password: "senha-fixture" });
    vi.mocked(fetch).mockClear().mockResolvedValueOnce(createJsonResponse({ account: "B" }));

    finishOldRequest(createJsonResponse({ account: "A" }));
    await expect(pending).resolves.toMatchObject({ name: "AbortError" });
    await expect(oldTab.get("/api/profile/me", { auth: true })).rejects.toMatchObject({ name: "AbortError" });
    expect(() => assertSessionActive(oldSession)).toThrow(expect.objectContaining({ name: "AbortError" }));
    expect(() => assertSessionActive(new AbortController().signal)).toThrow(expect.objectContaining({ name: "AbortError" }));
    expect(() => assertSessionActive(null)).toThrow(expect.objectContaining({ name: "AbortError" }));
    expect(oldSession?.aborted).toBe(true);
    expect(getSessionSignal()).toBeNull();
    await oldAuth.logout();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("um refresh recusado com o par anterior reaproveita a rotação já concluída na outra aba", async () => {
    window.localStorage.setItem("beefit.auth.accessToken", "jwt-expirado");
    window.localStorage.setItem("beefit.auth.refreshToken", "refresh-inicial");
    window.localStorage.setItem("beefit.auth.deviceId", "device-1");
    const { apiClient: firstTab, AUTH_UNAUTHORIZED_EVENT } = await import("./apiClient");
    const { getSessionSignal, assertSessionActive } = await import("../storage/sessionStorage");
    const originalIdentity = getSessionSignal();
    const invalid = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, invalid);
    let rejectOldRefresh!: (response: Response) => void;
    vi.mocked(fetch)
      .mockResolvedValueOnce(createJsonResponse({}, { status: 401 }))
      .mockImplementationOnce(() => new Promise((resolve) => { rejectOldRefresh = resolve; }));
    const firstResult = firstTab.get("/api/profile/me", { auth: true }).catch((error: unknown) => error);
    try {
      await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith(`${API_URL}/auth/refresh`, expect.anything()));
      vi.resetModules();
      const { apiClient: secondTab } = await import("./apiClient");
      vi.mocked(fetch)
        .mockResolvedValueOnce(createJsonResponse({}, { status: 401 }))
        .mockResolvedValueOnce(createJsonResponse({ accessToken: "jwt-rotacionado", refreshToken: "refresh-rotacionado" }))
        .mockResolvedValueOnce(createJsonResponse({ ok: true }));
      await expect(secondTab.get("/api/profile/me", { auth: true })).resolves.toEqual({ ok: true });

      vi.mocked(fetch).mockResolvedValueOnce(createJsonResponse({ ok: true }));
      rejectOldRefresh(createJsonResponse({}, { status: 401 }));
      await expect(firstResult).resolves.toEqual({ ok: true });
      expect(fetch).toHaveBeenLastCalledWith(`${API_URL}/api/profile/me`, expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer jwt-rotacionado" }),
      }));
      expect(invalid).not.toHaveBeenCalled();
      expect(getSessionSignal()).toBe(originalIdentity);
      expect(() => assertSessionActive(originalIdentity)).not.toThrow();
    } finally {
      rejectOldRefresh?.(createJsonResponse({}, { status: 401 }));
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, invalid);
    }
  });

  it.each(["rotação", "troca de geração"])("coordena refresh em duas abas com Web Locks: %s", async (scenario) => {
    const expired = "jwt-expirado";
    const rotated = { accessToken: "jwt-rotacionado", refreshToken: "refresh-rotacionado" };
    window.localStorage.setItem("beefit.auth.accessToken", expired);
    window.localStorage.setItem("beefit.auth.refreshToken", "refresh-inicial");
    window.localStorage.setItem("beefit.auth.deviceId", "device-1");

    const locks = new Map<string, Promise<unknown>>();
    const requestLock = vi.fn((name: string, _options: LockOptions, run: () => Promise<unknown>) => {
      const result = (locks.get(name) ?? Promise.resolve()).then(run);
      locks.set(name, result.catch(() => undefined));
      return result;
    });
    const restoreLocks = stubWebLocks({ request: requestLock });
    let finishBody!: () => void;
    const bodyReady = new Promise<void>((resolve) => { finishBody = resolve; });
    const refreshUrl = `${API_URL}/auth/refresh`;
    const refreshCalls = () => vi.mocked(fetch).mock.calls.filter(([url]) => url === refreshUrl);
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (url === refreshUrl) {
        return new Response(new ReadableStream<Uint8Array>({
          async start(controller) {
            await bodyReady;
            controller.enqueue(new TextEncoder().encode(JSON.stringify(rotated)));
            controller.close();
          },
        }), { headers: { "Content-Type": "application/json" } });
      }
      const token = new Headers(init?.headers).get("Authorization");
      if (token === `Bearer ${expired}`) return createJsonResponse({}, { status: 401 });
      if (token === `Bearer ${rotated.accessToken}`) return createJsonResponse({ ok: true });
      throw new Error("Credencial inesperada na fixture");
    });

    const { apiClient: firstTab, AUTH_UNAUTHORIZED_EVENT } = await import("./apiClient");
    const invalid = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, invalid);
    const first = firstTab.get("/api/profile/me", { auth: true }).catch((error: unknown) => error);
    let second: Promise<unknown> | undefined;
    try {
      await vi.waitFor(() => expect(refreshCalls()).toHaveLength(1));
      vi.resetModules();
      const { apiClient: secondTab } = await import("./apiClient");
      second = secondTab.get("/api/profile/me", { auth: true }).catch((error: unknown) => error);
      await vi.waitFor(() => expect(requestLock).toHaveBeenCalledTimes(2));
      const [firstLock, secondLock] = requestLock.mock.calls.map(([name]) => name);
      expect(firstLock).toMatch(/^beefit\.auth\.refresh\./);
      expect(firstLock).not.toMatch(/jwt-expirado|refresh-inicial|device-1/);
      expect(secondLock).toBe(firstLock);
      expect(refreshCalls()).toHaveLength(1);

      // Simula a gravação de outra aba antes da entrega do evento de storage.
      if (scenario === "troca de geração") window.localStorage.setItem("beefit.auth.generation", "nova-geracao-fixture");
      finishBody();
      const results = await Promise.all([first, second]);
      if (scenario === "rotação") {
        expect(results).toEqual([{ ok: true }, { ok: true }]);
      } else {
        for (const error of results) expect(error).toMatchObject({ name: "AbortError" });
      }
      expect(refreshCalls()).toHaveLength(1);
      expect(invalid).not.toHaveBeenCalled();
    } finally {
      finishBody();
      await Promise.all([first, second]);
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, invalid);
      restoreLocks();
    }
  });

  it("sem Web Locks, uma recusa definitiva do refresh ainda invalida a sessão", async () => {
    const restoreLocks = stubWebLocks(undefined);
    window.localStorage.setItem("beefit.auth.accessToken", "jwt-expirado");
    window.localStorage.setItem("beefit.auth.refreshToken", "refresh-inicial");
    window.localStorage.setItem("beefit.auth.deviceId", "device-1");
    const { apiClient, AUTH_UNAUTHORIZED_EVENT } = await import("./apiClient");
    const invalid = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, invalid);
    try {
      vi.mocked(fetch)
        .mockResolvedValueOnce(createJsonResponse({}, { status: 401 }))
        .mockResolvedValueOnce(createJsonResponse({}, { status: 401 }));
      await expect(apiClient.get("/api/profile/me", { auth: true })).rejects.toMatchObject({ status: 401 });
      expect(fetch).toHaveBeenCalledWith(`${API_URL}/auth/refresh`, expect.objectContaining({ method: "POST" }));
      expect(invalid).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, invalid);
      restoreLocks();
    }
  });

  it("busca mídia autenticada como blob sem usar o cache HTTP", async () => {
    window.localStorage.setItem("beefit.auth.accessToken", "media-token");
    // Corpo como string, nao Blob: o Blob do jsdom nao implementa stream(), que o
    // construtor Response do Node exige. O tipo do blob vem do Content-Type.
    vi.mocked(fetch).mockResolvedValueOnce(new Response("image", {
      status: 200,
      headers: { "Content-Type": "image/png" },
    }));

    const { apiClient } = await import("./apiClient");
    const blob = await apiClient.getBlob("/api/media/media-id", { auth: true });

    expect(blob.type).toBe("image/png");
    expect(await blob.text()).toBe("image");
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: "Bearer media-token" }),
      cache: "no-store",
    });
  });

  it("mantém o cache HTTP padrão para blobs públicos", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("public-image"));
    const { apiClient } = await import("./apiClient");

    await apiClient.getBlob("/images/exercise.png");

    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.cache).toBeUndefined();
  });

  describe("extractFieldErrors", () => {
    it("mapeia cada campo acusado pelo servidor para sua mensagem", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(createJsonResponse({
        status: 400,
        error: "Erro de validação",
        message: "Campos enviados inválidos",
        fields: [
          { field: "email", message: "Informe um e-mail válido, como nome@email.com." },
          { field: "weeklyGoal", message: "A meta semanal deve ser de 1 a 7 dias." },
        ],
      }, { status: 400 }));

      const { apiClient, extractFieldErrors } = await import("./apiClient");
      const error = await apiClient.post("/auth/register", {}).catch((caught) => caught);

      expect(extractFieldErrors(error)).toEqual({
        email: "Informe um e-mail válido, como nome@email.com.",
        weeklyGoal: "A meta semanal deve ser de 1 a 7 dias.",
      });
    });

    it("fica com a primeira mensagem quando o mesmo campo viola duas regras", async () => {
      const { extractFieldErrors } = await import("./apiClient");

      const result = extractFieldErrors({
        fields: [
          { field: "bodyWeight", message: "O peso deve ser maior que zero." },
          { field: "bodyWeight", message: "O peso deve ser de até 300 kg." },
        ],
      });

      expect(result).toEqual({ bodyWeight: "O peso deve ser maior que zero." });
    });

    it("nao lanca com corpo inesperado", async () => {
      const { extractFieldErrors } = await import("./apiClient");

      // O corpo de erro pode ser qualquer coisa: HTML de proxy, texto solto,
      // resposta sem fields. Isto roda dentro de tratamento de erro e nao pode
      // virar uma segunda excecao.
      expect(extractFieldErrors(null)).toEqual({});
      expect(extractFieldErrors("<html>502</html>")).toEqual({});
      expect(extractFieldErrors({ message: "sem fields" })).toEqual({});
      expect(extractFieldErrors({ fields: [] })).toEqual({});
      expect(extractFieldErrors({ fields: "nao e lista" })).toEqual({});
      expect(extractFieldErrors({ fields: [null, { field: "", message: "x" }] })).toEqual({});
      expect(extractFieldErrors({ fields: [{ field: "email" }] })).toEqual({});
    });
  });
});
