import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { SocialEvent } from "../../../services/socialEventsService";


const loadFeed = vi.hoisted(() => vi.fn());
const loadLive = vi.hoisted(() => vi.fn());
const getCachedPage = vi.hoisted(() => vi.fn());
const removeCachedPage = vi.hoisted(() => vi.fn());
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
    get: getCachedPage, set: vi.fn(), remove: removeCachedPage,
  },
  invalidateWorkoutCaches,
}));
import { resetFeedCache, useSocialFeedState } from "./useSocialFeedState";
import { useSocialVisibility } from "../../../hooks/useSocialVisibility";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((ok) => { resolve = ok; });
  return { promise, resolve };
}

function emitSocialEvent(event: SocialEvent) {
  for (const [onEvent, signal] of subscribeSocialEvents.mock.calls) {
    if (!signal.aborted) onEvent(event);
  }
}

const friend = { id: "friend-1", name: "Friend", initials: "FR", photoUrl: null, groups: [], elapsedSeconds: 0 };
const friendPost = { id: "p-1", authorId: "friend-1", author: "Friend", username: "@friend", initials: "FR", authorAvatarUrl: null, likes: 2, liked: false };

// A sessão e o feed são montados juntos neste seam, como no App.
function useSessionFeed() {
  useSocialVisibility("user-1");
  return useSocialFeedState();
}

describe("useSocialFeedState", () => {
  beforeEach(() => {
    resetFeedCache();
    window.localStorage.clear();
    loadFeed.mockReset().mockResolvedValue({ posts: [{ id: "p-1", authorId: "friend-1", author: "Friend", username: "@friend", initials: "FR", authorAvatarUrl: null, likes: 2, liked: false }], last: true });
    loadLive.mockReset().mockResolvedValue([]);
    getCachedPage.mockReset().mockResolvedValue(null);
    removeCachedPage.mockReset().mockResolvedValue(undefined);
    subscribeSocialEvents.mockReset().mockResolvedValue(undefined);
    deleteWorkout.mockReset().mockResolvedValue(undefined);
    invalidateWorkoutCaches.mockReset().mockResolvedValue(undefined);
    confirmModal.mockReset().mockResolvedValue(true);
  });

  it.each<SocialEvent>([
    { type: "SOCIAL_VISIBILITY_CHANGED", data: {} },
    { type: "FRIEND_REMOVED", data: {
      friendshipId: "conexao-1", friendId: "friend-1", friendFullName: "Friend", friendUsername: "friend", removedAt: "2026-01-01T00:00:00Z",
    } },
  ])("limpa a presença e revalida a primeira página após $type", async (event) => {
    loadLive.mockResolvedValueOnce([friend]);
    loadFeed.mockResolvedValueOnce({ posts: [friendPost], last: false });
    const { result } = renderHook(useSessionFeed);
    await waitFor(() => expect(result.current.liveFriends).toHaveLength(1));
    await waitFor(() => expect(result.current.posts).toHaveLength(1));

    const oldPage = deferred<{ posts: typeof friendPost[]; last: boolean }>();
    const newPage = deferred<{ posts: typeof friendPost[]; last: boolean }>();
    const newLive = deferred<typeof friend[]>();
    loadFeed.mockReturnValueOnce(oldPage.promise).mockReturnValueOnce(newPage.promise);
    loadLive.mockReturnValueOnce(newLive.promise);
    act(() => result.current.loadMore());
    act(() => emitSocialEvent(event));

    expect(result.current.liveFriends).toEqual([]);
    expect(result.current.posts).toEqual([]);
    expect(loadFeed.mock.calls).toEqual([[0], [1], [0]]);
    expect(loadLive).toHaveBeenCalledTimes(2);

    await act(async () => {
      newPage.resolve({ posts: [], last: true });
      newLive.resolve([]);
    });
    await act(async () => oldPage.resolve({ posts: [{ ...friendPost, id: "p-2" }], last: false }));
    expect(result.current.posts).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });

  it("descarta respostas da presença e da primeira página iniciadas antes da invalidação", async () => {
    const oldPage = deferred<{ posts: typeof friendPost[]; last: boolean }>();
    const oldLive = deferred<typeof friend[]>();
    const allowedPost = { ...friendPost, id: "proprio", authorId: "user-1" };
    loadFeed.mockReturnValueOnce(oldPage.promise).mockResolvedValueOnce({ posts: [allowedPost], last: true });
    loadLive.mockReturnValueOnce(oldLive.promise).mockResolvedValueOnce([]);
    const { result } = renderHook(useSessionFeed);
    await waitFor(() => expect(loadFeed).toHaveBeenCalledWith(0));

    await act(async () => emitSocialEvent({ type: "SOCIAL_VISIBILITY_CHANGED", data: {} }));
    expect(result.current.posts).toEqual([allowedPost]);

    await act(async () => {
      oldPage.resolve({ posts: [friendPost], last: false });
      oldLive.resolve([friend]);
    });
    expect(result.current.posts).toEqual([allowedPost]);
    expect(result.current.liveFriends).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });

  it("revalida na volta ao primeiro plano e na reconexão, agrupando sinais de retomada", async () => {
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    try {
      loadLive.mockResolvedValueOnce([friend]);
      const { result } = renderHook(useSessionFeed);
      await waitFor(() => expect(result.current.liveFriends).toHaveLength(1));
      expect(loadFeed).toHaveBeenCalledTimes(1);

      act(() => document.dispatchEvent(new Event("visibilitychange")));
      expect(loadLive).toHaveBeenCalledTimes(1);

      loadLive.mockResolvedValueOnce([]);
      loadFeed.mockResolvedValueOnce({ posts: [], last: true });
      await act(async () => {
        visibility.mockReturnValue("visible");
        document.dispatchEvent(new Event("visibilitychange"));
        window.dispatchEvent(new Event("online"));
      });
      expect(result.current.liveFriends).toEqual([]);
      expect(result.current.posts).toEqual([]);
      expect(loadLive).toHaveBeenCalledTimes(2);
      expect(loadFeed.mock.calls).toEqual([[0], [0]]);

      loadLive.mockResolvedValueOnce([friend]);
      await act(async () => window.dispatchEvent(new Event("beefit:social-connected")));
      expect(result.current.liveFriends.map(({ id }) => id)).toEqual([friend.id]);
      expect(loadLive).toHaveBeenCalledTimes(3);
      expect(loadFeed.mock.calls).toEqual([[0], [0], [0]]);
    } finally {
      visibility.mockRestore();
    }
  });

  it("descarta o cache invalidado enquanto o feed não está montado", async () => {
    const session = renderHook(() => useSocialVisibility("user-1"));
    const previous = renderHook(() => useSocialFeedState());
    await waitFor(() => expect(previous.result.current.posts).toEqual([friendPost]));
    previous.unmount();
    loadFeed.mockClear();
    act(() => emitSocialEvent({ type: "SOCIAL_VISIBILITY_CHANGED", data: {} }));
    expect(loadFeed).not.toHaveBeenCalled();

    loadFeed.mockResolvedValueOnce({ posts: [], last: true });
    const next = renderHook(() => useSocialFeedState());
    expect(next.result.current.posts).toEqual([]);
    await waitFor(() => expect(next.result.current.isLoading).toBe(false));
    expect(loadFeed).toHaveBeenCalledExactlyOnceWith(0);
    expect(next.result.current.posts).toEqual([]);
    session.unmount();
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

  it("não hidrata presença armazenada e limpa a chave legada na abertura", async () => {
    const legacyKey = "beefit.feed.live-friends";
    window.localStorage.setItem(legacyKey, JSON.stringify([friend]));
    loadLive.mockResolvedValueOnce([friend]);
    const { result } = renderHook(useSessionFeed);

    expect(result.current.liveFriends).toEqual([]);
    expect(window.localStorage.getItem(legacyKey)).toBeNull();
    await waitFor(() => expect(result.current.liveFriends).toHaveLength(1));
    expect(window.localStorage.getItem(legacyKey)).toBeNull();
  });

  it("na primeira abertura mostra apenas a página recebida da API, não o feed legado", async () => {
    getCachedPage.mockResolvedValue({ posts: [friendPost], last: true });
    const page = deferred<{ posts: typeof friendPost[]; last: boolean }>();
    loadFeed.mockReturnValueOnce(page.promise);

    const { result } = renderHook(useSessionFeed);
    await waitFor(() => expect(loadFeed).toHaveBeenCalledWith(0));
    expect(result.current.posts).toEqual([]);
    expect(removeCachedPage).toHaveBeenCalledWith("user-1", "feed.page-0");
    expect(getCachedPage).not.toHaveBeenCalled();

    const ownPost = { ...friendPost, id: "own", authorId: "user-1", author: "Eu" };
    await act(async () => page.resolve({ posts: [ownPost], last: true }));
    expect(result.current.posts).toEqual([ownPost]);
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
    // A presença é consultada de novo, mas a página de posts continua em cache.
    await act(async () => {});
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
    await act(async () => {});
    expect(loadFeed).not.toHaveBeenCalled();
  });
});
