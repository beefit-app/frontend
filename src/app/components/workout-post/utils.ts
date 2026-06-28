import type { ExerciseDetail, Rarity } from "./types";

const MUSCLE_STYLE: Record<string, { border: string; text: string; bg: string }> = {
  Bíceps: { border: "#60A5FA", text: "#93C5FD", bg: "rgba(59,130,246,0.14)" },
  Core: { border: "#EF4444", text: "#FCA5A5", bg: "rgba(239,68,68,0.14)" },
  Costas: { border: "#3B82F6", text: "#60A5FA", bg: "rgba(59,130,246,0.14)" },
  Dorsais: { border: "#3B82F6", text: "#60A5FA", bg: "rgba(59,130,246,0.14)" },
  "Full Body": { border: "#737373", text: "#D4D4D4", bg: "rgba(115,115,115,0.14)" },
  Glúteo: { border: "#22C55E", text: "#86EFAC", bg: "rgba(34,197,94,0.14)" },
  Glúteos: { border: "#22C55E", text: "#86EFAC", bg: "rgba(34,197,94,0.14)" },
  Ombro: { border: "#A855F7", text: "#C084FC", bg: "rgba(168,85,247,0.14)" },
  Ombros: { border: "#A855F7", text: "#C084FC", bg: "rgba(168,85,247,0.14)" },
  Braços: { border: "#E6C200", text: "#FFE44D", bg: "rgba(255,215,0,0.12)" },
  Peito: { border: "#FFD700", text: "#FFE44D", bg: "rgba(255,215,0,0.14)" },
  Peitoral: { border: "#FFD700", text: "#FFE44D", bg: "rgba(255,215,0,0.14)" },
  Pernas: { border: "#22C55E", text: "#86EFAC", bg: "rgba(34,197,94,0.14)" },
  Posterior: { border: "#22C55E", text: "#86EFAC", bg: "rgba(34,197,94,0.14)" },
  Quadríceps: { border: "#22C55E", text: "#86EFAC", bg: "rgba(34,197,94,0.14)" },
  Trapézio: { border: "#A855F7", text: "#C084FC", bg: "rgba(168,85,247,0.14)" },
  Tríceps: { border: "#E6C200", text: "#FFE44D", bg: "rgba(255,215,0,0.12)" },
};

const DEFAULT_ACCENT_MUSCLE_STYLE = { border: "#737373", text: "#A3A3A3", bg: "rgba(115,115,115,0.14)" };
const DEFAULT_NEUTRAL_MUSCLE_STYLE = {
  border: "rgba(255,255,255,0.1)",
  text: "rgba(255,255,255,0.5)",
  bg: "rgba(255,255,255,0.07)",
};

export function calculateAttackPower(weight: number, reps: number) {
  return weight * (1 + Math.min(reps, 10) / 30);
}

export function exerciseRarity(exercise: ExerciseDetail, bodyWeight: number): Rarity | null {
  const bestPower = Math.max(...exercise.sets.map((set) => calculateAttackPower(set.weight, set.reps)));

  if (exercise.isPersonalRecord === true || bestPower >= bodyWeight * 2) return "lendaria";
  if (bestPower >= bodyWeight * 1.5) return "epica";
  if (bestPower >= bodyWeight) return "rara";
  return null;
}

export function workoutRarity(exercises: ExerciseDetail[], bodyWeight: number): Rarity {
  const priority: Rarity[] = ["lendaria", "epica", "rara"];

  for (const rarity of priority) {
    if (exercises.some((exercise) => exerciseRarity(exercise, bodyWeight) === rarity)) {
      return rarity;
    }
  }

  return "comum";
}

export function getMuscleBadgeStyle(group: string, variant: "accent" | "neutral") {
  if (variant === "neutral") return DEFAULT_NEUTRAL_MUSCLE_STYLE;
  return MUSCLE_STYLE[group] ?? DEFAULT_ACCENT_MUSCLE_STYLE;
}
