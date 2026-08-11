import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useConfirm } from "./useConfirm";

function Probe({ onResult, options }: { onResult: (r: unknown) => void; options: Parameters<ReturnType<typeof useConfirm>["confirm"]>[0] }) {
  const { confirm, dialog } = useConfirm();
  return (
    <div>
      <button type="button" onClick={() => void confirm(options).then(onResult)}>
        abrir
      </button>
      {dialog}
    </div>
  );
}

function clickText(text: string) {
  fireEvent.click(screen.getByText(text));
}

describe("useConfirm", () => {
  it("resolve true no confirmar e false no cancelar", async () => {
    const onResult = vi.fn();
    render(<Probe onResult={onResult} options={{ title: "Cancelar este treino?" }} />);

    clickText("abrir");
    await waitFor(() => expect(screen.getByText("Cancelar este treino?")).toBeInTheDocument());
    clickText("Confirmar");

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));

    clickText("abrir");
    await waitFor(() => expect(screen.getByText("Cancelar este treino?")).toBeInTheDocument());
    clickText("Cancelar");

    await waitFor(() => expect(onResult).toHaveBeenLastCalledWith(false));
  });

  it("devolve o texto digitado, no lugar do window.prompt", async () => {
    const onResult = vi.fn();
    render(
      <Probe
        onResult={onResult}
        options={{ title: "Salvar como template", input: { label: "Nome do template" } }}
      />,
    );

    clickText("abrir");
    await waitFor(() => expect(screen.getByText("Salvar como template")).toBeInTheDocument());

    const input = document.querySelector("ion-input");
    fireEvent(input!, new CustomEvent("ionInput", { detail: { value: "Push pesado" } }));
    clickText("Confirmar");

    await waitFor(() => expect(onResult).toHaveBeenCalledWith("Push pesado"));
  });

  it("nao fecha nem resolve enquanto a validacao do texto recusa", async () => {
    const onResult = vi.fn();
    render(
      <Probe
        onResult={onResult}
        options={{
          title: "Salvar como template",
          input: {
            label: "Nome do template",
            validate: (value) => (value.trim() ? "" : "Informe um nome para o template."),
          },
        }}
      />,
    );

    clickText("abrir");
    await waitFor(() => expect(screen.getByText("Salvar como template")).toBeInTheDocument());
    clickText("Confirmar");

    await waitFor(() => {
      expect(screen.getByText("Informe um nome para o template.")).toBeInTheDocument();
    });
    // Fechar aqui descartaria o que o usuario digitou antes de conferir.
    expect(onResult).not.toHaveBeenCalled();
    expect(screen.getByText("Salvar como template")).toBeInTheDocument();
  });
});
