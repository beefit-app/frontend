import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useEffect, useSyncExternalStore } from "react";
import { clearMediaCache } from "../services/mediaCache";
import { subscribeSocialEvents } from "../services/socialEventsService";
import { pageCacheStorage } from "../storage/pageCacheStorage";
import { socialFeedStorage } from "../storage/socialFeedStorage";
import { invalidateFeedVisibility } from "../components/social-feed/hooks/useSocialFeedState";

const RESUME_COALESCE_MS = 1000;
const visibilityListeners = new Set<() => void>();
let visibilityRevision = 0;

function subscribeVisibility(listener: () => void) {
  visibilityListeners.add(listener);
  return () => { visibilityListeners.delete(listener); };
}

export function useSocialVisibilityRevision() {
  return useSyncExternalStore(subscribeVisibility, () => visibilityRevision, () => 0);
}

// Fica na sessão, inclusive quando a aba do feed ainda não montou.
export function useSocialVisibility(userId?: string | null) {
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    // O feed novo não lê nem grava a página persistida por versões anteriores.
    void pageCacheStorage.remove(userId, "feed.page-0").catch(() => undefined);
    try {
      socialFeedStorage.clearLiveFriends();
    } catch {
      // O armazenamento legado é opcional e não pode bloquear a assinatura.
    }

    const invalidate = () => {
      if (controller.signal.aborted) return;
      invalidateFeedVisibility(userId);
      clearMediaCache();
      visibilityRevision += 1;
      for (const listener of visibilityListeners) listener();
    };

    let lastRecoveryAt = -Infinity;
    const reconnect = () => {
      // A consulta de retomada pode ter ocorrido antes da última mudança na
      // lacuna do SSE. A reconexão sempre provoca nova leitura.
      lastRecoveryAt = Date.now();
      invalidate();
    };
    const resume = () => {
      const now = Date.now();
      if (now - lastRecoveryAt < RESUME_COALESCE_MS) return;
      lastRecoveryAt = now;
      invalidate();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") resume();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resume();
    };

    window.addEventListener("beefit:social-connected", reconnect);
    window.addEventListener("online", resume);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const nativeResume = Capacitor.isNativePlatform()
      ? CapApp.addListener("resume", resume).catch(() => null)
      : null;
    void subscribeSocialEvents((event) => {
      if (event.type === "SOCIAL_VISIBILITY_CHANGED" || event.type === "FRIEND_REMOVED") invalidate();
    }, controller.signal);

    return () => {
      controller.abort();
      window.removeEventListener("beefit:social-connected", reconnect);
      window.removeEventListener("online", resume);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void nativeResume?.then((handle) => handle?.remove()).catch(() => undefined);
    };
  }, [userId]);
}
