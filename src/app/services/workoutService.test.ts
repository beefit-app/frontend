import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkoutCompletionDraft } from "../types/workout";

vi.mock("./apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const finishedSession = {
  id: "workout-1",
  status: "FINISHED",
  startedAt: "2026-06-04T10:00:00.000Z",
  finishedAt: "2026-06-04T10:45:00.000Z",
  durationSeconds: 2700,
  estimatedCalories: 420,
  totalVolume: 6400,
  muscleGroups: ["CHEST"],
  isPrivate: false,
  exercises: [],
};

const FINISHED_AT = "2026-06-04T10:45:00.000Z";
const IDEMPOTENCY_KEY = "idempotency-key-1";

function createDraft(shouldSaveTemplate: boolean): WorkoutCompletionDraft {
  return {
    workoutId: "workout-1",
    title: "Push pesado",
    photoUrl: null,
    shouldPostWorkout: true,
    shouldSaveTemplate,
    selectedGroups: ["Peito"],
    elapsedSeconds: 120,
    idempotencyKey: IDEMPOTENCY_KEY,
    finishedAt: FINISHED_AT,
    exercises: [
      {
        id: "exercise-1",
        sessionExerciseId: "session-exercise-1",
        catalogId: "catalog-1",
        name: "Supino",
        group: "Peito",
        groupId: "peito",
        sets: [{ id: "set-1", backendId: "set-backend-1", weight: "80", reps: "8" }],
      },
    ],
  };
}

describe("workoutService.finishWorkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna resumo oficial do backend", async () => {
    const { apiClient } = await import("./apiClient");
    vi.mocked(apiClient.post).mockResolvedValueOnce(finishedSession);

    const { workoutService } = await import("./workoutService");
    const summary = await workoutService.finishWorkout(createDraft(false));

    expect(summary).toEqual({
      workoutId: "workout-1",
      durationSeconds: 2700,
      estimatedCalories: 420,
      totalVolume: 6400,
      card: null,
    });
  });

  it("cria template quando a opcao esta ativa", async () => {
    const { apiClient } = await import("./apiClient");
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce(finishedSession)
      .mockResolvedValueOnce({ id: "template-1", name: "Push pesado", muscleGroups: ["CHEST"], exercises: [] });
    vi.mocked(apiClient.get).mockResolvedValueOnce([]);

    const { workoutService } = await import("./workoutService");
    await workoutService.finishWorkout(createDraft(true));

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "/api/workout/workout-1/finish",
      {
        finishedAt: FINISHED_AT,
        title: "Push pesado",
        shouldPostWorkout: true,
        muscleGroups: ["peito"],
        photoMediaId: null,
        exercises: [
          {
            sessionExerciseId: "session-exercise-1",
            catalogExerciseId: "catalog-1",
            catalogExerciseName: "Supino",
            order: 1,
            sets: [{ id: "set-backend-1", order: 1, weightKg: 80, reps: 8 }],
          },
        ],
      },
      { auth: true, headers: { "Idempotency-Key": IDEMPOTENCY_KEY } },
    );

    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      "/api/templates",
      {
        name: "Push pesado",
        muscleGroups: ["peito"],
        exercises: [{ catalogExerciseId: "catalog-1", order: 1 }],
      },
      { auth: true },
    );
  });

  it("reenvia corpo identico na retomada, para o backend tratar como repeticao", async () => {
    const { apiClient } = await import("./apiClient");
    vi.mocked(apiClient.post).mockResolvedValue(finishedSession);

    const { workoutService } = await import("./workoutService");
    const draft = createDraft(false);
    await workoutService.finishWorkout(draft);
    await workoutService.finishWorkout(draft);

    const [firstCall, secondCall] = vi.mocked(apiClient.post).mock.calls;
    expect(secondCall[1]).toEqual(firstCall[1]);
    expect(secondCall[2]).toEqual(firstCall[2]);
  });

  it("sobe a foto uma vez e devolve o mediaId antes do finish", async () => {
    const { apiClient } = await import("./apiClient");
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ mediaId: "media-1" })
      .mockResolvedValueOnce(finishedSession);

    const { workoutService } = await import("./workoutService");
    const draft: WorkoutCompletionDraft = {
      ...createDraft(false),
      photoFile: new File(["foto"], "treino.jpg", { type: "image/jpeg" }),
    };
    const onPrepared = vi.fn().mockResolvedValue(undefined);

    await workoutService.finishWorkout(draft, onPrepared);

    expect(onPrepared).toHaveBeenCalledWith(expect.objectContaining({ photoMediaId: "media-1" }));
    expect(vi.mocked(apiClient.post).mock.calls[1][1]).toMatchObject({ photoMediaId: "media-1" });
  });

  it("nao cria template quando a opcao esta inativa", async () => {
    const { apiClient } = await import("./apiClient");
    vi.mocked(apiClient.post).mockResolvedValueOnce(finishedSession);

    const { workoutService } = await import("./workoutService");
    await workoutService.finishWorkout(createDraft(false));

    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });

  it("cancela treino ativo com endpoint dedicado", async () => {
    const { apiClient } = await import("./apiClient");
    vi.mocked(apiClient.post).mockResolvedValueOnce(finishedSession);

    const { workoutService } = await import("./workoutService");
    await workoutService.cancelWorkout("workout-1");

    expect(apiClient.post).toHaveBeenCalledWith("/api/workout/workout-1/cancel", undefined, { auth: true });
  });
});
