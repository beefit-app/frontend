export type { WorkoutPost } from "../workout-post";

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

export type ProfileScreenMode = "view" | "edit" | "account";

export interface ProfileScreenProps {
  accountSettings?: AccountSettingsData;
  onAccountSettingsChange?: (data: AccountSettingsData) => void;
}
