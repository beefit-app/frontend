import { act, fireEvent, render, screen } from "@testing-library/react";
import App from "./App";
import type { AuthUser } from "./types/auth";
import type { ComponentProps } from "react";

vi.hoisted(() => vi.stubEnv("VITE_API_URL", "http://api.test"));

const authState = vi.hoisted(() => ({
  current: {
    isAuthenticated: false,
    isBootstrapping: false,
    user: null,
  } as { isAuthenticated: boolean; isBootstrapping: boolean; user: AuthUser | null; needsProfileCompletion?: boolean },
}));

function signInAs(id: string) {
  authState.current = { isAuthenticated: true, isBootstrapping: false, user: { id, name: id, email: `${id}@example.test` } };
}
const loginWithSocialCode = vi.hoisted(() => vi.fn<(code: string) => Promise<void>>());
const removeCachedPage = vi.hoisted(() => vi.fn());
const workoutCompletion = vi.hoisted(() => ({ pending: null as Promise<void> | null }));

vi.mock("./auth/AuthContext", () => ({
  useAuth: () => ({ ...authState.current, loginWithSocialCode }),
}));

vi.mock("./components/LoginScreen", () => ({
  LoginScreen: ({ onNavigateToRegister }: { onNavigateToRegister: () => void }) => (
    <div>
      <span>login-screen</span>
      <button type="button" onClick={onNavigateToRegister}>
        go-register
      </button>
    </div>
  ),
}));

vi.mock("./components/RegisterScreen", () => ({
  RegisterScreen: ({ onNavigateToLogin }: { onNavigateToLogin: () => void }) => (
    <div>
      <span>register-screen</span>
      <button type="button" onClick={onNavigateToLogin}>
        go-login
      </button>
    </div>
  ),
}));

vi.mock("./components/SocialFeedScreen", () => ({
  SocialFeedScreen: ({ onOpenUserProfile, streakCount }: ComponentProps<typeof import("./components/SocialFeedScreen").SocialFeedScreen>) => (
    <div>
      social-feed-screen
      <span>ofensiva: {streakCount}</span>
      <button type="button" onClick={() => onOpenUserProfile?.("amiga-da-primeira-conta")}>abrir perfil social</button>
    </div>
  ),
}));

vi.mock("./components/SocialScreen", () => ({
  SocialScreen: ({ profileUsername }: { profileUsername: string | null }) => (
    <div>social-screen{profileUsername && <span>{profileUsername}</span>}</div>
  ),
}));

vi.mock("./components/WorkoutStartScreen", () => ({
  WorkoutStartScreen: ({ onWorkoutCompleted, onActiveWorkoutChange, ghostModeEnabled }: ComponentProps<typeof import("./components/WorkoutStartScreen").WorkoutStartScreen>) => (
    <>
      <span>modo fantasma: {String(ghostModeEnabled)}</span>
      <button type="button" onClick={() => onActiveWorkoutChange?.({ workoutId: "treino-1", selectedGroups: ["Costas"], startedAt: Date.now() })}>
        iniciar treino
      </button>
      <button type="button" onClick={() => {
        const complete = () => onWorkoutCompleted?.({} as never, {} as never);
        if (workoutCompletion.pending) void workoutCompletion.pending.then(complete);
        else complete();
      }}>complete-workout</button>
    </>
  ),
  resetActiveWorkoutMemory: vi.fn(),
}));
vi.mock("./components/workout-share", () => ({
  WorkoutShareSheet: ({ target }: { target: unknown }) => (target ? <div>workout-share-sheet</div> : null),
}));

vi.mock("./storage/pageCacheStorage", () => ({ pageCacheStorage: { remove: removeCachedPage } }));

vi.mock("./components/CompleteProfileScreen", () => ({
  CompleteProfileScreen: () => <div>complete-profile-screen</div>,
}));

vi.mock("./components/InventoryScreen", () => ({
  InventoryScreen: () => <div>inventory-screen</div>,
}));

vi.mock("./components/ProfileScreen", () => ({
  DEFAULT_ACCOUNT_SETTINGS: { ghostModeEnabled: false },
  ProfileScreen: ({ onAccountSettingsChange }: ComponentProps<typeof import("./components/ProfileScreen").ProfileScreen>) => (
    <button type="button" onClick={() => onAccountSettingsChange?.({ ghostModeEnabled: true })}>ativar modo fantasma</button>
  ),
}));

describe("App", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    loginWithSocialCode.mockReset();
    removeCachedPage.mockReset().mockResolvedValue(undefined);
    workoutCompletion.pending = null;
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(null, { status: 503 })));
    authState.current = { isAuthenticated: false, isBootstrapping: false, user: null };
  });

  afterEach(() => vi.unstubAllGlobals());
  afterAll(() => vi.unstubAllEnvs());

  it("mostra a tela de boot enquanto a sessão está sendo restaurada", () => {
    authState.current = {
      isAuthenticated: false,
      isBootstrapping: true,
      user: null,
    };

    render(<App />);

    expect(screen.getByAltText("BeeFit")).toBeInTheDocument();
  });

  it("permite alternar entre login e cadastro", () => {
    render(<App />);

    expect(screen.getByText("login-screen")).toBeInTheDocument();
    fireEvent.click(screen.getByText("go-register"));
    expect(screen.getByText("register-screen")).toBeInTheDocument();
    fireEvent.click(screen.getByText("go-login"));
    expect(screen.getByText("login-screen")).toBeInTheDocument();
  });

  it("volta sempre para login quando a sessão é encerrada", async () => {
    const { rerender } = render(<App />);

    fireEvent.click(screen.getByText("go-register"));
    expect(screen.getByText("register-screen")).toBeInTheDocument();

    signInAs("user-1");
    await act(async () => { rerender(<App />); });

    authState.current = { isAuthenticated: false, isBootstrapping: false, user: null };
    rerender(<App />);

    expect(screen.getByText("login-screen")).toBeInTheDocument();
  });

  it("mantém o callback web montado até consumir o código uma vez e voltar ao app", async () => {
    window.history.replaceState(null, "", "/oauth-callback?code=codigo-fixture");
    let confirm!: () => void;
    loginWithSocialCode.mockReturnValue(new Promise<void>((resolve) => { confirm = resolve; }));
    const { rerender } = render(<App />);
    expect(loginWithSocialCode).toHaveBeenCalledExactlyOnceWith("codigo-fixture");

    signInAs("conta-social");
    rerender(<App />);
    expect(screen.getByText("Concluindo login…")).toBeInTheDocument();
    expect(loginWithSocialCode).toHaveBeenCalledOnce();

    await act(async () => { confirm(); });
    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("");
    expect(await screen.findByText("social-feed-screen")).toBeInTheDocument();
  });

  it("trava o app na tela de completar cadastro enquanto a conta social estiver incompleta", () => {
    signInAs("conta-social");
    authState.current.needsProfileCompletion = true;

    const { rerender } = render(<App />);

    expect(screen.getByText("complete-profile-screen")).toBeInTheDocument();
    expect(screen.queryByText("social-feed-screen")).not.toBeInTheDocument();
    expect(screen.queryByTestId("bottom-navigation")).not.toBeInTheDocument();

    authState.current.needsProfileCompletion = false;
    rerender(<App />);

    expect(screen.queryByText("complete-profile-screen")).not.toBeInTheDocument();
    expect(screen.getByText("social-feed-screen")).toBeInTheDocument();
  });

  it("renderiza a área autenticada quando o usuário já está logado", async () => {
    signInAs("user-1");
    render(<App />);

    expect(await screen.findByText("social-feed-screen")).toBeInTheDocument();
    expect(screen.queryByText("social-screen")).not.toBeInTheDocument();
    expect(screen.getByText("Feed")).toBeInTheDocument();
    expect(screen.getByText("Social")).toBeInTheDocument();
    expect(screen.getByText("Treino")).toBeInTheDocument();
    expect(screen.getByText("Inventário")).toBeInTheDocument();
    expect(screen.getByText("Perfil")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-navigation").tagName.toLowerCase()).toBe("ion-footer");

    fireEvent.click(screen.getByRole("button", { name: "Social" }));
    expect(await screen.findByText("social-screen")).toBeInTheDocument();
    expect(screen.getByText("social-screen").closest("div")?.parentElement).toHaveStyle({ display: "block" });
    expect(screen.getByText("social-feed-screen").closest("div")?.parentElement).toHaveStyle({ display: "none" });
  });

  it.each(["novo login após logout", "troca direta"])("não mostra estado da primeira conta: %s", async (transition) => {
    vi.mocked(fetch).mockImplementation(async (url) => (
      String(url).endsWith("/api/profile/me") && authState.current.user?.id === "user-1"
        ? Response.json({ offensiveHoneys: 7 })
        : new Response(null, { status: 503 })
    ));
    signInAs("user-1");
    const { rerender } = render(<App />);
    expect(await screen.findByText("ofensiva: 7")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Perfil" }));
    fireEvent.click(screen.getByRole("button", { name: "ativar modo fantasma" }));
    fireEvent.click(screen.getByRole("button", { name: "Treino" }));
    expect(screen.getByText("modo fantasma: true")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "iniciar treino" }));
    fireEvent.click(screen.getByRole("button", { name: "Feed" }));
    fireEvent.click(screen.getByRole("button", { name: "abrir perfil social" }));
    expect(await screen.findByText("amiga-da-primeira-conta")).toBeVisible();
    expect(screen.getByText("Treino ativo")).toBeVisible();

    if (transition === "novo login após logout") {
      authState.current = { isAuthenticated: false, isBootstrapping: false, user: null };
      rerender(<App />);
      expect(screen.getByText("login-screen")).toBeVisible();
    }
    signInAs("user-2");
    await act(async () => { rerender(<App />); });

    expect(screen.getByRole("button", { name: "Feed" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("Treino ativo")).not.toBeInTheDocument();
    expect(screen.queryByText("amiga-da-primeira-conta")).not.toBeInTheDocument();
    expect(screen.getByText("ofensiva: 0")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Treino" }));
    expect(screen.getByText("modo fantasma: false")).toBeVisible();
  });

  it("invalida posts e dias do perfil ao concluir um treino", async () => {
    signInAs("user-1");
    await act(async () => { render(<App />); });
    fireEvent.click(screen.getByRole("button", { name: "Treino" }));
    fireEvent.click(screen.getByRole("button", { name: "complete-workout" }));

    expect(removeCachedPage).toHaveBeenCalledWith("user-1", "profile.posts");
    expect(removeCachedPage).toHaveBeenCalledWith("user-1", "profile.trained-days");
  });

  it("ignora a conclusão de treino que chega depois de a conta sair", async () => {
    let finishWorkout!: () => void;
    workoutCompletion.pending = new Promise<void>((resolve) => { finishWorkout = resolve; });
    signInAs("user-1");
    const { rerender } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Treino" }));
    fireEvent.click(screen.getByRole("button", { name: "complete-workout" }));

    signInAs("user-2");
    rerender(<App />);
    removeCachedPage.mockClear();
    await act(async () => { finishWorkout(); });

    expect(screen.queryByText("workout-share-sheet")).not.toBeInTheDocument();
    expect(removeCachedPage).not.toHaveBeenCalled();
  });

  it("abre o card de compartilhamento ao concluir um treino", async () => {
    signInAs("user-1");
    await act(async () => { render(<App />); });
    expect(screen.queryByText("workout-share-sheet")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Treino" }));
    fireEvent.click(screen.getByRole("button", { name: "complete-workout" }));

    expect(screen.getByText("workout-share-sheet")).toBeInTheDocument();
  });
});
