import { useEffect, useState } from "react";
import { socialFeedService } from "../../../services/socialFeedService";
import type { LiveFriend, SocialFeedPost } from "../types";
import { subscribeSocialEvents, type WorkoutPresenceEvent } from "../../../services/socialEventsService";

export function useSocialFeedState() {
  const [posts, setPosts] = useState<SocialFeedPost[]>([]);
  const [liveFriends, setLiveFriends] = useState<LiveFriend[]>([]);
  useEffect(() => { void socialFeedService.load().then((result) => setPosts(result.posts)); }, []);
  useEffect(() => {
    const controller = new AbortController(); let retry: number | null = null;
    const connect = () => void subscribeSocialEvents((type, data) => {
      if (!("userId" in data)) return;
      const event = data as WorkoutPresenceEvent;
      if (type === "WORKOUT_FINISHED" || type === "WORKOUT_CANCELED") { setLiveFriends((current) => current.filter((item) => String(item.id) !== event.userId)); return; }
      if (type === "WORKOUT_STARTED" || type === "WORKOUT_MUSCLE_GROUP_ADDED") setLiveFriends((current) => {
        const next = { id: event.userId, name: event.fullName, initials: event.fullName.slice(0, 2).toUpperCase(), photoUrl: null, groups: event.muscleGroups, elapsedSeconds: Math.max(0, Math.floor((Date.now() - new Date(event.occurredAt).getTime()) / 1000)) } as unknown as LiveFriend;
        return [...current.filter((item) => String(item.id) !== event.userId), next];
      });
    }, controller.signal).catch(() => { if (!controller.signal.aborted) retry = window.setTimeout(connect, 3000); });
    connect(); return () => { controller.abort(); if (retry) window.clearTimeout(retry); };
  }, []);
  useEffect(() => { const timer = window.setInterval(() => setLiveFriends((current) => current.map((friend) => ({ ...friend, elapsedSeconds: friend.elapsedSeconds + 1 }))), 1000); return () => window.clearInterval(timer); }, []);
  async function toggleLike(id: string | number) { const result = await socialFeedService.toggleLike(id); setPosts((current) => current.map((post) => post.id === id ? { ...post, liked: result.liked, likes: result.likes_count } : post)); }
  async function saveTemplate(id: string | number) { await socialFeedService.importTemplate(id); setPosts((current) => current.map((post) => post.id === id ? { ...post, templateSaved: true } : post)); }
  return { posts, liveFriends, toggleLike: (id: string | number) => void toggleLike(id), saveTemplate: (id: string | number) => void saveTemplate(id), setLiveFriends };
}
