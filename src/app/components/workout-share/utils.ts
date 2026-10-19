import type { StoryCardData } from "../../platform/storyCard";
import type { WorkoutShareTarget } from "./types";

/**
 * As métricas vêm do resumo confirmado pelo backend, não do cálculo local do
 * treino: o card mostra o mesmo número que o perfil e o feed vão mostrar.
 */
export function buildStoryCardData({ draft, summary }: WorkoutShareTarget): StoryCardData {
  return {
    title: draft.title,
    finishedAt: draft.finishedAt,
    durationSeconds: summary.durationSeconds,
    totalVolumeKg: summary.totalVolume,
    estimatedCalories: summary.estimatedCalories,
    photo: draft.photoFile ?? null,
  };
}
