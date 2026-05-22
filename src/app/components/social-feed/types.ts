import type { WorkoutPost } from "../workout-post";

export interface SocialFeedPost extends WorkoutPost {
  author: string;
  username: string;
  initials: string;
  bodyWeight: number;
}

export interface LiveFriend {
  id: number;
  name: string;
  initials: string;
  photoUrl: string | null;
  groups: string[];
  elapsedSeconds: number;
}
