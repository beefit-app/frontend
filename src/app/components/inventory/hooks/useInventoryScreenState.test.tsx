import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const { loadPage } = vi.hoisted(() => ({
  loadPage: vi.fn(),
}));

vi.mock("../../../services/inventoryService", () => ({
  inventoryService: {
    loadPage,
  },
}));

import { useInventoryScreenState } from "./useInventoryScreenState";

describe("useInventoryScreenState", () => {
  beforeEach(() => {
    loadPage.mockReset();
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
