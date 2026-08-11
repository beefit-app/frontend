import { apiClient } from "./apiClient";

// Guarda object URLs de midia protegida para o feed nao rebaixar a mesma foto a
// cada montagem. O cache e por contagem de referencia: revogar um object URL que
// outro componente ainda esta exibindo quebraria a imagem dele.
const MAX_CACHED_MEDIA = 40;

interface CacheEntry {
  url: string;
  refs: number;
}

// A ordem de insercao do Map serve de LRU: a entrada mais recente vai para o fim.
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<string>>();

function evictUnused() {
  if (cache.size <= MAX_CACHED_MEDIA) return;

  for (const [path, entry] of cache) {
    if (cache.size <= MAX_CACHED_MEDIA) break;
    if (entry.refs > 0) continue;
    URL.revokeObjectURL(entry.url);
    cache.delete(path);
  }
}

export async function acquireMediaUrl(path: string) {
  const cached = cache.get(path);
  if (cached) {
    cached.refs += 1;
    // Reinsere para marcar como usada mais recentemente.
    cache.delete(path);
    cache.set(path, cached);
    return cached.url;
  }

  // Varios cards podem pedir a mesma foto no mesmo frame; uma requisicao basta.
  let request = inFlight.get(path);
  if (!request) {
    request = apiClient
      .getBlob(path, { auth: true })
      .then((blob) => URL.createObjectURL(blob))
      .finally(() => inFlight.delete(path));
    inFlight.set(path, request);
  }

  const url = await request;
  const entry = cache.get(path);
  if (entry) {
    entry.refs += 1;
    return entry.url;
  }

  cache.set(path, { url, refs: 1 });
  evictUnused();
  return url;
}

export function releaseMediaUrl(path: string) {
  const entry = cache.get(path);
  if (!entry) return;

  entry.refs = Math.max(0, entry.refs - 1);
  evictUnused();
}

// Chamado no logout: sem isto as fotos do usuario anterior continuariam em memoria
// e acessiveis por object URL, que e exatamente o vazamento entre contas que o
// desmonte de sessao existe para evitar.
export function clearMediaCache() {
  for (const entry of cache.values()) {
    URL.revokeObjectURL(entry.url);
  }
  cache.clear();
  inFlight.clear();
}
