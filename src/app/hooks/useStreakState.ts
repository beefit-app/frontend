import { useEffect, useState } from "react";
import type { AuthUser } from "../types/auth";
import { apiClient } from "../services/apiClient";

interface StreakState {
  count: number;
  lastFedDate: string | null;
  burstToken: number;
}

interface PersistedStreakState {
  count: number;
  lastFedDate: string | null;
}

interface BackendProfileResponse {
  offensiveHoneys?: number | null;
}

const STREAK_STORAGE_KEY = "beefit.feed.streak";

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readPersistedStreak(): PersistedStreakState | null {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return null;
  const raw = window.localStorage.getItem(STREAK_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PersistedStreakState;
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      count: typeof parsed.count === "number" ? parsed.count : 0,
      lastFedDate: typeof parsed.lastFedDate === "string" ? parsed.lastFedDate : null,
    };
  } catch {
    window.localStorage.removeItem(STREAK_STORAGE_KEY);
    return null;
  }
}

function persistStreak(streak: PersistedStreakState) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
  window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streak));
}

export function useStreakState(user: AuthUser | null) {
  const [streak, setStreak] = useState<StreakState>(() => {
    const persisted = readPersistedStreak();
    return {
      count: persisted?.count ?? 0,
      lastFedDate: persisted?.lastFedDate ?? null,
      burstToken: 0,
    };
  });

  useEffect(() => {
    return () => undefined;
  }, []);

  useEffect(() => {
    persistStreak({
      count: streak.count,
      lastFedDate: streak.lastFedDate,
    });
  }, [streak.count, streak.lastFedDate]);

  useEffect(() => {
    if (!user) {
      setStreak((current) => ({ ...current, count: 0, lastFedDate: null, burstToken: 0 }));
      return;
    }

    let cancelled = false;
    void syncWithBackend(false, () => cancelled);

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function syncWithBackend(burstOnIncrease: boolean, isCancelled?: () => boolean) {
    const persisted = readPersistedStreak();

    try {
      const response = await apiClient.get<BackendProfileResponse>("/api/profile/me", { auth: true });
      if (isCancelled?.()) return;

      const remoteCount = typeof response.offensiveHoneys === "number" ? response.offensiveHoneys : 0;
      const todayKey = getTodayKey();

      setStreak((current) => {
        const increased = remoteCount > current.count;
        return {
          count: remoteCount,
          lastFedDate: increased ? todayKey : persisted?.lastFedDate ?? current.lastFedDate,
          burstToken: increased && burstOnIncrease ? current.burstToken + 1 : current.burstToken,
        };
      });
    } catch {
      if (isCancelled?.() || !persisted) return;
      setStreak((current) => ({
        ...current,
        count: persisted.count,
        lastFedDate: persisted.lastFedDate,
      }));
    }
  }

  function clearPendingFeed() {
    setStreak((current) => ({ ...current, burstToken: 0 }));
  }

  function syncStreakCount(nextCount: number) {
    const todayKey = getTodayKey();

    setStreak((current) => {
      if (nextCount === current.count) {
        return current;
      }

      return {
        count: nextCount,
        lastFedDate: nextCount > current.count ? todayKey : current.lastFedDate,
        burstToken: nextCount > current.count ? current.burstToken + 1 : current.burstToken,
      };
    });
  }

  return {
    streak,
    isStreakFedToday: streak.lastFedDate === getTodayKey(),
    clearPendingFeed,
    syncStreakCount,
  };
}
