export type { WorkoutPost } from "../workout-post";
export type { UserProfile as ProfileData } from "../../types/user";

export interface AccountSettingsData {
  ghostModeEnabled: boolean;
}

export interface AccountSettingsSaveInput extends AccountSettingsData {
  currentPassword?: string;
  newPassword?: string;
}

export type ProfileScreenMode = "view" | "edit" | "account";

export interface ProfileScreenProps {
  accountSettings?: AccountSettingsData;
  onAccountSettingsChange?: (data: AccountSettingsData) => void;
  onWorkoutDeleted?: () => void;
}
