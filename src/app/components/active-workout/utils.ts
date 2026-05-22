import { DEFAULT_MUSCLE_STYLE, MUSCLE_STYLE } from "./constants";
import type { ExerciseCatalogItem, WorkoutExercise, WorkoutSet } from "../../types/workout";

const MOCK_WORKOUT_MET = 4.5;

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

function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function calculateWorkoutVolume(exercises: WorkoutExercise[]) {
  return exercises.reduce((exerciseAcc, exercise) => {
    const exerciseVolume = exercise.sets.reduce((setAcc, set) => {
      const weight = parsePositiveNumber(set.weight);
      const reps = parsePositiveNumber(set.reps);

      if (weight === null || reps === null) return setAcc;

      return setAcc + weight * reps;
    }, 0);

    return exerciseAcc + exerciseVolume;
  }, 0);
}

export function calculateEstimatedCalories(elapsedSeconds: number, bodyWeightKg: number) {
  return MOCK_WORKOUT_MET * bodyWeightKg * (elapsedSeconds / 3600);
}

export function createExerciseCard(
  exercise: ExerciseCatalogItem,
  options: { withInitialSet?: boolean } = {},
): WorkoutExercise {
  const { withInitialSet = true } = options;

  return {
    id: createId("exercise"),
    catalogId: exercise.id,
    name: exercise.name,
    group: exercise.group,
    groupId: exercise.groupId,
    sets: withInitialSet ? [createSet()] : [],
  };
}

export function muscleStyle(group: string) {
  return MUSCLE_STYLE[group] ?? DEFAULT_MUSCLE_STYLE;
}
