import { useEffect, useState, useSyncExternalStore } from "react";
import {
  acquireMediaUrl,
  getMediaCacheGeneration,
  releaseMediaUrl,
  subscribeMediaCache,
  type AcquireMediaOptions,
} from "../services/mediaCache";

const noSubscription = () => () => {};
const publicGeneration = () => 0;

export function useAuthenticatedMediaUrl(source?: string | null, options?: AcquireMediaOptions) {
  const path = source?.startsWith("/api/media/") ? source : null;
  const pinned = options?.pinned;
  const generation = useSyncExternalStore(
    path ? subscribeMediaCache : noSubscription,
    path ? getMediaCacheGeneration : publicGeneration,
    publicGeneration,
  );
  const [resolved, setResolved] = useState<{ path: string; generation: number; url: string } | null>(null);

  useEffect(() => {
    setResolved(null);
    if (!path || generation !== getMediaCacheGeneration()) return;

    let active = true;
    let acquired: string | undefined;
    void acquireMediaUrl(path, { pinned }).then((url) => {
      if (!active || generation !== getMediaCacheGeneration()) {
        releaseMediaUrl(path, url);
        return;
      }
      acquired = url;
      setResolved({ path, generation, url });
    }).catch(() => {
      // Se o novo GET falhar ou não for autorizado, a mídia continua oculta.
    });

    return () => {
      active = false;
      if (acquired) releaseMediaUrl(path, acquired);
    };
  }, [path, generation, pinned]);

  if (!path) return source ?? null;
  // Não depende da execução do efeito para tirar o blob anterior do render.
  return resolved?.path === path && resolved.generation === generation ? resolved.url : null;
}
