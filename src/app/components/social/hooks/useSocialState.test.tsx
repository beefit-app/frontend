import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../../../auth/AuthContext", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
vi.mock("../../../services/socialService", () => ({ socialService: {
  loadFriends: vi.fn().mockResolvedValue([{ id: "friend", name: "Friend", username: "@friend", initials: "FR", status: "friend", friendshipId: "f-1" }]),
  loadRequests: vi.fn().mockResolvedValue([{ id: "r-1", profile: { id: "requester", name: "Requester", username: "@requester", initials: "RE", status: "available" } }]),
  loadHives: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue([]),
  acceptRequest: vi.fn().mockResolvedValue({}), rejectRequest: vi.fn().mockResolvedValue({}), sendRequest: vi.fn().mockResolvedValue({}),
  createHive: vi.fn().mockResolvedValue([]), joinHive: vi.fn().mockResolvedValue([]), leaveHive: vi.fn().mockResolvedValue({}),
} }));
import { useSocialState } from "./useSocialState";

describe("useSocialState", () => {
  it("carrega amigos e solicitações pela API", async () => {
    const { result } = renderHook(() => useSocialState());
    await waitFor(() => expect(result.current.friends).toHaveLength(1));
    expect(result.current.friendRequests).toHaveLength(1);
  });
  it("executa aceite e recarrega os dados sociais", async () => {
    const { result } = renderHook(() => useSocialState());
    await waitFor(() => expect(result.current.friendRequests).toHaveLength(1));
    act(() => result.current.acceptFriendRequest("r-1"));
    await waitFor(() => expect(result.current.feedback).toBe("Solicitação aceita."));
  });
});
