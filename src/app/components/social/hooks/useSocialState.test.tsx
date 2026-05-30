import { act, renderHook } from "@testing-library/react";
import { useSocialState } from "./useSocialState";

describe("useSocialState", () => {
  it("accepts and rejects friendship requests", () => {
    const { result } = renderHook(() => useSocialState());
    const initialFriendCount = result.current.friends.length;

    act(() => {
      result.current.acceptFriendRequest("request-lia");
    });

    expect(result.current.friends).toHaveLength(initialFriendCount + 1);
    expect(result.current.friends.some((friend) => friend.id === "lia")).toBe(true);
    expect(result.current.friendRequests.some((request) => request.id === "request-lia")).toBe(false);

    act(() => {
      result.current.rejectFriendRequest("request-joao");
    });

    expect(result.current.friendRequests).toHaveLength(0);
  });

  it("filters people and marks sent friendship requests", () => {
    const { result } = renderHook(() => useSocialState());

    act(() => {
      result.current.setSearchTerm("nina");
    });

    expect(result.current.searchResults.map((person) => person.id)).toEqual(["nina"]);

    act(() => {
      result.current.sendFriendRequest("nina");
    });

    expect(result.current.searchResults[0].status).toBe("sent");
  });

  it("creates and leaves a hive while maintaining its ranking", () => {
    const { result } = renderHook(() => useSocialState());

    act(() => {
      expect(result.current.createHive("Forca da Manha", "Mensal")).toBe(true);
    });

    expect(result.current.hives).toHaveLength(2);
    expect(result.current.selectedHive?.name).toBe("Forca da Manha");
    expect(result.current.rankMembers(result.current.selectedHive!)[0].isCurrentUser).toBe(true);

    act(() => {
      result.current.leaveHive(result.current.selectedHive!.id);
    });

    expect(result.current.hives).toHaveLength(1);
    expect(result.current.selectedHive?.name).toBe("Ferro das 6");
  });

  it("joins a valid invitation and blocks participation beyond two hives", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSocialState());

    act(() => {
      expect(result.current.joinHive("BEE-POWER")).toBe(true);
    });

    expect(result.current.hives).toHaveLength(2);
    expect(result.current.selectedHive?.name).toBe("Power Queens");

    act(() => {
      expect(result.current.joinHive("MEL-7D")).toBe(false);
    });

    expect(result.current.hives).toHaveLength(2);
    expect(result.current.error).toContain("duas Colmeias");

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.error).toBeNull();
    vi.useRealTimers();
  });

  it("rejects an invalid hive invitation", () => {
    const { result } = renderHook(() => useSocialState());

    act(() => {
      expect(result.current.joinHive("INVALIDO")).toBe(false);
    });

    expect(result.current.error).toContain("Convite invalido");
    expect(result.current.hives).toHaveLength(1);
  });
});
