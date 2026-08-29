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

vi.mock("../../../services/profileService", () => ({ profileService: {
  getProfileFallback,
  getProfile,
  getRecentPosts,
  getTrainedDays,
} }));
vi.mock("../../../services/socialEventsService", () => ({ subscribeSocialEvents }));
vi.mock("../../../services/accountSettingsService", () => ({ accountSettingsService: {} }));
vi.mock("../../../storage/pageCacheStorage", () => ({ pageCacheStorage: {
  get: cacheGet,
  set: cacheSet,
  remove: cacheRemove,
} }));

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
});
