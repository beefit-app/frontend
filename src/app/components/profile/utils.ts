import type { ExerciseDetail, ProfileData, Rarity } from "./types";

export function getProfileInitials(profile: Pick<ProfileData, "displayName">) {
  return profile.displayName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

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
