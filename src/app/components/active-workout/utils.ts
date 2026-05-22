import { DEFAULT_MUSCLE_STYLE, MUSCLE_STYLE } from "./constants";
import type { ExerciseCatalogItem, WorkoutExercise, WorkoutSet } from "../../types/workout";

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createSet(): WorkoutSet {
  return { id: createId("set"), weight: "", reps: "" };
}

export function formatElapsedTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function createExerciseCard(exercise: ExerciseCatalogItem): WorkoutExercise {
  return {
    id: createId("exercise"),
    catalogId: exercise.id,
    name: exercise.name,
    group: exercise.group,
    groupId: exercise.groupId,
    sets: [createSet()],
  };
}

export function muscleStyle(group: string) {
  return MUSCLE_STYLE[group] ?? DEFAULT_MUSCLE_STYLE;
}
