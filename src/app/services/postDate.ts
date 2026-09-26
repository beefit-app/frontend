const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Texto de quando o treino foi publicado: "Hoje às 14:22", "Ontem às 19:42",
 * "3 dias atrás" ou "Há mais de 7 dias".
 *
 * Conta dias de calendário, não blocos de 24h: um treino às 23h de ontem visto
 * às 8h de hoje é "Ontem", como a pessoa fala.
 */
export function formatPostDate(publishedAt: string, now: Date = new Date()): string {
  const published = new Date(publishedAt);
  if (Number.isNaN(published.getTime())) return "";

  // Math.round absorve a hora a mais ou a menos dos dias de troca de horário de verão.
  const daysAgo = Math.round((startOfDay(now).getTime() - startOfDay(published).getTime()) / DAY_MS);
  const time = timeFormatter.format(published);

  // Data no futuro só acontece com relógio do aparelho atrasado; tratar como hoje.
  if (daysAgo <= 0) return `Hoje às ${time}`;
  if (daysAgo === 1) return `Ontem às ${time}`;
  if (daysAgo <= 7) return `${daysAgo} dias atrás`;
  return "Há mais de 7 dias";
}
