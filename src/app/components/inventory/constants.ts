import type { InventoryFilters, InventoryMuscleGroup, InventoryRarity } from "./types";

export const DEFAULT_INVENTORY_FILTERS: InventoryFilters = {
  rarity: null,
  muscleGroup: null,
};

export const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

export const RARITY_META: Record<
  InventoryRarity,
  {
    label: string;
    color: string;
    border: string;
    accent: string;
    background: string;
    shadow: string;
    badgeBackground: string;
  }
> = {
  COMMON: {
    label: "Comum",
    color: "#A3A3A3",
    border: "#525252",
    accent: "#737373",
    background: "#1A1A1A",
    shadow: "0 8px 24px rgba(115,115,115,0.14)",
    badgeBackground: "rgba(115,115,115,0.15)",
  },
  RARE: {
    label: "Rara",
    color: "#60A5FA",
    border: "#3B82F6",
    accent: "#3B82F6",
    background: "#1A1A1A",
    shadow: "0 8px 24px rgba(59,130,246,0.18)",
    badgeBackground: "rgba(59,130,246,0.15)",
  },
  EPIC: {
    label: "Épica",
    color: "#C084FC",
    border: "#A855F7",
    accent: "#A855F7",
    background: "#1A1A1A",
    shadow: "0 8px 24px rgba(168,85,247,0.18)",
    badgeBackground: "rgba(168,85,247,0.15)",
  },
  LEGENDARY: {
    label: "Lendária",
    color: "#FFE44D",
    border: "#FFD700",
    accent: "#FFD700",
    background: "#1A1A1A",
    shadow: "0 8px 24px rgba(255,215,0,0.22)",
    badgeBackground: "rgba(255,215,0,0.15)",
  },
};

export const MUSCLE_GROUP_META: Record<
  InventoryMuscleGroup,
  {
    label: string;
    shortLabel: string;
    detail: string;
  }
> = {
  CHEST: { label: "Peito", shortLabel: "PT", detail: "Ênfase frontal" },
  BACK: { label: "Costas", shortLabel: "CT", detail: "Ênfase dorsal" },
  LEGS: { label: "Pernas", shortLabel: "PG", detail: "Base de força" },
  GLUTES: { label: "Glúteos", shortLabel: "GL", detail: "Potência posterior" },
  SHOULDERS: { label: "Ombros", shortLabel: "OM", detail: "Controle superior" },
  ARMS: { label: "Braços", shortLabel: "BR", detail: "Precisão de carga" },
  CORE: { label: "Core", shortLabel: "CR", detail: "Estabilidade central" },
  TRAPS: { label: "Trapézio", shortLabel: "TP", detail: "Sustentação alta" },
};

export const RARITY_FILTER_OPTIONS: Array<{ label: string; value: InventoryRarity | null }> = [
  { label: "Todas", value: null },
  { label: "Comum", value: "COMMON" },
  { label: "Rara", value: "RARE" },
  { label: "Épica", value: "EPIC" },
  { label: "Lendária", value: "LEGENDARY" },
];

export const MUSCLE_GROUP_FILTER_OPTIONS: Array<{ label: string; value: InventoryMuscleGroup | null }> = [
  { label: "Todos", value: null },
  { label: "Peito", value: "CHEST" },
  { label: "Costas", value: "BACK" },
  { label: "Pernas", value: "LEGS" },
  { label: "Glúteos", value: "GLUTES" },
  { label: "Ombros", value: "SHOULDERS" },
  { label: "Braços", value: "ARMS" },
  { label: "Core", value: "CORE" },
  { label: "Trapézio", value: "TRAPS" },
];
