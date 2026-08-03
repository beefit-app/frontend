import { useEffect, useState } from "react";
import { apiClient } from "../services/apiClient";

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
    let objectUrl: string | null = null;
    setResolvedSource(null);

    void apiClient.getBlob(source, { auth: true }).then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      if (active) {
        setResolvedSource(objectUrl);
      } else {
        URL.revokeObjectURL(objectUrl);
      }
    }).catch(() => {
      if (active) setResolvedSource(null);
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source]);

  return resolvedSource;
}
