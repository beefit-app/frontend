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
  startedAt = null,
  selectedGroups,
  initialExercises = [],
  initialSessionExercises,
  bodyWeightKg,
  ghostModeEnabled = false,
  onWorkoutComplete,
  onSessionGroupsChange,
  onDraftChange,
}: Pick<
  ActiveWorkoutScreenProps,
  | "selectedGroups"
  | "workoutId"
  | "startedAt"
  | "initialExercises"
  | "initialSessionExercises"
  | "bodyWeightKg"
  | "ghostModeEnabled"
  | "onWorkoutComplete"
  | "onSessionGroupsChange"
  | "onDraftChange"
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
  const [finishPhotoFile, setFinishPhotoFile] = useState<File | null>(null);
  const [shouldPostWorkout, setShouldPostWorkout] = useState(!ghostModeEnabled);
  const [finishTitleError, setFinishTitleError] = useState("");
  const [finishValidationError, setFinishValidationError] = useState("");
  const [pendingExerciseFocusId, setPendingExerciseFocusId] = useState<string | null>(null);
  const [pendingSetFocusExerciseId, setPendingSetFocusExerciseId] = useState<string | null>(null);
  const exerciseSlideRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const seriesContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const finishPhotoInputRef = useRef<HTMLInputElement>(null);

  const catalog = useMemo(() => workoutService.getCatalog(), []);
  const groupedExercises = useMemo(() => workoutService.getGroupedCatalog(), []);
  const groupOrder = useMemo(() => workoutService.getGroupOrder(), []);
  const activeCatalogExercise = useMemo(
    () => workoutService.getCatalogItemById(catalogDetailExerciseId),
    [catalogDetailExerciseId],
  );
  const visibleCatalogItems = useMemo(
    () => workoutService.getCatalogByGroupId(activeCatalogGroupId),
    [activeCatalogGroupId],
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
    const updateElapsed = () => {
      if (startedAt) {
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
        return;
      }
      setElapsedSeconds((current) => current + 1);
    };
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

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
    onDraftChange?.({ exercises, selectedGroups: sessionGroups });
  }, [exercises, onDraftChange, sessionGroups]);

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
      photoFile: finishPhotoFile,
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
    finishPhotoFile,
    shouldPostWorkout,
    finishTitleError,
    finishValidationError,
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
    setFinishPhotoFile,
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
