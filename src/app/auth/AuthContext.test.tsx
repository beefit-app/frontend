import { fireEvent, render, screen, waitFor } from "@testing-library/react";

function createAuthProbe(useAuth: typeof import("./AuthContext").useAuth) {
  return function AuthProbe() {
    const { user, isAuthenticated, isBootstrapping, logout } = useAuth();

    return (
      <div>
        <span data-testid="boot">{String(isBootstrapping)}</span>
        <span data-testid="auth">{String(isAuthenticated)}</span>
        <span data-testid="user">{user?.name ?? "anonymous"}</span>
        <button type="button" onClick={() => void logout()}>
          logout
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

  afterEach(() => {
    vi.unstubAllEnvs();
  });
});
