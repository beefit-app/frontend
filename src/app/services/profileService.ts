import type { AuthUser } from "../types/auth";
import type { UserProfile, UserProfileUpdate } from "../types/user";
import type { WorkoutPost } from "../components/profile/types";
import { MOCK_POSTS, TRAINED_DAYS } from "../components/profile/mock";

const PROFILE_STORAGE_KEY_PREFIX = "beefit.profile.current";
const LEGACY_PROFILE_STORAGE_KEY = "beefit.profile.current";

interface StoredProfileDraft extends Partial<UserProfile> {}

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function buildProfileStorageKey(profileId: string) {
  return `${PROFILE_STORAGE_KEY_PREFIX}.${profileId}`;
}

function clearLegacyProfileDraft() {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
}

function readStoredProfileDraft(profileId: string): StoredProfileDraft | null {
  if (!hasBrowserStorage()) return null;

  const raw = window.localStorage.getItem(buildProfileStorageKey(profileId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as StoredProfileDraft) : null;
  } catch {
    return null;
  }
}

function writeStoredProfileDraft(profile: UserProfile) {
  if (!hasBrowserStorage()) return;

  window.localStorage.setItem(buildProfileStorageKey(profile.id), JSON.stringify(profile));
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
  };
}

function buildBaseProfile(authUser: AuthUser | null): UserProfile {
  if (!authUser) {
    return buildFallbackProfile();
  }

  const username = authUser.username ? `@${authUser.username.replace(/^@/, "")}` : "@beefit";

  return {
    id: authUser.id || "profile-auth-user",
    displayName: authUser.name,
    username,
    email: authUser.email,
    bio: "",
    avatarUrl: null,
    weight: authUser.weight ?? 75,
    weeklyGoal: authUser.weeklyGoal ?? 4,
    cards: 47,
    streak: 15,
    totalWorkouts: 312,
  };
}

function sanitizeProfile(baseProfile: UserProfile, storedDraft: StoredProfileDraft | null): UserProfile {
  return {
    ...baseProfile,
    ...storedDraft,
    id: baseProfile.id,
    email: baseProfile.email,
    displayName: storedDraft?.displayName?.trim() || baseProfile.displayName,
    username: storedDraft?.username?.trim() || baseProfile.username,
    bio: storedDraft?.bio ?? baseProfile.bio,
    avatarUrl: storedDraft?.avatarUrl ?? baseProfile.avatarUrl,
    weight:
      typeof storedDraft?.weight === "number"
        ? storedDraft.weight
        : baseProfile.weight,
    weeklyGoal:
      typeof storedDraft?.weeklyGoal === "number"
        ? storedDraft.weeklyGoal
        : baseProfile.weeklyGoal,
  };
}

export const profileService = {
  getProfile(authUser: AuthUser | null): UserProfile {
    clearLegacyProfileDraft();

    const baseProfile = buildBaseProfile(authUser);
    return sanitizeProfile(baseProfile, readStoredProfileDraft(baseProfile.id));
  },

  saveProfile(currentProfile: UserProfile, update: UserProfileUpdate): UserProfile {
    const nextProfile = {
      ...currentProfile,
      ...update,
      displayName: update.displayName?.trim() || currentProfile.displayName,
    };

    writeStoredProfileDraft(nextProfile);
    return nextProfile;
  },

  getRecentPosts(): WorkoutPost[] {
    return MOCK_POSTS;
  },

  getTrainedDays() {
    return TRAINED_DAYS;
  },
};
