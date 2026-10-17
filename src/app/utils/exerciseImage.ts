/**
 * Resolve o caminho relativo retornado pela API para a URL final da imagem do exercício.
 * Em desenvolvimento web com proxy local ou em produção/mobile com VITE_API_URL definido.
 */
export function getExerciseImageUrl(path?: string | null): string | null {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//.test(trimmed)) return trimmed;

  const baseUrl = import.meta.env?.VITE_API_URL?.replace(/\/$/, "") ?? "";
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
}
