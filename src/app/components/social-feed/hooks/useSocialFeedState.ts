import { useEffect, useState } from "react";
import { socialFeedService } from "../../../services/socialFeedService";
import { socialPresenceService } from "../../../services/socialPresenceService";
import type { LiveFriend } from "../types";

export function useSocialFeedState() {
  const [posts, setPosts] = useState(() => socialFeedService.getInitialPosts());
  const [liveFriends, setLiveFriends] = useState<LiveFriend[]>([]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveFriends((current) =>
        current.map((friend) => ({ ...friend, elapsedSeconds: friend.elapsedSeconds + 1 })),
      );
    }, 1000);

    return () => window.clearInterval(timer);
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

  function saveTemplate(id: number) {
    setPosts((current) =>
      current.map((post) => (post.id === id ? { ...post, templateSaved: !post.templateSaved } : post)),
    );
  }

  return {
    posts,
    liveFriends,
    toggleLike,
    saveTemplate,
  };
}
