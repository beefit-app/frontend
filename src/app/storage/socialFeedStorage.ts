import type { LiveFriend } from "../components/social-feed/types";

const LIVE_FRIENDS_STORAGE_KEY = "beefit.feed.live-friends";

interface PersistedLiveFriend extends LiveFriend {
  storedAt: string;
}

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeLiveFriend(
  friend: PersistedLiveFriend,
  now = Date.now(),
): LiveFriend {
  const storedAt = new Date(friend.storedAt).getTime();
  const elapsedDelta = Number.isFinite(storedAt) ? Math.max(0, Math.floor((now - storedAt) / 1000)) : 0;

  return {
    id: friend.id,
    name: friend.name,
    initials: friend.initials,
    photoUrl: friend.photoUrl,
    groups: Array.isArray(friend.groups) ? friend.groups : [],
    elapsedSeconds: Math.max(0, friend.elapsedSeconds + elapsedDelta),
  };
}

export const socialFeedStorage = {
  getLiveFriends() {
    if (!hasBrowserStorage()) return [];
    const raw = window.localStorage.getItem(LIVE_FRIENDS_STORAGE_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as PersistedLiveFriend[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => item && typeof item === "object")
        .map((item) => normalizeLiveFriend(item));
    } catch {
      window.localStorage.removeItem(LIVE_FRIENDS_STORAGE_KEY);
      return [];
    }
  },

  setLiveFriends(friends: LiveFriend[]) {
    if (!hasBrowserStorage()) return;
    const payload = friends.map((friend) => ({
      ...friend,
      storedAt: new Date().toISOString(),
    }));
    window.localStorage.setItem(LIVE_FRIENDS_STORAGE_KEY, JSON.stringify(payload));
  },

  clearLiveFriends() {
    if (!hasBrowserStorage()) return;
    window.localStorage.removeItem(LIVE_FRIENDS_STORAGE_KEY);
  },
};
