import { ApiError, apiClient } from "./apiClient";
import type {
  InventoryCard,
  InventoryFilters,
  InventoryPageResult,
  InventoryRarity,
} from "../types/inventory";
import { normalizeMuscleGroupEnum } from "./muscleGroups";

interface BackendInventoryCard {
  id: string;
  workoutSessionId: string;
  attackPower: number;
  rarity: string;
  rarityLabel: string;
  muscleGroup: string;
  muscleIntensities?: Record<string, number> | null;
  isPersonalRecord: boolean;
  bodyWeightAtGeneration?: number | null;
  generatedAt: string;
}

interface BackendInventoryResponse {
  content?: BackendInventoryCard[];
  number?: number;
  totalElements?: number;
  totalPages?: number;
  last?: boolean;
}

function normalizeRarity(value: string): InventoryRarity {
  return value.toUpperCase() as InventoryRarity;
}

function normalizeCard(card: BackendInventoryCard): InventoryCard {
  const muscleGroup = normalizeMuscleGroupEnum(card.muscleGroup) ?? "CORE";
  const muscleIntensities: Record<string, number> = {};

  Object.entries(card.muscleIntensities ?? {}).forEach(([rawGroup, rawIntensity]) => {
    if (!rawGroup.trim() || typeof rawIntensity !== "number" || !Number.isFinite(rawIntensity)) return;
    const trimmedGroup = rawGroup.trim();
    const legacyGroup = trimmedGroup === trimmedGroup.toUpperCase()
      ? normalizeMuscleGroupEnum(trimmedGroup)
      : null;
    muscleIntensities[legacyGroup ?? trimmedGroup.toLowerCase()] = Math.max(1, Math.min(4, Math.round(rawIntensity)));
  });

  if (Object.keys(muscleIntensities).length === 0) {
    muscleIntensities[muscleGroup] = 4;
  }

  return {
    id: card.id,
    workoutSessionId: card.workoutSessionId,
    attackPower: typeof card.attackPower === "number" ? card.attackPower : 0,
    rarity: normalizeRarity(card.rarity),
    rarityLabel: card.rarityLabel,
    muscleGroup,
    muscleIntensities,
    isPersonalRecord: Boolean(card.isPersonalRecord),
    bodyWeightAtGeneration:
      typeof card.bodyWeightAtGeneration === "number" ? card.bodyWeightAtGeneration : null,
    generatedAt: card.generatedAt,
  };
}

function buildQuery(page: number, size: number, filters: InventoryFilters) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  if (filters.rarity) params.set("rarity", filters.rarity);
  if (filters.muscleGroup) params.set("muscleGroup", filters.muscleGroup);

  return params.toString();
}

export const inventoryService = {
  async loadPage({
    page = 0,
    size = 12,
    filters,
  }: {
    page?: number;
    size?: number;
    filters: InventoryFilters;
  }): Promise<InventoryPageResult> {
    try {
      const response = await apiClient.get<BackendInventoryResponse>(
        `/api/inventory?${buildQuery(page, size, filters)}`,
        { auth: true },
      );

      return {
        cards: (response.content ?? []).map(normalizeCard),
        page: response.number ?? page,
        totalElements: response.totalElements ?? 0,
        totalPages: response.totalPages ?? 0,
        last: response.last ?? true,
      };
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        throw new Error("Não foi possível carregar o inventário com a sessão atual.", { cause });
      }

      throw cause;
    }
  },
};
