export interface ExerciseCatalogItem {
  id: string;
  name: string;
  group: string;
  groupId: string;
  notes: string;
  lastPerformed: string;
  bestWeight: string;
  lastWeight: string;
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
  sets: WorkoutSet[];
}

export interface WorkoutCompletionDraft {
  workoutId?: string | null;
  title: string;
  photoUrl: string | null;
  photoFile?: File | null;
  shouldPostWorkout: boolean;
  selectedGroups: string[];
  elapsedSeconds: number;
  exercises: WorkoutExercise[];
  idempotencyKey: string;
  finishedAt: string;
  photoMediaId?: string | null;
}

export interface PersistedWorkoutDraft {
  workoutId: string;
  startedAt: number;
  selectedGroups: string[];
  exercises: WorkoutExercise[];
  title: string;
  shouldPostWorkout: boolean;
  photoUrl: string | null;
  photoFileName: string | null;
  pendingFinish: boolean;
  idempotencyKey?: string;
  finishedAt?: string;
  photoMediaId?: string | null;
  updatedAt: number;
}

export interface WorkoutCompletionResult {
  id: string;
  durationSeconds: number | null;
  estimatedCalories: number | null;
  totalVolume: number | null;
  card: {
    id: string;
    attackPower: number;
    rarity: string;
    muscleGroup: string;
    muscleIntensities: Record<string, number>;
    isPersonalRecord: boolean;
  } | null;
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
