const LIVE_FRIENDS_STORAGE_KEY = "beefit.feed.live-friends";

// Presença não é mais persistida: um snapshot local não prova visibilidade.
export const socialFeedStorage = {
  clearLiveFriends() {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
    window.localStorage.removeItem(LIVE_FRIENDS_STORAGE_KEY);
  },
};
