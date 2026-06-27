import { useCallback, useEffect, useRef, useState } from "react";
import { socialFeedService } from "../../../services/socialFeedService";
import type { LiveFriend, SocialFeedPost } from "../types";
import { subscribeSocialEvents, type WorkoutPresenceEvent } from "../../../services/socialEventsService";
import { socialFeedStorage } from "../../../storage/socialFeedStorage";

export function useSocialFeedState() {
  const [posts, setPosts] = useState<SocialFeedPost[]>([]);
  const [liveFriends, setLiveFriends] = useState<LiveFriend[]>(() => socialFeedStorage.getLiveFriends());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const loadPage = useCallback(async (targetPage: number, replace = false) => {
    if (loadingRef.current || (!replace && !hasMore)) return;
    loadingRef.current = true; replace ? setIsLoading(true) : setIsLoadingMore(true); setError(null);
    try {
      const result = await socialFeedService.load(targetPage);
      setPosts((current) => {
        const merged = replace ? result.posts : [...current, ...result.posts];
        return Array.from(new Map(merged.map((post) => [String(post.id), post])).values());
      });
      setPage(targetPage); setHasMore(!result.last);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar o feed."); }
    finally { loadingRef.current = false; setIsLoading(false); setIsLoadingMore(false); }
  }, [hasMore]);

  useEffect(() => { void loadPage(0, true); }, [loadPage]);
  const loadMore = useCallback(() => void loadPage(page + 1), [loadPage, page]);
  const retry = useCallback(() => void loadPage(posts.length ? page + 1 : 0, posts.length === 0), [loadPage, page, posts.length]);

  useEffect(() => {
    if (liveFriends.length === 0) {
      socialFeedStorage.clearLiveFriends();
      return;
    }
    socialFeedStorage.setLiveFriends(liveFriends);
  }, [liveFriends]);

  useEffect(() => {
    const controller = new AbortController(); let retryTimer: number | null = null;
    const connect = () => void subscribeSocialEvents((type, data) => {
      if (!("userId" in data)) return;
      const event = data as WorkoutPresenceEvent;
      if (type === "WORKOUT_FINISHED" || type === "WORKOUT_CANCELED") { setLiveFriends((current) => current.filter((item) => String(item.id) !== event.userId)); return; }
      if (type === "WORKOUT_STARTED" || type === "WORKOUT_MUSCLE_GROUP_ADDED") setLiveFriends((current) => {
        const next: LiveFriend = { id: event.userId, name: event.fullName, initials: event.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join(""), photoUrl: null, groups: event.muscleGroups, elapsedSeconds: Math.max(0, Math.floor((Date.now() - new Date(event.occurredAt).getTime()) / 1000)) };
        return [...current.filter((item) => String(item.id) !== event.userId), next];
      });
    }, controller.signal).catch(() => { if (!controller.signal.aborted) retryTimer = window.setTimeout(connect, 3000); });
    connect(); return () => { controller.abort(); if (retryTimer) window.clearTimeout(retryTimer); };
  }, []);
  useEffect(() => { const timer = window.setInterval(() => setLiveFriends((current) => current.map((friend) => ({ ...friend, elapsedSeconds: friend.elapsedSeconds + 1 }))), 1000); return () => window.clearInterval(timer); }, []);
  async function toggleLike(id: string | number) { const result = await socialFeedService.toggleLike(id); setPosts((current) => current.map((post) => post.id === id ? { ...post, liked: result.liked, likes: result.likes_count } : post)); }
  async function saveTemplate(id: string | number) { await socialFeedService.importTemplate(id); setPosts((current) => current.map((post) => post.id === id ? { ...post, templateSaved: true } : post)); }
  return { posts, liveFriends, isLoading, isLoadingMore, hasMore, error, loadMore, retry, toggleLike: (id: string | number) => void toggleLike(id), saveTemplate: (id: string | number) => void saveTemplate(id) };
}
