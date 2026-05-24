import type { WorkoutPost } from "../components/profile/types";
import { MOCK_POSTS, TRAINED_DAYS } from "../components/profile/mock";
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
    };

    await persistAuthUserUpdate(authUser, nextProfile);
    return nextProfile;
  },

  getRecentPosts(): WorkoutPost[] {
    return MOCK_POSTS;
  },

  getTrainedDays() {
    return TRAINED_DAYS;
  },
};
