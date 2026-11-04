import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const completeProfileMock = vi.hoisted(() => vi.fn());
const logoutMock = vi.hoisted(() => vi.fn());
const clearAuthError = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({ authError: null as string | null }));
const fetchLegalVersionsMock = vi.hoisted(() => vi.fn());

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", name: "Maria Souza", email: "maria@gmail.com", profileComplete: false },
    authError: authState.authError,
    clearAuthError,
    isSubmitting: false,
    completeProfile: completeProfileMock,
    logout: logoutMock,
  }),
}));

vi.mock("../services/legalService", () => ({
  fetchLegalVersions: fetchLegalVersionsMock,
}));

const LEGAL_VERSIONS = { termsVersion: "2026-08-18", privacyVersion: "2026-08-18" };

let container: HTMLElement;

async function renderScreen() {
  const { CompleteProfileScreen } = await import("./CompleteProfileScreen");
  const result = render(<CompleteProfileScreen />);
  container = result.container;
  await waitFor(() => {
    expect(screen.queryByText("Carregando os documentos...")).not.toBeInTheDocument();
  });
  return result;
}

/** IonCheckbox emite ionChange com detail.checked, nao o change nativo. */
function acceptLegal() {
  const checkbox = container.querySelector("ion-checkbox");
  if (!checkbox) throw new Error("checkbox de aceite nao encontrado");
  fireEvent(checkbox, new CustomEvent("ionChange", { detail: { checked: true } }));
}

function setValue(placeholder: string, value: string) {
  const input = container.querySelector(`ion-input[placeholder="${placeholder}"]`);
  if (!input) throw new Error(`campo nao encontrado: ${placeholder}`);
  fireEvent(input, new CustomEvent("ionInput", { detail: { value } }));
}

function submit() {
  const target = screen.getByText("Continuar").closest("ion-button");
  if (!target) throw new Error("botao de submit nao encontrado");
  fireEvent.click(target);
}

describe("CompleteProfileScreen", () => {
  beforeEach(() => {
    vi.resetModules();
    completeProfileMock.mockReset().mockResolvedValue(undefined);
    logoutMock.mockReset().mockResolvedValue(undefined);
    clearAuthError.mockReset();
    fetchLegalVersionsMock.mockReset().mockResolvedValue(LEGAL_VERSIONS);
    authState.authError = null;
  });

  it("cumprimenta pelo primeiro nome", async () => {
    await renderScreen();
    expect(screen.getByText("Olá, Maria! Falta pouco")).toBeInTheDocument();
  });

  it("acusa peso e meta ausentes sem ir ao servidor", async () => {
    await renderScreen();
    acceptLegal();
    submit();

    expect(await screen.findByText("Informe seu peso.")).toBeInTheDocument();
    expect(screen.getByText("Informe sua meta semanal.")).toBeInTheDocument();
    expect(completeProfileMock).not.toHaveBeenCalled();
  });

  it("recusa peso fora da faixa sem ir ao servidor", async () => {
    await renderScreen();
    setValue("Ex: 75.5", "10");
    setValue("Ex: 4 (dias por semana)", "3");
    acceptLegal();
    submit();

    expect(await screen.findByText(/30 a 300 kg/)).toBeInTheDocument();
    expect(completeProfileMock).not.toHaveBeenCalled();
  });

  it("nao envia sem o aceite dos documentos", async () => {
    await renderScreen();
    setValue("Ex: 75.5", "68");
    setValue("Ex: 4 (dias por semana)", "3");
    submit();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(completeProfileMock).not.toHaveBeenCalled();
  });

  it("envia peso, meta e as versoes vigentes que vieram do servidor", async () => {
    await renderScreen();
    setValue("Ex: 75.5", "68.5");
    setValue("Ex: 4 (dias por semana)", "3");
    acceptLegal();
    submit();

    await waitFor(() => {
      expect(completeProfileMock).toHaveBeenCalledWith({
        weight: 68.5,
        weeklyGoal: 3,
        acceptedTermsVersion: LEGAL_VERSIONS.termsVersion,
        acceptedPrivacyVersion: LEGAL_VERSIONS.privacyVersion,
      });
    });
  });

  it("leva o erro de campo do servidor para o input certo", async () => {
    completeProfileMock.mockRejectedValue(
      Object.assign(new Error("Dados inválidos"), {
        name: "ApiError",
        status: 400,
        data: {
          status: 400,
          error: "Dados inválidos",
          message: "Dados inválidos",
          fields: [{ field: "bodyWeight", message: "O peso deve ser de 30 a 300 kg." }],
        },
      }),
    );
    await renderScreen();
    setValue("Ex: 75.5", "68");
    setValue("Ex: 4 (dias por semana)", "3");
    acceptLegal();
    submit();

    expect(await screen.findByText("O peso deve ser de 30 a 300 kg.")).toBeInTheDocument();
  });

  it("mostra o erro geral do servidor", async () => {
    authState.authError = "Os documentos legais foram atualizados. Revise e aceite as versões vigentes.";
    await renderScreen();
    expect(screen.getByText(/documentos legais foram atualizados/)).toBeInTheDocument();
  });

  it("permite sair sem completar", async () => {
    await renderScreen();
    const target = screen.getByText("Sair").closest("ion-button");
    fireEvent.click(target!);
    expect(logoutMock).toHaveBeenCalled();
  });
});
