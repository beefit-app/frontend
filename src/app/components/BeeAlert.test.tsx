import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BeeAlert } from "./BeeAlert";

describe("BeeAlert", () => {
  it("anuncia o erro para leitor de tela", () => {
    render(<BeeAlert>Não foi possível salvar o template.</BeeAlert>);

    // O banner que cada tela desenhava a mao era um texto solto, sem role: o erro
    // aparecia na tela mas nao era anunciado.
    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent("Não foi possível salvar o template.");
    expect(alerta).toHaveAttribute("aria-live", "assertive");
  });

  it("usa aria-live polite fora de erro, para nao interromper a leitura", () => {
    render(<BeeAlert variant="success">Template salvo.</BeeAlert>);

    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
  });

  it("mostra o titulo junto da mensagem quando recebe um", () => {
    render(
      <BeeAlert title="Aviso de Ofensiva">Treinos com menos de 30 minutos não contam.</BeeAlert>,
    );

    expect(screen.getByText("Aviso de Ofensiva")).toBeInTheDocument();
    expect(screen.getByText("Treinos com menos de 30 minutos não contam.")).toBeInTheDocument();
  });

  it("no modo plain continua sendo anunciado", () => {
    render(<BeeAlert plain>Informe seu e-mail.</BeeAlert>);

    expect(screen.getByRole("alert")).toHaveTextContent("Informe seu e-mail.");
  });
});
