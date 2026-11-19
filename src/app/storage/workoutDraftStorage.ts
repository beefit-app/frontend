import type { PendingWorkoutFinish, WorkoutDraft } from "../types/workout";
import { removePersistedWorkoutPhoto } from "../platform/workoutPhoto";
import { appStorage } from "./appStorage";

export function getWorkoutDraftStorageKey(userId: string, workoutId: string) {
  return `beefit.workoutDraft.${userId}.${workoutId}`;
}

function getUserDraftPrefix(userId: string) {
  return `beefit.workoutDraft.${userId}.`;
}

// Uma fila por conta neste runtime JS (sem coordenar abas ou WebViews).
// Inclui as limpezas por prefixo e as leituras, que podem migrar dados no nativo.
const draftQueueByUser = new Map<string, Promise<void>>();

function enqueueDraftOperation<T>(userId: string, operation: () => Promise<T>): Promise<T> {
  const result = (draftQueueByUser.get(userId) ?? Promise.resolve()).then(operation);
  const tail = result.then(() => undefined, () => undefined);
  draftQueueByUser.set(userId, tail);

  return result.finally(() => {
    if (draftQueueByUser.get(userId) === tail) draftQueueByUser.delete(userId);
  });
}

function isPendingWorkoutFinish(draft: WorkoutDraft | null): draft is PendingWorkoutFinish {
  return draft?.pendingFinish === true && Boolean(draft.idempotencyKey && draft.finishedAt);
}

export const workoutDraftStorage = {
  async getDraft(userId: string | null | undefined, workoutId: string | null | undefined) {
    if (!userId || !workoutId) return null;
    return enqueueDraftOperation(userId, () =>
      appStorage.getItem<WorkoutDraft>(getWorkoutDraftStorageKey(userId, workoutId)),
    );
  },

  async saveDraft(draft: WorkoutDraft) {
    if (!draft.userId || !draft.workoutId) return;
    const key = getWorkoutDraftStorageKey(draft.userId, draft.workoutId);
    await enqueueDraftOperation(draft.userId, async () => {
      const persisted = await appStorage.getItem<WorkoutDraft>(key);
      if (persisted?.pendingFinish === true) return;
      await appStorage.setItem(key, draft);
    });
  },

  async savePendingFinish(draft: PendingWorkoutFinish): Promise<PendingWorkoutFinish> {
    const { userId, workoutId } = draft;
    if (!userId || !workoutId) throw new Error("A finalização precisa de uma conta e um treino.");
    const key = getWorkoutDraftStorageKey(userId, workoutId);
    // Captura o corpo no formato do storage, antes da espera pela fila.
    const candidate = JSON.parse(JSON.stringify(draft)) as PendingWorkoutFinish;

    return enqueueDraftOperation(userId, async () => {
      const persisted = await appStorage.getItem<WorkoutDraft>(key);
      if (isPendingWorkoutFinish(persisted)) return persisted;

      // Um pendente legado só recebe os metadados de finalização que faltam.
      const snapshot: PendingWorkoutFinish = persisted?.pendingFinish === true
        ? {
            ...persisted,
            pendingFinish: true,
            idempotencyKey: persisted.idempotencyKey || candidate.idempotencyKey,
            finishedAt: persisted.finishedAt || candidate.finishedAt,
          }
        : candidate;
      if (!isPendingWorkoutFinish(snapshot)) throw new Error("Faltam a chave ou o horário da finalização.");
      await appStorage.setItem(key, snapshot);
      return snapshot;
    });
  },

  async saveFinishPhotoId(draft: PendingWorkoutFinish, mediaId: string): Promise<PendingWorkoutFinish> {
    const { userId, workoutId, idempotencyKey } = draft;
    if (!userId || !workoutId || !mediaId) throw new Error("A foto precisa de uma conta, um treino e um ID de mídia.");
    const key = getWorkoutDraftStorageKey(userId, workoutId);

    return enqueueDraftOperation(userId, async () => {
      const persisted = await appStorage.getItem<WorkoutDraft>(key);
      if (!isPendingWorkoutFinish(persisted) || persisted.idempotencyKey !== idempotencyKey) {
        throw new Error("A finalização pendente não corresponde ao rascunho gravado.");
      }
      if (persisted.photoMediaId != null) {
        if (persisted.photoMediaId !== mediaId) throw new Error("A finalização já tem outro photoMediaId.");
        return persisted;
      }

      const snapshot = { ...persisted, photoMediaId: mediaId };
      await appStorage.setItem(key, snapshot);
      return snapshot;
    });
  },

  async removeDraft(userId: string | null | undefined, workoutId: string | null | undefined) {
    if (!userId || !workoutId) return;
    await enqueueDraftOperation(userId, () => appStorage.removeItem(getWorkoutDraftStorageKey(userId, workoutId)));
  },

  // A restauracao do treino ativo descobre o rascunho antes de conhecer o
  // workoutId, entao precisa varrer as chaves do usuario. So pode existir um
  // treino em andamento por vez; se sobrar lixo de sessoes antigas, vence o
  // rascunho atualizado mais recentemente.
  async getCurrentDraft(userId: string | null | undefined) {
    if (!userId) return null;

    return enqueueDraftOperation(userId, async () => {
      const keys = await appStorage.keys(getUserDraftPrefix(userId));
      const drafts: WorkoutDraft[] = [];
      for (const key of keys) {
        const draft = await appStorage.getItem<WorkoutDraft>(key);
        if (draft) drafts.push(draft);
      }

      return drafts.sort((first, second) =>
        new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())[0] ?? null;
    });
  },

  async clearDrafts(userId: string | null | undefined) {
    if (!userId) return;

    await enqueueDraftOperation(userId, async () => {
      for (const key of await appStorage.keys(getUserDraftPrefix(userId))) {
        await appStorage.removeItem(key);
      }
    });
  },

  // Ao contrario de clearDrafts, apaga tambem a foto de cada rascunho. Remover so a
  // chave deixa o arquivo orfao no IndexedDB (web) ou em workout-drafts/ (nativo),
  // sem nada que o recolha depois.
  async clearAllDrafts(userId: string | null | undefined) {
    if (!userId) return;

    await enqueueDraftOperation(userId, async () => {
      for (const key of await appStorage.keys(getUserDraftPrefix(userId))) {
        const draft = await appStorage.getItem<WorkoutDraft>(key);
        await removePersistedWorkoutPhoto(draft?.photoFileName);
        await appStorage.removeItem(key);
      }
    });
  },
};
