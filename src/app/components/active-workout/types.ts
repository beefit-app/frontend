import type { ExerciseCatalogItem, WorkoutCompletionDraft, WorkoutDraft, WorkoutExercise } from "../../types/workout";

export interface ActiveWorkoutScreenProps {
  workoutId?: string | null;
  userId?: string | null;
  startedAt?: number | null;
  title: string;
  subtitle: string;
  selectedGroups: string[];
  initialExercises?: ExerciseCatalogItem[];
  initialSessionExercises?: WorkoutExercise[];
  initialDraft?: WorkoutDraft | null;
  catalogRevision?: number;
  bodyWeightKg?: number | null;
  ghostModeEnabled?: boolean;
  // Estado de uma finalizacao ja iniciada e retomada do armazenamento local. A
  // chave, o carimbo e o mediaId precisam ser reaproveitados intactos: o backend
  // recusa a mesma Idempotency-Key com corpo divergente.
  initialFinishPhotoFile?: File | null;
  initialFinishIdempotencyKey?: string | null;
  initialFinishFinishedAt?: string | null;
  initialFinishPhotoMediaId?: string | null;
  initialFinishTitle?: string | null;
  initialShouldPostWorkout?: boolean;
  pendingFinish?: boolean;
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
  shouldSaveTemplate: boolean;
  finishTitleError: string;
  finishValidationError: string;
  totalVolumeKg: number;
  estimatedCalories: number;
}
