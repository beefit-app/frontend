import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const getLiveFriends = vi.hoisted(() => vi.fn().mockReturnValue([]));
const setLiveFriends = vi.hoisted(() => vi.fn());
const clearLiveFriends = vi.hoisted(() => vi.fn());
const loadFeed = vi.hoisted(() => vi.fn());
const loadLive = vi.hoisted(() => vi.fn());
const getCachedPage = vi.hoisted(() => vi.fn());
const subscribeSocialEvents = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const invalidateWorkoutCaches = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const deleteWorkout = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const confirmModal = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock("../../../services/workoutService", () => ({
  workoutService: {
    deleteWorkout,
  },
}));
vi.mock("../../../hooks/useConfirm", () => ({
  useConfirm: () => ({ confirm: confirmModal, dialog: null }),
}));
vi.mock("../../../services/socialFeedService", () => ({ socialFeedService: {
  load: loadFeed,
  loadLive,
  toggleLike: vi.fn().mockResolvedValue({ liked: true, likes_count: 3 }), importTemplate: vi.fn().mockResolvedValue({}),
} }));
vi.mock("../../../services/socialEventsService", () => ({ subscribeSocialEvents }));
vi.mock("../../../auth/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("../../../storage/pageCacheStorage", () => ({
  pageCacheStorage: {
    get: getCachedPage, set: vi.fn(), remove: vi.fn(),
  },
  invalidateWorkoutCaches,
}));
vi.mock("../../../storage/socialFeedStorage", () => ({ socialFeedStorage: {
  getLiveFriends,
  setLiveFriends,
  clearLiveFriends,
} }));
import { resetFeedCache, useSocialFeedState } from "./useSocialFeedState";

describe("useSocialFeedState", () => {
  beforeEach(() => {
    resetFeedCache();
    getLiveFriends.mockReturnValue([]);
    setLiveFriends.mockReset();
    clearLiveFriends.mockReset();
    loadFeed.mockReset().mockResolvedValue({ posts: [{ id: "p-1", authorId: "friend-1", author: "Friend", username: "@friend", initials: "FR", authorAvatarUrl: null, likes: 2, liked: false }], last: true });
    loadLive.mockReset().mockResolvedValue([]);
    getCachedPage.mockReset().mockResolvedValue(null);
    subscribeSocialEvents.mockReset().mockResolvedValue(undefined);
    deleteWorkout.mockReset().mockResolvedValue(undefined);
    invalidateWorkoutCaches.mockReset().mockResolvedValue(undefined);
    confirmModal.mockReset().mockResolvedValue(true);
  });

  it("atualiza curtida com a resposta da API", async () => {
    const { result } = renderHook(() => useSocialFeedState());
    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    act(() => result.current.toggleLike("p-1"));
    await waitFor(() => expect(result.current.posts[0].liked).toBe(true));
    expect(result.current.posts[0].likes).toBe(3);
  });

  it("atualiza o contador quando recebe uma curtida por SSE", async () => {
    subscribeSocialEvents.mockImplementation(async (onEvent: (event: { type: "POST_LIKED"; data: { postId: string; totalLikes: number } }) => void) => {
      onEvent({ type: "POST_LIKED", data: { postId: "p-1", totalLikes: 7 } });
    });
    const { result } = renderHook(() => useSocialFeedState());
    await waitFor(() => expect(result.current.posts[0]?.likes).toBe(7));
  });

  it("limpa o cache de amigos treinando quando não há ninguém ativo", async () => {
    renderHook(() => useSocialFeedState());
    await waitFor(() => expect(clearLiveFriends).toHaveBeenCalled());
  });

  it("hidrata o feed fresco sem requisitar a primeira pagina novamente", async () => {
    getCachedPage.mockResolvedValue({ posts: [{ id: "cached", authorId: "friend-1", author: "Friend", username: "@friend", initials: "FR", authorAvatarUrl: null, likes: 4, liked: true }], last: true });

    const { result } = renderHook(() => useSocialFeedState());

    await waitFor(() => expect(result.current.posts[0]?.id).toBe("cached"));
    expect(loadFeed).not.toHaveBeenCalled();
  });

  it("consulta a API quando o cache expirado e tratado como miss", async () => {
    getCachedPage.mockResolvedValue(null);

    renderHook(() => useSocialFeedState());

    await waitFor(() => expect(loadFeed).toHaveBeenCalledWith(0));
  });

  it("mantém os posts em memória e não refaz requisição ao remontar", async () => {
    const firstRender = renderHook(() => useSocialFeedState());
    await waitFor(() => expect(firstRender.result.current.posts).toHaveLength(1));
    expect(loadFeed).toHaveBeenCalledTimes(1);

    // Simula desmontar a aba e voltar para ela
    firstRender.unmount();
    loadFeed.mockClear();

    const secondRender = renderHook(() => useSocialFeedState());
    // Posts aparecem imediatamente (sem loading)
    expect(secondRender.result.current.isLoading).toBe(false);
    expect(secondRender.result.current.posts[0]?.id).toBe("p-1");
    // Nenhuma nova requisição de rede
    expect(loadFeed).not.toHaveBeenCalled();
  });

  it("atualiza o avatar de posts e treinos ao vivo quando o perfil muda", async () => {
    let handler: ((event: { type: "PROFILE_UPDATED"; data: { userId: string; fullName: string; username: string; profilePicture: string | null } }) => void) | undefined;
    loadLive.mockResolvedValue([{ id: "friend-1", name: "Friend", initials: "FR", photoUrl: null, groups: [], elapsedSeconds: 0 }]);
    subscribeSocialEvents.mockImplementation(async (onEvent: typeof handler) => {
      handler = onEvent;
    });

    const { result } = renderHook(() => useSocialFeedState());
    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    await waitFor(() => expect(result.current.liveFriends).toHaveLength(1));

    act(() => handler?.({ type: "PROFILE_UPDATED", data: {
      userId: "friend-1", fullName: "Friend Updated", username: "friend-updated", profilePicture: "/api/media/new-avatar",
    } }));

    await waitFor(() => expect(result.current.posts[0]?.authorAvatarUrl).toBe("/api/media/new-avatar"));
    expect(result.current.posts[0]?.author).toBe("Friend Updated");
    expect(result.current.posts[0]?.initials).toBe("FU");
    expect(result.current.liveFriends[0]?.photoUrl).toBe("/api/media/new-avatar");
  });

  it("exclui treino do feed, atualiza cache em memória, invalida storage e aciona callback", async () => {
    const onWorkoutDeleted = vi.fn();
    loadFeed.mockResolvedValue({
      posts: [
        { id: "post-1", workoutSessionId: "session-1", authorId: "user-1", author: "User", username: "@user", initials: "US", authorAvatarUrl: null, likes: 0, liked: false },
        { id: "post-2", workoutSessionId: "session-2", authorId: "friend-1", author: "Friend", username: "@friend", initials: "FR", authorAvatarUrl: null, likes: 0, liked: false },
      ],
      last: true,
    });

    const { result, unmount } = renderHook(() => useSocialFeedState({ onWorkoutDeleted }));
    await waitFor(() => expect(result.current.posts).toHaveLength(2));

    await act(async () => {
      await result.current.handleDeletePost("post-1");
    });

    expect(deleteWorkout).toHaveBeenCalledWith("session-1");
    expect(result.current.posts).toHaveLength(1);
    expect(result.current.posts[0].id).toBe("post-2");
    expect(invalidateWorkoutCaches).toHaveBeenCalledWith("user-1");
    expect(onWorkoutDeleted).toHaveBeenCalled();

    // Ao remontar, o cache em memória não deve ressuscitar o post excluído
    unmount();
    loadFeed.mockClear();

    const secondRender = renderHook(() => useSocialFeedState());
    expect(secondRender.result.current.posts).toHaveLength(1);
    expect(secondRender.result.current.posts[0].id).toBe("post-2");
    expect(loadFeed).not.toHaveBeenCalled();
  });
});
