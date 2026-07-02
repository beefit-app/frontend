import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const getLiveFriends = vi.hoisted(() => vi.fn().mockReturnValue([]));
const setLiveFriends = vi.hoisted(() => vi.fn());
const clearLiveFriends = vi.hoisted(() => vi.fn());

vi.mock("../../../services/socialFeedService", () => ({ socialFeedService: {
  load: vi.fn().mockResolvedValue({ posts: [{ id: "p-1", likes: 2, liked: false }], last: true }),
  loadLive: vi.fn().mockResolvedValue([]),
  toggleLike: vi.fn().mockResolvedValue({ liked: true, likes_count: 3 }), importTemplate: vi.fn().mockResolvedValue({}),
} }));
vi.mock("../../../services/socialEventsService", () => ({ subscribeSocialEvents: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../../storage/socialFeedStorage", () => ({ socialFeedStorage: {
  getLiveFriends,
  setLiveFriends,
  clearLiveFriends,
} }));
import { useSocialFeedState } from "./useSocialFeedState";

describe("useSocialFeedState", () => {
  beforeEach(() => {
    getLiveFriends.mockReturnValue([]);
    setLiveFriends.mockReset();
    clearLiveFriends.mockReset();
  });

  it("atualiza curtida com a resposta da API", async () => {
    const { result } = renderHook(() => useSocialFeedState());
    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    act(() => result.current.toggleLike("p-1"));
    await waitFor(() => expect(result.current.posts[0].liked).toBe(true));
    expect(result.current.posts[0].likes).toBe(3);
  });

  it("limpa o cache de amigos treinando quando não há ninguém ativo", async () => {
    renderHook(() => useSocialFeedState());
    await waitFor(() => expect(clearLiveFriends).toHaveBeenCalled());
  });
});
