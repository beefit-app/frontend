import { useEffect, useMemo, useRef, useState } from "react";
import { workoutService } from "../../../services/workoutService";
import { workoutDraftStorage } from "../../../storage/workoutDraftStorage";
import type { ExerciseCatalogItem, WorkoutCompletionDraft, WorkoutExercise } from "../../../types/workout";
import type { ActiveWorkoutScreenProps, DetailViewSource } from "../types";
import {
  calculateEstimatedCalories,
  calculateWorkoutVolume,
  createExerciseCard,
  createSet,
} from "../utils";

export function useActiveWorkoutSession({
  workoutId = null,
  userId = null,
  startedAt = null,
  selectedGroups,
  initialExercises = [],
  initialSessionExercises,
  initialDraft = null,
  bodyWeightKg,
  ghostModeEnabled = false,
  onWorkoutComplete,
  onSessionGroupsChange,
}: Pick<
  ActiveWorkoutScreenProps,
  | "selectedGroups"
  | "workoutId"
  | "userId"
  | "startedAt"
  | "initialExercises"
  | "initialSessionExercises"
  | "initialDraft"
  | "bodyWeightKg"
  | "ghostModeEnabled"
  | "onWorkoutComplete"
  | "onSessionGroupsChange"
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
  const [exercises, setExercises] = useState<WorkoutExercise[]>(() =>
    initialDraft?.exercises && initialDraft.exercises.length > 0
      ? initialDraft.exercises
      : initialSessionExercises && initialSessionExercises.length > 0
      ? initialSessionExercises
      : initialExercises.map((exercise) => createExerciseCard(exercise, { withInitialSet: false })),
  );
  const [finishTitle, setFinishTitle] = useState(initialDraft?.title ?? selectedGroups.join(" & "));
  const [finishPhotoUrl, setFinishPhotoUrl] = useState<string | null>(null);
  const [shouldPostWorkout, setShouldPostWorkout] = useState(initialDraft?.shouldPostWorkout ?? !ghostModeEnabled);
  const [shouldSaveTemplate, setShouldSaveTemplate] = useState(initialDraft?.shouldSaveTemplate ?? false);
  const [finishTitleError, setFinishTitleError] = useState("");
  const [finishValidationError, setFinishValidationError] = useState("");
  const [catalog, setCatalog] = useState(() => workoutService.getCatalog());
  const [catalogLoadError, setCatalogLoadError] = useState("");
  const [pendingExerciseFocusId, setPendingExerciseFocusId] = useState<string | null>(null);
  const [pendingSetFocusExerciseId, setPendingSetFocusExerciseId] = useState<string | null>(null);
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

  useEffect(() => {
    onSessionGroupsChange?.(sessionGroups);
  }, [onSessionGroupsChange, sessionGroups]);

  useEffect(() => {
    if (!userId || !workoutId) return;

    const draft = {
      userId,
      workoutId,
      title: finishTitle.trim() || defaultFinishTitle,
      selectedGroups: sessionGroups,
      exercises,
      shouldPostWorkout,
      shouldSaveTemplate,
      updatedAt: new Date().toISOString(),
    };

    void workoutDraftStorage.saveDraft(draft);
  }, [
    defaultFinishTitle,
    exercises,
    finishTitle,
    sessionGroups,
    shouldPostWorkout,
    shouldSaveTemplate,
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

    setExercises((current) => [...current, newExercise]);
    setPendingExerciseFocusId(newExercise.id);
    setCatalogDetailExerciseId(null);
    setDetailViewSource("catalog");
    setIsCatalogOpen(false);
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
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) => (set.id === setId ? { ...set, [field]: value } : set)),
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

    const draft: WorkoutCompletionDraft = {
      workoutId,
      title: finishTitle.trim(),
      photoUrl: finishPhotoUrl,
      shouldPostWorkout,
      shouldSaveTemplate,
      selectedGroups: sessionGroups,
      elapsedSeconds,
      exercises,
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
    exercises,
    finishTitle,
    finishPhotoUrl,
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
    setIsCatalogOpen,
    setIsFinishingWorkout,
    setActiveCatalogGroupId,
    setCatalogDetailExerciseId,
    setDetailViewSource,
    setIsWorkoutMenuOpen,
    setFinishTitle,
    setFinishPhotoUrl,
    setShouldPostWorkout,
    setShouldSaveTemplate,
    setFinishTitleError,
    setFinishValidationError,
    addExercise,
    addSet,
    updateSet,
    openFinishWorkout,
    handleFinishWorkout,
  };
}
