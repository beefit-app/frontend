import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const subscribeSocialEvents = vi.hoisted(() => vi.fn());

vi.mock("../../../auth/AuthContext", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
vi.mock("../../../services/socialService", () => ({ socialService: {
  loadFriends: vi.fn().mockResolvedValue([{ id: "friend", name: "Friend", username: "@friend", initials: "FR", status: "friend", friendshipId: "f-1" }]),
  loadIncomingRequests: vi.fn().mockResolvedValue([{ id: "r-1", profile: { id: "requester", name: "Requester", username: "@requester", initials: "RE", status: "available" } }]),
  loadOutgoingRequests: vi.fn().mockResolvedValue([{ id: "r-2", profile: { id: "sent", name: "Sent", username: "@sent", initials: "SE", status: "sent" } }]),
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
import { useSocialState } from "./useSocialState";

describe("useSocialState", () => {
  beforeEach(() => {
    subscribeSocialEvents.mockReset().mockResolvedValue(undefined);
  });

  it("carrega amigos e solicitações pela API", async () => {
    const { result } = renderHook(() => useSocialState());
    await waitFor(() => expect(result.current.friends).toHaveLength(1));
    expect(result.current.friendRequests).toHaveLength(1);
    expect(result.current.sentRequests).toHaveLength(1);
  });
  it("executa aceite e recarrega os dados sociais", async () => {
    const { result } = renderHook(() => useSocialState());
    await waitFor(() => expect(result.current.friendRequests).toHaveLength(1));
    act(() => result.current.acceptFriendRequest("r-1"));
    await waitFor(() => expect(result.current.feedback).toBe("Solicitação aceita."));
  });

  it("adiciona solicitação recebida em tempo real", async () => {
    let handler: ((type: string, data: Record<string, unknown>) => void) | undefined;
    subscribeSocialEvents.mockImplementation(async (onEvent: (type: string, data: Record<string, unknown>) => void) => {
      handler = onEvent;
    });

    const { result } = renderHook(() => useSocialState());
    await waitFor(() => expect(subscribeSocialEvents).toHaveBeenCalled());

    act(() => {
      handler?.("FRIEND_REQUEST_PENDING", {
        friendshipId: "r-2",
        requesterId: "friend-2",
        requesterFullName: "Maria Silva",
        requesterUsername: "maria",
      });
    });

    await waitFor(() => expect(result.current.friendRequests.some((request) => request.id === "r-2")).toBe(true));
    expect(result.current.friendRequests.find((request) => request.id === "r-2")?.profile.name).toBe("Maria Silva");
  });

  it("adiciona amigo correto quando a solicitação enviada é aceita", async () => {
    let handler: ((type: string, data: Record<string, unknown>) => void) | undefined;
    subscribeSocialEvents.mockImplementation(async (onEvent: (type: string, data: Record<string, unknown>) => void) => {
      handler = onEvent;
    });

    const { result } = renderHook(() => useSocialState());
    await waitFor(() => expect(subscribeSocialEvents).toHaveBeenCalled());

    act(() => {
      handler?.("FRIEND_REQUEST_ACCEPTED", {
        friendshipId: "f-2",
        addresseeId: "friend-2",
        addresseeFullName: "Maria Silva",
        addresseeUsername: "maria",
      });
    });

    await waitFor(() => expect(result.current.friends.some((friend) => friend.friendshipId === "f-2")).toBe(true));
    expect(result.current.friends.find((friend) => friend.friendshipId === "f-2")?.name).toBe("Maria Silva");
  });

  it("remove solicitação enviada e atualiza busca para amigo quando o aceite chega por sse", async () => {
    let handler: ((type: string, data: Record<string, unknown>) => void) | undefined;
    const { socialService } = await import("../../../services/socialService");
    vi.mocked(socialService.search).mockResolvedValue([
      { id: "friend-2", name: "Maria Silva", username: "@maria", initials: "MS", status: "available" },
    ]);

    subscribeSocialEvents.mockImplementation(async (onEvent: (type: string, data: Record<string, unknown>) => void) => {
      handler = onEvent;
    });

    const { result } = renderHook(() => useSocialState());
    await waitFor(() => expect(subscribeSocialEvents).toHaveBeenCalled());

    act(() => result.current.setSearchTerm("maria"));
    await waitFor(() => expect(result.current.searchResults.some((person) => person.id === "friend-2")).toBe(true));

    act(() => {
      handler?.("FRIEND_REQUEST_ACCEPTED", {
        friendshipId: "r-2",
        addresseeId: "friend-2",
        addresseeFullName: "Maria Silva",
        addresseeUsername: "maria",
      });
    });

    await waitFor(() => expect(result.current.sentRequests.some((request) => request.id === "r-2")).toBe(false));
    expect(result.current.searchResults.find((person) => person.id === "friend-2")?.status).toBe("friend");
    expect(result.current.friends.some((friend) => friend.id === "friend-2")).toBe(true);
  });

  it("remove amizade em tempo real quando chega o sse de deleção", async () => {
    let handler: ((type: string, data: Record<string, unknown>) => void) | undefined;
    subscribeSocialEvents.mockImplementation(async (onEvent: (type: string, data: Record<string, unknown>) => void) => {
      handler = onEvent;
    });

    const { result } = renderHook(() => useSocialState());
    await waitFor(() => expect(subscribeSocialEvents).toHaveBeenCalled());

    act(() => {
      handler?.("FRIEND_REMOVED", {
        friendshipId: "f-1",
        friendId: "friend",
        friendFullName: "Friend",
        friendUsername: "friend",
      });
    });

    await waitFor(() => expect(result.current.friends.some((friend) => friend.id === "friend")).toBe(false));
  });
});
