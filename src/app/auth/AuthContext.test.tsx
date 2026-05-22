import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { authService } from "../services/authService";

function AuthProbe() {
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
}

describe("AuthProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("restaura uma sessao valida salva localmente", async () => {
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

  it("limpa uma sessao invalida durante o boot", async () => {
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

  it("executa logout e limpa a sessao persistida", async () => {
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
  });
});
