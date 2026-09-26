import { describe, expect, it } from "vitest";
import { formatPostDate } from "./postDate";

// Datas locais sem offset, como o backend envia o publishedAt.
const NOW = new Date(2026, 8, 26, 15, 0);

describe("formatPostDate", () => {
  it("mostra a hora quando foi hoje", () => {
    expect(formatPostDate("2026-09-26T14:22:00", NOW)).toBe("Hoje às 14:22");
    expect(formatPostDate("2026-09-26T00:05:00", NOW)).toBe("Hoje às 00:05");
  });

  it("mostra ontem com a hora", () => {
    expect(formatPostDate("2026-09-25T19:42:00", NOW)).toBe("Ontem às 19:42");
  });

  it("conta dias de calendário, não blocos de 24h", () => {
    const justAfterMidnight = new Date(2026, 8, 26, 0, 1);
    expect(formatPostDate("2026-09-25T23:59:00", justAfterMidnight)).toBe("Ontem às 23:59");
    expect(formatPostDate("2026-09-24T23:59:00", justAfterMidnight)).toBe("2 dias atrás");
  });

  it("mostra quantos dias atrás entre 2 e 7 dias", () => {
    expect(formatPostDate("2026-09-24T10:00:00", NOW)).toBe("2 dias atrás");
    expect(formatPostDate("2026-09-19T10:00:00", NOW)).toBe("7 dias atrás");
  });

  it("agrupa tudo a partir de 8 dias", () => {
    expect(formatPostDate("2026-09-18T23:59:00", NOW)).toBe("Há mais de 7 dias");
    expect(formatPostDate("2025-01-01T10:00:00", NOW)).toBe("Há mais de 7 dias");
  });

  it("trata data no futuro como hoje", () => {
    expect(formatPostDate("2026-09-26T18:30:00", NOW)).toBe("Hoje às 18:30");
  });

  it("devolve vazio para data inválida", () => {
    expect(formatPostDate("não é data", NOW)).toBe("");
  });
});
