import { useEffect, useMemo, useRef, useState } from "react";
import { workoutService } from "../../../services/workoutService";
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
  selectedGroups,
  initialExercises = [],
  initialSessionExercises,
  bodyWeightKg,
  ghostModeEnabled = false,
  onWorkoutComplete,
  onSessionGroupsChange,
}: Pick<
  ActiveWorkoutScreenProps,
  | "selectedGroups"
  | "workoutId"
  | "initialExercises"
  | "initialSessionExercises"
  | "bodyWeightKg"
  | "ghostModeEnabled"
  | "onWorkoutComplete"
  | "onSessionGroupsChange"
>) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isFinishingWorkout, setIsFinishingWorkout] = useState(false);
  const [activeCatalogGroupId, setActiveCatalogGroupId] = useState("peito");
  const [catalogDetailExerciseId, setCatalogDetailExerciseId] = useState<string | null>(null);
  const [detailViewSource, setDetailViewSource] = useState<DetailViewSource>("catalog");
  const [isWorkoutMenuOpen, setIsWorkoutMenuOpen] = useState(false);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(() =>
    initialSessionExercises && initialSessionExercises.length > 0
      ? initialSessionExercises
      : initialExercises.map((exercise) => createExerciseCard(exercise, { withInitialSet: false })),
  );
  const [finishTitle, setFinishTitle] = useState(selectedGroups.join(" & "));
  const [finishPhotoUrl, setFinishPhotoUrl] = useState<string | null>(null);
  const [shouldPostWorkout, setShouldPostWorkout] = useState(!ghostModeEnabled);
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
    const timer = window.setInterval(() => setElapsedSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
    if (!isFinishingWorkout) return;
    setShouldPostWorkout(!ghostModeEnabled);
  }, [ghostModeEnabled, isFinishingWorkout]);

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

    setFinishTitle(defaultFinishTitle);
    setFinishTitleError("");
    setFinishValidationError("");
    setShouldPostWorkout(!ghostModeEnabled);
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
    setFinishTitleError,
    setFinishValidationError,
    addExercise,
    addSet,
    updateSet,
    openFinishWorkout,
    handleFinishWorkout,
  };
}
