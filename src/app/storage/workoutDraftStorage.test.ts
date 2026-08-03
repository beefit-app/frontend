import { beforeEach, describe, expect, it } from "vitest";
import { getWorkoutDraftStorageKey, workoutDraftStorage } from "./workoutDraftStorage";
import type { WorkoutDraft } from "../types/workout";

function createDraft(userId: string, workoutId: string): WorkoutDraft {
  return {
    userId,
    workoutId,
    title: "Push pesado",
    selectedGroups: ["Peito"],
    shouldPostWorkout: true,
    shouldSaveTemplate: false,
    updatedAt: "2026-06-04T12:00:00.000Z",
    exercises: [
      {
        id: "exercise-1",
        catalogId: "catalog-1",
        name: "Supino",
        group: "Peito",
        groupId: "peito",
        sets: [{ id: "set-1", weight: "80", reps: "8" }],
      },
    ],
  };
}

describe("workoutDraftStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("salva e restaura rascunho por userId e workoutId", async () => {
    const draft = createDraft("user-1", "workout-1");

    await workoutDraftStorage.saveDraft(draft);

    await expect(workoutDraftStorage.getDraft("user-1", "workout-1")).resolves.toEqual(draft);
    expect(window.localStorage.getItem(getWorkoutDraftStorageKey("user-1", "workout-1"))).toContain("Push pesado");
  });

  it("nao cruza rascunhos entre usuarios", async () => {
    await workoutDraftStorage.saveDraft(createDraft("user-1", "workout-1"));
    await workoutDraftStorage.saveDraft({ ...createDraft("user-2", "workout-1"), title: "Pull" });

    await expect(workoutDraftStorage.getDraft("user-1", "workout-1")).resolves.toMatchObject({ title: "Push pesado" });
    await expect(workoutDraftStorage.getDraft("user-2", "workout-1")).resolves.toMatchObject({ title: "Pull" });
  });

  it("remove rascunho ao finalizar ou cancelar", async () => {
    const draft = createDraft("user-1", "workout-1");
    await workoutDraftStorage.saveDraft(draft);

    await workoutDraftStorage.removeDraft("user-1", "workout-1");

    await expect(workoutDraftStorage.getDraft("user-1", "workout-1")).resolves.toBeNull();
  });
});
