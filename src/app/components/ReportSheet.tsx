import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { BeeButton } from "./BeeButton";
import { BeeTextarea } from "./profile/components/shared";
import { messages } from "../constants/messages";
import { reportService } from "../services/reportService";
import { ApiError } from "../services/apiClient";
import type { ReportReason, ReportTargetType } from "../types/api";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Assédio" },
  { value: "NUDITY", label: "Nudez" },
  { value: "VIOLENCE", label: "Violência" },
  { value: "OTHER", label: "Outros" },
];

const DETAILS_MAX_LENGTH = 500;

export function ReportSheet({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Cada abertura comeca limpa: reaproveitar o motivo escolhido para outro alvo
  // faria o usuario enviar uma denuncia que ele nao releu.
  useEffect(() => {
    if (open) {
      setReason(null);
      setDetails("");
      setError("");
      setIsSending(false);
    }
  }, [open]);

  async function handleSubmit() {
    if (!reason) {
      setError(messages.reportReasonRequired);
      return;
    }
    if (details.length > DETAILS_MAX_LENGTH) {
      setError(messages.maxLength(DETAILS_MAX_LENGTH));
      return;
    }

    setIsSending(true);
    try {
      await reportService.createReport({
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      });
      onOpenChange(false);
      toast.success(messages.reportSent);
    } catch (submitError) {
      // 409 e o caso esperado de denuncia repetida; o backend ja devolve o texto
      // para o usuario final, entao ele vale mais que a mensagem generica.
      if (submitError instanceof ApiError && submitError.status === 409) {
        onOpenChange(false);
        toast.error(submitError.message || messages.reportDuplicate);
        return;
      }
      setError(messages.actionFailed("enviar a denúncia"));
    } finally {
      setIsSending(false);
    }
  }

  const title = targetType === "POST" ? "Denunciar publicação" : "Denunciar perfil";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="beefit-sheet-width rounded-t-[28px] border-[#2D2D2D] bg-[#141414] px-5 pb-7 pt-3 text-white"
      >
        <SheetHeader>
          <SheetTitle className="font-montserrat text-[20px] font-bold text-white">{title}</SheetTitle>
          <SheetDescription className="font-inter text-[13px] text-[#8A8A8A]">
            {targetLabel ? `Denunciando ${targetLabel}.` : "Escolha o motivo da denúncia."}
          </SheetDescription>
        </SheetHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {REASONS.map((option) => {
              const selected = reason === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected ? "true" : "false"}
                  onClick={() => {
                    setReason(option.value);
                    setError("");
                  }}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 999,
                    border: `1px solid ${selected ? "#FFD700" : "#404040"}`,
                    background: selected ? "rgba(255,215,0,0.12)" : "transparent",
                    color: selected ? "#FFD700" : "#D4D4D4",
                    fontSize: 14,
                    fontWeight: selected ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <BeeTextarea
            label="Detalhes (opcional)"
            value={details}
            onChange={setDetails}
            placeholder={messages.reportDetailsHint}
            error={error}
          />

          <BeeButton variant="red" fullWidth disabled={isSending} onClick={handleSubmit}>
            {isSending ? "Enviando..." : "Enviar denúncia"}
          </BeeButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
