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
    });
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
