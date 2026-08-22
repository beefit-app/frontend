import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchLegalVersionsMock = vi.hoisted(() => vi.fn());

vi.mock("../services/legalService", () => ({
  fetchLegalVersions: fetchLegalVersionsMock,
}));

import { LegalDocuments } from "./LegalDocuments";

describe("LegalDocuments", () => {
  beforeEach(() => {
    fetchLegalVersionsMock
      .mockReset()
      .mockResolvedValue({ termsVersion: "2026-08-18", privacyVersion: "2026-08-01" });
  });

  it("renderiza os Termos de Uso com suas secoes", () => {
    render(<LegalDocuments document="terms" />);

    expect(screen.getByRole("heading", { name: "Termos de Uso" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Uso aceitável" })).toBeInTheDocument();
    // O aviso de saude nao pode sumir numa reescrita: o app registra treino e nao
    // substitui orientacao medica.
    expect(screen.getByRole("heading", { name: "Saúde e limites do serviço" })).toBeInTheDocument();
    expect(screen.getByText(/não substitui orientação médica/)).toBeInTheDocument();
  });

  it("renderiza a Politica de Privacidade com suas secoes", () => {
    render(<LegalDocuments document="privacy" />);

    expect(screen.getByRole("heading", { name: "Política de Privacidade" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dados que coletamos" })).toBeInTheDocument();
    // Exigencia da LGPD e facil de perder numa reescrita: os dados ficam nos EUA.
    expect(
      screen.getByRole("heading", { name: "Compartilhamento e transferência internacional" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/fora do Brasil/)).toBeInTheDocument();
  });

  it("lista as lacunas que dependem do time em vez de preenche-las", () => {
    render(<LegalDocuments document="privacy" />);

    expect(screen.getByText(/Identificação do controlador/)).toBeInTheDocument();
    expect(screen.getByText(/Comarca de foro/)).toBeInTheDocument();
  });

  it("mostra a versao vigente do documento pedido", async () => {
    render(<LegalDocuments document="privacy" />);

    // Cada documento tem versao propria; usar a dos Termos aqui seria registrar o
    // rotulo errado na tela que o usuario aceitou.
    await waitFor(() => {
      expect(screen.getByText("2026-08-01")).toBeInTheDocument();
    });
  });

  it("exibe o documento mesmo quando a versao nao carrega", async () => {
    fetchLegalVersionsMock.mockRejectedValue(new Error("instancia fria"));

    render(<LegalDocuments document="terms" />);

    // O conteudo nao pode ficar refem de uma chamada que leva ~60s na instancia free.
    expect(screen.getByRole("heading", { name: "Termos de Uso" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/Versão vigente/)).not.toBeInTheDocument();
    });
  });

  it("mantem o aviso de rascunho pendente de revisao juridica", () => {
    render(<LegalDocuments document="terms" />);

    expect(screen.getByRole("heading", { name: "Rascunho para revisão jurídica" })).toBeInTheDocument();
  });
});
