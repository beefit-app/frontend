export interface ProfileData {
  displayName: string;
  username: string;
  bio: string;
  cards: number;
  streak: number;
  totalWorkouts: number;
  weight: number;
  avatarUrl: string | null;
}

export interface AccountSettingsData {
  ghostModeEnabled: boolean;
}

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
  id: number;
  author: string;
  text: string;
  timeAgo: string;
}

export interface WorkoutPost {
  id: number;
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

export type ProfileScreenMode = "view" | "edit" | "account";

export interface ProfileScreenProps {
  accountSettings?: AccountSettingsData;
  onAccountSettingsChange?: (data: AccountSettingsData) => void;
}
