import type { ImgHTMLAttributes } from "react";
import { useAuthenticatedMediaUrl } from "../hooks/useAuthenticatedMediaUrl";

export function AuthenticatedImage({ src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const resolvedSource = useAuthenticatedMediaUrl(src);
  if (!resolvedSource) return null;
  return <img src={resolvedSource} {...props} />;
}
