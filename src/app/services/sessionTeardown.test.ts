import { beforeEach, describe, expect, it, vi } from "vitest";

const API_URL = "http://api.test";
const USER_ID = "user-1";

const removePersistedWorkoutPhoto = vi.hoisted(() => vi.fn());
const closeSocialEventsConnection = vi.hoisted(() => vi.fn());

vi.mock("../platform/workoutPhoto", () => ({ removePersistedWorkoutPhoto }));
vi.mock("./socialEventsService", () => ({
  closeSocialEventsConnection,
  subscribeSocialEvents: vi.fn().mockResolvedValue(undefined),
}));

function seedLocalData() {
  window.localStorage.setItem("beefit.auth.accessToken", "jwt");
  window.localStorage.setItem("beefit.auth.refreshToken", "refresh");
  window.localStorage.setItem(
    "beefit.auth.user",
    JSON.stringify({ id: USER_ID, name: "Bee Fit", email: "user@email.com" }),
  );
  window.localStorage.setItem("beefit.feed.live-friends", JSON.stringify([{ id: "amigo-1" }]));
  window.localStorage.setItem("beefit.feed.streak", JSON.stringify({ count: 4, lastFedDate: null }));
  window.localStorage.setItem("beefit.profile.current", JSON.stringify({ fullName: "Bee Fit" }));
  window.localStorage.setItem("beefit.page-cache.user-1.feed.page-0", JSON.stringify({
    version: 1,
    savedAt: Date.now(),
    value: { posts: [] },
  }));
  window.localStorage.setItem(
    `beefit.workoutDraft.${USER_ID}.workout-1`,
    JSON.stringify({ userId: USER_ID, workoutId: "workout-1", photoFileName: "web:foto-1" }),
  );
}

function remainingBeefitKeys() {
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith("beefit.")) keys.push(key);
  }
  return keys;
}

describe("desmonte da sessao local", () => {
  beforeEach(() => {
    vi.resetModules();
    removePersistedWorkoutPhoto.mockReset().mockResolvedValue(undefined);
    closeSocialEventsConnection.mockReset();
    vi.stubEnv("VITE_API_URL", API_URL);
    vi.stubEnv("VITE_DEV_AUTH_BYPASS", "false");
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));
    seedLocalData();
  });

  it("nao deixa nenhuma chave beefit apos o logout", async () => {
    const { authService } = await import("./authService");
    await authService.logout();

    expect(remainingBeefitKeys()).toEqual([]);
  });

  it("zera o cache de templates para nao vazar entre usuarios", async () => {
    const { workoutService } = await import("./workoutService");
    const { authService } = await import("./authService");

    vi.mocked(fetch).mockResolvedValueOnce(new Response(
      JSON.stringify([{ id: "t-1", name: "Push", muscleGroups: ["peito"], exercises: [] }]),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    await workoutService.loadTemplates();
    expect(workoutService.getTemplates()).toHaveLength(1);

    await authService.logout();

    // getTemplates e lido de forma sincrona na montagem da tela de treino: se o
    // cache sobrevivesse, o proximo usuario veria o template do anterior.
    expect(workoutService.getTemplates()).toEqual([]);
  });

  it("derruba o stream de eventos sociais", async () => {
    const { authService } = await import("./authService");
    await authService.logout();

    expect(closeSocialEventsConnection).toHaveBeenCalled();
  });

  it("limpa igual quando a revogacao no servidor falha", async () => {
    // Caminho de AUTH_UNAUTHORIZED_EVENT: o token ja nao vale, o POST de logout
    // falha, e ainda assim o dado local precisa sair do aparelho.
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));

    const { authService } = await import("./authService");
    await authService.logout();

    expect(remainingBeefitKeys()).toEqual([]);
  });
});
