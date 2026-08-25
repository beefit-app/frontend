import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const { loadPage } = vi.hoisted(() => ({
  loadPage: vi.fn(),
}));

const {
  getCatalog,
  getTemplates,
  loadCatalog,
  loadTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  hydrateCatalog,
  hydrateTemplates,
} = vi.hoisted(() => ({
  getCatalog: vi.fn(),
  getTemplates: vi.fn(),
  loadCatalog: vi.fn(),
  loadTemplates: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  hydrateCatalog: vi.fn(),
  hydrateTemplates: vi.fn(),
}));

vi.mock("../../../services/inventoryService", () => ({
  inventoryService: {
    loadPage,
  },
}));

vi.mock("../../../services/workoutService", () => ({
  workoutService: {
    getCatalog,
    getTemplates,
    loadCatalog,
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    hydrateCatalog,
    hydrateTemplates,
  },
}));

vi.mock("../../../auth/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("../../../storage/pageCacheStorage", () => ({ pageCacheStorage: {
  get: vi.fn().mockResolvedValue(null), set: vi.fn(), remove: vi.fn(),
} }));

import { useInventoryScreenState } from "./useInventoryScreenState";

describe("useInventoryScreenState", () => {
  beforeEach(() => {
    loadPage.mockReset();
    getCatalog.mockReset();
    getTemplates.mockReset();
    loadCatalog.mockReset();
    loadTemplates.mockReset();
    createTemplate.mockReset();
    updateTemplate.mockReset();
    deleteTemplate.mockReset();
    hydrateCatalog.mockReset();
    hydrateTemplates.mockReset();
    getCatalog.mockReturnValue([]);
    getTemplates.mockReturnValue([]);
    loadCatalog.mockResolvedValue([]);
    loadTemplates.mockResolvedValue([]);
    loadPage.mockResolvedValue({
      cards: [],
      page: 0,
      totalElements: 0,
      totalPages: 0,
      last: true,
    });
  });

  it("reseta a lista ao trocar filtros e carrega a primeira página filtrada", async () => {
    loadPage.mockImplementation(async ({ filters }: { filters: { rarity: string | null } }) => {
      if (filters.rarity === "EPIC") {
        return {
          cards: [{ id: "card-2", attackPower: 150 }],
          page: 0,
          totalElements: 1,
          totalPages: 1,
          last: true,
        };
      }

      return {
        cards: [{ id: "card-1", attackPower: 100 }],
        page: 0,
        totalElements: 20,
        totalPages: 2,
        last: false,
      };
    });

    const { result } = renderHook(() => useInventoryScreenState());

    await waitFor(() => expect(result.current.cards[0]?.id).toBe("card-1"));

    act(() => {
      result.current.updateFilters({ rarity: "EPIC" });
    });

    await waitFor(() => expect(result.current.cards[0]?.id).toBe("card-2"));
    expect(loadPage).toHaveBeenLastCalledWith({
      page: 0,
      size: 12,
      filters: { rarity: "EPIC", muscleGroup: null },
    });
    expect(result.current.totalElements).toBe(1);
  });

  it("permite limpar filtros e voltar ao estado padrão", async () => {
    loadPage.mockImplementation(async ({ filters }: { filters: { rarity: string | null; muscleGroup: string | null } }) => ({
      cards: filters.rarity === "LEGENDARY" ? [{ id: "card-9", attackPower: 220 }] : [],
      page: 0,
      totalElements: filters.rarity === "LEGENDARY" ? 1 : 0,
      totalPages: filters.rarity === "LEGENDARY" ? 1 : 0,
      last: true,
    }));

    const { result } = renderHook(() => useInventoryScreenState());

    act(() => {
      result.current.updateFilters({ rarity: "LEGENDARY", muscleGroup: "BACK" });
    });

    await waitFor(() => {
      expect(result.current.filters).toEqual({ rarity: "LEGENDARY", muscleGroup: "BACK" });
      expect(result.current.cards[0]?.id).toBe("card-9");
    });

    act(() => {
      result.current.resetFilters();
    });

    await waitFor(() => {
      expect(result.current.filters).toEqual({ rarity: null, muscleGroup: null });
      expect(result.current.cards).toEqual([]);
    });
  });
});
