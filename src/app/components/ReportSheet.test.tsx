import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportSheet } from "./ReportSheet";
import { reportService } from "../services/reportService";
import { ApiError } from "../services/apiClient";
import { messages } from "../constants/messages";

vi.mock("../services/reportService", () => ({
  reportService: { createReport: vi.fn() },
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

const createReport = vi.mocked(reportService.createReport);

function renderSheet(onOpenChange = vi.fn()) {
  render(
    <ReportSheet
      open
      onOpenChange={onOpenChange}
      targetType="POST"
      targetId="11111111-1111-1111-1111-111111111111"
      targetLabel="esta publicação"
    />,
  );
  return onOpenChange;
}

describe("ReportSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exige um motivo antes de enviar", async () => {
    renderSheet();

    fireEvent.click(screen.getByText("Enviar denúncia"));

    await waitFor(() => expect(screen.getByText(messages.reportReasonRequired)).toBeInTheDocument());
    expect(createReport).not.toHaveBeenCalled();
  });

  it("envia o motivo escolhido e os detalhes aparados", async () => {
    createReport.mockResolvedValue({});
    const onOpenChange = renderSheet();

    fireEvent.click(screen.getByText("Assédio"));

    const textarea = document.querySelector("ion-textarea");
    fireEvent(textarea!, new CustomEvent("ionChange", { detail: { value: "  ofendeu outra pessoa  " } }));

    fireEvent.click(screen.getByText("Enviar denúncia"));

    await waitFor(() =>
      expect(createReport).toHaveBeenCalledWith({
        targetType: "POST",
        targetId: "11111111-1111-1111-1111-111111111111",
        reason: "HARASSMENT",
        details: "ofendeu outra pessoa",
      }),
    );
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(messages.reportSent));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("omite os detalhes quando o campo fica vazio", async () => {
    createReport.mockResolvedValue({});
    renderSheet();

    fireEvent.click(screen.getByText("Spam"));
    fireEvent.click(screen.getByText("Enviar denúncia"));

    await waitFor(() =>
      expect(createReport).toHaveBeenCalledWith(expect.objectContaining({ details: undefined })),
    );
  });

  it("mostra a mensagem do backend quando a denúncia já existe", async () => {
    createReport.mockRejectedValue(new ApiError("Você já denunciou este conteúdo.", 409, null));
    const onOpenChange = renderSheet();

    fireEvent.click(screen.getByText("Spam"));
    fireEvent.click(screen.getByText("Enviar denúncia"));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Você já denunciou este conteúdo."));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("mantém a folha aberta e avisa quando o envio falha", async () => {
    createReport.mockRejectedValue(new Error("rede"));
    renderSheet();

    fireEvent.click(screen.getByText("Spam"));
    fireEvent.click(screen.getByText("Enviar denúncia"));

    await waitFor(() =>
      expect(screen.getByText(messages.actionFailed("enviar a denúncia"))).toBeInTheDocument(),
    );
  });
});
