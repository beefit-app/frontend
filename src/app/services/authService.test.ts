import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const API_URL = "http://api.test";
const native = vi.hoisted(() => ({
  enabled: false,
  values: new Map<string, unknown>(),
  beforeWrite: null as ((key: string, value: unknown) => Promise<void> | undefined) | null,
  beforeRead: null as ((key: string) => void) | null,
  beforeRemove: null as ((key: string) => void) | null,
}));

vi.mock("@capacitor/core", async (importOriginal) => {
  const core = await importOriginal<typeof import("@capacitor/core")>();
  return { ...core, Capacitor: { ...core.Capacitor, isNativePlatform: () => native.enabled } };
});

vi.mock("@aparajita/capacitor-secure-storage", () => ({
  SecureStorage: {
    async get(key: string) {
      native.beforeRead?.(key);
      return native.values.get(key) ?? null;
    },
    async set(key: string, value: unknown) {
      await native.beforeWrite?.(key, value);
      native.values.set(key, value);
    },
    async remove(key: string) {
      native.beforeRemove?.(key);
      native.values.delete(key);
    },
  },
}));

function createJsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("authService API integration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", API_URL);
    vi.stubEnv("VITE_DEV_AUTH_BYPASS", "false");
    window.localStorage.clear();
    native.enabled = false;
    native.values.clear();
    native.beforeWrite = null;
    native.beforeRead = null;
    native.beforeRemove = null;
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("normaliza o login com o contrato atual do backend", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        // Contrato de LoginResponseDTO: accessToken, refreshToken e user.
        createJsonResponse({
          accessToken: "jwt-backend",
          refreshToken: "refresh-backend",
          user: {
            id: "user-1",
            fullName: "Bee Fit",
            username: "beefit",
            email: "user@email.com",
            bodyWeight: 75.5,
            weeklyGoal: 4,
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          id: "user-1",
          fullName: "Bee Fit",
          username: "beefit",
          email: "user@email.com",
          bodyWeight: 75.5,
          weeklyGoal: 4,
        }),
      );

    const { authService } = await import("./authService");
    const session = await authService.login({ email: "user@email.com", password: "123456" });

    expect(session).toEqual({
      accessToken: "jwt-backend",
      refreshToken: "refresh-backend",
      user: {
        id: "user-1",
        name: "Bee Fit",
        username: "beefit",
        email: "user@email.com",
        weight: 75.5,
        weeklyGoal: 4,
        profileComplete: true,
      },
    });
    const { sessionStorage, getSessionSignal } = await import("../storage/sessionStorage");
    await expect(sessionStorage.getTokens(getSessionSignal()!)).resolves.toEqual({ accessToken: "jwt-backend", refreshToken: "refresh-backend" });
    await expect(sessionStorage.getUser(getSessionSignal()!)).resolves.toMatchObject({ name: "Bee Fit" });
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toBe(`${API_URL}/auth/me`);
    expect(vi.mocked(fetch).mock.calls[1]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Authorization: "Bearer jwt-backend",
      }),
    });
  });

  it("não reabre a sessão se o logout ocorrer enquanto aguarda a troca do código social", async () => {
    const { authService } = await import("./authService");
    const { getSessionSignal, sessionStorage } = await import("../storage/sessionStorage");
    window.localStorage.setItem("beefit.auth.accessToken", "jwt-original");
    window.localStorage.setItem("beefit.auth.refreshToken", "refresh-original");
    let confirm!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(new Promise<Response>((resolve) => { confirm = resolve; }));
    const onReplace = vi.fn();
    const exchange = authService.exchangeSocialCode("codigo-fixture", onReplace);
    const cancelled = expect(exchange).rejects.toMatchObject({ name: "AbortError" });
    await authService.logout();
    confirm(createJsonResponse({
      accessToken: "jwt-social", refreshToken: "refresh-social", user: { id: "social", fullName: "Conta social" },
    }));
    await cancelled;

    expect(onReplace).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledOnce();
    expect(getSessionSignal()).toBeNull();
    await expect(sessionStorage.getToken()).resolves.toBeNull();
  });

  it("registra usuario usando o contrato atual do backend", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            accessToken: "jwt-register",
            refreshToken: "refresh-register",
            user: {
              id: "user-2",
              fullName: "Nova Pessoa",
              username: "nova",
              email: "nova@email.com",
              bodyWeight: 68,
              weeklyGoal: 5,
            },
          },
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          id: "user-2",
          fullName: "Nova Pessoa",
          username: "nova",
          email: "nova@email.com",
          bodyWeight: 68,
          weeklyGoal: 5,
        }),
      );

    const { authService } = await import("./authService");
    const session = await authService.register({
      name: "Nova Pessoa",
      username: "nova",
      email: "nova@email.com",
      password: "123456",
      weight: 68,
      weeklyGoal: 5,
      acceptedTermsVersion: "2026-08-18",
      acceptedPrivacyVersion: "2026-08-18",
    });

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/auth/register`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          fullName: "Nova Pessoa",
          username: "nova",
          email: "nova@email.com",
          password: "123456",
          weeklyGoal: 5,
          bodyWeight: 68,
          acceptedTermsVersion: "2026-08-18",
          acceptedPrivacyVersion: "2026-08-18",
          deviceId: window.localStorage.getItem("beefit.auth.deviceId"),
        }),
      }),
    );
    expect(session).toEqual({
      accessToken: "jwt-register",
      refreshToken: "refresh-register",
      user: {
        id: "user-2",
        name: "Nova Pessoa",
        username: "nova",
        email: "nova@email.com",
        weight: 68,
        weeklyGoal: 5,
        profileComplete: true,
      },
    });
    const { sessionStorage } = await import("../storage/sessionStorage");
    await expect(sessionStorage.getToken()).resolves.toBe("jwt-register");
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toBe(`${API_URL}/auth/me`);
  });

  it("restaura a sessão usando o perfil parcial e o cache local do usuário", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(createJsonResponse({ message: "not found" }, { status: 404 }))
      .mockResolvedValueOnce(
        createJsonResponse({
          fullName: "Bee Fit Updated",
          username: "beefit-updated",
        }),
      );

    window.localStorage.setItem("beefit.auth.accessToken", "jwt-backend");
    window.localStorage.setItem("beefit.auth.refreshToken", "refresh-backend");
    window.localStorage.setItem(
      "beefit.auth.user",
      JSON.stringify({
        id: "user-1",
        name: "Bee Fit",
        email: "user@email.com",
        username: "beefit",
        weeklyGoal: 4,
        weight: 75.5,
      }),
    );

    const { authService } = await import("./authService");
    const session = await authService.restoreSession();

    expect(session).toEqual({
      accessToken: "jwt-backend",
      refreshToken: "refresh-backend",
      user: {
        id: "user-1",
        name: "Bee Fit Updated",
        email: "user@email.com",
        username: "beefit-updated",
        weeklyGoal: 4,
        weight: 75.5,
      },
    });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(`${API_URL}/auth/me`);
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toBe(`${API_URL}/api/profile/me`);
    expect(vi.mocked(fetch).mock.calls[1]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Authorization: "Bearer jwt-backend",
      }),
    });
  });

  it("restaura com o par rotacionado durante a leitura do usuário", async () => {
    window.localStorage.setItem("beefit.auth.accessToken", "jwt-expirado");
    window.localStorage.setItem("beefit.auth.refreshToken", "refresh-inicial");
    window.localStorage.setItem("beefit.auth.deviceId", "device-1");
    vi.mocked(fetch)
      .mockResolvedValueOnce(createJsonResponse({ error: "TOKEN_EXPIRED" }, { status: 401 }))
      .mockResolvedValueOnce(createJsonResponse({ accessToken: "jwt-rotacionado", refreshToken: "refresh-rotacionado" }))
      .mockResolvedValueOnce(createJsonResponse({ id: "user-1", fullName: "Bee Fit", email: "user@example.test" }));

    const { authService } = await import("./authService");
    await expect(authService.restoreSession()).resolves.toMatchObject({
      accessToken: "jwt-rotacionado",
      refreshToken: "refresh-rotacionado",
      user: { id: "user-1" },
    });
    // Outra aba deve restaurar o novo par a partir do armazenamento, sem depender da memória desta aba.
    vi.resetModules();
    const { sessionStorage, getSessionSignal } = await import("../storage/sessionStorage");
    await expect(sessionStorage.getTokens(getSessionSignal()!)).resolves.toEqual({ accessToken: "jwt-rotacionado", refreshToken: "refresh-rotacionado" });
    expect(fetch).toHaveBeenLastCalledWith(`${API_URL}/auth/me`, expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer jwt-rotacionado" }),
    }));
  });

  it("descarta o resultado de um boot que termina depois de trocar de conta", async () => {
    window.localStorage.setItem("beefit.auth.accessToken", "jwt-da-conta-a");
    window.localStorage.setItem("beefit.auth.refreshToken", "refresh-da-conta-a");
    const accountA = { id: "user-a", fullName: "Conta A", email: "a@example.test" };
    const accountB = { id: "user-b", fullName: "Conta B", email: "b@example.test" };
    let finishOldProfile!: (response: Response) => void;
    const oldProfile = new Promise<Response>((resolve) => { finishOldProfile = resolve; });
    vi.mocked(fetch)
      .mockReturnValueOnce(oldProfile)
      .mockResolvedValueOnce(createJsonResponse({ accessToken: "jwt-b", refreshToken: "refresh-b", user: accountB }))
      .mockResolvedValueOnce(createJsonResponse(accountB));

    const { authService } = await import("./authService");
    const boot = authService.restoreSession();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith(`${API_URL}/auth/me`, expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer jwt-da-conta-a" }),
    })));
    await expect(authService.login({ email: accountB.email, password: "senha-fixture" })).resolves.toMatchObject({ user: { id: accountB.id } });
    finishOldProfile(createJsonResponse(accountA));

    await expect(boot).resolves.toBeNull();
    const { sessionStorage, getSessionSignal } = await import("../storage/sessionStorage");
    await expect(sessionStorage.getTokens(getSessionSignal()!)).resolves.toEqual({ accessToken: "jwt-b", refreshToken: "refresh-b" });
    await expect(sessionStorage.getUser(getSessionSignal()!)).resolves.toMatchObject({ id: accountB.id });
  });

  it.each(["refresh", "perfil"])("não ressuscita dados da conta no Capacitor após uma escrita atrasada de %s", async (writer) => {
    native.enabled = true;
    native.values.set("beefit.auth.accessToken", "jwt-a");
    native.values.set("beefit.auth.refreshToken", "refresh-a");
    native.values.set("beefit.auth.deviceId", "device-1");
    const accountA = { id: "user-a", name: "Conta A", email: "a@example.test", weight: 75 };
    const accountB = { id: "user-b", fullName: "Conta B", email: "b@example.test" };
    native.values.set("beefit.auth.user", accountA);
    let writing!: () => void;
    let finishWrite!: () => void;
    const writeStarted = new Promise<void>((resolve) => { writing = resolve; });
    const pendingWrite = new Promise<void>((resolve) => { finishWrite = resolve; });
    native.beforeWrite = (key, value) => {
      const isOldWrite = writer === "refresh"
        ? key === "beefit.auth.accessToken" && value === "jwt-a-rotacionado"
        : key === "beefit.auth.user" && (value as { name?: string } | null)?.name === "Perfil alterado de A";
      if (!isOldWrite) return;
      writing();
      return pendingWrite;
    };
    let offline = false;
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (url === `${API_URL}/auth/refresh`) {
        return createJsonResponse({ accessToken: "jwt-a-rotacionado", refreshToken: "refresh-a-rotacionado" });
      }
      if (url === `${API_URL}/auth/logout` || url === `${API_URL}/api/profile/me`) return new Response(null, { status: 204 });
      if (url === `${API_URL}/auth/login`) return createJsonResponse({ accessToken: "jwt-b", refreshToken: "refresh-b", user: accountB });
      if (url === `${API_URL}/auth/me`) {
        if (offline) return new Response(null, { status: 503 });
        return new Headers(init?.headers).get("Authorization") === "Bearer jwt-b"
          ? createJsonResponse(accountB) : new Response(null, { status: 401 });
      }
      throw new Error("URL inesperada na fixture");
    });
    const { authService } = await import("./authService");
    const { profileService } = await import("./profileService");
    const oldOperation = writer === "refresh"
      ? authService.restoreSession()
      : profileService.saveProfile(accountA, profileService.getProfileFallback(accountA), { displayName: "Perfil alterado de A" })
        .catch((error) => error);
    await writeStarted;
    const logout = authService.logout();
    const login = authService.login({ email: accountB.email, password: "senha-fixture" });
    // Se a escrita puder ultrapassar a troca, ela termina depois de o novo perfil ser persistido.
    await Promise.race([login, new Promise<void>((resolve) => setTimeout(resolve, 50))]);
    finishWrite();

    await logout;
    await expect(login).resolves.toMatchObject({ user: { id: accountB.id } });
    if (writer === "refresh") await expect(oldOperation).resolves.toBeNull();
    else await oldOperation;
    offline = true;
    await expect(authService.restoreSession()).resolves.toMatchObject({ user: { id: accountB.id } });
    expect(native.values.get("beefit.auth.accessToken")).toBe("jwt-b");
    expect(native.values.get("beefit.auth.refreshToken")).toBe("refresh-b");
    expect(native.values.get("beefit.auth.user")).toMatchObject({ id: accountB.id });
    expect(window.localStorage.getItem("beefit.auth.accessToken")).toBeNull();
  });

  it("informa falhas de limpeza do Secure Storage e não restaura a sessão antiga no próximo boot", async () => {
    native.enabled = true;
    native.values.set("beefit.auth.accessToken", "jwt-antigo");
    native.values.set("beefit.auth.refreshToken", "refresh-antigo");
    native.values.set("beefit.auth.deviceId", "device-1");
    native.values.set("beefit.auth.user", { id: "user-1", name: "Conta anterior" });
    const remove = vi.fn(() => { throw new Error("Secure Storage indisponível na fixture"); });
    native.beforeRemove = remove;
    const draftKey = "beefit.workoutDraft.user-1.workout-1";
    window.localStorage.setItem(draftKey, JSON.stringify({ userId: "user-1", workoutId: "workout-1" }));
    window.localStorage.setItem("beefit.feed.live-friends", "[]");
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (url === `${API_URL}/auth/logout`) return new Response(null, { status: 204 });
      if (url === `${API_URL}/auth/login`) return createJsonResponse({ accessToken: "jwt-novo", refreshToken: "refresh-novo", user: { id: "user-2", fullName: "Conta nova" } });
      throw new TypeError("Offline na fixture");
    });

    const { authService } = await import("./authService");
    await expect(authService.logout()).rejects.toThrow(/limpeza local/i);
    for (const key of ["accessToken", "refreshToken", "user"]) {
      expect(remove).toHaveBeenCalledWith(`beefit.auth.${key}`);
    }
    expect(window.localStorage.getItem("beefit.feed.live-friends")).toBeNull();
    expect(window.localStorage.getItem(draftKey)).not.toBeNull();
    expect(window.localStorage.getItem("beefit.auth.accessToken")).toBeNull();
    expect(fetch).toHaveBeenCalledWith(`${API_URL}/auth/logout`, expect.anything());

    vi.mocked(fetch).mockClear();
    vi.resetModules();
    const { authService: restarted } = await import("./authService");
    const { getSessionSignal } = await import("../storage/sessionStorage");
    await expect(restarted.restoreSession()).resolves.toBeNull();
    expect(getSessionSignal()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();

    native.beforeRemove = null;
    vi.mocked(fetch).mockResolvedValueOnce(createJsonResponse({ accessToken: "jwt-novo", refreshToken: "refresh-novo", user: { id: "user-2", fullName: "Conta nova" } }))
      .mockResolvedValueOnce(createJsonResponse({ id: "user-2", fullName: "Conta nova", email: "nova@example.test" }));
    await expect(restarted.login({ email: "nova@example.test", password: "senha-fixture" }))
      .resolves.toMatchObject({ user: { id: "user-2" } });
    await expect(restarted.restoreSession()).resolves.toMatchObject({ user: { id: "user-2" } });
  });

  it("continua limpando tokens, perfil e caches quando não consegue ler o usuário anterior", async () => {
    native.enabled = true;
    native.values.set("beefit.auth.accessToken", "jwt-antigo");
    native.values.set("beefit.auth.refreshToken", "refresh-antigo");
    native.values.set("beefit.auth.user", { id: "user-1", name: "Conta anterior" });
    native.beforeRead = (key) => {
      if (key === "beefit.auth.user") throw new Error("não pôde ler o perfil na fixture");
    };
    window.localStorage.setItem("beefit.feed.live-friends", "[]");

    const { authService } = await import("./authService");
    await expect(authService.logout()).rejects.toThrow(/limpeza local/i);
    expect(native.values.size).toBe(0);
    expect(window.localStorage.getItem("beefit.feed.live-friends")).toBeNull();
  });

  it("preserva a sessão em cache se o refresh durante o boot falhar transitoriamente", async () => {
    window.localStorage.setItem("beefit.auth.accessToken", "jwt-inicial");
    window.localStorage.setItem("beefit.auth.refreshToken", "refresh-inicial");
    window.localStorage.setItem("beefit.auth.deviceId", "device-1");
    window.localStorage.setItem("beefit.auth.user", JSON.stringify({ id: "user-1", name: "Conta em cache" }));
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));

    const { authService } = await import("./authService");
    await expect(authService.restoreSession()).resolves.toMatchObject({
      accessToken: "jwt-inicial",
      refreshToken: "refresh-inicial",
      user: { id: "user-1" },
    });
  });

  it("limpa a sessão persistida quando o token salvo é inválido", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(createJsonResponse({ message: "unauthorized" }, { status: 401 }));

    window.localStorage.setItem("beefit.auth.accessToken", "broken-token");
    window.localStorage.setItem("beefit.auth.refreshToken", "refresh-broken-token");
    window.localStorage.setItem(
      "beefit.auth.user",
      JSON.stringify({
        id: "user-1",
        name: "Bee Fit",
        email: "user@email.com",
      }),
    );

    const { authService } = await import("./authService");
    const session = await authService.restoreSession();

    expect(session).toBeNull();
    expect(window.localStorage.getItem("beefit.auth.accessToken")).toBeNull();
    expect(window.localStorage.getItem("beefit.auth.refreshToken")).toBeNull();
    expect(window.localStorage.getItem("beefit.auth.user")).toBeNull();
    vi.resetModules();
    const { authService: restarted } = await import("./authService");
    await expect(restarted.restoreSession()).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("marca a conta social recem-criada como cadastro incompleto", async () => {
    window.localStorage.setItem("beefit.auth.accessToken", "jwt-social");
    window.localStorage.setItem("beefit.auth.refreshToken", "refresh-social");
    vi.mocked(fetch).mockResolvedValueOnce(
      createJsonResponse({
        id: "user-2",
        fullName: "Conta Social",
        username: "social",
        email: "social@gmail.com",
        bodyWeight: null,
        weeklyGoal: null,
        profileComplete: false,
      }),
    );

    const { authService } = await import("./authService");
    const session = await authService.restoreSession();

    expect(session?.user).toMatchObject({ profileComplete: false, weight: null, weeklyGoal: null });
  });

  it("completa o cadastro social e persiste o usuario atualizado", async () => {
    window.localStorage.setItem("beefit.auth.accessToken", "jwt-social");
    window.localStorage.setItem("beefit.auth.refreshToken", "refresh-social");
    vi.mocked(fetch).mockResolvedValueOnce(
      createJsonResponse({
        id: "user-2",
        fullName: "Conta Social",
        username: "social",
        email: "social@gmail.com",
        bodyWeight: 68.5,
        weeklyGoal: 3,
        profileComplete: true,
      }),
    );

    const { authService } = await import("./authService");
    const user = await authService.completeProfile({
      weight: 68.5,
      weeklyGoal: 3,
      acceptedTermsVersion: "2026-08-18",
      acceptedPrivacyVersion: "2026-08-18",
    });

    expect(user).toMatchObject({ profileComplete: true, weight: 68.5, weeklyGoal: 3 });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(`${API_URL}/auth/complete-profile`);
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body))).toEqual({
      bodyWeight: 68.5,
      weeklyGoal: 3,
      acceptedTermsVersion: "2026-08-18",
      acceptedPrivacyVersion: "2026-08-18",
    });
    const { getSessionSignal, sessionStorage } = await import("../storage/sessionStorage");
    await expect(sessionStorage.getUser(getSessionSignal()!)).resolves.toMatchObject({ id: "user-2", profileComplete: true });
  });
});
