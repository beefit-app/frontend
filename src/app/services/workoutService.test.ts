import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkoutCompletionDraft } from "../types/workout";

const API_URL = "http://api.test";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("workoutService idempotency", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", API_URL);
    vi.stubGlobal("fetch", vi.fn());
    window.localStorage.setItem("beefit.auth.accessToken", "token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("reenvia o mesmo payload sem repetir o upload após falha de rede", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ mediaId: "media-1" }))
      .mockRejectedValueOnce(new TypeError("network lost"))
      .mockResolvedValueOnce(jsonResponse({
        id: "workout-1",
        status: "FINISHED",
        startedAt: "2026-08-01T10:00:00-03:00",
        finishedAt: "2026-08-01T10:40:00-03:00",
        muscleGroups: ["CHEST"],
        isPrivate: false,
        exercises: [],
        card: null,
      }));

    const { workoutService } = await import("./workoutService");
    const draft: WorkoutCompletionDraft = {
      workoutId: "workout-1",
      title: "Treino de peito",
      photoUrl: "blob:photo",
      photoFile: new File(["photo"], "photo.jpg", { type: "image/jpeg" }),
      shouldPostWorkout: true,
      selectedGroups: ["Peito"],
      elapsedSeconds: 2400,
      exercises: [],
      idempotencyKey: "finish-key-1",
      finishedAt: "2026-08-01T13:40:00.000Z",
      photoMediaId: null,
    };
    let preparedDraft: WorkoutCompletionDraft | null = null;

    await expect(workoutService.finishWorkout(draft, async (prepared) => {
      preparedDraft = prepared;
    })).rejects.toMatchObject({ status: 0 });

    expect(preparedDraft).toMatchObject({
      idempotencyKey: "finish-key-1",
      finishedAt: "2026-08-01T13:40:00.000Z",
      photoMediaId: "media-1",
    });

    await workoutService.finishWorkout(preparedDraft!);

    expect(fetch).toHaveBeenCalledTimes(3);
    const firstFinish = vi.mocked(fetch).mock.calls[1]?.[1];
    const replayFinish = vi.mocked(fetch).mock.calls[2]?.[1];
    expect(firstFinish?.body).toBe(replayFinish?.body);
    expect(JSON.parse(String(replayFinish?.body))).toMatchObject({
      finishedAt: "2026-08-01T13:40:00.000Z",
      photoMediaId: "media-1",
    });
    expect(replayFinish?.headers).toMatchObject({ "Idempotency-Key": "finish-key-1" });
  });
});
