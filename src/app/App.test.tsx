import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

const authState = vi.hoisted(() => ({
  current: {
    isAuthenticated: false,
    isBootstrapping: false,
  },
}));

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

vi.mock("./components/WorkoutStartScreen", () => ({
  WorkoutStartScreen: () => <div>workout-screen</div>,
}));

vi.mock("./components/ProfileScreen", () => ({
  DEFAULT_ACCOUNT_SETTINGS: { ghostModeEnabled: false },
  ProfileScreen: () => <div>profile-screen</div>,
}));

describe("App", () => {
  beforeEach(() => {
    authState.current = {
      isAuthenticated: false,
      isBootstrapping: false,
    };
  });

  it("mostra a tela de boot enquanto a sessao esta sendo restaurada", () => {
    authState.current = {
      isAuthenticated: false,
      isBootstrapping: true,
    };

    render(<App />);

    expect(screen.getByText("Restaurando sua sessão...")).toBeInTheDocument();
  });

  it("permite alternar entre login e cadastro", () => {
    render(<App />);

    expect(screen.getByText("login-screen")).toBeInTheDocument();
    fireEvent.click(screen.getByText("go-register"));
    expect(screen.getByText("register-screen")).toBeInTheDocument();
    fireEvent.click(screen.getByText("go-login"));
    expect(screen.getByText("login-screen")).toBeInTheDocument();
  });

  it("renderiza a area autenticada quando o usuario ja esta logado", () => {
    authState.current = {
      isAuthenticated: true,
      isBootstrapping: false,
    };

    render(<App />);

    expect(screen.getByText("social-feed-screen")).toBeInTheDocument();
    expect(screen.getByText("workout-screen")).toBeInTheDocument();
    expect(screen.getByText("profile-screen")).toBeInTheDocument();
  });
});
