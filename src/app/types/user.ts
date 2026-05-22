export interface UserProfile {
  id: string;
  displayName: string;
  username: string;
  email: string;
  weight: number | null;
  bio: string;
  avatarUrl: string | null;
  weeklyGoal: number | null;
  cards: number;
  streak: number;
  totalWorkouts: number;
}

export type UserProfileUpdate = Partial<
  Pick<UserProfile, "displayName" | "bio" | "weight" | "avatarUrl">
>;
