import type { StoryCardData } from "../../platform/storyCard";
import type { WorkoutShareTarget } from "./types";

function isFilledSet(set: { weight: string; reps: string }) {
  return Number.parseInt(set.reps, 10) > 0;
}

/**
 * As métricas vêm do resumo confirmado pelo backend, não do cálculo local do
 * treino: o card mostra o mesmo número que o perfil e o feed vão mostrar.
 */
export function buildStoryCardData({ draft, summary }: WorkoutShareTarget): StoryCardData {
  const exercisesWithSets = draft.exercises.filter((exercise) => exercise.sets.some(isFilledSet));
  return {
    title: draft.title,
    finishedAt: draft.finishedAt,
    durationSeconds: summary.durationSeconds,
    totalVolumeKg: summary.totalVolume,
    estimatedCalories: summary.estimatedCalories,
    exerciseCount: exercisesWithSets.length,
    setCount: exercisesWithSets.reduce((total, exercise) => total + exercise.sets.filter(isFilledSet).length, 0),
    photo: draft.photoFile ?? null,
  };
}
