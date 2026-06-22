import type { WorkoutPost } from "../components/profile/types";
import { sessionStorage } from "../storage/sessionStorage";
import type { AuthUser } from "../types/auth";
import type { UserProfile, UserProfileUpdate } from "../types/user";
import { apiClient } from "./apiClient";

const LEGACY_PROFILE_STORAGE_KEY = "beefit.profile.current";

interface BackendProfileResponse {
  fullName: string;
  username: string;
  biography: string | null;
  profilePicture: string | null;
  bodyWeight?: number | null;
  ghostMode?: boolean | null;
  offensiveHoneys?: number | null;
  cardsCount?: number | null;
  totalWorkouts?: number | null;
}

interface UpdateProfileRequest {
  fullName: string;
  biography: string;
  bodyWeight: number | null;
  profilePicture: string | null;
}

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function clearLegacyProfileDraft() {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
}

function buildFallbackProfile(): UserProfile {
  return {
    id: "profile-local",
    displayName: "Alex Ferreira",
    username: "@alexfit",
    email: "alexfit@beefit.local",
    bio: "Entusiasta de musculação e calistenia 🏋️‍♂️ | Treinando há 3 anos | Rumo ao físico dos sonhos!",
    cards: 47,
    streak: 15,
    totalWorkouts: 312,
    weight: 82.5,
    avatarUrl: null,
    weeklyGoal: 4,
    ghostModeEnabled: false,
  };
}

function normalizeUsername(username: string | null | undefined) {
  if (!username?.trim()) return "@beefit";
  return `@${username.replace(/^@/, "").trim()}`;
}

function buildBaseProfile(authUser: AuthUser | null): UserProfile {
  if (!authUser) {
    return buildFallbackProfile();
  }

  return {
    id: authUser.id || "profile-auth-user",
    displayName: authUser.name,
    username: normalizeUsername(authUser.username),
    email: authUser.email,
    bio: "",
    avatarUrl: null,
    weight: authUser.weight ?? 75,
    weeklyGoal: authUser.weeklyGoal ?? 4,
    ghostModeEnabled: false,
    cards: 47,
    streak: 15,
    totalWorkouts: 312,
  };
}

function mergeProfile(baseProfile: UserProfile, response: BackendProfileResponse): UserProfile {
  return {
    ...baseProfile,
    displayName: response.fullName?.trim() || baseProfile.displayName,
    username: normalizeUsername(response.username),
    bio: response.biography ?? "",
    avatarUrl: response.profilePicture ?? null,
    weight: typeof response.bodyWeight === "number" ? response.bodyWeight : baseProfile.weight,
    ghostModeEnabled:
      typeof response.ghostMode === "boolean"
        ? response.ghostMode
        : baseProfile.ghostModeEnabled,
    cards: typeof response.cardsCount === "number" ? response.cardsCount : baseProfile.cards,
    streak:
      typeof response.offensiveHoneys === "number"
        ? response.offensiveHoneys
        : baseProfile.streak,
    totalWorkouts:
      typeof response.totalWorkouts === "number"
        ? response.totalWorkouts
        : baseProfile.totalWorkouts,
  };
}

function buildUpdatePayload(currentProfile: UserProfile, update: UserProfileUpdate): UpdateProfileRequest {
  return {
    fullName: update.displayName?.trim() || currentProfile.displayName,
    biography: update.bio ?? currentProfile.bio,
    bodyWeight:
      typeof update.weight === "number"
        ? update.weight
        : currentProfile.weight,
    profilePicture: update.avatarUrl ?? currentProfile.avatarUrl,
  };
}

async function persistAuthUserUpdate(authUser: AuthUser | null, nextProfile: UserProfile) {
  if (!authUser) return;

  await sessionStorage.setUser({
    ...authUser,
    name: nextProfile.displayName,
    weight: nextProfile.weight,
  });
}

export const profileService = {
  getProfileFallback(authUser: AuthUser | null): UserProfile {
    clearLegacyProfileDraft();
    return buildBaseProfile(authUser);
  },

  async getProfile(authUser: AuthUser | null): Promise<UserProfile> {
    const baseProfile = this.getProfileFallback(authUser);
    const response = await apiClient.get<BackendProfileResponse>("/api/profile/me", { auth: true });
    return mergeProfile(baseProfile, response);
  },

  async saveProfile(
    authUser: AuthUser | null,
    currentProfile: UserProfile,
    update: UserProfileUpdate,
  ): Promise<UserProfile> {
    const payload = buildUpdatePayload(currentProfile, update);
    await apiClient.put("/api/profile/me", payload, { auth: true });

    const nextProfile: UserProfile = {
      ...currentProfile,
      displayName: payload.fullName,
      bio: payload.biography,
      weight: payload.bodyWeight,
      avatarUrl: payload.profilePicture,
    };

    await persistAuthUserUpdate(authUser, nextProfile);
    return nextProfile;
  },
  async uploadProfilePhoto(file: File) {
    const formData = new FormData();
    formData.append("file", file, file.name || "profile-photo.jpg");
    const response = await apiClient.post<{ url: string }>("/api/media/profile-photo", formData, { auth: true });
    return response.url;
  },
  async getRecentPosts(): Promise<WorkoutPost[]> {
    const response = await apiClient.get<{ content?: Array<{ postId: string; title?: string; publishedAt: string; totalLikes: number; likedByCurrentUser: boolean; photoUrl?: string | null; durationSeconds: number; bodyHeatMap: string[]; exercises: Array<{ exerciseName: string; sets: Array<{ weightKg: number; reps: number }> }> }> }>("/api/profile/me/posts?size=10", { auth: true });
    return (response.content ?? []).map((post) => ({ id: post.postId, title: post.title || "Treino concluído", date: new Date(post.publishedAt).toLocaleDateString("pt-BR"), duration: `${Math.floor(post.durationSeconds / 60)} min`, rarity: "comum", muscles: post.bodyHeatMap, emoji: "💪", photoUrl: post.photoUrl ?? null, exerciseDetails: post.exercises.map((exercise) => ({ name: exercise.exerciseName, sets: exercise.sets.map((set) => ({ weight: set.weightKg, reps: set.reps })) })), likes: post.totalLikes, liked: post.likedByCurrentUser, templateSaved: false, comments: [] }));
  },
  async getTrainedDays(month = new Date()) {
    const monthValue = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    return apiClient.get<number[]>(`/api/profile/me/training-days?month=${monthValue}`, { auth: true });
  },
};
