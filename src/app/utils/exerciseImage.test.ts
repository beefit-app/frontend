import { describe, expect, it, vi } from "vitest";
import { getExerciseImageUrl } from "./exerciseImage";

describe("getExerciseImageUrl", () => {
  it("devolve null para valores nulos, vazios ou indefinidos", () => {
    expect(getExerciseImageUrl(null)).toBeNull();
    expect(getExerciseImageUrl(undefined)).toBeNull();
    expect(getExerciseImageUrl("")).toBeNull();
    expect(getExerciseImageUrl("   ")).toBeNull();
  });

  it("retorna URLs absolutas inalteradas", () => {
    expect(getExerciseImageUrl("https://cdn.example.com/ex.webp")).toBe("https://cdn.example.com/ex.webp");
    expect(getExerciseImageUrl("http://localhost:8080/images/ex.webp")).toBe("http://localhost:8080/images/ex.webp");
  });

  it("anexa VITE_API_URL quando configurado", () => {
    vi.stubEnv("VITE_API_URL", "https://api.beefit.com");
    expect(getExerciseImageUrl("images/flat/supino-start.webp")).toBe(
      "https://api.beefit.com/images/flat/supino-start.webp",
    );
    expect(getExerciseImageUrl("/images/flat/supino-start.webp")).toBe(
      "https://api.beefit.com/images/flat/supino-start.webp",
    );
    vi.unstubAllEnvs();
  });

  it("mantem caminho com barra caso VITE_API_URL esteja vazio", () => {
    vi.stubEnv("VITE_API_URL", "");
    expect(getExerciseImageUrl("images/flat/supino-start.webp")).toBe("/images/flat/supino-start.webp");
    vi.unstubAllEnvs();
  });
});
