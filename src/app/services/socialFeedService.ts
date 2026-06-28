import { ApiError, apiClient } from "./apiClient";
import type { LiveFriend, SocialFeedPost } from "../components/social-feed/types";
import { normalizeMuscleGroupLabels } from "./muscleGroups";

interface ApiPost { postId: string; username: string; userProfilePicture?: string | null; publishedAt: string; totalLikes: number; likedByCurrentUser: boolean; title?: string | null; photoUrl?: string | null; durationSeconds: number; bodyHeatMap: string[]; exercises: { exerciseName: string; sets: { weightKg: number; reps: number }[] }[] }
interface ApiLiveWorkout { workoutId: string; userId: string; username: string; fullName: string; status: string; occurredAt: string; muscleGroups: string[] }
function initials(username: string) { return username.slice(0, 2).toUpperCase(); }
function toPost(post: ApiPost): SocialFeedPost {
  return { id: post.postId, author: post.username, username: `@${post.username}`, initials: initials(post.username), bodyWeight: 0,
    date: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(post.publishedAt)), title: post.title || "Treino concluído",
    duration: `${Math.floor((post.durationSeconds ?? 0) / 60)} min`, rarity: "comum", muscles: normalizeMuscleGroupLabels(post.bodyHeatMap), emoji: "💪", photoUrl: post.photoUrl ?? null,
    exerciseDetails: post.exercises.map((exercise) => ({ name: exercise.exerciseName, sets: exercise.sets.map((set) => ({ weight: set.weightKg, reps: set.reps })) })),
    authorAvatarUrl: post.userProfilePicture ?? null, likes: post.totalLikes, liked: post.likedByCurrentUser, templateSaved: false, comments: [] };
}
function toLiveFriend(item: ApiLiveWorkout): LiveFriend {
  return {
    id: item.userId,
    name: item.fullName,
    initials: item.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join(""),
    photoUrl: null,
    groups: normalizeMuscleGroupLabels(item.muscleGroups),
    elapsedSeconds: Math.max(0, Math.floor((Date.now() - new Date(item.occurredAt).getTime()) / 1000)),
  };
}
export const socialFeedService = {
  async load(page = 0) {
    try {
      const response = await apiClient.get<{ content?: ApiPost[]; last?: boolean }>(`/api/posts/feed?page=${page}&size=10`, { auth: true });
      return { posts: (response.content ?? []).map(toPost), last: response.last ?? true };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new Error("Não foi possível carregar o feed com a sessão atual.");
      }
      throw error;
    }
  },
  async loadLive() {
    try {
      const response = await apiClient.get<ApiLiveWorkout[]>("/api/social/live", { auth: true });
      return response.map(toLiveFriend);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return [];
      }
      throw error;
    }
  },
  async toggleLike(postId: string | number) { return apiClient.post<{ liked: boolean; likes_count: number }>(`/api/posts/${postId}/like`, undefined, { auth: true }); },
  async importTemplate(postId: string | number) { return apiClient.post(`/api/templates/import/${postId}`, undefined, { auth: true }); },
};
