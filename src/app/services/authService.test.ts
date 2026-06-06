import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const API_URL = "http://api.test";

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
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("normaliza o login com o contrato atual do backend", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        createJsonResponse({
          token: "jwt-backend",
          userResponseDTO: {
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
      user: {
        id: "user-1",
        name: "Bee Fit",
        username: "beefit",
        email: "user@email.com",
        weight: 75.5,
        weeklyGoal: 4,
      },
    });
    expect(window.localStorage.getItem("beefit.auth.accessToken")).toBe("jwt-backend");
    expect(window.localStorage.getItem("beefit.auth.user")).toContain("\"Bee Fit\"");
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toBe(`${API_URL}/auth/me`);
    expect(vi.mocked(fetch).mock.calls[1]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Authorization: "Bearer jwt-backend",
      }),
    });
  });

  it("registra usuario usando o contrato atual do backend", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            token: "jwt-register",
            userResponseDTO: {
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
        }),
      }),
    );
    expect(session).toEqual({
      accessToken: "jwt-register",
      user: {
        id: "user-2",
        name: "Nova Pessoa",
        username: "nova",
        email: "nova@email.com",
        weight: 68,
        weeklyGoal: 5,
      },
    });
    expect(window.localStorage.getItem("beefit.auth.accessToken")).toBe("jwt-register");
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toBe(`${API_URL}/auth/me`);
  });

  it("restaura a sessao usando o perfil parcial e o cache local do usuario", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(createJsonResponse({ message: "not found" }, { status: 404 }))
      .mockResolvedValueOnce(
        createJsonResponse({
          fullName: "Bee Fit Updated",
          username: "beefit-updated",
        }),
      );

    window.localStorage.setItem("beefit.auth.accessToken", "jwt-backend");
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

  it("limpa a sessao persistida quando o token salvo e invalido", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(createJsonResponse({ message: "unauthorized" }, { status: 401 }));

    window.localStorage.setItem("beefit.auth.accessToken", "broken-token");
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
    expect(window.localStorage.getItem("beefit.auth.user")).toBeNull();
  });
});
