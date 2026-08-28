import { appStorage } from "./appStorage";

const CACHE_PREFIX = "beefit.page-cache.";
const CACHE_VERSION = 1;

interface CachedValue<T> {
  version: number;
  savedAt: number;
  value: T;
}

function cacheKey(userId: string, key: string) {
  return `${CACHE_PREFIX}${encodeURIComponent(userId)}.${key}`;
}

function isCachedValue(value: unknown): value is CachedValue<unknown> {
  return typeof value === "object" && value !== null && "version" in value && "savedAt" in value && "value" in value;
}

export const pageCacheStorage = {
  async get<T>(userId: string | null | undefined, key: string, ttlMs: number): Promise<T | null> {
    if (!userId) return null;
    const storageKey = cacheKey(userId, key);
    const cached = await appStorage.getItem<unknown>(storageKey);
    if (!isCachedValue(cached) || cached.version !== CACHE_VERSION || !Number.isFinite(cached.savedAt)) {
      await appStorage.removeItem(storageKey);
      return null;
    }

    if (Date.now() - cached.savedAt > ttlMs) {
      await appStorage.removeItem(storageKey);
      return null;
    }

    return cached.value as T;
  },

  async set<T>(userId: string | null | undefined, key: string, value: T) {
    if (!userId) return;
    await appStorage.setItem<CachedValue<T>>(cacheKey(userId, key), {
      version: CACHE_VERSION,
      savedAt: Date.now(),
      value,
    });
  },

  async remove(userId: string | null | undefined, key: string) {
    if (!userId) return;
    await appStorage.removeItem(cacheKey(userId, key));
  },

  async clearUser(userId: string | null | undefined) {
    if (!userId) return;
    const keys = await appStorage.keys(`${CACHE_PREFIX}${encodeURIComponent(userId)}.`);
    await Promise.all(keys.map((key) => appStorage.removeItem(key)));
  },
};
