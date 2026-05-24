import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const API_URL = "http://api.test";

function createJsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("accountSettingsService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", API_URL);
    vi.stubEnv("VITE_DEV_AUTH_BYPASS", "false");
    window.localStorage.clear();
    window.localStorage.setItem("beefit.auth.accessToken", "jwt-backend");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("carrega ghost mode a partir do perfil remoto", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      createJsonResponse({
        ghostMode: true,
      }),
    );

    const { accountSettingsService } = await import("./accountSettingsService");
    const settings = await accountSettingsService.getSettings();

    expect(settings).toEqual({ ghostModeEnabled: true });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(`${API_URL}/api/profile/me`);
  });

  it("persiste ghost mode e troca de senha", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(createJsonResponse("Senha alterada com sucesso!"));

    const { accountSettingsService } = await import("./accountSettingsService");
    const settings = await accountSettingsService.saveSettings({
      ghostModeEnabled: true,
      currentPassword: "Atual123!",
      newPassword: "NovaSenha123!",
    });

    expect(settings).toEqual({ ghostModeEnabled: true });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(`${API_URL}/api/profile/me/settings`);
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).toMatchObject({
      method: "PUT",
      body: JSON.stringify({ ghostMode: true }),
    });
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toBe(`${API_URL}/api/profile/me/password`);
    expect(vi.mocked(fetch).mock.calls[1]?.[1]).toMatchObject({
      method: "PUT",
      body: JSON.stringify({
        currentPassword: "Atual123!",
        newPassword: "NovaSenha123!",
      }),
    });
  });
});
