import { useEffect, useRef, useState } from "react";
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
  const pendingStreakTimeoutRef = useRef<number | null>(null);
  const [streak, setStreak] = useState<StreakState>(() => {
    const persisted = readPersistedStreak();
    return {
      count: persisted?.count ?? 0,
      lastFedDate: persisted?.lastFedDate ?? null,
      burstToken: 0,
    };
  });

  useEffect(() => {
    return () => {
      if (pendingStreakTimeoutRef.current !== null) {
        window.clearTimeout(pendingStreakTimeoutRef.current);
      }
    };
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

    const persisted = readPersistedStreak();
    let cancelled = false;

    void apiClient
      .get<BackendProfileResponse>("/api/profile/me", { auth: true })
      .then((response) => {
        if (cancelled) return;
        const remoteCount = typeof response.offensiveHoneys === "number" ? response.offensiveHoneys : 0;
        const persistedCount = persisted?.lastFedDate === getTodayKey() ? persisted.count : 0;

        setStreak((current) => ({
          ...current,
          count: Math.max(remoteCount, persistedCount),
          lastFedDate: persisted?.lastFedDate ?? null,
        }));
      })
      .catch(() => {
        if (cancelled || !persisted) return;
        setStreak((current) => ({
          ...current,
          count: persisted.count,
          lastFedDate: persisted.lastFedDate,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  function feedStreak() {
    const todayKey = getTodayKey();

    setStreak((current) => ({
      count: current.lastFedDate === todayKey ? current.count : current.count + 1,
      lastFedDate: todayKey,
      burstToken: current.burstToken + 1,
    }));
  }

  function clearPendingFeed() {
    if (pendingStreakTimeoutRef.current !== null) {
      window.clearTimeout(pendingStreakTimeoutRef.current);
      pendingStreakTimeoutRef.current = null;
    }
  }

  function scheduleFeed(delayMs: number) {
    pendingStreakTimeoutRef.current = window.setTimeout(() => {
      feedStreak();
      pendingStreakTimeoutRef.current = null;
    }, delayMs);
  }

  return {
    streak,
    isStreakFedToday: streak.lastFedDate === getTodayKey(),
    feedStreak,
    clearPendingFeed,
    scheduleFeed,
  };
}
