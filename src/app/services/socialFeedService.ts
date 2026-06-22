import { apiClient } from "./apiClient";
import type { SocialFeedPost } from "../components/social-feed/types";

interface ApiPost { postId: string; username: string; publishedAt: string; totalLikes: number; likedByCurrentUser: boolean; title?: string | null; photoUrl?: string | null; durationSeconds: number; bodyHeatMap: string[]; exercises: { exerciseName: string; sets: { weightKg: number; reps: number }[] }[] }
function initials(username: string) { return username.slice(0, 2).toUpperCase(); }
function toPost(post: ApiPost): SocialFeedPost {
  return { id: post.postId, author: post.username, username: `@${post.username}`, initials: initials(post.username), bodyWeight: 0,
    date: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(post.publishedAt)), title: post.title || "Treino concluído",
    duration: `${Math.floor((post.durationSeconds ?? 0) / 60)} min`, rarity: "comum", muscles: post.bodyHeatMap, emoji: "💪", photoUrl: post.photoUrl ?? null,
    exerciseDetails: post.exercises.map((exercise) => ({ name: exercise.exerciseName, sets: exercise.sets.map((set) => ({ weight: set.weightKg, reps: set.reps })) })),
    likes: post.totalLikes, liked: post.likedByCurrentUser, templateSaved: false, comments: [] };
}
export const socialFeedService = {
  async load(page = 0) { const response = await apiClient.get<{ content?: ApiPost[]; last?: boolean }>(`/api/posts/feed?page=${page}&size=10`, { auth: true }); return { posts: (response.content ?? []).map(toPost), last: response.last ?? true }; },
  async toggleLike(postId: string | number) { return apiClient.post<{ liked: boolean; likes_count: number }>(`/api/posts/${postId}/like`, undefined, { auth: true }); },
  async importTemplate(postId: string | number) { return apiClient.post(`/api/templates/import/${postId}`, undefined, { auth: true }); },
};
