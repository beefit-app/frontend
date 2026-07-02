import type { WorkoutDraft } from "../types/workout";
import { appStorage } from "./appStorage";

export function getWorkoutDraftStorageKey(userId: string, workoutId: string) {
  return `beefit.workoutDraft.${userId}.${workoutId}`;
}

export const workoutDraftStorage = {
  async getDraft(userId: string | null | undefined, workoutId: string | null | undefined) {
    if (!userId || !workoutId) return null;
    return appStorage.getItem<WorkoutDraft>(getWorkoutDraftStorageKey(userId, workoutId));
  },

  async saveDraft(draft: WorkoutDraft) {
    if (!draft.userId || !draft.workoutId) return;
    await appStorage.setItem(getWorkoutDraftStorageKey(draft.userId, draft.workoutId), draft);
  },

  async removeDraft(userId: string | null | undefined, workoutId: string | null | undefined) {
    if (!userId || !workoutId) return;
    await appStorage.removeItem(getWorkoutDraftStorageKey(userId, workoutId));
  },
};
