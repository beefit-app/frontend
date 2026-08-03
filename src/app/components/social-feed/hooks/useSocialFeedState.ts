import { useCallback, useEffect, useRef, useState } from "react";
import { socialFeedService } from "../../../services/socialFeedService";
import type { LiveFriend, SocialFeedPost } from "../types";
import { subscribeSocialEvents, type WorkoutPresenceEvent } from "../../../services/socialEventsService";
import { socialFeedStorage } from "../../../storage/socialFeedStorage";

const PRESENCE_GROUP_LABELS: Record<string, string> = {
  peito: "Peito",
  costas: "Costas",
  pernas: "Pernas",
  gluteos: "Glúteos",
  ombros: "Ombros",
  bracos: "Braços",
  core: "Core",
  trapezio: "Trapézio",
  CHEST: "Peito",
  BACK: "Costas",
  LEGS: "Pernas",
  GLUTES: "Glúteos",
  SHOULDERS: "Ombros",
  ARMS: "Braços",
  CORE: "Core",
  TRAPS: "Trapézio",
};

function normalizePresenceGroups(groups: string[]) {
  return Array.from(
    new Set(
      groups
        .map((group) => PRESENCE_GROUP_LABELS[group] ?? group)
        .filter((group) => group.trim().length > 0),
    ),
  );
}

function normalizeLiveFriend(friend: LiveFriend): LiveFriend {
  return {
    ...friend,
    groups: normalizePresenceGroups(friend.groups ?? []),
  };
}

export function useSocialFeedState() {
  const [posts, setPosts] = useState<SocialFeedPost[]>([]);
  const [liveFriends, setLiveFriends] = useState<LiveFriend[]>(() => socialFeedStorage.getLiveFriends());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const loadPage = useCallback(async (targetPage: number, replace = false) => {
    if (loadingRef.current || (!replace && !hasMoreRef.current)) return;
    loadingRef.current = true;
    if (replace) setIsLoading(true);
    else setIsLoadingMore(true);
    setError(null);
    try {
      const result = await socialFeedService.load(targetPage);
      setPosts((current) => {
        const merged = replace ? result.posts : [...current, ...result.posts];
        return Array.from(new Map(merged.map((post) => [String(post.id), post])).values());
      });
      const nextHasMore = !result.last;
      hasMoreRef.current = nextHasMore;
      setPage(targetPage); setHasMore(nextHasMore);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar o feed."); }
    finally { loadingRef.current = false; setIsLoading(false); setIsLoadingMore(false); }
  }, []);

  useEffect(() => { void loadPage(0, true); }, [loadPage]);
  const loadMore = useCallback(() => void loadPage(page + 1), [loadPage, page]);
  const retry = useCallback(() => void loadPage(posts.length ? page + 1 : 0, posts.length === 0), [loadPage, page, posts.length]);

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
    const list = liveFriends.filter((item) => item.id !== "__self__");
    if (list.length > 0) {
      socialFeedStorage.setLiveFriends(list);
    } else {
      socialFeedStorage.clearLiveFriends();
    }
  }, [liveFriends]);

  useEffect(() => {
    const controller = new AbortController();
    void subscribeSocialEvents((type, data) => {
      if (!("userId" in data)) return;
      const event = data as WorkoutPresenceEvent;
      if (type === "WORKOUT_FINISHED" || type === "WORKOUT_CANCELED") {
        setLiveFriends((current) => current.filter((item) => String(item.id) !== event.userId && String(item.id) !== "__self__"));
        return;
      }
      if (type === "WORKOUT_STARTED" || type === "WORKOUT_MUSCLE_GROUP_ADDED") setLiveFriends((current) => {
        const existing = current.find((item) => String(item.id) === event.userId);
        const next: LiveFriend = normalizeLiveFriend({
          id: event.userId,
          name: event.fullName,
          initials: event.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join(""),
          photoUrl: existing?.photoUrl ?? null,
          groups: event.muscleGroups ?? [],
          elapsedSeconds: existing?.elapsedSeconds ?? Math.max(0, Math.floor((Date.now() - new Date(event.occurredAt).getTime()) / 1000)),
        });
        return [...current.filter((item) => String(item.id) !== event.userId), next];
      });
    }, controller.signal);
    return () => { controller.abort(); };
  }, []);
  useEffect(() => { const timer = window.setInterval(() => setLiveFriends((current) => current.map((friend) => ({ ...friend, elapsedSeconds: friend.elapsedSeconds + 1 }))), 1000); return () => window.clearInterval(timer); }, []);
  async function toggleLike(id: string | number) { const result = await socialFeedService.toggleLike(id); setPosts((current) => current.map((post) => post.id === id ? { ...post, liked: result.liked, likes: result.likes_count } : post)); }
  async function saveTemplate(id: string | number) {
    const post = posts.find((p) => p.id === id);
    const templateName = post?.title || (post ? `Treino de ${post.author}` : "Meu Treino Importado");
    const confirmCopy = window.confirm(`Deseja copiar o template "${templateName}" para o seu inventário?`);
    if (!confirmCopy) return;
    try {
      await socialFeedService.importTemplate(id, templateName);
      setPosts((current) => current.map((post) => post.id === id ? { ...post, templateSaved: true } : post));
    } catch {
      alert("Não foi possível copiar o treino.");
    }
  }
  return { posts, liveFriends, isLoading, isLoadingMore, hasMore, error, loadMore, retry, toggleLike: (id: string | number) => void toggleLike(id), saveTemplate: (id: string | number) => void saveTemplate(id) };
}
