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

  it("tenta a url relativa quando a chamada direta falha", async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(createJsonResponse({ ok: true }));

    const { apiClient } = await import("./apiClient");
    const response = await apiClient.post("/auth/register", { name: "Teste" });

    expect(response).toEqual({ ok: true });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(`${API_URL}/auth/register`);
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toBe("/auth/register");
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
});
