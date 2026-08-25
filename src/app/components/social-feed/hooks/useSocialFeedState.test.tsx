import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const getLiveFriends = vi.hoisted(() => vi.fn().mockReturnValue([]));
const setLiveFriends = vi.hoisted(() => vi.fn());
const clearLiveFriends = vi.hoisted(() => vi.fn());
const loadFeed = vi.hoisted(() => vi.fn());
const loadLive = vi.hoisted(() => vi.fn());
const getCachedPage = vi.hoisted(() => vi.fn());

vi.mock("../../../services/socialFeedService", () => ({ socialFeedService: {
  load: loadFeed,
  loadLive,
  toggleLike: vi.fn().mockResolvedValue({ liked: true, likes_count: 3 }), importTemplate: vi.fn().mockResolvedValue({}),
} }));
vi.mock("../../../services/socialEventsService", () => ({ subscribeSocialEvents: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../../auth/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("../../../storage/pageCacheStorage", () => ({ pageCacheStorage: {
  get: getCachedPage, set: vi.fn(), remove: vi.fn(),
} }));
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
    loadFeed.mockReset().mockResolvedValue({ posts: [{ id: "p-1", likes: 2, liked: false }], last: true });
    loadLive.mockReset().mockResolvedValue([]);
    getCachedPage.mockReset().mockResolvedValue(null);
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

  it("hidrata o feed fresco sem requisitar a primeira pagina novamente", async () => {
    getCachedPage.mockResolvedValue({ posts: [{ id: "cached", likes: 4, liked: true }], last: true });

    const { result } = renderHook(() => useSocialFeedState());

    await waitFor(() => expect(result.current.posts[0]?.id).toBe("cached"));
    expect(loadFeed).not.toHaveBeenCalled();
  });

  it("consulta a API quando o cache expirado e tratado como miss", async () => {
    getCachedPage.mockResolvedValue(null);

    renderHook(() => useSocialFeedState());

    await waitFor(() => expect(loadFeed).toHaveBeenCalledWith(0));
  });
});
