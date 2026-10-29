import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkoutShareView } from "./WorkoutShareView";

const SHARE_LABEL = "Compartilhar no Instagram Stories";

function renderView(overrides: Partial<Parameters<typeof WorkoutShareView>[0]> = {}) {
  const props = {
    open: true,
    status: "ready" as const,
    previewUrl: "blob:card",
    shareLabel: SHARE_LABEL,
    onShare: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<WorkoutShareView {...props} />);
  return props;
}

describe("WorkoutShareView", () => {
  it("mostra a previa do card e compartilha ao clicar", () => {
    const props = renderView();

    expect(screen.getByAltText("Prévia do card do treino")).toHaveAttribute("src", "blob:card");
    fireEvent.click(screen.getByText(SHARE_LABEL));

    expect(props.onShare).toHaveBeenCalledTimes(1);
  });

  it("bloqueia o compartilhamento enquanto o card e gerado", () => {
    renderView({ status: "generating", previewUrl: null });

    expect(screen.getByText("Gerando card...")).toBeInTheDocument();
    // O React 19 entrega `disabled` ao IonButton como propriedade, não atributo.
    const button = screen.getByText(SHARE_LABEL).closest("ion-button") as (HTMLElement & { disabled?: boolean }) | null;
    expect(button?.disabled).toBe(true);
  });

  it("explica a falha e esconde o botao de compartilhar quando o card nao sai", () => {
    renderView({ status: "error", previewUrl: null });

    expect(screen.getByText("Não foi possível gerar o card do treino.")).toBeInTheDocument();
    expect(screen.queryByText(SHARE_LABEL)).not.toBeInTheDocument();
  });

  it("fecha pelo botao de ir para o feed", () => {
    const props = renderView();

    fireEvent.click(screen.getByText("Ir para o feed"));

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
