import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";

const API_URL = "http://api.test";
const accountA = { id: "user-a", fullName: "Conta A", email: "a@example.test" };
const accountB = { id: "user-b", fullName: "Conta B", email: "b@example.test" };

function seedAccountA() {
  vi.stubEnv("VITE_API_URL", API_URL);
  vi.stubEnv("VITE_DEV_AUTH_BYPASS", "false");
  window.localStorage.setItem("beefit.auth.accessToken", "jwt-a");
  window.localStorage.setItem("beefit.auth.refreshToken", "refresh-a");
  window.localStorage.setItem("beefit.auth.deviceId", "device-1");
}

function createAuthProbe(useAuth: typeof import("./AuthContext").useAuth) {
  return function AuthProbe() {
    const { user, isAuthenticated, isBootstrapping, logout, login } = useAuth();

    return (
      <div>
        <span data-testid="boot">{String(isBootstrapping)}</span>
        <span data-testid="auth">{String(isAuthenticated)}</span>
        <span data-testid="user">{user?.name ?? "anonymous"}</span>
        <button type="button" onClick={() => void logout()}>
          logout
        </button>
        <button type="button" onClick={() => void login({ email: accountB.email, password: "senha-fixture" })}>
          entrar na conta B
        </button>
      </div>
    );
  };
}

describe("AuthProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it("restaura uma sessão válida salva localmente", async () => {
    vi.stubEnv("VITE_API_URL", "");
    vi.stubEnv("VITE_DEV_AUTH_BYPASS", "true");
    const { authService } = await import("../services/authService");
    const { AuthProvider, useAuth } = await import("./AuthContext");
    const AuthProbe = createAuthProbe(useAuth);
    await authService.login({ email: "restore@beefit.dev", password: "123456" });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("boot")).toHaveTextContent("false"));
    expect(screen.getByTestId("auth")).toHaveTextContent("true");
    expect(screen.getByTestId("user")).toHaveTextContent("Restore");
  });

  it("limpa uma sessão inválida durante o boot", async () => {
    vi.stubEnv("VITE_API_URL", "");
    vi.stubEnv("VITE_DEV_AUTH_BYPASS", "true");
    const { AuthProvider, useAuth } = await import("./AuthContext");
    const AuthProbe = createAuthProbe(useAuth);
    window.localStorage.setItem("beefit.auth.accessToken", "broken-token");

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("boot")).toHaveTextContent("false"));
    expect(screen.getByTestId("auth")).toHaveTextContent("false");
    expect(window.localStorage.getItem("beefit.auth.accessToken")).toBeNull();
  });

  it("executa logout e limpa a sessão persistida", async () => {
    vi.stubEnv("VITE_API_URL", "");
    vi.stubEnv("VITE_DEV_AUTH_BYPASS", "true");
    const { authService } = await import("../services/authService");
    const { AuthProvider, useAuth } = await import("./AuthContext");
    const AuthProbe = createAuthProbe(useAuth);
    await authService.login({ email: "logout@beefit.dev", password: "123456" });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("auth")).toHaveTextContent("true"));
    fireEvent.click(screen.getByText("logout"));

    await waitFor(() => expect(screen.getByTestId("auth")).toHaveTextContent("false"));
    expect(window.localStorage.getItem("beefit.auth.accessToken")).toBeNull();
    expect(window.localStorage.getItem("beefit.auth.refreshToken")).toBeNull();
  });

  it("um 401 definitivo do SSE desmonta a sessão antes de a revogação remota responder", async () => {
    seedAccountA();
    const { AuthProvider, useAuth } = await import("./AuthContext");
    const { subscribeSocialEvents } = await import("../services/socialEventsService");
    const AuthProbe = createAuthProbe(useAuth);
    let finishLogout!: (value: Response) => void;
    const remoteLogout = new Promise<Response>((resolve) => { finishLogout = resolve; });
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(async (url, init) => {
      if (url === `${API_URL}/auth/me`) {
        return Response.json(new Headers(init?.headers).get("Authorization") === "Bearer jwt-b" ? accountB : accountA);
      }
      if (url === `${API_URL}/auth/login`) return Response.json({ accessToken: "jwt-b", refreshToken: "refresh-b", user: accountB });
      if (url === `${API_URL}/auth/logout`) return remoteLogout;
      if (url === `${API_URL}/api/social/feed` || url === `${API_URL}/auth/refresh`) return new Response(null, { status: 401 });
      throw new Error("URL inesperada na fixture");
    }));
    const { unmount } = render(<AuthProvider><AuthProbe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Conta A"));

    const subscriber = new AbortController();
    try {
      await act(async () => { await subscribeSocialEvents(vi.fn(), subscriber.signal); });
      await waitFor(() => {
        expect(screen.getByTestId("auth")).toHaveTextContent("false");
        expect(window.localStorage.getItem("beefit.auth.accessToken")).toBeNull();
        expect(window.localStorage.getItem("beefit.auth.refreshToken")).toBeNull();
      });
      expect(fetch).toHaveBeenCalledWith(`${API_URL}/auth/logout`, expect.anything());
      fireEvent.click(screen.getByRole("button", { name: "entrar na conta B" }));
      await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Conta B"));
      await act(async () => { finishLogout(new Response(null, { status: 204 })); });
      expect(screen.getByTestId("user")).toHaveTextContent("Conta B");
    } finally {
      subscriber.abort();
      finishLogout(new Response(null, { status: 204 }));
      unmount();
    }
  });

  it("invalida a UI e o stream da aba antiga sem adotar nem revogar a nova sessão", async () => {
    seedAccountA();
    const { AuthProvider, useAuth } = await import("./AuthContext");
    const { subscribeSocialEvents } = await import("../services/socialEventsService");
    const { workoutService } = await import("../services/workoutService");
    const AuthProbe = createAuthProbe(useAuth);
    const streamCanceled = vi.fn();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(async (url, init) => {
      if (url === `${API_URL}/auth/me`) {
        return Response.json(new Headers(init?.headers).get("Authorization") === "Bearer jwt-b" ? accountB : accountA);
      }
      if (url === `${API_URL}/auth/login`) return Response.json({ accessToken: "jwt-b", refreshToken: "refresh-b", user: accountB });
      if (url === `${API_URL}/api/social/feed`) return new Response(new ReadableStream({ cancel: streamCanceled }));
      if (url === `${API_URL}/api/templates`) return Response.json([{ id: "t-1", name: "Push", muscleGroups: ["peito"], exercises: [] }]);
      throw new Error("URL inesperada na fixture");
    }));
    render(<AuthProvider><AuthProbe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Conta A"));
    await workoutService.loadTemplates();
    expect(workoutService.getTemplates()).toHaveLength(1);

    const subscriber = new AbortController();
    try {
      const unsubscribed = vi.fn();
      const stream = subscribeSocialEvents(vi.fn(), subscriber.signal).then(unsubscribed);
      await waitFor(() => expect(fetch).toHaveBeenCalledWith(`${API_URL}/api/social/feed`, expect.anything()));
      const before = window.localStorage.getItem("beefit.auth.generation");
      vi.resetModules();
      const { authService } = await import("../services/authService");
      await authService.login({ email: accountB.email, password: "senha-fixture" });
      const after = window.localStorage.getItem("beefit.auth.generation");
      await act(async () => {
        window.dispatchEvent(new StorageEvent("storage", { key: "beefit.auth.generation", oldValue: before, newValue: after }));
      });
      expect(screen.getByTestId("auth")).toHaveTextContent("false");
      expect(screen.getByTestId("user")).toHaveTextContent("anonymous");
      expect(unsubscribed).toHaveBeenCalledOnce();
      expect(streamCanceled).toHaveBeenCalledOnce();
      expect(workoutService.getTemplates()).toEqual([]);
      await stream;
      expect(fetch).not.toHaveBeenCalledWith(`${API_URL}/auth/logout`, expect.anything());
      await expect(authService.restoreSession()).resolves.toMatchObject({ user: { id: accountB.id } });
    } finally {
      subscriber.abort();
    }
  });

  it("um boot atrasado não derruba a conta que entrou depois", async () => {
    seedAccountA();
    const { AuthProvider, useAuth } = await import("./AuthContext");
    const AuthProbe = createAuthProbe(useAuth);
    let finishBoot!: (value: Response) => void;
    const oldProfile = new Promise<Response>((resolve) => { finishBoot = resolve; });
    vi.stubGlobal("fetch", vi.fn()
      .mockReturnValueOnce(oldProfile)
      .mockResolvedValueOnce(Response.json({ accessToken: "jwt-b", refreshToken: "refresh-b", user: accountB }))
      .mockResolvedValueOnce(Response.json(accountB)));
    render(<AuthProvider><AuthProbe /></AuthProvider>);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(`${API_URL}/auth/me`, expect.anything()));
    fireEvent.click(screen.getByRole("button", { name: "entrar na conta B" }));
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Conta B"));
    await act(async () => { finishBoot(Response.json(accountA)); });
    expect(screen.getByTestId("user")).toHaveTextContent("Conta B");
  });

  it("mantém a sessão atual enquanto aguarda o código social e reporta a recusa sem logout", async () => {
    seedAccountA();
    const { AuthProvider, useAuth } = await import("./AuthContext");
    const { getSessionSignal } = await import("../storage/sessionStorage");
    let rejectCode!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json(accountA))
      .mockReturnValueOnce(new Promise<Response>((resolve) => { rejectCode = resolve; })));
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.user?.id).toBe(accountA.id));
    const originalSession = getSessionSignal();

    let exchange!: Promise<void>;
    act(() => { exchange = result.current.loginWithSocialCode("codigo-fixture"); });
    expect(result.current).toMatchObject({ isSubmitting: true, user: { id: accountA.id } });
    expect(getSessionSignal()).toBe(originalSession);
    await act(async () => {
      rejectCode(Response.json({ message: "Código expirado." }, { status: 401 }));
      await expect(exchange).rejects.toMatchObject({ status: 401 });
    });
    expect(result.current).toMatchObject({ authError: "Código expirado.", isSubmitting: false, user: { id: accountA.id } });
    expect(getSessionSignal()).toBe(originalSession);
    expect(fetch).not.toHaveBeenCalledWith(`${API_URL}/auth/logout`, expect.anything());
  });

  it("reporta a falha ao validar a sessão social confirmada e limpa as credenciais", async () => {
    seedAccountA();
    const { AuthProvider, useAuth } = await import("./AuthContext");
    const { sessionStorage } = await import("../storage/sessionStorage");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json(accountA))
      .mockResolvedValueOnce(Response.json({ accessToken: "jwt-b", refreshToken: "refresh-b", user: accountB }))
      .mockResolvedValueOnce(Response.json({ message: "Sessão inválida." }, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 })));
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.user?.id).toBe(accountA.id));

    await act(async () => {
      await expect(result.current.loginWithSocialCode("codigo-fixture")).rejects.toMatchObject({ status: 401 });
    });
    expect(result.current).toMatchObject({ isAuthenticated: false, isSubmitting: false, authError: "Sessão inválida." });
    await expect(sessionStorage.getToken()).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalledWith(`${API_URL}/auth/logout`, expect.anything());
  });

  it("reage a cadastro incompleto retornado em uma chamada da sessão ativa", async () => {
    seedAccountA();
    const { AuthProvider, useAuth } = await import("./AuthContext");
    const { apiClient } = await import("../services/apiClient");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json(accountA))
      .mockResolvedValueOnce(Response.json({ error: "PROFILE_INCOMPLETE" }, { status: 403 })));
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.user?.id).toBe(accountA.id));
    expect(result.current.needsProfileCompletion).toBe(false);

    await act(async () => {
      await expect(apiClient.get("/api/profile/me", { auth: true })).rejects.toMatchObject({ status: 403 });
    });
    expect(result.current).toMatchObject({ isAuthenticated: true, needsProfileCompletion: true });
  });

  it("troca de geração no login social confirmado e completa o perfil sem trocar as credenciais", async () => {
    seedAccountA();
    const { AuthProvider, useAuth } = await import("./AuthContext");
    const { getSessionSignal, sessionStorage } = await import("../storage/sessionStorage");
    const incomplete = { ...accountB, weeklyGoal: null, bodyWeight: null, profileComplete: false };
    const updated = { ...incomplete, weeklyGoal: 4, bodyWeight: 75, profileComplete: true };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json(accountA))
      .mockResolvedValueOnce(Response.json({ accessToken: "jwt-b", refreshToken: "refresh-b", user: incomplete }))
      .mockResolvedValueOnce(Response.json(incomplete))
      .mockResolvedValueOnce(Response.json({ message: "Termos desatualizados." }, { status: 400 }))
      .mockResolvedValueOnce(Response.json(updated));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.user?.id).toBe(accountA.id));
    const originalSession = getSessionSignal();

    await act(async () => { await result.current.loginWithSocialCode("codigo-fixture"); });
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${API_URL}/auth/social/exchange`, expect.objectContaining({
      method: "POST", body: JSON.stringify({ code: "codigo-fixture" }),
    }));
    expect(originalSession?.aborted).toBe(true);
    const socialSession = getSessionSignal()!;
    expect(socialSession).not.toBe(originalSession);
    expect(result.current).toMatchObject({ user: { id: accountB.id }, needsProfileCompletion: true });

    const input = { weight: 75, weeklyGoal: 4, acceptedTermsVersion: "v1", acceptedPrivacyVersion: "v1" };
    await act(async () => { await expect(result.current.completeProfile(input)).rejects.toMatchObject({ status: 400 }); });
    expect(result.current).toMatchObject({ needsProfileCompletion: true, authError: "Termos desatualizados." });
    await act(async () => { await result.current.completeProfile(input); });
    expect(fetchMock).toHaveBeenLastCalledWith(`${API_URL}/auth/complete-profile`, expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer jwt-b" }),
      body: JSON.stringify({ bodyWeight: 75, weeklyGoal: 4, acceptedTermsVersion: "v1", acceptedPrivacyVersion: "v1" }),
    }));
    expect(result.current).toMatchObject({ needsProfileCompletion: false, user: { id: accountB.id, weight: 75 } });
    expect(getSessionSignal()).toBe(socialSession);
    await expect(sessionStorage.getUser(socialSession)).resolves.toMatchObject({ id: accountB.id, profileComplete: true });
    await expect(sessionStorage.getTokens(socialSession)).resolves.toEqual({ accessToken: "jwt-b", refreshToken: "refresh-b" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
});
