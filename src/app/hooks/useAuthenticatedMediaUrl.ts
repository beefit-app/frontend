import { useEffect, useState } from "react";
import { acquireMediaUrl, releaseMediaUrl } from "../services/mediaCache";

function isProtectedMediaPath(value: string) {
  return value.startsWith("/api/media/");
}

export function useAuthenticatedMediaUrl(source?: string | null) {
  const [resolvedSource, setResolvedSource] = useState<string | null>(() =>
    source && !isProtectedMediaPath(source) ? source : null,
  );

  useEffect(() => {
    if (!source || !isProtectedMediaPath(source)) {
      setResolvedSource(source ?? null);
      return;
    }

    let active = true;
    let acquired = false;
    setResolvedSource(null);

    void acquireMediaUrl(source)
      .then((url) => {
        if (!active) {
          // Desmontou enquanto a foto vinha: devolve a referencia agora, porque a
          // limpeza do efeito ja rodou e nao vai devolver por nos.
          releaseMediaUrl(source);
          return;
        }
        acquired = true;
        setResolvedSource(url);
      })
      .catch(() => {
        if (active) setResolvedSource(null);
      });

    return () => {
      active = false;
      if (acquired) {
        acquired = false;
        releaseMediaUrl(source);
      }
    };
  }, [source]);

  return resolvedSource;
}
