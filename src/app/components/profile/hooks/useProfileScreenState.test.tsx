import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { SocialEvent } from "../../../services/socialEventsService";

const getProfileFallback = vi.hoisted(() => vi.fn());
const getProfile = vi.hoisted(() => vi.fn());
const getRecentPosts = vi.hoisted(() => vi.fn());
const getTrainedDays = vi.hoisted(() => vi.fn());
const subscribeSocialEvents = vi.hoisted(() => vi.fn());
const cacheGet = vi.hoisted(() => vi.fn());
const cacheSet = vi.hoisted(() => vi.fn());
const cacheRemove = vi.hoisted(() => vi.fn());
const invalidateWorkoutCaches = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const deleteWorkout = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const resetFeedCache = vi.hoisted(() => vi.fn());

vi.mock("../../../services/workoutService", () => ({ workoutService: { deleteWorkout } }));
vi.mock("../../social-feed/hooks/useSocialFeedState", () => ({ resetFeedCache }));
vi.mock("../../../services/profileService", () => ({ profileService: {
  getProfileFallback,
  getProfile,
  getRecentPosts,
  getTrainedDays,
} }));
vi.mock("../../../services/socialEventsService", () => ({ subscribeSocialEvents }));
vi.mock("../../../services/accountSettingsService", () => ({ accountSettingsService: {} }));
vi.mock("../../../storage/pageCacheStorage", () => ({
  pageCacheStorage: {
    get: cacheGet,
    set: cacheSet,
    remove: cacheRemove,
  },
  invalidateWorkoutCaches,
}));

import { useProfileScreenState } from "./useProfileScreenState";

const authUser = { id: "user-1", name: "Nome antigo", email: "user@example.com", username: "nome-antigo", weight: 75 };

function profile(displayName: string) {
  return {
    id: "user-1",
    displayName,
    username: "@nome",
    email: "user@example.com",
    bio: "Bio",
    avatarUrl: null,
    weight: 75,
    weeklyGoal: 3,
    ghostModeEnabled: false,
    cards: 2,
    streak: 1,
    totalWorkouts: 4,
    isDeveloper: false,
  };
}

describe("useProfileScreenState", () => {
  beforeEach(() => {
    getProfileFallback.mockReset().mockReturnValue(profile("Shell"));
    getProfile.mockReset().mockResolvedValueOnce(profile("Nome antigo")).mockResolvedValueOnce(profile("Nome atualizado"));
    getRecentPosts.mockReset().mockResolvedValue([]);
    getTrainedDays.mockReset().mockResolvedValue([]);
    subscribeSocialEvents.mockReset().mockResolvedValue(undefined);
    cacheGet.mockReset().mockResolvedValue(null);
    cacheSet.mockReset();
    cacheRemove.mockReset();
    deleteWorkout.mockReset().mockResolvedValue(undefined);
    resetFeedCache.mockReset();
    invalidateWorkoutCaches.mockReset().mockResolvedValue(undefined);
  });

  it("invalida o cache e reconcilia o perfil próprio quando recebe PROFILE_UPDATED", async () => {
    let handler: ((event: SocialEvent) => void) | undefined;
    subscribeSocialEvents.mockImplementation(async (onEvent: (event: SocialEvent) => void) => {
      handler = onEvent;
    });

    const { result } = renderHook(() => useProfileScreenState({
      authUser,
      accountSettings: { ghostModeEnabled: false },
    }));

    await waitFor(() => expect(result.current.profile.displayName).toBe("Nome antigo"));
    act(() => handler?.({ type: "PROFILE_UPDATED", data: {
      userId: "user-1", fullName: "Nome atualizado", username: "nome", profilePicture: "/avatar.jpg",
    } }));

    await waitFor(() => expect(result.current.profile.displayName).toBe("Nome atualizado"));
    expect(cacheRemove).toHaveBeenCalledWith("user-1", "profile");
    expect(getProfile).toHaveBeenCalledTimes(2);
    expect(cacheSet).toHaveBeenCalledWith("user-1", "profile", expect.objectContaining({ displayName: "Nome atualizado" }));
  });

  it("ignora atualização de perfil de outra pessoa", async () => {
    let handler: ((event: SocialEvent) => void) | undefined;
    subscribeSocialEvents.mockImplementation(async (onEvent: (event: SocialEvent) => void) => {
      handler = onEvent;
    });
    const { result } = renderHook(() => useProfileScreenState({
      authUser,
      accountSettings: { ghostModeEnabled: false },
    }));

    await waitFor(() => expect(result.current.profile.displayName).toBe("Nome antigo"));
    act(() => handler?.({ type: "PROFILE_UPDATED", data: {
      userId: "friend-1", fullName: "Outra pessoa", username: "outra", profilePicture: null,
    } }));

    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(cacheRemove).not.toHaveBeenCalledWith("user-1", "profile");
  });

  it("exclui treino do perfil, atualiza estado e contadores, reseta feed e invalida caches", async () => {
    const onWorkoutDeleted = vi.fn();
    getRecentPosts.mockResolvedValue([
      { id: "post-1", workoutSessionId: "session-1", title: "Treino 1", liked: false, likes: 0 },
      { id: "post-2", workoutSessionId: "session-2", title: "Treino 2", liked: false, likes: 0 },
    ]);

    const { result } = renderHook(() => useProfileScreenState({
      authUser,
      accountSettings: { ghostModeEnabled: false },
      onWorkoutDeleted,
    }));

    await waitFor(() => expect(result.current.recentPosts).toHaveLength(2));
    expect(result.current.profile.totalWorkouts).toBe(4);
    expect(result.current.profile.cards).toBe(2);

    await act(async () => {
      await result.current.handleDeleteWorkoutPost("session-1", "post-1");
    });

    expect(deleteWorkout).toHaveBeenCalledWith("session-1");
    expect(result.current.recentPosts).toHaveLength(1);
    expect(result.current.recentPosts[0].id).toBe("post-2");
    expect(result.current.profile.totalWorkouts).toBe(3);
    expect(result.current.profile.cards).toBe(1);
    expect(resetFeedCache).toHaveBeenCalled();
    expect(invalidateWorkoutCaches).toHaveBeenCalledWith("user-1");
    expect(onWorkoutDeleted).toHaveBeenCalled();
  });
});
