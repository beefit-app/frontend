export interface UserProfile {
  id: string;
  displayName: string;
  username: string;
  email: string;
  weight: number | null;
  bio: string;
  avatarUrl: string | null;
  weeklyGoal: number | null;
  ghostModeEnabled?: boolean;
  cards: number;
  streak: number;
  totalWorkouts: number;
  isDeveloper?: boolean;
}

export type PublicProfileRelationshipStatus = "SELF" | "FRIEND" | "NONE" | "REQUEST_SENT" | "REQUEST_RECEIVED";

export interface PublicUserProfile extends UserProfile {
  userId: string;
  relationshipStatus: PublicProfileRelationshipStatus;
  friendshipId: string | null;
}

export type UserProfileUpdate = Partial<
  Pick<UserProfile, "displayName" | "bio" | "weight" | "avatarUrl">
>;
