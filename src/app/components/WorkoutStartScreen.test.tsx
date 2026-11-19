import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beginSessionChange, sessionStorage } from "../storage/sessionStorage";
import { workoutDraftStorage } from "../storage/workoutDraftStorage";
import { workoutService } from "../services/workoutService";
import type { WorkoutCompletionDraft } from "../types/workout";
import { resetActiveWorkoutMemory, WorkoutStartScreen } from "./WorkoutStartScreen";

const callbacks = vi.hoisted(() => ({
  completed: vi.fn(),
  activeChanged: vi.fn(),
}));
const removePersistedWorkoutPhoto = vi.hoisted(() => vi.fn());
const confirm = vi.hoisted(() => vi.fn());
const photo = vi.hoisted(() => ({ file: null as File | null, persist: vi.fn(), restore: vi.fn() }));
const finishedWorkout = vi.hoisted(() => ({
  workoutId: "workout-1",
  durationSeconds: 1800,
  estimatedCalories: 250,
  totalVolume: 1200,
  card: null,
}));
const startedAt = Date.parse("2026-08-29T11:30:00.000Z");

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", weight: 80 } }),
}));

vi.mock("../hooks/useConfirm", () => ({
  useConfirm: () => ({ confirm, dialog: null }),
}));

vi.mock("./ActiveWorkoutScreen", () => ({
  ActiveWorkoutScreen: ({ onWorkoutComplete, onCancelWorkout }: {
    onCancelWorkout: () => Promise<boolean>;
    onWorkoutComplete: (draft: {
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
    }) => void;
  }) => (
    <>
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
    <button type="button" onClick={() => void onCancelWorkout()}>cancelar treino mockado</button>
    </>
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
    finishWorkout: vi.fn(),
    getWorkout: vi.fn(),
    cancelWorkout: vi.fn(),
  },
}));

vi.mock("../services/socialEventsService", () => ({
  subscribeSocialEvents: vi.fn().mockResolvedValue(undefined),
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
  restoreWorkoutPhoto: photo.restore,
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe("WorkoutStartScreen", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await sessionStorage.activate(beginSessionChange("replace").signal, "access-a", "refresh-a", { id: "user-1" });
    photo.file = null;
    photo.persist.mockReset();
    photo.restore.mockReset().mockResolvedValue(null);
    confirm.mockReset().mockResolvedValue(true);
    vi.mocked(workoutService.cancelWorkout).mockReset().mockResolvedValue(undefined);
    vi.mocked(workoutService.finishWorkout).mockReset().mockResolvedValue(finishedWorkout);
    vi.mocked(workoutService.getWorkout).mockReset().mockResolvedValue({
      ...finishedWorkout, status: "IN_PROGRESS", startedAt, muscleGroups: ["Peito"], exercises: [],
    });
    callbacks.completed.mockReset();
    callbacks.activeChanged.mockReset();
    vi.mocked(toast.error).mockClear();
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

    await expect(workoutDraftStorage.getDraft("user-1", "workout-1")).resolves.toMatchObject({
      userId: "user-1", pendingFinish: true, photoFileName: "treino-a.jpg",
    });
    expect(workoutService.finishWorkout).not.toHaveBeenCalled();
    expect(callbacks.completed).not.toHaveBeenCalled();
  });

  it("reabre o treino pendente e repete a conclusão sem reenviar a foto já registrada", async () => {
    photo.file = new File(["foto de teste"], "treino.jpg", { type: "image/jpeg" });
    photo.persist.mockResolvedValue("web:treino-a.jpg");
    let firstCommand: WorkoutCompletionDraft | undefined;
    vi.mocked(workoutService.finishWorkout).mockImplementationOnce(async (draft, prepared) => {
      firstCommand = { ...draft, photoMediaId: "media-1" };
      await prepared?.(firstCommand);
      throw new Error("Conexão interrompida.");
    });

    const mounted = render(<WorkoutStartScreen onWorkoutCompleted={callbacks.completed} />);
    fireEvent.click(await screen.findByRole("button", { name: "finalizar treino mockado" }));
    expect(await screen.findByText("Finalização pendente")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "finalizar treino mockado" })).not.toBeInTheDocument();
    await expect(workoutDraftStorage.getDraft("user-1", "workout-1")).resolves.toMatchObject({
      idempotencyKey: "idempotency-key", finishedAt: "2026-08-29T12:00:00.000Z", photoMediaId: "media-1",
    });
    mounted.unmount();
    resetActiveWorkoutMemory();

    render(<WorkoutStartScreen onWorkoutCompleted={callbacks.completed} />);
    await waitFor(() => expect(callbacks.completed).toHaveBeenCalledOnce());
    expect(workoutService.getWorkout).toHaveBeenCalledWith("workout-1");
    expect(workoutService.finishWorkout).toHaveBeenCalledTimes(2);
    expect(vi.mocked(workoutService.finishWorkout).mock.calls[1][0]).toMatchObject({
      ...firstCommand, photoFile: null,
    });
    expect(photo.persist).toHaveBeenCalledOnce();
    await expect(workoutDraftStorage.getDraft("user-1", "workout-1")).resolves.toBeNull();
  });

  it("reconhece a conclusão confirmada sem enviar outro comando quando a resposta se perdeu", async () => {
    vi.mocked(workoutService.finishWorkout).mockRejectedValueOnce(new Error("Resposta indisponível."));
    const mounted = render(<WorkoutStartScreen onWorkoutCompleted={callbacks.completed} />);
    fireEvent.click(await screen.findByRole("button", { name: "finalizar treino mockado" }));
    expect(await screen.findByText("Finalização pendente")).toBeInTheDocument();
    expect(callbacks.completed).not.toHaveBeenCalled();
    mounted.unmount();
    resetActiveWorkoutMemory();

    vi.mocked(workoutService.getWorkout).mockResolvedValueOnce({
      ...finishedWorkout, status: "FINISHED", startedAt, muscleGroups: ["Peito"], exercises: [],
    });
    render(<WorkoutStartScreen onWorkoutCompleted={callbacks.completed} />);

    await waitFor(() => expect(callbacks.completed).toHaveBeenCalledOnce());
    expect(workoutService.finishWorkout).toHaveBeenCalledOnce();
    await expect(workoutDraftStorage.getDraft("user-1", "workout-1")).resolves.toBeNull();
  });

  it("não envia duas conclusões se a rede voltar durante a tentativa manual", async () => {
    vi.mocked(workoutService.finishWorkout).mockRejectedValueOnce(new Error("Sem conexão."));
    render(<WorkoutStartScreen onWorkoutCompleted={callbacks.completed} />);
    fireEvent.click(await screen.findByRole("button", { name: "finalizar treino mockado" }));
    expect(await screen.findByText("Finalização pendente")).toBeInTheDocument();

    let releaseLookup!: (value: Awaited<ReturnType<typeof workoutService.getWorkout>>) => void;
    vi.mocked(workoutService.getWorkout).mockReturnValueOnce(new Promise((resolve) => { releaseLookup = resolve; }));
    fireEvent.click(screen.getByText("Tentar novamente"));
    await waitFor(() => expect(workoutService.getWorkout).toHaveBeenCalledOnce());
    act(() => window.dispatchEvent(new Event("online")));
    await act(async () => releaseLookup({
      ...finishedWorkout, status: "IN_PROGRESS", startedAt, muscleGroups: ["Peito"], exercises: [],
    }));

    expect(callbacks.completed).toHaveBeenCalledOnce();
    expect(workoutService.getWorkout).toHaveBeenCalledOnce();
    expect(workoutService.finishWorkout).toHaveBeenCalledTimes(2);
  });

  it("retoma após a tentativa em voo falhar se a rede voltou enquanto ela aguardava", async () => {
    let rejectFinish!: (error: Error) => void;
    vi.mocked(workoutService.finishWorkout).mockReturnValueOnce(new Promise((_resolve, reject) => {
      rejectFinish = reject;
    }));
    render(<WorkoutStartScreen onWorkoutCompleted={callbacks.completed} />);
    fireEvent.click(await screen.findByRole("button", { name: "finalizar treino mockado" }));
    await waitFor(() => expect(workoutService.finishWorkout).toHaveBeenCalledOnce());

    act(() => window.dispatchEvent(new Event("online")));
    await act(async () => rejectFinish(new Error("A resposta anterior não chegou.")));

    await waitFor(() => expect(callbacks.completed).toHaveBeenCalledOnce());
    expect(workoutService.getWorkout).toHaveBeenCalledOnce();
    expect(workoutService.finishWorkout).toHaveBeenCalledTimes(2);
  });

  it("não começa uma finalização enquanto cancelar o treino está em voo", async () => {
    let releaseCancel!: () => void;
    vi.mocked(workoutService.cancelWorkout).mockReturnValueOnce(new Promise((resolve) => {
      releaseCancel = () => resolve(undefined);
    }));
    render(<WorkoutStartScreen onWorkoutCompleted={callbacks.completed} />);
    fireEvent.click(await screen.findByRole("button", { name: "cancelar treino mockado" }));
    await waitFor(() => expect(workoutService.cancelWorkout).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "finalizar treino mockado" }));
    await act(async () => releaseCancel());

    expect(workoutService.finishWorkout).not.toHaveBeenCalled();
    expect(callbacks.completed).not.toHaveBeenCalled();
    await expect(workoutDraftStorage.getDraft("user-1", "workout-1")).resolves.toBeNull();
  });

  it("não envia nem congela a conclusão se a foto não puder ser gravada no aparelho", async () => {
    photo.file = new File(["foto de teste"], "treino.jpg", { type: "image/jpeg" });
    photo.persist.mockResolvedValueOnce(null);
    render(<WorkoutStartScreen onWorkoutCompleted={callbacks.completed} />);
    fireEvent.click(await screen.findByRole("button", { name: "finalizar treino mockado" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("salvar a foto no aparelho")));
    expect(screen.getByRole("button", { name: "finalizar treino mockado" })).toBeVisible();
    expect(workoutService.finishWorkout).not.toHaveBeenCalled();
    await expect(workoutDraftStorage.getDraft("user-1", "workout-1")).resolves.toBeNull();
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
