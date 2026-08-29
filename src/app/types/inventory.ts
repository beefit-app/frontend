export type InventoryRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export type InventoryMuscleGroup =
  | "CHEST"
  | "BACK"
  | "LEGS"
  | "GLUTES"
  | "SHOULDERS"
  | "ARMS"
  | "CORE"
  | "TRAPS";

export interface InventoryCard {
  id: string;
  workoutSessionId: string;
  attackPower?: number;
  rarity: InventoryRarity;
  rarityLabel: string;
  muscleGroup: InventoryMuscleGroup;
  muscleIntensities: Record<string, number>;
  isPersonalRecord: boolean;
  exerciseId?: string | null;
  exerciseName?: string | null;
  bestSetWeightKg?: number | null;
  bestSetReps?: number | null;
  estimatedOneRepMax?: number | null;
  improvementPercentage?: number | null;
  bodyWeightAtGeneration: number | null;
  generatedAt: string;
}

export interface InventoryFilters {
  rarity: InventoryRarity | null;
  muscleGroup: InventoryMuscleGroup | null;
}

export interface InventoryPageResult {
  cards: InventoryCard[];
  page: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
