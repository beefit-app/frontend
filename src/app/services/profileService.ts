import type { WorkoutPost } from "../components/profile/types";
import { sessionStorage } from "../storage/sessionStorage";
import type { AuthUser } from "../types/auth";
import type { PublicProfileRelationshipStatus, PublicUserProfile, UserProfile, UserProfileUpdate } from "../types/user";
import { apiClient } from "./apiClient";
import { normalizeMuscleGroupLabels } from "./muscleGroups";

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
  developer?: boolean | null;
}

interface BackendPublicProfileResponse extends BackendProfileResponse {
  userId: string;
  relationshipStatus: PublicProfileRelationshipStatus;
  friendshipId?: string | null;
}

import type { UpdateProfileRequest } from "../types/api";

interface BackendProfilePost {
  postId: string;
  workoutSessionId?: string;
  title?: string;
  publishedAt: string;
  totalLikes?: number;
  likedByCurrentUser?: boolean;
  photoUrl?: string | null;
  durationSeconds?: number | null;
  bodyHeatMap?: string[] | null;
  exercises?: Array<{
    exerciseName: string;
    sets?: Array<{ weightKg: number; reps: number }> | null;
  }> | null;
}

interface BackendProfilePostsPage {
  content?: BackendProfilePost[];
}

function usernameKey(username: string | null | undefined) {
  return username?.replace(/^@/, "").trim().toLowerCase() ?? "";
}

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function clearLegacyProfileDraft() {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
}

function normalizeUsername(username: string | null | undefined) {
  if (!username?.trim()) return "@beefit";
  return `@${username.replace(/^@/, "").trim()}`;
}

function buildBaseProfile(authUser: AuthUser | null): UserProfile {
  return {
    // Este estado é apenas um shell de carregamento derivado da sessão. Métricas
    // e conteúdo do perfil nunca recebem dados demonstrativos: chegam da API.
    id: authUser?.id ?? "",
    displayName: authUser?.name ?? "",
    username: normalizeUsername(authUser?.username),
    email: authUser?.email ?? "",
    bio: "",
    avatarUrl: null,
    weight: authUser?.weight ?? null,
    weeklyGoal: authUser?.weeklyGoal ?? null,
    ghostModeEnabled: false,
    cards: 0,
    streak: 0,
    totalWorkouts: 0,
    isDeveloper: false,
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
    isDeveloper: response.developer === true,
  };
}

function publicProfileFromResponse(response: BackendPublicProfileResponse): PublicUserProfile {
  const username = response.username?.trim() || "usuario";
  return {
    ...mergeProfile(
      {
        id: `profile-${username}`,
        displayName: response.fullName?.trim() || username,
        username: normalizeUsername(username),
        email: "",
        bio: "",
        avatarUrl: null,
        weight: null,
        weeklyGoal: null,
        ghostModeEnabled: false,
        cards: 0,
        streak: 0,
        totalWorkouts: 0,
        isDeveloper: false,
      },
      response,
    ),
    userId: response.userId,
    relationshipStatus: response.relationshipStatus,
    friendshipId: response.friendshipId ?? null,
  };
}

function buildUpdatePayload(currentProfile: UserProfile, update: UserProfileUpdate): UpdateProfileRequest {
  const bodyWeight = typeof update.weight === "number" ? update.weight : currentProfile.weight;

  // UpdateProfileRequestDTO marca bodyWeight como @NotNull: mandar null devolve
  // 400 com a mensagem de peso, num salvamento em que o usuario nem tocou no
  // campo. Todo cadastro exige peso, entao ausencia aqui e perfil ainda nao
  // carregado — e melhor nao salvar do que salvar e falhar no servidor.
  if (typeof bodyWeight !== "number") {
    throw new Error("O peso do perfil ainda não foi carregado; tente novamente em instantes.");
  }

  return {
    fullName: update.displayName?.trim() || currentProfile.displayName,
    biography: update.bio ?? currentProfile.bio,
    bodyWeight,
    // O DTO nao aceita null nesses dois; ausencia se representa omitindo o campo.
    profilePicture: update.avatarUrl ?? currentProfile.avatarUrl ?? undefined,
  };
}

function normalizeProfilePost(post: BackendProfilePost): WorkoutPost {
  const durationSeconds = post.durationSeconds ?? 0;

  return {
    id: post.postId,
    workoutSessionId: post.workoutSessionId,
    title: post.title || "Treino concluído",
    date: new Date(post.publishedAt).toLocaleDateString("pt-BR"),
    duration: `${Math.floor(durationSeconds / 60)} min`,
    rarity: "comum",
    muscles: normalizeMuscleGroupLabels(post.bodyHeatMap),
    emoji: "💪",
    photoUrl: post.photoUrl ?? null,
    exerciseDetails: (post.exercises ?? []).map((exercise) => ({
      name: exercise.exerciseName,
      sets: (exercise.sets ?? []).map((set) => ({
        weight: set.weightKg,
        reps: set.reps,
      })),
    })),
    likes: post.totalLikes ?? 0,
    liked: Boolean(post.likedByCurrentUser),
    templateSaved: false,
    comments: [],
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

  async getProfileByUsername(username: string): Promise<UserProfile> {
    const normalizedUsername = username.replace(/^@/, "").trim();
    const response = await apiClient.get<BackendProfileResponse>(`/api/profile/${encodeURIComponent(normalizedUsername)}`, { auth: true });
    return mergeProfile(
      {
        id: `profile-${normalizedUsername || "friend"}`,
        displayName: response.fullName?.trim() || normalizedUsername,
        username: normalizeUsername(response.username || normalizedUsername),
        email: "",
        bio: "",
        avatarUrl: null,
        weight: null,
        weeklyGoal: null,
        ghostModeEnabled: false,
        cards: 0,
        streak: 0,
        totalWorkouts: 0,
        isDeveloper: false,
      },
      response,
    );
  },

  async getPublicProfile(username: string): Promise<PublicUserProfile> {
    const normalizedUsername = username.replace(/^@/, "").trim();
    const response = await apiClient.get<BackendPublicProfileResponse>(`/api/profile/${encodeURIComponent(normalizedUsername)}`, { auth: true });
    return publicProfileFromResponse(response);
  },

  async saveProfile(
    authUser: AuthUser | null,
    currentProfile: UserProfile,
    update: UserProfileUpdate,
  ): Promise<UserProfile> {
    const payload = buildUpdatePayload(currentProfile, update);
    await apiClient.put("/api/profile/me", payload, { auth: true });

    // O payload omite biography/profilePicture quando vazios; o perfil local usa
    // string e null, entao a conversao acontece aqui em vez de vazar undefined.
    const nextProfile: UserProfile = {
      ...currentProfile,
      displayName: payload.fullName,
      bio: payload.biography ?? "",
      weight: payload.bodyWeight,
      avatarUrl: payload.profilePicture ?? null,
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
  async getRecentPosts(username?: string | null): Promise<WorkoutPost[]> {
    const response = await apiClient.get<BackendProfilePostsPage | BackendProfilePost[]>("/api/profile/me/posts?size=30", { auth: true });
    const posts = Array.isArray(response) ? response : response.content ?? [];
    if (posts.length > 0 || !usernameKey(username)) return posts.map(normalizeProfilePost);

    const feedResponse = await apiClient.get<BackendProfilePostsPage | BackendProfilePost[]>("/api/posts/feed?page=0&size=30", { auth: true });
    const feedPosts = Array.isArray(feedResponse) ? feedResponse : feedResponse.content ?? [];
    const currentUsername = usernameKey(username);

    return feedPosts
      .filter((post) => usernameKey((post as BackendProfilePost & { username?: string | null }).username) === currentUsername)
      .map(normalizeProfilePost);
  },
  async getPublicPosts(username: string): Promise<WorkoutPost[]> {
    const normalizedUsername = username.replace(/^@/, "").trim();
    const response = await apiClient.get<BackendProfilePostsPage | BackendProfilePost[]>(`/api/profile/${encodeURIComponent(normalizedUsername)}/posts?size=30`, { auth: true });
    const posts = Array.isArray(response) ? response : response.content ?? [];
    return posts.map(normalizeProfilePost);
  },
  async getTrainedDays(month = new Date()) {
    const monthValue = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    return apiClient.get<number[]>(`/api/profile/me/training-days?month=${monthValue}`, { auth: true });
  },
  async getPublicTrainedDays(username: string, month = new Date()) {
    const normalizedUsername = username.replace(/^@/, "").trim();
    const monthValue = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    return apiClient.get<number[]>(`/api/profile/${encodeURIComponent(normalizedUsername)}/training-days?month=${monthValue}`, { auth: true });
  },
};
