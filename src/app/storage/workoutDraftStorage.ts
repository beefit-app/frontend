import type { WorkoutDraft } from "../types/workout";
import { appStorage } from "./appStorage";

export function getWorkoutDraftStorageKey(userId: string, workoutId: string) {
  return `beefit.workoutDraft.${userId}.${workoutId}`;
}

function getUserDraftPrefix(userId: string) {
  return `beefit.workoutDraft.${userId}.`;
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

  // A restauracao do treino ativo descobre o rascunho antes de conhecer o
  // workoutId, entao precisa varrer as chaves do usuario. So pode existir um
  // treino em andamento por vez; se sobrar lixo de sessoes antigas, vence o
  // rascunho atualizado mais recentemente.
  async getCurrentDraft(userId: string | null | undefined) {
    if (!userId) return null;

    const keys = await appStorage.keys(getUserDraftPrefix(userId));
    const drafts: WorkoutDraft[] = [];
    for (const key of keys) {
      const draft = await appStorage.getItem<WorkoutDraft>(key);
      if (draft) drafts.push(draft);
    }

    return drafts.sort((first, second) =>
      new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())[0] ?? null;
  },

  async clearDrafts(userId: string | null | undefined) {
    if (!userId) return;

    for (const key of await appStorage.keys(getUserDraftPrefix(userId))) {
      await appStorage.removeItem(key);
    }
  },
};
