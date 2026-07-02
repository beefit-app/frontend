import type { PersistedWorkoutDraft } from "../types/workout";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const DRAFT_KEY = "beefit.workout.active-draft";

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export const workoutDraftStorage = {
  async get(): Promise<PersistedWorkoutDraft | null> {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key: DRAFT_KEY });
      if (!value) return null;
      try {
        return JSON.parse(value) as PersistedWorkoutDraft;
      } catch {
        await Preferences.remove({ key: DRAFT_KEY });
        return null;
      }
    }
    if (!hasStorage()) return null;
    const value = window.localStorage.getItem(DRAFT_KEY);
    if (!value) return null;

    try {
      return JSON.parse(value) as PersistedWorkoutDraft;
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }
  },

  async set(draft: PersistedWorkoutDraft) {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: DRAFT_KEY, value: JSON.stringify(draft) });
      return;
    }
    if (!hasStorage()) return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  },

  async clear() {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: DRAFT_KEY });
      return;
    }
    if (!hasStorage()) return;
    window.localStorage.removeItem(DRAFT_KEY);
  },
};
