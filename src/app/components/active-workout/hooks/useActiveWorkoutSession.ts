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
  catalogRevision = 0,
  workoutId = null,
  startedAt = null,
  selectedGroups,
  initialExercises = [],
  initialSessionExercises,
  initialFinishPhotoFile = null,
  bodyWeightKg,
  ghostModeEnabled = false,
  onWorkoutComplete,
  onSessionGroupsChange,
  onDraftChange,
}: Pick<
  ActiveWorkoutScreenProps,
  | "selectedGroups"
  | "catalogRevision"
  | "workoutId"
  | "startedAt"
  | "initialExercises"
  | "initialSessionExercises"
  | "initialFinishPhotoFile"
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
  const [activeExerciseMenuId, setActiveExerciseMenuId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(() =>
    initialSessionExercises && initialSessionExercises.length > 0
      ? initialSessionExercises
      : initialExercises.map((exercise) => createExerciseCard(exercise, { withInitialSet: false })),
  );
  const [finishTitle, setFinishTitle] = useState(selectedGroups.join(" & "));
  const [finishPhotoUrl, setFinishPhotoUrl] = useState<string | null>(() => initialFinishPhotoFile ? URL.createObjectURL(initialFinishPhotoFile) : null);
  const [finishPhotoFile, setFinishPhotoFile] = useState<File | null>(initialFinishPhotoFile);
  const [shouldPostWorkout, setShouldPostWorkout] = useState(!ghostModeEnabled);
  const [finishTitleError, setFinishTitleError] = useState("");
  const [finishValidationError, setFinishValidationError] = useState("");
  const [pendingExerciseFocusId, setPendingExerciseFocusId] = useState<string | null>(null);
  const [pendingSetFocusExerciseId, setPendingSetFocusExerciseId] = useState<string | null>(null);
  const [catalogItems, setCatalogItems] = useState<ExerciseCatalogItem[]>(() => workoutService.getCatalog());
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const exerciseSlideRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const seriesContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const finishPhotoInputRef = useRef<HTMLInputElement>(null);

  const catalog = catalogItems;
  const groupedExercises = useMemo(() => workoutService.getGroupedCatalog(), [catalogItems]);
  const groupOrder = useMemo(() => workoutService.getGroupOrder(), []);
  const activeCatalogExercise = useMemo(
    () => workoutService.getCatalogItemById(catalogDetailExerciseId),
    [catalogDetailExerciseId, catalogItems],
  );
  const visibleCatalogItems = useMemo(
    () => workoutService.getCatalogByGroupId(activeCatalogGroupId),
    [activeCatalogGroupId, catalogItems],
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
    setCatalogItems(workoutService.getCatalog());
  }, [catalogRevision]);

  useEffect(() => {
    if (!isCatalogOpen) return;
    if (workoutService.hasCatalogLoaded()) {
      setCatalogItems(workoutService.getCatalog());
      setCatalogError(null);
      return;
    }

    let active = true;
    setIsLoadingCatalog(true);
    setCatalogError(null);

    void workoutService
      .loadCatalog()
      .then((catalogResponse) => {
        if (!active) return;
        setCatalogItems(catalogResponse);
      })
      .catch((error) => {
        if (!active) return;
        setCatalogError(error instanceof Error ? error.message : "Não foi possível carregar os exercícios.");
      })
      .finally(() => {
        if (!active) return;
        setIsLoadingCatalog(false);
      });

    return () => {
      active = false;
    };
  }, [isCatalogOpen]);

  useEffect(() => {
    if (catalogItems.length === 0) return;
    if (activeCatalogGroupId === "todos") return;
    const currentGroupHasItems = catalogItems.some((exercise) => exercise.groupId === activeCatalogGroupId);
    if (currentGroupHasItems) return;

    const firstAvailableGroupId = groupedExercises.find((group) => group.items.length > 0)?.groupId;
    if (firstAvailableGroupId) {
      setActiveCatalogGroupId(firstAvailableGroupId);
    }
  }, [activeCatalogGroupId, catalogItems, groupedExercises]);

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
    activeExerciseMenuId,
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
