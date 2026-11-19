import { apiClient } from "./apiClient";

const MAX_CACHED_MEDIA = 40;

interface CacheEntry {
  url: string | null;
  download: Promise<string>;
  refs: number;
  pinned?: boolean;
}

export interface AcquireMediaOptions {
  pinned?: boolean;
}

// A mesma entrada deduplica downloads em voo e mantém a URL para novas montagens.
// A ordem de inserção do Map serve de LRU.
const cache = new Map<string, CacheEntry>();
const generationListeners = new Set<() => void>();
let generation = 0;

export function getMediaCacheGeneration() {
  return generation;
}

export function subscribeMediaCache(listener: () => void) {
  generationListeners.add(listener);
  return () => { generationListeners.delete(listener); };
}

function evictUnused() {
  if (cache.size <= MAX_CACHED_MEDIA) return;

  for (const [path, entry] of cache) {
    if (cache.size <= MAX_CACHED_MEDIA) break;
    if (!entry.url || entry.refs > 0 || entry.pinned) continue;
    URL.revokeObjectURL(entry.url);
    cache.delete(path);
  }
}

function assertCurrentGeneration(requestGeneration: number) {
  if (requestGeneration !== generation) {
    throw new Error("A autorização da mídia mudou durante o download.");
  }
}

function downloadMedia(path: string, requestGeneration: number): CacheEntry {
  const download = apiClient.getBlob(path, { auth: true }).then((blob) => {
    assertCurrentGeneration(requestGeneration);
    entry.url = URL.createObjectURL(blob);
    return entry.url;
  }).catch((error: unknown) => {
    if (cache.get(path) === entry) cache.delete(path);
    throw error;
  });
  const entry: CacheEntry = { url: null, download, refs: 0 };
  return entry;
}

export async function acquireMediaUrl(path: string, options?: AcquireMediaOptions) {
  const requestGeneration = generation;
  const entry = cache.get(path) ?? downloadMedia(path, requestGeneration);
  entry.refs += 1;
  if (options?.pinned) entry.pinned = true;
  cache.delete(path);
  cache.set(path, entry);

  const url = entry.url ?? await entry.download;
  assertCurrentGeneration(requestGeneration);
  evictUnused();
  return url;
}

export async function preloadMedia(
  paths: (string | null | undefined)[],
  options?: AcquireMediaOptions,
): Promise<void> {
  const validPaths = Array.from(
    new Set(
      paths.filter((p): p is string => typeof p === "string" && p.startsWith("/api/media/")),
    ),
  );

  await Promise.allSettled(
    validPaths.map(async (path) => releaseMediaUrl(path, await acquireMediaUrl(path, options))),
  );
}

export function releaseMediaUrl(path: string, url: string) {
  const entry = cache.get(path);
  // Um cleanup atrasado não pode devolver a referência adquirida por outra geração.
  if (!entry || entry.url !== url) return;

  entry.refs = Math.max(0, entry.refs - 1);
  evictUnused();
}

// O logout e as invalidações de visibilidade revogam até URLs fixadas e em uso.
export function clearMediaCache() {
  generation += 1;
  for (const entry of cache.values()) {
    if (entry.url) URL.revokeObjectURL(entry.url);
  }
  cache.clear();
  for (const listener of generationListeners) listener();
}
