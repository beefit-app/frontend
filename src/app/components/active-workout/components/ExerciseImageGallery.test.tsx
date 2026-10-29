import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ExerciseImageGallery } from "./ExerciseImageGallery";

describe("ExerciseImageGallery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("não renderiza nada se images for vazio ou indefinido", () => {
    const { container } = render(<ExerciseImageGallery images={[]} exerciseName="Supino" />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza imagem única sem botões de alternância", () => {
    render(<ExerciseImageGallery images={["images/flat/supino-start.webp"]} exerciseName="Supino" />);
    const img = screen.getByRole("img", { name: "Supino - Posição inicial" });
    expect(img).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "1. Posição inicial" })).not.toBeInTheDocument();
  });

  it("alterna automaticamente em loop entre posição inicial e pico", () => {
    render(
      <ExerciseImageGallery
        images={["images/flat/supino-start.webp", "images/flat/supino-peak.webp"]}
        exerciseName="Supino"
      />,
    );

    expect(screen.getByText("GIF")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();

    const startButton = screen.getByRole("button", { name: "1. Posição inicial" });
    const peakButton = screen.getByRole("button", { name: "2. Execução / Pico" });
    expect(startButton).toHaveAttribute("aria-pressed", "true");
    expect(peakButton).toHaveAttribute("aria-pressed", "false");

    // Avança 1100ms para alternar para a fase de pico
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(screen.getByText("2/2")).toBeInTheDocument();
    expect(startButton).toHaveAttribute("aria-pressed", "false");
    expect(peakButton).toHaveAttribute("aria-pressed", "true");

    // Avança mais 1100ms para voltar em loop à posição inicial
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(startButton).toHaveAttribute("aria-pressed", "true");
  });

  it("permite pausar e retomar a animação com o botão ou clicando no player", () => {
    render(
      <ExerciseImageGallery
        images={["images/flat/supino-start.webp", "images/flat/supino-peak.webp"]}
        exerciseName="Supino"
      />,
    );

    const pauseButton = screen.getByRole("button", { name: "Pausar animação" });
    fireEvent.click(pauseButton);

    expect(screen.getByText("PAUSADO")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reproduzir animação" })).toBeInTheDocument();

    // Com a animação pausada, o tempo não altera o frame
    act(() => {
      vi.advanceTimersByTime(2200);
    });
    expect(screen.getByText("1/2")).toBeInTheDocument();

    // Clica no player para retomar
    const region = screen.getByRole("region", { name: "Animação de Supino" });
    fireEvent.click(region);
    expect(screen.getByText("GIF")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.getByText("2/2")).toBeInTheDocument();
  });

  it("permite selecionar diretamente entre inicial e pico através dos botões", () => {
    render(
      <ExerciseImageGallery
        images={["images/flat/supino-start.webp", "images/flat/supino-peak.webp"]}
        exerciseName="Supino"
      />,
    );

    const peakButton = screen.getByRole("button", { name: "2. Execução / Pico" });
    fireEvent.click(peakButton);

    // Deve mudar para o frame do pico e pausar para inspeção
    expect(screen.getByText("2/2")).toBeInTheDocument();
    expect(screen.getByText("PAUSADO")).toBeInTheDocument();
    expect(peakButton).toHaveAttribute("aria-pressed", "true");

    const startButton = screen.getByRole("button", { name: "1. Posição inicial" });
    fireEvent.click(startButton);

    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(startButton).toHaveAttribute("aria-pressed", "true");
  });
});
