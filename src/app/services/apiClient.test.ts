import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const API_URL = "http://api.test";

function createJsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("apiClient", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", API_URL);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
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

  it("não dispara logout global para 401 de uma tela autenticada por padrão", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      createJsonResponse({ message: "Credenciais inválidas." }, { status: 401 }),
    );
    const listener = vi.fn();
    window.addEventListener("beefit:auth-unauthorized", listener);

    const { apiClient } = await import("./apiClient");

    await expect(apiClient.get("/api/posts/feed", { auth: true })).rejects.toMatchObject({
      status: 401,
    });
    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener("beefit:auth-unauthorized", listener);
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
    expect(window.localStorage.getItem("beefit.auth.accessToken")).toBe("new-token");
    expect(window.localStorage.getItem("beefit.auth.refreshToken")).toBe("new-refresh-token");
  });

  it("busca mídia como blob usando autenticação", async () => {
    window.localStorage.setItem("beefit.auth.accessToken", "media-token");
    const expectedBlob = new Blob(["image"], { type: "image/png" });
    vi.mocked(fetch).mockResolvedValueOnce(new Response(expectedBlob, {
      status: 200,
      headers: { "Content-Type": "image/png" },
    }));

    const { apiClient } = await import("./apiClient");
    const blob = await apiClient.getBlob("/api/media/media-id", { auth: true });

    expect(blob.type).toBe("image/png");
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: "Bearer media-token" }),
    });
  });
});
