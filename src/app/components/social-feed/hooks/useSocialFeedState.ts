import { useCallback, useEffect, useRef, useState } from "react";
import { socialFeedService } from "../../../services/socialFeedService";
import { socialPresenceService } from "../../../services/socialPresenceService";
import type { LiveFriend } from "../types";

export function useSocialFeedState() {
  const [posts, setPosts] = useState(() => socialFeedService.getInitialPosts());
  const [liveFriends, setLiveFriends] = useState<LiveFriend[]>([]);

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
    const abortController = new AbortController();

    function buildInitials(fullName: string) {
      return fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");
    }

    function normalizeGroups(groups: string[]) {
      return groups.map((group) => {
        const normalized = group.trim().toLowerCase();
        if (normalized === "chest" || normalized === "peito") return "Peito";
        if (normalized === "back" || normalized === "costas") return "Costas";
        if (normalized === "legs" || normalized === "pernas") return "Pernas";
        if (normalized === "shoulders" || normalized === "ombros") return "Ombros";
        if (normalized === "arms" || normalized === "bracos" || normalized === "braços") return "Braços";
        if (normalized === "core") return "Core";
        return group;
      });
    }

    void socialPresenceService.subscribe((event) => {
      setLiveFriends((current) => {
        if (event.eventType === "WORKOUT_FINISHED" || event.eventType === "WORKOUT_CANCELED") {
          return current.filter((friend) => friend.id !== event.userId);
        }

        const occurredAt = new Date(event.occurredAt).getTime();
        const nextFriend: LiveFriend = {
          id: event.userId,
          name: event.fullName,
          initials: buildInitials(event.fullName),
          photoUrl: null,
          groups: normalizeGroups(event.muscleGroups),
          elapsedSeconds: Math.max(0, Math.floor((Date.now() - occurredAt) / 1000)),
        };

        const existingIndex = current.findIndex((friend) => friend.id === event.userId);
        if (existingIndex === -1) {
          return [...current, nextFriend];
        }

        return current.map((friend, index) => (index === existingIndex ? { ...friend, ...nextFriend } : friend));
      });
    }, abortController.signal).catch(() => {
      abortController.abort();
    });

    return () => abortController.abort();
  }, []);

  function toggleLike(id: number) {
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
          : post,
      ),
    );
  }

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
    } catch (err) {
      console.error(err);
      alert("Não foi possível copiar o treino.");
    }
  }
  return { posts, liveFriends, isLoading, isLoadingMore, hasMore, error, loadMore, retry, toggleLike: (id: string | number) => void toggleLike(id), saveTemplate: (id: string | number) => void saveTemplate(id) };
}
