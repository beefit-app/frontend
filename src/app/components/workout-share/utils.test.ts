import { describe, expect, it } from "vitest";
import type { WorkoutExercise } from "../../types/workout";
import { buildStoryCardData } from "./utils";

function exercise(id: string, sets: Array<{ weight: string; reps: string }>): WorkoutExercise {
  return {
    id,
    sessionExerciseId: null,
    catalogId: id,
    name: id,
    group: "Peito",
    groupId: "chest",
    anatomicalMuscles: [],
    primaryAnatomicalMuscles: [],
    secondaryAnatomicalMuscles: [],
    sets: sets.map((set, index) => ({ id: `${id}-${index}`, backendId: null, ...set })),
  };
}

describe("buildStoryCardData", () => {
  it("usa as metricas do servidor, nao o calculo local do treino", () => {
    const photo = new File(["x"], "foto.jpg", { type: "image/jpeg" });
    const data = buildStoryCardData({
      draft: {
        title: "Push",
        photoUrl: null,
        photoFile: photo,
        shouldPostWorkout: true,
        shouldSaveTemplate: false,
        selectedGroups: ["Peito"],
        elapsedSeconds: 999,
        exercises: [
          exercise("supino", [{ weight: "80", reps: "10" }, { weight: "80", reps: "" }]),
          exercise("flexao", [{ weight: "0", reps: "15" }]),
          exercise("vazio", [{ weight: "", reps: "" }]),
        ],
        idempotencyKey: "key",
        finishedAt: "2026-10-19T12:00:00.000Z",
      },
      summary: { workoutId: "w1", durationSeconds: 3600, estimatedCalories: 300, totalVolume: 800 },
    });

    expect(data).toEqual({
      title: "Push",
      finishedAt: "2026-10-19T12:00:00.000Z",
      durationSeconds: 3600,
      totalVolumeKg: 800,
      estimatedCalories: 300,
      photo,
    });
  });
});
