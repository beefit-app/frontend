export type SocialSection = "friends" | "hives";
export type FriendshipStatus = "friend" | "available" | "sent";
export type HiveRankingPeriod = "Semanal" | "Mensal";

export interface FriendProfile {
  id: string;
  name: string;
  username: string;
  initials: string;
  status: FriendshipStatus;
  friendshipId?: string;
}

export interface FriendRequest {
  id: string;
  profile: FriendProfile;
}

export interface HiveMember {
  id: string;
  name: string;
  username: string;
  initials: string;
  workouts: number;
  honeys: number;
  isCurrentUser?: boolean;
}

export interface Hive {
  id: string;
  name: string;
  period: HiveRankingPeriod;
  inviteCode?: string;
  creatorId: string;
  members: HiveMember[];
}

export interface SocialInitialState {
  friends: FriendProfile[];
  friendRequests: FriendRequest[];
  discoverablePeople: FriendProfile[];
  hives: Hive[];
}
