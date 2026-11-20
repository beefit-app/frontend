import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkoutDraftStorageKey, workoutDraftStorage } from "./workoutDraftStorage";
import type { PendingWorkoutFinish, WorkoutDraft } from "../types/workout";

const removePersistedWorkoutPhoto = vi.hoisted(() => vi.fn());
vi.mock("../platform/workoutPhoto", () => ({ removePersistedWorkoutPhoto }));

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

function createPendingFinish(userId = "user-1", workoutId = "workout-1"): PendingWorkoutFinish {
  return {
    ...createDraft(userId, workoutId),
    pendingFinish: true,
    idempotencyKey: "finish-1",
    finishedAt: "2026-06-04T12:05:00.000Z",
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

  it("congela a finalização mesmo com um autosave atrasado para o mesmo treino", async () => {
    const draft = createDraft("user-1", "workout-1");
    await workoutDraftStorage.saveDraft(draft);
    const pending = { ...createPendingFinish(), title: "Treino concluído" };

    const [snapshot] = await Promise.all([
      workoutDraftStorage.savePendingFinish(pending),
      workoutDraftStorage.saveDraft({ ...draft, title: "Edição atrasada", updatedAt: "2026-06-04T12:06:00.000Z" }),
    ]);

    expect(snapshot).toEqual(pending);
    await expect(workoutDraftStorage.getDraft("user-1", "workout-1")).resolves.toEqual(pending);
  });

  it("devolve o primeiro snapshot na disputa e mantém o mesmo treino de outra conta separado", async () => {
    const first = createPendingFinish();
    const retry = {
      ...createPendingFinish(),
      idempotencyKey: "retry-2",
      finishedAt: "2026-06-04T12:06:00.000Z",
      title: "Título do retry",
      shouldPostWorkout: false,
      exercises: [],
    };
    const other = { ...createPendingFinish("user-2"), title: "Treino da segunda conta" };

    await expect(Promise.all([
      workoutDraftStorage.savePendingFinish(first),
      workoutDraftStorage.savePendingFinish(retry),
      workoutDraftStorage.savePendingFinish(other),
    ])).resolves.toEqual([first, first, other]);

    await expect(workoutDraftStorage.getDraft(first.userId, first.workoutId)).resolves.toEqual(first);
    await expect(workoutDraftStorage.getDraft(other.userId, other.workoutId)).resolves.toEqual(other);
  });

  it("captura também as séries na chamada, sem compartilhar o corpo com o candidato", async () => {
    const pending = createPendingFinish();
    const saving = workoutDraftStorage.savePendingFinish(pending);
    pending.exercises[0].sets[0].reps = "2";
    pending.title = "Edição em memória";

    await expect(saving).resolves.toEqual(createPendingFinish());
    await expect(workoutDraftStorage.getDraft(pending.userId, pending.workoutId)).resolves.toEqual(createPendingFinish());
  });

  it.each([
    { idempotencyKey: undefined, finishedAt: "2026-06-04T12:04:00.000Z" },
    { idempotencyKey: "legacy-key", finishedAt: "" },
    { idempotencyKey: undefined, finishedAt: undefined },
  ])("preenche somente chave e hora faltantes do pendente legado (%j)", async (metadata) => {
    const pending = createPendingFinish();
    const legacy = {
      ...pending,
      ...metadata,
      title: "Título original",
      updatedAt: 1780574400000,
      shouldSaveTemplate: true,
      photoFileName: "web:foto-original.jpg",
      photoMediaId: "media-original",
    };
    const key = getWorkoutDraftStorageKey(legacy.userId, legacy.workoutId);
    window.localStorage.setItem(key, JSON.stringify(legacy));
    const expected = {
      ...legacy,
      idempotencyKey: metadata.idempotencyKey ?? "finish-1",
      finishedAt: metadata.finishedAt || "2026-06-04T12:05:00.000Z",
    };

    await expect(workoutDraftStorage.savePendingFinish(pending)).resolves.toEqual(expected);
    await expect(workoutDraftStorage.getDraft(legacy.userId, legacy.workoutId)).resolves.toEqual(expected);
  });

  it("grava só o ID da foto e o reaproveita nas retentativas", async () => {
    const pending = { ...createPendingFinish(), photoFileName: "web:foto-original.jpg", photoMediaId: null };
    await workoutDraftStorage.savePendingFinish(pending);
    const stale = { ...createPendingFinish(), title: "Título obsoleto", finishedAt: "2026-06-04T12:06:00.000Z" };
    const expected = { ...pending, photoMediaId: "media-1" };

    await expect(workoutDraftStorage.saveFinishPhotoId(stale, "media-1")).resolves.toEqual(expected);
    await expect(workoutDraftStorage.saveFinishPhotoId(stale, "media-1")).resolves.toEqual(expected);
    await expect(workoutDraftStorage.savePendingFinish(stale)).resolves.toEqual(expected);
    await expect(workoutDraftStorage.getDraft(pending.userId, pending.workoutId)).resolves.toEqual(expected);
  });

  it("rejeita o segundo ID de foto numa disputa e preserva o primeiro", async () => {
    const pending = await workoutDraftStorage.savePendingFinish(createPendingFinish());
    const expected = { ...pending, photoMediaId: "media-1" };

    const results = await Promise.allSettled([
      workoutDraftStorage.saveFinishPhotoId(pending, "media-1"),
      workoutDraftStorage.saveFinishPhotoId(pending, "media-2"),
    ]);

    expect(results).toEqual([
      { status: "fulfilled", value: expected },
      { status: "rejected", reason: expect.any(Error) },
    ]);
    await expect(workoutDraftStorage.getDraft(pending.userId, pending.workoutId)).resolves.toEqual(expected);
  });

  it("rejeita a foto de uma chave diferente para o mesmo treino", async () => {
    const pending = await workoutDraftStorage.savePendingFinish(createPendingFinish());
    const stale = { ...pending, idempotencyKey: "chave-obsoleta" };

    await expect(workoutDraftStorage.saveFinishPhotoId(stale, "media-1")).rejects.toThrow();
    await expect(workoutDraftStorage.getDraft(pending.userId, pending.workoutId)).resolves.toEqual(pending);
  });

  it.each(["removeDraft", "clearDrafts", "clearAllDrafts"] as const)(
    "%s impede que um upload atrasado recrie o rascunho",
    async (discard) => {
      const pending = await workoutDraftStorage.savePendingFinish(createPendingFinish());
      const { userId, workoutId } = pending;

      await Promise.all([
        workoutDraftStorage[discard](userId, workoutId),
        expect(workoutDraftStorage.saveFinishPhotoId(pending, "media-1")).rejects.toThrow(),
      ]);

      await expect(workoutDraftStorage.getDraft(userId, workoutId)).resolves.toBeNull();
    },
  );

  it("a limpeza por conta inclui um snapshot novo que já está sendo gravado", async () => {
    const pending = createPendingFinish();

    await Promise.all([
      workoutDraftStorage.savePendingFinish(pending),
      workoutDraftStorage.clearDrafts(pending.userId),
    ]);

    await expect(workoutDraftStorage.getDraft(pending.userId, pending.workoutId)).resolves.toBeNull();
  });

  it("remove rascunho ao finalizar ou cancelar", async () => {
    const draft = createDraft("user-1", "workout-1");
    await workoutDraftStorage.saveDraft(draft);

    await workoutDraftStorage.removeDraft("user-1", "workout-1");

    await expect(workoutDraftStorage.getDraft("user-1", "workout-1")).resolves.toBeNull();
  });

  it("clearAllDrafts apaga a foto de cada rascunho, nao so a chave", async () => {
    await workoutDraftStorage.saveDraft({
      ...createDraft("user-1", "workout-1"),
      photoFileName: "web:foto-1",
    });
    await workoutDraftStorage.saveDraft({
      ...createDraft("user-1", "workout-2"),
      photoFileName: "web:foto-2",
    });
    await workoutDraftStorage.saveDraft(createDraft("user-2", "workout-1"));

    await workoutDraftStorage.clearAllDrafts("user-1");

    // Remover so a chave deixaria o arquivo orfao no dispositivo, sem nada que o recolha.
    expect(removePersistedWorkoutPhoto).toHaveBeenCalledWith("web:foto-1");
    expect(removePersistedWorkoutPhoto).toHaveBeenCalledWith("web:foto-2");
    expect(window.localStorage.getItem(getWorkoutDraftStorageKey("user-1", "workout-1"))).toBeNull();
    expect(window.localStorage.getItem(getWorkoutDraftStorageKey("user-1", "workout-2"))).toBeNull();
    // Nao pode encostar no rascunho de outro usuario.
    await expect(workoutDraftStorage.getDraft("user-2", "workout-1")).resolves.not.toBeNull();
  });
});
