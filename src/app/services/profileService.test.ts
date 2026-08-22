import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const API_URL = "http://api.test";

function createJsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("profileService", () => {
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

  it("busca o perfil remoto e preserva dados da sessão local", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      createJsonResponse({
        fullName: "Bee Fit Updated",
        username: "beefit-updated",
        biography: "Nova bio",
        profilePicture: null,
        bodyWeight: 80.5,
        offensiveHoneys: 9,
        cardsCount: 12,
        totalWorkouts: 31,
      }),
    );

    window.localStorage.setItem("beefit.auth.accessToken", "jwt-backend");

    const { profileService } = await import("./profileService");
    const profile = await profileService.getProfile({
      id: "user-1",
      name: "Bee Fit",
      email: "user@email.com",
      username: "beefit",
      weeklyGoal: 4,
      weight: 75.5,
    });

    expect(profile).toEqual({
      id: "user-1",
      displayName: "Bee Fit Updated",
      username: "@beefit-updated",
      email: "user@email.com",
      bio: "Nova bio",
      avatarUrl: null,
      weight: 80.5,
      weeklyGoal: 4,
      ghostModeEnabled: false,
      cards: 12,
      streak: 9,
      totalWorkouts: 31,
    });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(`${API_URL}/api/profile/me`);
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).toMatchObject({
      method: "GET",
      headers: expect.objectContaining({
        Authorization: "Bearer jwt-backend",
      }),
    });
  });

  it("envia o update do perfil e atualiza o usuário persistido", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

    window.localStorage.setItem("beefit.auth.accessToken", "jwt-backend");

    const { profileService } = await import("./profileService");
    const nextProfile = await profileService.saveProfile(
      {
        id: "user-1",
        name: "Bee Fit",
        email: "user@email.com",
        username: "beefit",
        weeklyGoal: 4,
        weight: 75.5,
      },
      {
        id: "user-1",
        displayName: "Bee Fit",
        username: "@beefit",
        email: "user@email.com",
        bio: "Bio antiga",
        avatarUrl: null,
        weight: 75.5,
        weeklyGoal: 4,
        ghostModeEnabled: false,
        cards: 47,
        streak: 15,
        totalWorkouts: 312,
      },
      {
        displayName: "Bee Prime",
        bio: "Bio nova",
        weight: 81.2,
      },
    );

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(`${API_URL}/api/profile/me`);
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).toMatchObject({
      method: "PUT",
      headers: expect.objectContaining({
        Authorization: "Bearer jwt-backend",
        "Content-Type": "application/json",
      }),
      // profilePicture sai do corpo quando nao ha foto: UpdateProfileRequestDTO
      // declara o campo como opcional, nao como nulavel.
      body: JSON.stringify({
        fullName: "Bee Prime",
        biography: "Bio nova",
        bodyWeight: 81.2,
      }),
    });
    expect(nextProfile.displayName).toBe("Bee Prime");
    expect(nextProfile.bio).toBe("Bio nova");
    expect(nextProfile.weight).toBe(81.2);
    expect(nextProfile.ghostModeEnabled).toBe(false);
    expect(window.localStorage.getItem("beefit.auth.user")).toContain("\"Bee Prime\"");
    expect(window.localStorage.getItem("beefit.auth.user")).toContain("\"weight\":81.2");
  });
});
