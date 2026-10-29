import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

const authState = vi.hoisted(() => ({
  current: {
    isAuthenticated: false,
    isBootstrapping: false,
  },
}));
const removeCachedPage = vi.hoisted(() => vi.fn());

vi.mock("./auth/AuthContext", () => ({
  useAuth: () => authState.current,
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
  SocialFeedScreen: () => <div>social-feed-screen</div>,
}));

vi.mock("./components/SocialScreen", () => ({
  SocialScreen: () => <div>social-screen</div>,
}));

vi.mock("./components/WorkoutStartScreen", () => ({
  WorkoutStartScreen: ({ onWorkoutCompleted }: { onWorkoutCompleted: (draft: never, summary: never) => void }) => (
    <button type="button" onClick={() => onWorkoutCompleted({} as never, {} as never)}>complete-workout</button>
  ),
  resetActiveWorkoutMemory: vi.fn(),
}));
vi.mock("./components/workout-share", () => ({
  WorkoutShareSheet: ({ target }: { target: unknown }) => (target ? <div>workout-share-sheet</div> : null),
}));

vi.mock("./storage/pageCacheStorage", () => ({ pageCacheStorage: { remove: removeCachedPage } }));

vi.mock("./components/InventoryScreen", () => ({
  InventoryScreen: () => <div>inventory-screen</div>,
}));

vi.mock("./components/ProfileScreen", () => ({
  DEFAULT_ACCOUNT_SETTINGS: { ghostModeEnabled: false },
  ProfileScreen: () => <div>profile-screen</div>,
}));

describe("App", () => {
  beforeEach(() => {
    removeCachedPage.mockReset();
    authState.current = {
      isAuthenticated: false,
      isBootstrapping: false,
    };
  });

  it("mostra a tela de boot enquanto a sessão está sendo restaurada", () => {
    authState.current = {
      isAuthenticated: false,
      isBootstrapping: true,
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

  it("volta sempre para login quando a sessão é encerrada", () => {
    const { rerender } = render(<App />);

    fireEvent.click(screen.getByText("go-register"));
    expect(screen.getByText("register-screen")).toBeInTheDocument();

    authState.current = {
      isAuthenticated: true,
      isBootstrapping: false,
    };
    rerender(<App />);

    authState.current = {
      isAuthenticated: false,
      isBootstrapping: false,
    };
    rerender(<App />);

    expect(screen.getByText("login-screen")).toBeInTheDocument();
  });

  it("renderiza a área autenticada quando o usuário já está logado", async () => {
    authState.current = {
      isAuthenticated: true,
      isBootstrapping: false,
    };

    render(<App />);

    expect(screen.getByText("social-feed-screen")).toBeInTheDocument();
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

  it("invalida posts e dias do perfil ao concluir um treino", () => {
    authState.current = {
      isAuthenticated: true,
      isBootstrapping: false,
    };
    Object.assign(authState.current, { user: { id: "user-1" } });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Treino" }));
    fireEvent.click(screen.getByRole("button", { name: "complete-workout" }));

    expect(removeCachedPage).toHaveBeenCalledWith("user-1", "profile.posts");
    expect(removeCachedPage).toHaveBeenCalledWith("user-1", "profile.trained-days");
  });

  it("abre o card de compartilhamento ao concluir um treino", () => {
    authState.current = {
      isAuthenticated: true,
      isBootstrapping: false,
    };
    Object.assign(authState.current, { user: { id: "user-1" } });

    render(<App />);
    expect(screen.queryByText("workout-share-sheet")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Treino" }));
    fireEvent.click(screen.getByRole("button", { name: "complete-workout" }));

    expect(screen.getByText("workout-share-sheet")).toBeInTheDocument();
  });
});
