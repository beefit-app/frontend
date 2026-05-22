import type { ExerciseCatalogItem, WorkoutCompletionDraft, WorkoutExercise } from "../../types/workout";

export interface ActiveWorkoutScreenProps {
  title: string;
  subtitle: string;
  selectedGroups: string[];
  initialExercises?: ExerciseCatalogItem[];
  bodyWeightKg?: number | null;
  ghostModeEnabled?: boolean;
  onBack: () => void;
  onWorkoutComplete?: (draft: WorkoutCompletionDraft) => void;
  onSessionGroupsChange?: (groups: string[]) => void;
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
