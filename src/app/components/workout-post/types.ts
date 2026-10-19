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
  // Sessao que originou o post. Apagar o treino opera sobre a sessao, nao sobre
  // o post, entao o card precisa dos dois identificadores.
  workoutSessionId?: string;
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
  commentsCount?: number;
}

export interface WorkoutPostAuthor {
  name: string;
  initials: string;
  avatarUrl?: string | null;
  isDeveloper?: boolean;
  onClick?: () => void;
}
