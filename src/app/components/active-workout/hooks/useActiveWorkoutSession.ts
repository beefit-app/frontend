import { useEffect, useMemo, useRef, useState } from "react";
import { workoutService } from "../../../services/workoutService";
import { workoutDraftStorage } from "../../../storage/workoutDraftStorage";
import type {
  ExerciseCatalogItem,
  WorkoutCompletionDraft,
  WorkoutDraft,
  WorkoutExercise,
} from "../../../types/workout";
import type { ActiveWorkoutScreenProps, DetailViewSource } from "../types";
import {
  calculateEstimatedCalories,
  calculateWorkoutVolume,
  createExerciseCard,
  createSet,
} from "../utils";

const WORKOUT_TITLE_MAX_LENGTH = 80;

export function useActiveWorkoutSession({
  catalogRevision = 0,
  workoutId = null,
  userId = null,
  startedAt = null,
  selectedGroups,
  initialExercises = [],
  initialSessionExercises,
  initialDraft = null,
  bodyWeightKg,
  ghostModeEnabled = false,
  initialFinishPhotoFile = null,
  initialFinishIdempotencyKey = null,
  initialFinishFinishedAt = null,
  initialFinishPhotoMediaId = null,
  initialFinishTitle = null,
  initialShouldPostWorkout,
  pendingFinish = false,
  onWorkoutComplete,
  onSessionGroupsChange,
  onDraftChange,
}: Pick<
  ActiveWorkoutScreenProps,
  | "selectedGroups"
  | "catalogRevision"
  | "workoutId"
  | "userId"
  | "startedAt"
  | "initialExercises"
  | "initialSessionExercises"
  | "initialDraft"
  | "bodyWeightKg"
  | "ghostModeEnabled"
  | "initialFinishPhotoFile"
  | "initialFinishIdempotencyKey"
  | "initialFinishFinishedAt"
  | "initialFinishPhotoMediaId"
  | "initialFinishTitle"
  | "initialShouldPostWorkout"
  | "pendingFinish"
  | "onWorkoutComplete"
  | "onSessionGroupsChange"
  | "onDraftChange"
>) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0,
  );
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isFinishingWorkout, setIsFinishingWorkout] = useState(false);
  const [activeCatalogGroupId, setActiveCatalogGroupId] = useState("peito");
  const [catalogDetailExerciseId, setCatalogDetailExerciseId] = useState<string | null>(null);
  const [detailViewSource, setDetailViewSource] = useState<DetailViewSource>("catalog");
  const [isWorkoutMenuOpen, setIsWorkoutMenuOpen] = useState(false);
  const [activeExerciseMenuId, setActiveExerciseMenuId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(() =>
    initialDraft?.exercises && initialDraft.exercises.length > 0
      ? initialDraft.exercises
      : initialSessionExercises && initialSessionExercises.length > 0
      ? initialSessionExercises
      : initialExercises.map((exercise) => createExerciseCard(exercise, { withInitialSet: false })),
  );
  const [finishTitle, setFinishTitle] = useState(
    initialFinishTitle ?? initialDraft?.title ?? selectedGroups.join(" & "),
  );
  const [finishPhotoUrl, setFinishPhotoUrl] = useState<string | null>(null);
  const [finishPhotoFile, setFinishPhotoFile] = useState<File | null>(initialFinishPhotoFile);
  // Chave e carimbo nascem uma unica vez por sessao: reabrir a tela de conclusao ou
  // reclicar "concluir" tem de reenviar o mesmo corpo, senao o backend responde
  // IdempotencyConflictException em vez de tratar a repeticao como no-op.
  const [finishIdempotencyKey] = useState(() => initialFinishIdempotencyKey || crypto.randomUUID());
  const [finishFinishedAt, setFinishFinishedAt] = useState(initialFinishFinishedAt ?? "");
  const [shouldPostWorkout, setShouldPostWorkout] = useState(
    initialShouldPostWorkout ?? initialDraft?.shouldPostWorkout ?? !ghostModeEnabled,
  );
  const [shouldSaveTemplate, setShouldSaveTemplate] = useState(initialDraft?.shouldSaveTemplate ?? false);
  const [finishTitleError, setFinishTitleError] = useState("");
  const [finishValidationError, setFinishValidationError] = useState("");
  const [catalog, setCatalog] = useState(() => workoutService.getCatalog());
  const [catalogLoadError, setCatalogLoadError] = useState("");
  const [pendingExerciseFocusId, setPendingExerciseFocusId] = useState<string | null>(null);
  const [pendingSetFocusExerciseId, setPendingSetFocusExerciseId] = useState<string | null>(null);
  const [catalogItems, setCatalogItems] = useState<ExerciseCatalogItem[]>(() => workoutService.getCatalog());
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const exerciseSlideRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const seriesContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const finishPhotoInputRef = useRef<HTMLInputElement>(null);

  const groupedExercises = useMemo(() => workoutService.getGroupedCatalog(catalog), [catalog]);
  const groupOrder = useMemo(() => workoutService.getGroupOrder(), []);
  const activeCatalogExercise = useMemo(
    () => workoutService.getCatalogItemById(catalogDetailExerciseId, catalog),
    [catalog, catalogDetailExerciseId],
  );
  const visibleCatalogItems = useMemo(
    () => workoutService.getCatalogByGroupId(activeCatalogGroupId, catalog),
    [activeCatalogGroupId, catalog],
  );
  const sessionGroups = useMemo(
    () => workoutService.getSessionGroups(selectedGroups, exercises),
    [exercises, selectedGroups],
  );
  const defaultFinishTitle = sessionGroups.join(" & ");
  const selectedCatalogIds = useMemo(
    () => new Set(exercises.map((exercise) => exercise.catalogId)),
    [exercises],
  );
  const totalVolumeKg = useMemo(() => calculateWorkoutVolume(exercises), [exercises]);
  const estimatedCalories = useMemo(
    () => calculateEstimatedCalories(elapsedSeconds, bodyWeightKg ?? 75),
    [bodyWeightKg, elapsedSeconds],
  );

  useEffect(() => {
    const updateElapsedSeconds = () => {
      setElapsedSeconds(startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0);
    };

    updateElapsedSeconds();
    const timer = window.setInterval(updateElapsedSeconds, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      try {
        const loadedCatalog = await workoutService.loadCatalog();
        if (!active) return;
        setCatalog(loadedCatalog);
        setCatalogLoadError("");
      } catch (error) {
        if (!active) return;
        setCatalogLoadError(error instanceof Error ? error.message : "Não foi possível carregar o catálogo.");
      }
    }

    void loadCatalog();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => () => {
    if (finishPhotoUrl?.startsWith("blob:")) URL.revokeObjectURL(finishPhotoUrl);
  }, [finishPhotoUrl]);

  useEffect(() => {
    if (!pendingExerciseFocusId) return;

    const frame = window.requestAnimationFrame(() => {
      const targetSlide = exerciseSlideRefs.current[pendingExerciseFocusId];

      if (targetSlide) {
        targetSlide.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }

      setPendingExerciseFocusId(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [exercises, pendingExerciseFocusId]);

  useEffect(() => {
    if (!pendingSetFocusExerciseId) return;

    const frame = window.requestAnimationFrame(() => {
      const targetContainer = seriesContainerRefs.current[pendingSetFocusExerciseId];

      if (targetContainer) {
        targetContainer.scrollTo({ top: targetContainer.scrollHeight, behavior: "smooth" });
      }

      setPendingSetFocusExerciseId(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [exercises, pendingSetFocusExerciseId]);

  const onSessionGroupsChangeRef = useRef(onSessionGroupsChange);
  const onDraftChangeRef = useRef(onDraftChange);

  useEffect(() => {
    onSessionGroupsChangeRef.current = onSessionGroupsChange;
  }, [onSessionGroupsChange]);

  useEffect(() => {
    onDraftChangeRef.current = onDraftChange;
  }, [onDraftChange]);

  useEffect(() => {
    onSessionGroupsChangeRef.current?.(sessionGroups);
  }, [sessionGroups]);

  useEffect(() => {
    onDraftChangeRef.current?.({ exercises, selectedGroups: sessionGroups });
  }, [exercises, sessionGroups]);

  // Este efeito e o unico escritor do rascunho enquanto o treino esta em andamento.
  // Depois que a finalizacao vira pendente, quem manda e persistPendingFinish: um
  // save daqui apagaria a Idempotency-Key e o carimbo e quebraria a retomada.
  useEffect(() => {
    if (!userId || !workoutId || pendingFinish) return;

    const draft: WorkoutDraft = {
      userId,
      workoutId,
      title: finishTitle.trim() || defaultFinishTitle,
      selectedGroups: sessionGroups,
      exercises,
      shouldPostWorkout,
      shouldSaveTemplate,
      startedAt: startedAt ?? undefined,
      updatedAt: new Date().toISOString(),
    };

    void workoutDraftStorage.saveDraft(draft);
  }, [
    defaultFinishTitle,
    exercises,
    finishTitle,
    pendingFinish,
    sessionGroups,
    shouldPostWorkout,
    shouldSaveTemplate,
    startedAt,
    userId,
    workoutId,
  ]);

  useEffect(() => {
    if (!finishValidationError) return;

    const timer = window.setTimeout(() => {
      setFinishValidationError("");
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [finishValidationError]);

  function addExercise(exercise: ExerciseCatalogItem) {
    const newExercise = createExerciseCard(exercise);
    const shouldSyncMuscleGroup =
      Boolean(workoutId) &&
      !sessionGroups.includes(exercise.group);

    setExercises((current) => [...current, newExercise]);
    setActiveExerciseMenuId(null);
    setPendingExerciseFocusId(newExercise.id);
    setCatalogDetailExerciseId(null);
    setDetailViewSource("catalog");
    setIsCatalogOpen(false);

    if (shouldSyncMuscleGroup && workoutId) {
      void workoutService.addMuscleGroup(workoutId, exercise.groupId).catch(() => undefined);
    }
  }

  function removeExercise(exerciseId: string) {
    setExercises((current) => current.filter((exercise) => exercise.id !== exerciseId));
    setActiveExerciseMenuId(null);
    setFinishValidationError("");
  }

  function addSet(exerciseId: string) {
    const newSet = createSet();

    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, sets: [...exercise.sets, newSet] } : exercise,
      ),
    );
    setPendingSetFocusExerciseId(exerciseId);
    setFinishValidationError("");
  }

  function updateSet(exerciseId: string, setId: string, field: "weight" | "reps", value: string) {
    let sanitizedValue = value;
    if (field === "weight") {
      sanitizedValue = value.replace(/[^0-9.,]/g, "");
      if (sanitizedValue.trim().length > 0) {
        const numValue = Number(sanitizedValue.replace(",", "."));
        if (!isNaN(numValue) && numValue > 1000) {
          sanitizedValue = "1000";
        }
      }
    } else if (field === "reps") {
      sanitizedValue = value.replace(/[^0-9]/g, "");
      if (sanitizedValue.trim().length > 0) {
        const numValue = parseInt(sanitizedValue, 10);
        if (!isNaN(numValue) && numValue > 100) {
          sanitizedValue = "100";
        }
      }
    }

    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) => (set.id === setId ? { ...set, [field]: sanitizedValue } : set)),
            }
          : exercise,
      ),
    );
    setFinishValidationError("");
  }

  function openFinishWorkout() {
    if (exercises.length === 0) {
      setFinishValidationError(
        "Adicione pelo menos um exercício antes de concluir o treino.",
      );
      return;
    }

    if (
      exercises.some(
        (exercise) =>
          !exercise.sets.some(
            (set) => set.weight.trim().length > 0 && set.reps.trim().length > 0,
          ),
      )
    ) {
      setFinishValidationError(
        "Todos os exercícios precisam ter ao menos uma série com peso e repetições preenchidos antes de concluir o treino.",
      );
      return;
    }

    setFinishTitle((current) => (current.trim() ? current : defaultFinishTitle));
    setFinishTitleError("");
    setFinishValidationError("");
    setIsFinishingWorkout(true);
  }

  function handleFinishWorkout() {
    if (!finishTitle.trim()) {
      setFinishTitleError("Digite um título para concluir o treino");
      return;
    }
    if (finishTitle.trim().length > WORKOUT_TITLE_MAX_LENGTH) {
      setFinishTitleError(`O título pode ter no máximo ${WORKOUT_TITLE_MAX_LENGTH} caracteres.`);
      return;
    }

    // Carimba na primeira conclusao e reaproveita depois, para que uma segunda
    // tentativa produza um corpo identico ao da primeira.
    const finishedAt = finishFinishedAt || new Date().toISOString();
    if (!finishFinishedAt) setFinishFinishedAt(finishedAt);

    const draft: WorkoutCompletionDraft = {
      workoutId,
      title: finishTitle.trim(),
      photoUrl: finishPhotoUrl,
      photoFile: finishPhotoFile,
      shouldPostWorkout,
      shouldSaveTemplate,
      selectedGroups: sessionGroups,
      elapsedSeconds,
      exercises,
      idempotencyKey: finishIdempotencyKey,
      finishedAt,
      photoMediaId: initialFinishPhotoMediaId,
    };

    onWorkoutComplete?.(draft);
  }

  return {
    elapsedSeconds,
    isCatalogOpen,
    isFinishingWorkout,
    activeCatalogGroupId,
    catalogDetailExerciseId,
    detailViewSource,
    isWorkoutMenuOpen,
    activeExerciseMenuId,
    exercises,
    finishTitle,
    finishPhotoUrl,
    finishPhotoFile,
    shouldPostWorkout,
    shouldSaveTemplate,
    finishTitleError,
    finishValidationError,
    catalogLoadError,
    totalVolumeKg,
    estimatedCalories,
    exerciseSlideRefs,
    seriesContainerRefs,
    finishPhotoInputRef,
    catalog,
    groupedExercises,
    groupOrder,
    activeCatalogExercise,
    visibleCatalogItems,
    sessionGroups,
    defaultFinishTitle,
    selectedCatalogIds,
    isLoadingCatalog,
    catalogError,
    setIsCatalogOpen,
    setIsFinishingWorkout,
    setActiveCatalogGroupId,
    setCatalogDetailExerciseId,
    setDetailViewSource,
    setIsWorkoutMenuOpen,
    setActiveExerciseMenuId,
    setFinishTitle,
    setFinishPhotoUrl,
    setFinishPhotoFile,
    setShouldPostWorkout,
    setShouldSaveTemplate,
    setFinishTitleError,
    setFinishValidationError,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    openFinishWorkout,
    handleFinishWorkout,
  };
}
