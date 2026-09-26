/** Minúsculas e sem acento, para "triceps" e "Tríceps" serem o mesmo termo de busca. */
export function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function matchesSearch(text: string, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return normalizeSearchText(text).includes(normalizedQuery);
}
