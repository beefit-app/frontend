export type Rarity = "lendaria" | "epica" | "rara" | "comum";

export interface ExerciseSet {
  weight: number;
  reps: number;
}

export interface ExerciseDetail {
  name: string;
  sets: ExerciseSet[];
  isPersonalRecord?: boolean;
}

export interface Comment {
  id: string | number;
  author: string;
  text: string;
  timeAgo: string;
}

export interface WorkoutPost {
  // A API devolve UUID; os mocks locais ainda usam numero sequencial.
  id: string | number;
  date: string;
  title: string;
  duration: string;
  rarity: Rarity;
  muscles: string[];
  emoji: string;
  photoUrl: string | null;
  exerciseDetails: ExerciseDetail[];
  likes: number;
  liked: boolean;
  templateSaved: boolean;
  comments: Comment[];
}

export interface WorkoutPostAuthor {
  name: string;
  initials: string;
  avatarUrl?: string | null;
  onClick?: () => void;
}
