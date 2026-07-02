import type { InventoryMuscleGroup } from "../types/inventory";

const MUSCLE_GROUP_BY_VALUE: Record<string, InventoryMuscleGroup> = {
  CHEST: "CHEST",
  peito: "CHEST",
  peitoral: "CHEST",
  BACK: "BACK",
  costas: "BACK",
  dorsais: "BACK",
  LEGS: "LEGS",
  pernas: "LEGS",
  quadriceps: "LEGS",
  posterior: "LEGS",
  GLUTES: "GLUTES",
  gluteos: "GLUTES",
  gluteo: "GLUTES",
  SHOULDERS: "SHOULDERS",
  ombros: "SHOULDERS",
  ombro: "SHOULDERS",
  ARMS: "ARMS",
  bracos: "ARMS",
  biceps: "ARMS",
  triceps: "ARMS",
  CORE: "CORE",
  core: "CORE",
  TRAPS: "TRAPS",
  trapezio: "TRAPS",
};

const MUSCLE_GROUP_LABELS: Record<InventoryMuscleGroup, string> = {
  CHEST: "Peito",
  BACK: "Costas",
  LEGS: "Pernas",
  GLUTES: "Glúteos",
  SHOULDERS: "Ombros",
  ARMS: "Braços",
  CORE: "Core",
  TRAPS: "Trapézio",
};

function normalizeKey(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeMuscleGroupEnum(value: unknown): InventoryMuscleGroup | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return MUSCLE_GROUP_BY_VALUE[trimmed] ?? MUSCLE_GROUP_BY_VALUE[normalizeKey(trimmed)] ?? null;
}

export function normalizeMuscleGroupLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const muscleGroup = normalizeMuscleGroupEnum(value);
  if (muscleGroup) return MUSCLE_GROUP_LABELS[muscleGroup];

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeMuscleGroupLabels(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map(normalizeMuscleGroupLabel)
        .filter((value): value is string => value !== null),
    ),
  );
}
