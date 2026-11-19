import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beginSessionChange, sessionStorage } from "../storage/sessionStorage";
import { workoutDraftStorage } from "../storage/workoutDraftStorage";
import { workoutService } from "../services/workoutService";
import { resetActiveWorkoutMemory, WorkoutStartScreen } from "./WorkoutStartScreen";

const callbacks = vi.hoisted(() => ({
  completed: vi.fn(),
  activeChanged: vi.fn(),
}));
const removePersistedWorkoutPhoto = vi.hoisted(() => vi.fn());
const photo = vi.hoisted(() => ({ file: null as File | null, persist: vi.fn() }));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", weight: 80 } }),
}));

vi.mock("../hooks/useConfirm", () => ({
  useConfirm: () => ({ confirm: vi.fn(), dialog: null }),
}));

vi.mock("./ActiveWorkoutScreen", () => ({
  ActiveWorkoutScreen: ({ onWorkoutComplete }: { onWorkoutComplete: (draft: {
    workoutId: string;
    title: string;
    photoUrl: null;
    photoFile?: File | null;
    shouldPostWorkout: boolean;
    shouldSaveTemplate: boolean;
    selectedGroups: string[];
    elapsedSeconds: number;
    exercises: [];
    idempotencyKey: string;
    finishedAt: string;
  }) => void }) => (
    <button
      type="button"
      onClick={() => onWorkoutComplete({
        workoutId: "workout-1",
        title: "Treino de peito",
        photoUrl: null,
        photoFile: photo.file,
        shouldPostWorkout: true,
        shouldSaveTemplate: false,
        selectedGroups: ["peito"],
        elapsedSeconds: 1800,
        exercises: [],
        idempotencyKey: "idempotency-key",
        finishedAt: "2026-08-29T12:00:00.000Z",
      })}
    >
      finalizar treino mockado
    </button>
  ),
}));

vi.mock("../services/workoutService", () => ({
  workoutService: {
    getTemplates: () => [],
    getMuscleGroups: () => [],
    getTemplateById: () => null,
    loadCatalog: vi.fn().mockResolvedValue([]),
    loadTemplates: vi.fn().mockResolvedValue([]),
    getActiveWorkout: vi.fn().mockResolvedValue({
      id: "workout-1",
      startedAt: new Date("2026-08-29T11:30:00.000Z").getTime(),
      muscleGroups: ["Peito"],
      exercises: [],
    }),
    finishWorkout: vi.fn().mockResolvedValue({
      workoutId: "workout-1",
      durationSeconds: 1800,
      estimatedCalories: 250,
      totalVolume: 1200,
      card: null,
    }),
  },
}));

vi.mock("../services/socialEventsService", () => ({
  subscribeSocialEvents: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../storage/workoutDraftStorage", () => ({
  workoutDraftStorage: {
    getCurrentDraft: vi.fn().mockResolvedValue(null),
    removeDraft: vi.fn().mockResolvedValue(undefined),
    clearDrafts: vi.fn().mockResolvedValue(undefined),
    saveDraft: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../storage/pageCacheStorage", () => ({
  pageCacheStorage: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../platform/workoutPhoto", () => ({
  persistWorkoutPhoto: photo.persist,
  removePersistedWorkoutPhoto,
  restoreWorkoutPhoto: vi.fn().mockResolvedValue(null),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe("WorkoutStartScreen", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await sessionStorage.activate(beginSessionChange("replace").signal, "access-a", "refresh-a", { id: "user-1" });
    photo.file = null;
    photo.persist.mockReset();
    vi.mocked(workoutService.finishWorkout).mockClear();
    vi.mocked(workoutDraftStorage.saveDraft).mockClear();
    callbacks.completed.mockReset();
    callbacks.activeChanged.mockReset();
    removePersistedWorkoutPhoto.mockReset().mockResolvedValue(undefined);
    resetActiveWorkoutMemory();
  });

  it("encerra o treino e confirma a conclusão mesmo sem evento CARD_GENERATED", async () => {
    render(
      <WorkoutStartScreen
        onActiveWorkoutChange={callbacks.activeChanged}
        onWorkoutCompleted={callbacks.completed}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "finalizar treino mockado" }));

    await waitFor(() => {
      expect(callbacks.completed).toHaveBeenCalledTimes(1);
      expect(callbacks.activeChanged).toHaveBeenLastCalledWith(null);
      expect(screen.queryByRole("button", { name: "finalizar treino mockado" })).not.toBeInTheDocument();
      expect(screen.getByText("Treino finalizado: 30 min, 250 kcal, 1.200 kg.")).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it("preserva o rascunho do dono e não envia a foto depois que a sessão muda", async () => {
    photo.file = new File(["foto de teste"], "treino.jpg", { type: "image/jpeg" });
    let finishSavingPhoto!: (path: string) => void;
    photo.persist.mockReturnValue(new Promise<string>((resolve) => { finishSavingPhoto = resolve; }));

    render(<WorkoutStartScreen onWorkoutCompleted={callbacks.completed} />);
    fireEvent.click(await screen.findByRole("button", { name: "finalizar treino mockado" }));
    await waitFor(() => expect(photo.persist).toHaveBeenCalled());

    await act(async () => {
      await sessionStorage.activate(beginSessionChange("replace").signal, "access-b", "refresh-b", { id: "user-2" });
      finishSavingPhoto("treino-a.jpg");
    });

    expect(workoutDraftStorage.saveDraft).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1", pendingFinish: true, photoFileName: "treino-a.jpg",
    }));
    expect(workoutService.finishWorkout).not.toHaveBeenCalled();
    expect(callbacks.completed).not.toHaveBeenCalled();
  });

  it("encerra o treino quando a limpeza local da foto falha", async () => {
    removePersistedWorkoutPhoto.mockRejectedValueOnce(new Error("Arquivo indisponível"));

    render(
      <WorkoutStartScreen
        onActiveWorkoutChange={callbacks.activeChanged}
        onWorkoutCompleted={callbacks.completed}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "finalizar treino mockado" }));

    await waitFor(() => {
      expect(callbacks.completed).toHaveBeenCalledTimes(1);
      expect(callbacks.activeChanged).toHaveBeenLastCalledWith(null);
    });
  });
});
