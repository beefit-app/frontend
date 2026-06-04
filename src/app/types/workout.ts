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
  shouldPostWorkout: boolean;
  shouldSaveTemplate: boolean;
  selectedGroups: string[];
  elapsedSeconds: number;
  exercises: WorkoutExercise[];
}

export interface WorkoutDraft {
  userId: string;
  workoutId: string;
  title: string;
  selectedGroups: string[];
  exercises: WorkoutExercise[];
  shouldPostWorkout: boolean;
  shouldSaveTemplate: boolean;
  updatedAt: string;
}

export interface WorkoutCompletionSummary {
  workoutId: string;
  durationSeconds: number;
  estimatedCalories: number;
  totalVolume: number;
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
