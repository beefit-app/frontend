import { describe, expect, it } from "vitest";
import { matchesSearch, normalizeSearchText } from "./textSearch";

describe("matchesSearch", () => {
  it("acha o nome acentuado buscando sem acento, e o contrário", () => {
    expect(matchesSearch("Tríceps Testa", "triceps")).toBe(true);
    expect(matchesSearch("Triceps Corda", "tríceps")).toBe(true);
  });

  it("ignora maiúsculas e outros acentos do português", () => {
    expect(matchesSearch("Elevação Lateral", "ELEVACAO")).toBe(true);
    expect(matchesSearch("Glúteo na Máquina", "gluteo maq")).toBe(false);
    expect(matchesSearch("Glúteo na Máquina", "gluteo na maq")).toBe(true);
  });

  it("aceita tudo quando a busca está vazia ou só tem espaços", () => {
    expect(matchesSearch("Supino", "")).toBe(true);
    expect(matchesSearch("Supino", "   ")).toBe(true);
  });

  it("ignora espaços nas pontas da busca", () => {
    expect(matchesSearch("Supino Reto", "  supino ")).toBe(true);
  });

  it("não acha o que não está no nome", () => {
    expect(matchesSearch("Tríceps Testa", "biceps")).toBe(false);
  });
});

describe("normalizeSearchText", () => {
  it("remove acento de ç, ã, é e í", () => {
    expect(normalizeSearchText("Ação Pé Íntegro")).toBe("acao pe integro");
  });
});
