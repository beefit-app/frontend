import { apiClient } from "./apiClient";
import type { PostComment } from "../types/comments";
import type { CreateCommentRequest } from "../types/api";

interface ApiComment extends PostComment { avatarUrl: string | null }
interface CommentPage { content: ApiComment[]; last: boolean; number: number; totalElements: number }
const listeners = new Set<(postId: string) => void>();

function changed(postId: string) {
  listeners.forEach((listener) => listener(postId));
}

export const commentService = {
  invalidate: changed,
  async list(postId: string, page = 0) {
    const result = await apiClient.get<CommentPage>(`/api/posts/${postId}/comments?page=${page}&size=20`, { auth: true });
    return { ...result, content: result.content.map((comment): PostComment => ({ ...comment, avatarUrl: comment.avatarUrl ?? null })) };
  },
  count(postId: string) {
    return apiClient.get<number>(`/api/posts/${postId}/comments/count`, { auth: true });
  },
  async create(postId: string, text: string) {
    const body: CreateCommentRequest = { text };
    const result = await apiClient.post<ApiComment>(`/api/posts/${postId}/comments`, body, { auth: true });
    changed(postId);
    return result;
  },
  async remove(postId: string, commentId: string) {
    await apiClient.delete(`/api/posts/${postId}/comments/${commentId}`, undefined, { auth: true });
    changed(postId);
  },
  subscribe(listener: (postId: string) => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};
