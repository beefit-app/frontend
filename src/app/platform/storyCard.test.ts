import { describe, expect, it } from "vitest";
import {
  STORY_HEIGHT,
  STORY_WIDTH,
  buildStoryMetrics,
  computePhotoLayout,
  formatStoryDuration,
  wrapText,
} from "./storyCard";

// Largura fixa por caractere: torna a quebra de linha previsível sem canvas.
const measure = (value: string) => value.length * 10;

describe("computePhotoLayout", () => {
  it("cobre o card com uma foto ja 9:16, sem corte", () => {
    const layout = computePhotoLayout(1080, 1920);
    expect(layout).toEqual({ mode: "cover", source: { x: 0, y: 0, width: 1080, height: 1920 } });
  });

  it("cobre o card com foto retrato 3:4, cortando so as laterais e centralizado", () => {
    const layout = computePhotoLayout(900, 1200);
    expect(layout.mode).toBe("cover");
    if (layout.mode !== "cover") return;
    expect(layout.source.height).toBe(1200);
    expect(layout.source.width / layout.source.height).toBeCloseTo(STORY_WIDTH / STORY_HEIGHT);
    expect(layout.source.x).toBeCloseTo((900 - layout.source.width) / 2);
  });

  it("mostra a foto quadrada inteira em vez de cortar 44% dela", () => {
    const layout = computePhotoLayout(1200, 1200);
    expect(layout.mode).toBe("contain");
    if (layout.mode !== "contain") return;
    expect(layout.target.width).toBe(layout.target.height);
    expect(layout.target.x).toBeCloseTo((STORY_WIDTH - layout.target.width) / 2);
  });

  it("encaixa a foto paisagem sem distorcer a proporcao e acima das metricas", () => {
    const layout = computePhotoLayout(1600, 1200);
    expect(layout.mode).toBe("contain");
    if (layout.mode !== "contain") return;
    expect(layout.target.width / layout.target.height).toBeCloseTo(1600 / 1200);
    expect(layout.target.x).toBeGreaterThan(0);
    // Abaixo do cabeçalho com o logo e acima do bloco de métricas.
    expect(layout.target.y).toBeGreaterThanOrEqual(240);
    expect(layout.target.y + layout.target.height).toBeLessThanOrEqual(STORY_HEIGHT - 780);
  });
});

describe("wrapText", () => {
  it("mantem o titulo curto numa linha", () => {
    expect(wrapText("Push pesado", measure, 300, 2)).toEqual(["Push pesado"]);
  });

  it("quebra em ate duas linhas e termina com reticencias o que nao cabe", () => {
    const lines = wrapText("Peito ombro e triceps no dia mais pesado da semana", measure, 200, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
    lines.forEach((line) => expect(measure(line)).toBeLessThanOrEqual(200));
  });

  it("corta uma palavra unica maior que a largura", () => {
    const [line] = wrapText("Supercalifragilistico", measure, 100, 2);
    expect(line.endsWith("…")).toBe(true);
    expect(measure(line)).toBeLessThanOrEqual(100);
  });
});

describe("formatStoryDuration", () => {
  it.each([
    [0, "0 min"],
    [45 * 60, "45 min"],
    [60 * 60, "1h"],
    [75 * 60 + 20, "1h 15min"],
  ])("formata %i segundos como %s", (seconds, expected) => {
    expect(formatStoryDuration(seconds)).toBe(expected);
  });
});

describe("buildStoryMetrics", () => {
  it("formata as metricas em pt-BR", () => {
    const metrics = buildStoryMetrics({
      title: "Push",
      finishedAt: "2026-10-19T12:00:00.000Z",
      durationSeconds: 3900,
      totalVolumeKg: 12345.6,
      estimatedCalories: 410.2,
      exerciseCount: 5,
      setCount: 18,
      photo: null,
    });
    expect(metrics.map((metric) => metric.value)).toEqual(["1h 5min", "12.346 kg", "410 kcal", "5", "18"]);
  });
});
