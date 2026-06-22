import type { ExerciseCatalogItem, WorkoutCompletionDraft, WorkoutExercise } from "../../types/workout";

export interface ActiveWorkoutScreenProps {
  workoutId?: string | null;
  startedAt?: number | null;
  title: string;
  subtitle: string;
  selectedGroups: string[];
  initialExercises?: ExerciseCatalogItem[];
  initialSessionExercises?: WorkoutExercise[];
  initialFinishPhotoFile?: File | null;
  bodyWeightKg?: number | null;
  ghostModeEnabled?: boolean;
  onBack: () => void;
  onCancelWorkout?: () => Promise<boolean>;
  onSaveTemplate?: (groups: string[], exercises: WorkoutExercise[]) => Promise<boolean>;
  onWorkoutComplete?: (draft: WorkoutCompletionDraft) => void;
  onSessionGroupsChange?: (groups: string[]) => void;
  onDraftChange?: (draft: Pick<WorkoutCompletionDraft, "exercises" | "selectedGroups">) => void;
}

export type DetailViewSource = "catalog" | "session";

export interface ActiveWorkoutSessionState {
  elapsedSeconds: number;
  isCatalogOpen: boolean;
  isFinishingWorkout: boolean;
  activeCatalogGroupId: string;
  catalogDetailExerciseId: string | null;
  detailViewSource: DetailViewSource;
  isWorkoutMenuOpen: boolean;
  exercises: WorkoutExercise[];
  finishTitle: string;
  finishPhotoUrl: string | null;
  shouldPostWorkout: boolean;
  finishTitleError: string;
  finishValidationError: string;
  totalVolumeKg: number;
  estimatedCalories: number;
}
