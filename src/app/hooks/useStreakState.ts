import { useEffect, useRef, useState } from "react";

interface StreakState {
  count: number;
  lastFedDate: string | null;
  burstToken: number;
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useStreakState() {
  const pendingStreakTimeoutRef = useRef<number | null>(null);
  const [streak, setStreak] = useState<StreakState>({
    count: 15,
    lastFedDate: null,
    burstToken: 0,
  });

  useEffect(() => {
    return () => {
      if (pendingStreakTimeoutRef.current !== null) {
        window.clearTimeout(pendingStreakTimeoutRef.current);
      }
    };
  }, []);

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
    feedStreak,
    clearPendingFeed,
    scheduleFeed,
    syncStreakCount,
  };
}
