import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { BeeInput } from "../components/BeeInput";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Estilo de acao destrutiva (cancelar treino, excluir conta). */
  destructive?: boolean;
  /** Quando presente, o dialogo pede um texto — substitui o window.prompt. */
  input?: {
    label: string;
    placeholder?: string;
    initialValue?: string;
    /** Mensagem de erro quando o valor nao serve; vazio significa valido. */
    validate?: (value: string) => string;
  };
}

/**
 * Confirmacao no visual do app, no lugar de window.confirm/prompt.
 *
 * O retorno e uma promise como o window.confirm era, para o call site continuar
 * lendo de cima para baixo: `if (!(await confirm({...}))) return;`. Quando ha
 * `input`, resolve com o texto digitado, ou `null` se cancelar.
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const resolverRef = useRef<((result: string | boolean | null) => void) | null>(null);

  useEffect(() => () => {
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  const confirm = useCallback((next: ConfirmOptions) => {
    // Abrir um confirm com outro pendente sobrescreveria o resolver e deixaria o
    // primeiro chamador esperando para sempre. A interface nao permite isso — o
    // dialogo e modal —, mas uma chamada programatica travaria o fluxo em silencio,
    // que e o mesmo risco que o onOpenChange ja cobre para o Esc.
    resolverRef.current?.(false);
    setOptions(next);
    setValue(next.input?.initialValue ?? "");
    setError("");
    return new Promise<string | boolean | null>((resolve) => {
      resolverRef.current = (result) => resolve(next.input && result === false ? null : result);
    });
  }, []);

  function settle(result: string | boolean | null) {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }

  function handleConfirm() {
    if (options?.input) {
      const validationError = options.input.validate?.(value) ?? "";
      if (validationError) {
        setError(validationError);
        return;
      }
      settle(value);
      return;
    }
    settle(true);
  }

  const dialog = (
    <AlertDialog
      open={options !== null}
      onOpenChange={(open) => {
        // Fechar pelo Esc ou pelo overlay equivale a cancelar; sem isto a promise
        // ficaria pendurada para sempre e o fluxo travaria em silencio.
        if (!open && resolverRef.current) settle(options?.input ? null : false);
      }}
    >
      <AlertDialogContent className="beefit-sheet-width rounded-[24px] border-[#2D2D2D] bg-[#141414] p-6 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-montserrat text-[18px] font-bold text-white">
            {options?.title}
          </AlertDialogTitle>
          {options?.description && (
            <AlertDialogDescription className="font-inter text-[14px] leading-relaxed text-[#A3A3A3]">
              {options.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {options?.input && (
          <div className="py-1">
            <BeeInput
              label={options.input.label}
              placeholder={options.input.placeholder}
              value={value}
              error={error}
              onChange={(event) => {
                setValue(event.target.value);
                if (error) setError("");
              }}
            />
          </div>
        )}

        <AlertDialogFooter className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel className="min-h-11 rounded-[14px] border-[#2D2D2D] bg-transparent font-montserrat text-[12px] font-bold uppercase tracking-wider text-white hover:bg-[#1F1F1F]">
            {options?.cancelLabel ?? "Cancelar"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              // Com input, a validacao pode recusar; deixar o Radix fechar sozinho
              // descartaria o texto digitado antes de conferir.
              event.preventDefault();
              handleConfirm();
            }}
            className={
              options?.destructive
                ? "min-h-11 rounded-[14px] bg-[#EF4444] font-montserrat text-[12px] font-bold uppercase tracking-wider text-white hover:bg-[#DC2626]"
                : "min-h-11 rounded-[14px] bg-[#FFD700] font-montserrat text-[12px] font-bold uppercase tracking-wider text-[#0A0A0A] hover:bg-[#E6C200]"
            }
          >
            {options?.confirmLabel ?? "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
