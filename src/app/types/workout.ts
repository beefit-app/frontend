export interface ExerciseCatalogItem {
  id: string;
  name: string;
  group: string;
  groupId: string;
  notes: string;
  lastPerformed: string;
  bestWeight: string;
  lastWeight: string;
  anatomicalMuscles?: string[];
}

export interface WorkoutSet {
  id: string;
  backendId?: string | null;
  weight: string;
  reps: string;
}

export interface WorkoutExercise {
  id: string;
  sessionExerciseId?: string | null;
  catalogId: string;
  name: string;
  group: string;
  groupId: string;
  anatomicalMuscles?: string[];
  sets: WorkoutSet[];
}

export interface WorkoutCompletionDraft {
  workoutId?: string | null;
  title: string;
  photoUrl: string | null;
  photoFile?: File | null;
  shouldPostWorkout: boolean;
  shouldSaveTemplate: boolean;
  selectedGroups: string[];
  elapsedSeconds: number;
  exercises: WorkoutExercise[];
  idempotencyKey: string;
  finishedAt: string;
  photoMediaId?: string | null;
}

export interface WorkoutDraft {
  userId: string;
  workoutId: string;
  title: string;
  selectedGroups: string[];
  exercises: WorkoutExercise[];
  shouldPostWorkout: boolean;
  shouldSaveTemplate?: boolean;
  updatedAt: string | number;
  startedAt?: number;
  // Estado da finalizacao offline: o rascunho sobrevive ao fechamento do app e
  // e retomado por WorkoutStartScreen quando ha conexao e sessao valida.
  pendingFinish?: boolean;
  idempotencyKey?: string;
  finishedAt?: string;
  photoUrl?: string | null;
  photoFileName?: string | null;
  photoMediaId?: string | null;
}

export interface WorkoutCompletionSummary {
  workoutId: string;
  durationSeconds: number;
  estimatedCalories: number;
  totalVolume: number;
}

export interface WorkoutCard {
  id: string;
  attackPower: number;
  rarity: string;
  muscleGroup: string;
  isPersonalRecord: boolean;
}

export interface WorkoutCompletionResult extends WorkoutCompletionSummary {
  card: WorkoutCard | null;
}

export interface WorkoutRecoveryResult extends WorkoutCompletionResult {
  status: string;
  startedAt: number;
  muscleGroups: string[];
  exercises: WorkoutExercise[];
}

export interface MuscleGroupOption {
  id: string;
  label: string;
  description: string;
  accent: string;
  glow: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  groups: string[];
  duration: string;
  exercises: number;
  exerciseIds: string[];
}
