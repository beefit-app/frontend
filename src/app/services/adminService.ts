import { apiClient } from "./apiClient";
import type {
  ReportReason,
  ReportResolutionAction,
  ReportStatus,
  ReportTargetType,
  ResolveReportRequest,
  UpdatePostMetadataRequest,
} from "../types/api";

export interface AdminDashboardMetrics {
  totalActiveUsers: number;
  workoutsLast24Hours: number;
  totalVolumeLifted: number | null;
}

export interface AdminUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  bodyWeight: number | null;
  weeklyGoal: number | null;
  banned: boolean;
  bannedUntil: string | null;
}

export interface AdminBanResponse {
  userId: string;
  username: string;
  banned: boolean;
  banDays: number;
  bannedUntil: string | null;
}

export interface AdminPost {
  id: string;
  userId: string;
  username: string;
  userFullName: string;
  title: string | null;
  publishedAt: string;
  totalLikes: number;
  removed: boolean;
  durationSeconds: number | null;
  totalVolume: number | null;
}

export interface AdminReport {
  id: string;
  reporterId: string;
  reporterUsername: string;
  targetType: ReportTargetType;
  targetId: string;
  targetPostTitle: string | null;
  targetOwnerId: string;
  targetOwnerUsername: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
}

export interface AdminReportResolution {
  reportId: string;
  action: ReportResolutionAction;
  status: ReportStatus;
  closedReports: number;
}

export interface AdminPage<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

function normalizePage<T>(response: Partial<AdminPage<T>>): AdminPage<T> {
  return {
    content: response.content ?? [],
    number: response.number ?? 0,
    size: response.size ?? response.content?.length ?? 0,
    totalElements: response.totalElements ?? response.content?.length ?? 0,
    totalPages: response.totalPages ?? 1,
    first: response.first ?? (response.number ?? 0) === 0,
    last: response.last ?? true,
  };
}

export const adminService = {
  async getDashboard() {
    return apiClient.get<AdminDashboardMetrics>("/api/admin/dashboard", { auth: true });
  },

  async getUsers(search: string, page: number, size = 10) {
    const params = new URLSearchParams({
      search,
      page: String(page),
      size: String(size),
    });
    const response = await apiClient.get<Partial<AdminPage<AdminUser>>>(`/api/admin/users?${params}`, { auth: true });
    return normalizePage(response);
  },

  async banUser(userId: string, banDays: number) {
    const params = new URLSearchParams({ banDays: String(banDays) });
    return apiClient.patch<AdminBanResponse>(`/api/admin/users/${userId}/ban?${params}`, undefined, { auth: true });
  },

  async unbanUser(userId: string) {
    return apiClient.patch<AdminBanResponse>(`/api/admin/users/${userId}/unban`, undefined, { auth: true });
  },

  async getPosts(page: number, size = 10) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      sort: "publishedAt,desc",
    });
    const response = await apiClient.get<Partial<AdminPage<AdminPost>>>(`/api/admin/posts?${params}`, { auth: true });
    return normalizePage(response);
  },

  async updatePostTitle(postId: string, title: string) {
    return apiClient.patch(`/api/admin/posts/${postId}`, { newTitle: title } satisfies UpdatePostMetadataRequest, { auth: true });
  },

  async removePost(postId: string) {
    return apiClient.delete(`/api/admin/posts/${postId}`, undefined, { auth: true });
  },

  async getReports(status: ReportStatus, page: number, size = 10) {
    const params = new URLSearchParams({
      status,
      page: String(page),
      size: String(size),
      sort: "createdAt,desc",
    });
    const response = await apiClient.get<Partial<AdminPage<AdminReport>>>(`/api/admin/reports?${params}`, { auth: true });
    return normalizePage(response);
  },

  async resolveReport(reportId: string, action: ReportResolutionAction, banDays?: number) {
    return apiClient.post<AdminReportResolution>(
      `/api/admin/reports/${reportId}/resolve`,
      { action, banDays } satisfies ResolveReportRequest,
      { auth: true },
    );
  },
};
