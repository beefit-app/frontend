import { toast } from "sonner";
import { messages } from "../../../constants/messages";
import { useConfirm } from "../../../hooks/useConfirm";
import { useEffect, useRef, useState } from "react";
import { socialFeedService } from "../../../services/socialFeedService";
import { workoutService } from "../../../services/workoutService";
import { socialFeedStorage } from "../../../storage/socialFeedStorage";
import { pageCacheStorage } from "../../../storage/pageCacheStorage";
import { useAuth } from "../../../auth/AuthContext";
import { subscribeSocialEvents } from "../../../services/socialEventsService";
import { normalizeMuscleGroupLabels } from "../../../services/muscleGroups";
import type { LiveFriend, SocialFeedPost } from "../types";

const FEED_TTL_MS = 5 * 60 * 1000;
const FEED_CACHE_KEY = "feed.page-0";
const LIVE_FRIENDS_TTL_MS = 30 * 1000;

interface FeedMemoryCache {
  userId: string | null;
  posts: SocialFeedPost[];
  hasMore: boolean;
  page: number;
  savedAt: number;
}

let feedMemoryCache: FeedMemoryCache | null = null;
let lastLiveFriendsFetchedAt = 0;

export function resetFeedCache() {
  feedMemoryCache = null;
  lastLiveFriendsFetchedAt = 0;
}

function normalizeLiveFriend(friend: LiveFriend): LiveFriend {
  async function handleDeletePost(postId: string | number) {
    const ok = await confirmDialog({
      title: "Apagar Treino",
      message: "Tem certeza que deseja apagar este treino? Essa ação não pode ser desfeita.",
      confirmText: "Apagar",
      cancelText: "Cancelar"
    });
    if (!ok) return;
    try {
      await workoutService.deleteWorkout(String(postId));
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Treino apagado com sucesso.");
    } catch (e) {
      toast.error("Não foi possível apagar o treino.");
    }
  }

  return {
    ...friend,
    // Os eventos SSE entregam o grupo cru (slug ou enum); o caminho REST ja chega
    // rotulado por toLiveFriend. Normalizar aqui cobre os dois.
    groups: normalizeMuscleGroupLabels(friend.groups),
    elapsedSeconds: Math.max(0, friend.elapsedSeconds),
  };
}

function initials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function useSocialFeedState() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  // O dialogo e devolvido para a view montar: este arquivo e .ts e nao renderiza.
  const { confirm, dialog: confirmDialog } = useConfirm();

  const isCacheForUser = feedMemoryCache !== null && feedMemoryCache.userId === userId;
  const isMemoryFresh = isCacheForUser && Date.now() - feedMemoryCache!.savedAt < FEED_TTL_MS;

  const initialPosts = isCacheForUser ? feedMemoryCache!.posts : [];
  const initialHasMore = isCacheForUser ? feedMemoryCache!.hasMore : true;
  const initialPage = isCacheForUser ? feedMemoryCache!.page : 0;
  const initialLoading = initialPosts.length === 0;

  const [posts, setPosts] = useState<SocialFeedPost[]>(initialPosts);
  const [liveFriends, setLiveFriends] = useState<LiveFriend[]>(() => socialFeedStorage.getLiveFriends());
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  // Um evento pode chegar enquanto a primeira página ainda está em trânsito. O
  // contador pendente é aplicado à resposta para que ela não reverta o SSE.
  const likeCountsByPostId = useRef(new Map<string, number>());

  function withPendingLikeCounts(nextPosts: SocialFeedPost[]) {
    return nextPosts.map((post) => {
      const likes = likeCountsByPostId.current.get(String(post.id));
      return likes === undefined ? post : { ...post, likes };
    });
  }

  async function loadFirstPage({ hydrateCache = false, silent = false } = {}) {
    if (!silent) {
      setIsLoading(!hydrateCache);
    }
    setError(null);
    if (hydrateCache && posts.length === 0) {
      const cached = await pageCacheStorage.get<{ posts: SocialFeedPost[]; last: boolean }>(userId, FEED_CACHE_KEY, FEED_TTL_MS);
      if (cached && cached.posts.length > 0) {
        const postsWithLikes = withPendingLikeCounts(cached.posts);
        setPosts(postsWithLikes);
        setHasMore(!cached.last);
        setPage(0);
        setIsLoading(false);
        feedMemoryCache = {
          userId,
          posts: postsWithLikes,
          hasMore: !cached.last,
          page: 0,
          savedAt: Date.now(),
        };
        return;
      }
    }
    try {
      const response = await socialFeedService.load(0);
      const postsWithLikes = withPendingLikeCounts(response.posts);
      setPosts(postsWithLikes);
      setHasMore(!response.last);
      setPage(0);
      feedMemoryCache = {
        userId,
        posts: postsWithLikes,
        hasMore: !response.last,
        page: 0,
        savedAt: Date.now(),
      };
      void pageCacheStorage.set(userId, FEED_CACHE_KEY, response);
    } catch (err) {
      if (!silent || posts.length === 0) {
        setError(err instanceof Error ? err.message : "Não foi possível carregar o feed.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isMemoryFresh && posts.length > 0) {
      return;
    }
    const silent = posts.length > 0;
    void loadFirstPage({ hydrateCache: posts.length === 0, silent });
  }, [userId]);

  useEffect(() => {
    const now = Date.now();
    if (now - lastLiveFriendsFetchedAt < LIVE_FRIENDS_TTL_MS && liveFriends.length > 0) {
      return;
    }

    let active = true;
    void socialFeedService.loadLive()
      .then((friends) => {
        if (!active) return;
        lastLiveFriendsFetchedAt = Date.now();
        setLiveFriends(friends.map(normalizeLiveFriend));
      })
      .catch(() => {
        if (!active) return;
        setLiveFriends([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (liveFriends.length === 0) {
      socialFeedStorage.clearLiveFriends();
    } else {
      socialFeedStorage.setLiveFriends(liveFriends);
    }
  }, [liveFriends]);

  useEffect(() => {
    const controller = new AbortController();
    void subscribeSocialEvents((event) => {
      if (event.type === "POST_LIKED") {
        const { postId, totalLikes } = event.data;
        likeCountsByPostId.current.set(postId, totalLikes);
        setPosts((current) => {
          const next = current.map((post) =>
            String(post.id) === postId ? { ...post, likes: totalLikes } : post,
          );
          if (feedMemoryCache?.userId === userId) feedMemoryCache.posts = next;
          return next;
        });
        return;
      }
      if (event.type === "PROFILE_UPDATED") {
        const { data } = event;
        setPosts((current) => {
          const next = current.map((post) => post.authorId === data.userId
            ? { ...post, author: data.fullName, username: `@${data.username.replace(/^@/, "")}`, initials: initials(data.fullName), authorAvatarUrl: data.profilePicture }
            : post);
          if (feedMemoryCache?.userId === userId) feedMemoryCache.posts = next;
          return next;
        });
        setLiveFriends((current) => current.map((friend) => String(friend.id) === data.userId
          ? { ...friend, name: data.fullName, initials: initials(data.fullName), photoUrl: data.profilePicture }
          : friend));
        void pageCacheStorage.remove(userId, FEED_CACHE_KEY);
        return;
      }
      if (event.type === "WORKOUT_FINISHED") {
        resetFeedCache();
        void pageCacheStorage.remove(userId, FEED_CACHE_KEY);
        void loadFirstPage();
      }
      if (event.type === "WORKOUT_CANCELED") {
        setLiveFriends((current) => current.filter((item) => String(item.id) !== event.data.userId));
        return;
      }
      if (event.type === "WORKOUT_STARTED" || event.type === "WORKOUT_MUSCLE_GROUP_ADDED") {
        const { data } = event;
        setLiveFriends((current) => {
          const existing = current.find((item) => String(item.id) === data.userId);
          const next = normalizeLiveFriend({
            id: data.userId,
            name: data.fullName,
            initials: initials(data.fullName),
            photoUrl: data.profilePicture ?? existing?.photoUrl ?? null,
            groups: data.muscleGroups,
            elapsedSeconds: existing?.elapsedSeconds ?? Math.max(0, Math.floor((Date.now() - new Date(data.occurredAt).getTime()) / 1000)),
          });
          return [...current.filter((item) => String(item.id) !== data.userId), next];
        });
      }
    }, controller.signal);
    return () => { controller.abort(); };
  }, [userId]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setLiveFriends((current) => current.map((friend) => ({ ...friend, elapsedSeconds: friend.elapsedSeconds + 1 }))),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);

  async function toggleLike(id: string | number) {
    let previousLiked = false;
    let previousLikes = 0;

    // 1. Atualização otimista imediata na UI e memória (0ms)
    setPosts((current) => {
      const target = current.find((p) => p.id === id);
      if (target) {
        previousLiked = target.liked;
        previousLikes = target.likes;
      }
      const nextLiked = !target?.liked;
      const nextLikes = Math.max(0, (target?.likes ?? 0) + (nextLiked ? 1 : -1));
      const next = current.map((post) =>
        post.id === id ? { ...post, liked: nextLiked, likes: nextLikes } : post,
      );
      if (feedMemoryCache && feedMemoryCache.userId === userId) {
        feedMemoryCache.posts = next;
      }
      return next;
    });
    void pageCacheStorage.remove(userId, FEED_CACHE_KEY);

    // 2. Chamada assíncrona para sincronizar com o backend
    try {
      const result = await socialFeedService.toggleLike(id);
      setPosts((current) => {
        const next = current.map((post) =>
          post.id === id ? { ...post, liked: result.liked, likes: result.likes_count } : post,
        );
        if (feedMemoryCache && feedMemoryCache.userId === userId) {
          feedMemoryCache.posts = next;
        }
        return next;
      });
    } catch {
      // Reverte em caso de falha de conexão
      setPosts((current) => {
        const next = current.map((post) =>
          post.id === id ? { ...post, liked: previousLiked, likes: previousLikes } : post,
        );
        if (feedMemoryCache && feedMemoryCache.userId === userId) {
          feedMemoryCache.posts = next;
        }
        return next;
      });
    }
  }

  async function saveTemplate(id: string | number) {
    const post = posts.find((p) => p.id === id);
    const templateName = post?.title || (post ? `Treino de ${post.author}` : "Meu Treino Importado");
    const confirmed = await confirm({
      title: "Copiar treino?",
      description: `"${templateName}" será salvo como template no seu inventário.`,
      confirmLabel: "Copiar",
    });
    if (!confirmed) return;
    try {
      await socialFeedService.importTemplate(id, templateName);
      setPosts((current) => {
        const next = current.map((p) => (p.id === id ? { ...p, templateSaved: true } : p));
        if (feedMemoryCache && feedMemoryCache.userId === userId) {
          feedMemoryCache.posts = next;
        }
        return next;
      });
      void pageCacheStorage.remove(userId, "workout.templates");
    } catch {
      toast.error(messages.actionFailed("copiar o treino"));
    }
  }

  async function loadMore() {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await socialFeedService.load(nextPage);
      setPosts((current) => {
        const next = [...current, ...withPendingLikeCounts(response.posts)];
        if (feedMemoryCache && feedMemoryCache.userId === userId) {
          feedMemoryCache.posts = next;
          feedMemoryCache.page = nextPage;
          feedMemoryCache.hasMore = !response.last;
          feedMemoryCache.savedAt = Date.now();
        }
        return next;
      });
      setHasMore(!response.last);
      setPage(nextPage);
    } catch {
      // Mantem os posts atuais; o usuário pode rolar novamente para tentar de novo.
    } finally {
      setIsLoadingMore(false);
    }
  }

  function retry() {
    void loadFirstPage({ hydrateCache: false, silent: false });
  }

  async function handleDeletePost(postId: string | number) {
    const ok = await confirmDialog({
      title: "Apagar Treino",
      message: "Tem certeza que deseja apagar este treino? Essa ação não pode ser desfeita.",
      confirmText: "Apagar",
      cancelText: "Cancelar"
    });
    if (!ok) return;
    try {
      await workoutService.deleteWorkout(String(postId));
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Treino apagado com sucesso.");
    } catch (e) {
      toast.error("Não foi possível apagar o treino.");
    }
  }

  return {
    confirmDialog,
    posts,
    liveFriends,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore: () => void loadMore(),
    retry,
    toggleLike: (id: string | number) => void toggleLike(id),
    saveTemplate: (id: string | number) => void saveTemplate(id),
  };
}
