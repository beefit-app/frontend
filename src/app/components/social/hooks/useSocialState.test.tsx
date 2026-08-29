import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { SocialEvent } from "../../../services/socialEventsService";

const subscribeSocialEvents = vi.hoisted(() => vi.fn());
const getCachedRelationships = vi.hoisted(() => vi.fn());
const setCachedValue = vi.hoisted(() => vi.fn());

vi.mock("../../../auth/AuthContext", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
vi.mock("../../../services/socialService", () => ({ socialService: {
  loadFriends: vi.fn().mockResolvedValue([{ id: "friend", name: "Friend", username: "@friend", initials: "FR", avatarUrl: null, status: "friend", friendshipId: "f-1" }]),
  loadIncomingRequests: vi.fn().mockResolvedValue([{ id: "r-1", profile: { id: "requester", name: "Requester", username: "@requester", initials: "RE", avatarUrl: null, status: "available" } }]),
  loadOutgoingRequests: vi.fn().mockResolvedValue([{ id: "r-2", profile: { id: "sent", name: "Sent", username: "@sent", initials: "SE", avatarUrl: null, status: "sent" } }]),
  loadHives: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue([]),
  acceptRequest: vi.fn().mockResolvedValue({
    id: "r-1",
    user: { id: "requester", fullName: "Requester", username: "requester", profilePicture: null },
    status: "ACCEPTED",
    direction: "incoming",
  }),
  rejectRequest: vi.fn().mockResolvedValue({}),
  sendRequest: vi.fn().mockResolvedValue({
    id: "r-2",
    user: { id: "sent", fullName: "Sent", username: "sent", profilePicture: null },
    status: "PENDING",
    direction: "outgoing",
  }),
  createHive: vi.fn().mockResolvedValue([]), joinHive: vi.fn().mockResolvedValue([]), leaveHive: vi.fn().mockResolvedValue({}),
} }));
vi.mock("../../../services/socialEventsService", () => ({ subscribeSocialEvents }));
vi.mock("../../../storage/pageCacheStorage", () => ({ pageCacheStorage: {
  get: getCachedRelationships, set: setCachedValue, remove: vi.fn(),
} }));
import { useSocialState } from "./useSocialState";

describe("useSocialState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscribeSocialEvents.mockReset().mockResolvedValue(undefined);
    getCachedRelationships.mockReset().mockResolvedValue(null);
    setCachedValue.mockReset();
  });

  it("carrega amigos e solicitações pela API", async () => {
    const { result } = renderHook(() => useSocialState());
    await waitFor(() => expect(result.current.friends).toHaveLength(1));
    expect(result.current.friendRequests).toHaveLength(1);
    expect(result.current.sentRequests).toHaveLength(1);
  });

  it("hidrata relacionamentos frescos sem requisitar amigos novamente", async () => {
    const { socialService } = await import("../../../services/socialService");
    getCachedRelationships.mockImplementation(async (_userId, key) => key === "social.relationships" ? {
      friends: [{ id: "cached", name: "Cache", username: "@cache", initials: "CA", avatarUrl: null, status: "friend", friendshipId: "f-cache" }],
      friendRequests: [],
      sentRequests: [],
    } : null);

    const { result } = renderHook(() => useSocialState(true));

    await waitFor(() => expect(result.current.friends[0]?.id).toBe("cached"));
    expect(socialService.loadFriends).not.toHaveBeenCalled();
  });

  it("hidrata Colmeias frescas sem requisitar a lista e sem persistir inviteCode", async () => {
    const { socialService } = await import("../../../services/socialService");
    getCachedRelationships.mockImplementation(async (_userId, key) => {
      if (key === "social.hives") {
        return [{
          id: "hive-1", name: "Cache Hive", period: "Semanal", creatorId: "me", members: [],
        }];
      }
      return null;
    });

    const { result } = renderHook(() => useSocialState(true));

    await waitFor(() => expect(result.current.hives[0]?.id).toBe("hive-1"));
    expect(result.current.hives[0]?.inviteCode).toBeUndefined();
    expect(socialService.loadHives).not.toHaveBeenCalled();
  });

  it("persiste Colmeias sem o código de convite", async () => {
    const { socialService } = await import("../../../services/socialService");
    vi.mocked(socialService.loadHives).mockResolvedValueOnce([{
      id: "hive-1", name: "Hive", period: "Semanal", inviteCode: "SECRET-CODE", creatorId: "me", members: [],
    }]);

    renderHook(() => useSocialState(true));

    await waitFor(() => expect(setCachedValue).toHaveBeenCalledWith(
      "me",
      "social.hives",
      [{ id: "hive-1", name: "Hive", period: "Semanal", creatorId: "me", members: [] }],
    ));
  });
  it("executa aceite e recarrega os dados sociais", async () => {
    const { result } = renderHook(() => useSocialState());
    await waitFor(() => expect(result.current.friendRequests).toHaveLength(1));
    act(() => result.current.acceptFriendRequest("r-1"));
    await waitFor(() => expect(result.current.feedback).toBe("Solicitação aceita."));
  });

  it("adiciona solicitação recebida em tempo real", async () => {
    let handler: ((event: SocialEvent) => void) | undefined;
    subscribeSocialEvents.mockImplementation(async (onEvent: (event: SocialEvent) => void) => {
      handler = onEvent;
    });

    const { result } = renderHook(() => useSocialState());
    await waitFor(() => expect(subscribeSocialEvents).toHaveBeenCalled());

    act(() => {
      handler?.({ type: "FRIEND_REQUEST_PENDING", data: {
        friendshipId: "r-2",
        requesterId: "friend-2",
        requesterFullName: "Maria Silva",
        requesterUsername: "maria",
        sentAt: "2026-08-29T10:00:00Z",
      } });
    });

    await waitFor(() => expect(result.current.friendRequests.some((request) => request.id === "r-2")).toBe(true));
    expect(result.current.friendRequests.find((request) => request.id === "r-2")?.profile.name).toBe("Maria Silva");
  });

  it("adiciona amigo correto quando a solicitação enviada é aceita", async () => {
    let handler: ((event: SocialEvent) => void) | undefined;
    subscribeSocialEvents.mockImplementation(async (onEvent: (event: SocialEvent) => void) => {
      handler = onEvent;
    });

    const { result } = renderHook(() => useSocialState());
    await waitFor(() => expect(subscribeSocialEvents).toHaveBeenCalled());

    act(() => {
      handler?.({ type: "FRIEND_REQUEST_ACCEPTED", data: {
        friendshipId: "f-2",
        addresseeId: "friend-2",
        addresseeFullName: "Maria Silva",
        addresseeUsername: "maria",
        acceptedAt: "2026-08-29T10:00:00Z",
      } });
    });

    await waitFor(() => expect(result.current.friends.some((friend) => friend.friendshipId === "f-2")).toBe(true));
    expect(result.current.friends.find((friend) => friend.friendshipId === "f-2")?.name).toBe("Maria Silva");
  });

  it("remove solicitação enviada e atualiza busca para amigo quando o aceite chega por sse", async () => {
    let handler: ((event: SocialEvent) => void) | undefined;
    const { socialService } = await import("../../../services/socialService");
    vi.mocked(socialService.search).mockResolvedValue([
      { id: "friend-2", name: "Maria Silva", username: "@maria", initials: "MS", avatarUrl: null, status: "available" },
    ]);

    subscribeSocialEvents.mockImplementation(async (onEvent: (event: SocialEvent) => void) => {
      handler = onEvent;
    });

    const { result } = renderHook(() => useSocialState());
    await waitFor(() => expect(subscribeSocialEvents).toHaveBeenCalled());

    act(() => result.current.setSearchTerm("maria"));
    await waitFor(() => expect(result.current.searchResults.some((person) => person.id === "friend-2")).toBe(true));

    act(() => {
      handler?.({ type: "FRIEND_REQUEST_ACCEPTED", data: {
        friendshipId: "r-2",
        addresseeId: "friend-2",
        addresseeFullName: "Maria Silva",
        addresseeUsername: "maria",
        acceptedAt: "2026-08-29T10:00:00Z",
      } });
    });

    await waitFor(() => expect(result.current.sentRequests.some((request) => request.id === "r-2")).toBe(false));
    expect(result.current.searchResults.find((person) => person.id === "friend-2")?.status).toBe("friend");
    expect(result.current.friends.some((friend) => friend.id === "friend-2")).toBe(true);
  });

  it("remove amizade em tempo real quando chega o sse de deleção", async () => {
    let handler: ((event: SocialEvent) => void) | undefined;
    subscribeSocialEvents.mockImplementation(async (onEvent: (event: SocialEvent) => void) => {
      handler = onEvent;
    });

    const { result } = renderHook(() => useSocialState());
    await waitFor(() => expect(subscribeSocialEvents).toHaveBeenCalled());

    act(() => {
      handler?.({ type: "FRIEND_REMOVED", data: {
        friendshipId: "f-1",
        friendId: "friend",
        friendFullName: "Friend",
        friendUsername: "friend",
        removedAt: "2026-08-29T10:00:00Z",
      } });
    });

    await waitFor(() => expect(result.current.friends.some((friend) => friend.id === "friend")).toBe(false));
  });

  it("atualiza os avatares sociais quando o perfil de um amigo muda", async () => {
    let handler: ((event: SocialEvent) => void) | undefined;
    subscribeSocialEvents.mockImplementation(async (onEvent: (event: SocialEvent) => void) => {
      handler = onEvent;
    });
    const { result } = renderHook(() => useSocialState());
    await waitFor(() => expect(result.current.friends).toHaveLength(1));

    act(() => handler?.({ type: "PROFILE_UPDATED", data: {
      userId: "friend", fullName: "Friend Updated", username: "friend-updated", profilePicture: "/api/media/new-avatar",
    } }));

    await waitFor(() => expect(result.current.friends[0]?.avatarUrl).toBe("/api/media/new-avatar"));
    expect(result.current.friends[0]?.name).toBe("Friend Updated");
  });
});
