import type { ImgHTMLAttributes } from "react";
import { useAuthenticatedMediaUrl } from "../hooks/useAuthenticatedMediaUrl";

export interface AuthenticatedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  pinned?: boolean;
}

export function AuthenticatedImage({ src, pinned, ...props }: AuthenticatedImageProps) {
  const resolvedSource = useAuthenticatedMediaUrl(src, pinned ? { pinned: true } : undefined);
  if (!resolvedSource) return null;
  return <img src={resolvedSource} {...props} />;
}
