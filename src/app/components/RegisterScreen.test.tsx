import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const registerMock = vi.hoisted(() => vi.fn());
const clearAuthError = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({ authError: null as string | null }));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    authError: authState.authError,
    clearAuthError,
    isSubmitting: false,
    register: registerMock,
  }),
}));

let container: HTMLElement;

async function renderScreen() {
  const { RegisterScreen } = await import("./RegisterScreen");
  const result = render(<RegisterScreen onNavigateToLogin={() => {}} />);
  container = result.container;
  return result;
}

/** BeeInput usa IonInput, que so escuta ionInput/ionChange — nao o change nativo. */
function field(placeholder: string) {
  const input = container.querySelector(`ion-input[placeholder="${placeholder}"]`);
  if (!input) throw new Error(`campo nao encontrado: ${placeholder}`);
  return input;
}

function setValue(placeholder: string, value: string) {
  fireEvent(field(placeholder), new CustomEvent("ionInput", { detail: { value } }));
}

function fillValidForm() {
  setValue("Seu nome completo", "Bee Fit");
  setValue("Seu username", "beefit");
  setValue("seu@email.com", "bee@email.com");
  setValue("••••••••", "senha123");
  setValue("Ex: 4 (dias por semana)", "4");
  setValue("Ex: 75.5", "75");
}

function submit() {
  // "Criar Conta" e o titulo da tela e tambem o rotulo do botao. BeeButton
  // renderiza um IonButton, custom element que o jsdom nao expoe como
  // role="button", entao o desempate e pelo ancestral.
  const target = screen.getAllByText("Criar Conta").find((el) => el.closest("ion-button"));
  if (!target) throw new Error("botao de submit nao encontrado");
  fireEvent.click(target);
}

/** Erro no formato que o GlobalExceptionHandler devolve. */
function apiError(status: number, message: string, fields: { field: string; message: string }[]) {
  return Object.assign(new Error(message), {
    name: "ApiError",
    status,
    data: { status, error: "Dados inválidos", message, fields },
  });
}

describe("RegisterScreen", () => {
  beforeEach(() => {
    vi.resetModules();
    registerMock.mockReset().mockResolvedValue(undefined);
    clearAuthError.mockReset();
    authState.authError = null;
  });

  it("acusa cada campo obrigatorio com sua propria mensagem", async () => {
    await renderScreen();

    submit();

    await waitFor(() => {
      expect(screen.getByText("Informe seu nome completo.")).toBeInTheDocument();
    });
    expect(screen.getByText("Escolha um nome de usuário.")).toBeInTheDocument();
    expect(screen.getByText("Informe seu e-mail.")).toBeInTheDocument();
    expect(screen.getByText("Crie uma senha.")).toBeInTheDocument();
    expect(screen.getByText("Informe sua meta semanal.")).toBeInTheDocument();
    expect(screen.getByText("Informe seu peso.")).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("recusa meta semanal acima de 7 sem ir ao servidor", async () => {
    await renderScreen();
    fillValidForm();
    setValue("Ex: 4 (dias por semana)", "10");

    submit();

    await waitFor(() => {
      expect(screen.getByText("A meta semanal deve ser de 1 a 7 dias.")).toBeInTheDocument();
    });
    // O backend rejeitaria com @Max(7); prever isso evita uma ida ao servidor.
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("mostra o conflito de username embaixo do campo, e nao no aviso geral", async () => {
    authState.authError = "Esse nome de usuário já está em uso.";
    registerMock.mockRejectedValue(
      apiError(409, "Esse nome de usuário já está em uso.", [
        { field: "username", message: "Esse nome de usuário já está em uso." },
      ]),
    );

    await renderScreen();
    fillValidForm();
    submit();

    await waitFor(() => {
      expect(screen.getByText("Esse nome de usuário já está em uso.")).toBeInTheDocument();
    });

    // Uma unica ocorrencia: o aviso geral seria uma segunda copia do mesmo texto.
    expect(screen.getAllByText("Esse nome de usuário já está em uso.")).toHaveLength(1);
    expect(registerMock).toHaveBeenCalledTimes(1);
    // aria-invalid e aria-describedby nao sao conferidos aqui: o IonInput nao
    // hidrata no jsdom e os atributos nao chegam ao elemento. A associacao com o
    // leitor de tela e verificada no browser real.
  });

  it("mantem o aviso geral quando o erro e de um campo que a tela nao mostra", async () => {
    authState.authError = "Requisição sem identificação do dispositivo.";
    registerMock.mockRejectedValue(
      apiError(400, "Campos enviados inválidos", [
        { field: "deviceId", message: "Requisição sem identificação do dispositivo." },
      ]),
    );

    await renderScreen();
    fillValidForm();
    submit();

    // Sem input para marcar, esconder o aviso deixaria o erro invisivel e o botao
    // pareceria nao fazer nada.
    await waitFor(() => {
      expect(screen.getByText("Requisição sem identificação do dispositivo.")).toBeInTheDocument();
    });
  });

  it("limpa o erro do campo quando o usuario corrige", async () => {
    registerMock.mockRejectedValue(
      apiError(409, "Este e-mail já está cadastrado.", [
        { field: "email", message: "Este e-mail já está cadastrado." },
      ]),
    );

    await renderScreen();
    fillValidForm();
    submit();

    await waitFor(() => {
      expect(screen.getByText("Este e-mail já está cadastrado.")).toBeInTheDocument();
    });

    setValue("seu@email.com", "outro@email.com");

    await waitFor(() => {
      expect(screen.queryByText("Este e-mail já está cadastrado.")).not.toBeInTheDocument();
    });
  });
});
