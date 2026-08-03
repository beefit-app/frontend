import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const API_URL = "http://api.test";

function createJsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("inventoryService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", API_URL);
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("carrega a página do inventário com filtros e normaliza a resposta", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      createJsonResponse({
        content: [
          {
            id: "card-1",
            workoutSessionId: "session-1",
            attackPower: 123.4,
            rarity: "EPIC",
            rarityLabel: "Épico",
            muscleGroup: "CHEST",
            muscleIntensities: { chest: 4, deltoids: 2, triceps: 2 },
            isPersonalRecord: true,
            bodyWeightAtGeneration: 81.5,
            generatedAt: "2026-06-27T15:00:00Z",
          },
        ],
        number: 2,
        totalElements: 31,
        totalPages: 3,
        last: false,
      }),
    );

    window.localStorage.setItem("beefit.auth.accessToken", "jwt-backend");

    const { inventoryService } = await import("./inventoryService");
    const result = await inventoryService.loadPage({
      page: 2,
      size: 12,
      filters: { rarity: "EPIC", muscleGroup: "CHEST" },
    });

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      `${API_URL}/api/inventory?page=2&size=12&rarity=EPIC&muscleGroup=CHEST`,
    );
    expect(result).toEqual({
      cards: [
        {
          id: "card-1",
          workoutSessionId: "session-1",
          attackPower: 123.4,
          rarity: "EPIC",
          rarityLabel: "Épico",
          muscleGroup: "CHEST",
          muscleIntensities: { chest: 4, deltoids: 2, triceps: 2 },
          isPersonalRecord: true,
          bodyWeightAtGeneration: 81.5,
          generatedAt: "2026-06-27T15:00:00Z",
        },
      ],
      page: 2,
      totalElements: 31,
      totalPages: 3,
      last: false,
    });
  });

  it("traduz erro 401 para uma mensagem útil", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Token expirado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    window.localStorage.setItem("beefit.auth.accessToken", "jwt-backend");

    const { inventoryService } = await import("./inventoryService");

    await expect(
      inventoryService.loadPage({
        page: 0,
        size: 12,
        filters: { rarity: null, muscleGroup: null },
      }),
    ).rejects.toThrow("Não foi possível carregar o inventário com a sessão atual.");
  });
});
