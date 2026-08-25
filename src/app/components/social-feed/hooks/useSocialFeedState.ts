import { toast } from "sonner";
import { messages } from "../../../constants/messages";
import { useConfirm } from "../../../hooks/useConfirm";
import { useEffect, useState } from "react";
import { socialFeedService } from "../../../services/socialFeedService";
import { socialFeedStorage } from "../../../storage/socialFeedStorage";
import { pageCacheStorage } from "../../../storage/pageCacheStorage";
import { useAuth } from "../../../auth/AuthContext";
import { subscribeSocialEvents, type WorkoutPresenceEvent } from "../../../services/socialEventsService";
import { normalizeMuscleGroupLabels } from "../../../services/muscleGroups";
import type { LiveFriend, SocialFeedPost } from "../types";

const FEED_TTL_MS = 2 * 60 * 1000;
const FEED_CACHE_KEY = "feed.page-0";

function normalizeLiveFriend(friend: LiveFriend): LiveFriend {
  return {
    ...friend,
    // Os eventos SSE entregam o grupo cru (slug ou enum); o caminho REST ja chega
    // rotulado por toLiveFriend. Normalizar aqui cobre os dois.
    groups: normalizeMuscleGroupLabels(friend.groups),
    elapsedSeconds: Math.max(0, friend.elapsedSeconds),
  };
}

export function useSocialFeedState() {
  const { user } = useAuth();
  // O dialogo e devolvido para a view montar: este arquivo e .ts e nao renderiza.
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [posts, setPosts] = useState<SocialFeedPost[]>([]);
  const [liveFriends, setLiveFriends] = useState<LiveFriend[]>(() => socialFeedStorage.getLiveFriends());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  async function loadFirstPage({ hydrateCache = false } = {}) {
    setIsLoading(!hydrateCache);
    setError(null);
    if (hydrateCache) {
      const cached = await pageCacheStorage.get<{ posts: SocialFeedPost[]; last: boolean }>(user?.id, FEED_CACHE_KEY, FEED_TTL_MS);
      if (cached) {
        setPosts(cached.posts);
        setHasMore(!cached.last);
        setPage(0);
        setIsLoading(false);
        return;
      }
    }
    try {
      const response = await socialFeedService.load(0);
      setPosts(response.posts);
      setHasMore(!response.last);
      setPage(0);
      void pageCacheStorage.set(user?.id, FEED_CACHE_KEY, response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o feed.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadFirstPage({ hydrateCache: true });
  }, []);

  useEffect(() => {
    let active = true;
    void socialFeedService.loadLive()
      .then((friends) => {
        if (!active) return;
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
    void subscribeSocialEvents((type, data) => {
      if (type === "WORKOUT_FINISHED") {
        void pageCacheStorage.remove(user?.id, FEED_CACHE_KEY);
        void loadFirstPage();
      }
      if (!("userId" in data)) return;
      const event = data as WorkoutPresenceEvent;
      if (type === "WORKOUT_FINISHED" || type === "WORKOUT_CANCELED") {
        setLiveFriends((current) => current.filter((item) => String(item.id) !== event.userId));
        return;
      }
      if (type === "WORKOUT_STARTED" || type === "WORKOUT_MUSCLE_GROUP_ADDED") {
        setLiveFriends((current) => {
          const existing = current.find((item) => String(item.id) === event.userId);
          const next = normalizeLiveFriend({
            id: event.userId,
            name: event.fullName,
            initials: event.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join(""),
            photoUrl: existing?.photoUrl ?? null,
            groups: event.muscleGroups ?? [],
            elapsedSeconds: existing?.elapsedSeconds ?? Math.max(0, Math.floor((Date.now() - new Date(event.occurredAt).getTime()) / 1000)),
          });
          return [...current.filter((item) => String(item.id) !== event.userId), next];
        });
      }
    }, controller.signal);
    return () => { controller.abort(); };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(
      () => setLiveFriends((current) => current.map((friend) => ({ ...friend, elapsedSeconds: friend.elapsedSeconds + 1 }))),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);

  async function toggleLike(id: string | number) {
    const result = await socialFeedService.toggleLike(id);
    setPosts((current) => current.map((post) => (post.id === id ? { ...post, liked: result.liked, likes: result.likes_count } : post)));
    void pageCacheStorage.remove(user?.id, FEED_CACHE_KEY);
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
      setPosts((current) => current.map((post) => (post.id === id ? { ...post, templateSaved: true } : post)));
      void pageCacheStorage.remove(user?.id, "workout.templates");
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
      setPosts((current) => [...current, ...response.posts]);
      setHasMore(!response.last);
      setPage(nextPage);
    } catch {
      // Mantem os posts atuais; o usuário pode rolar novamente para tentar de novo.
    } finally {
      setIsLoadingMore(false);
    }
  }

  function retry() {
    void loadFirstPage();
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
