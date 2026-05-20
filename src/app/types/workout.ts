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
  weight: string;
  reps: string;
}

export interface WorkoutExercise {
  id: string;
  catalogId: string;
  name: string;
  group: string;
  groupId: string;
  sets: WorkoutSet[];
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
