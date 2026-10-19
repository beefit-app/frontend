import { Instagram } from "lucide-react";
import { BeeButton } from "../../BeeButton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../ui/sheet";
import type { WorkoutShareStatus } from "../hooks/useWorkoutShare";

export function WorkoutShareView({
  open,
  status,
  previewUrl,
  shareLabel,
  onShare,
  onClose,
}: {
  open: boolean;
  status: WorkoutShareStatus;
  previewUrl: string | null;
  shareLabel: string;
  onShare: () => void;
  onClose: () => void;
}) {
  const isBusy = status === "generating" || status === "sharing";

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        className="beefit-sheet-width rounded-t-[28px] border-[#2D2D2D] bg-[#141414] px-5 pb-7 pt-3 text-white"
      >
        <SheetHeader>
          <SheetTitle className="font-montserrat text-[20px] font-bold text-white">Treino concluído!</SheetTitle>
          <SheetDescription className="font-inter text-[13px] text-[#8A8A8A]">
            Mostre o resultado da sessão nos seus Stories.
          </SheetDescription>
        </SheetHeader>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div
            data-testid="workout-share-preview"
            style={{
              height: "min(48vh, 420px)",
              aspectRatio: "9 / 16",
              borderRadius: 20,
              overflow: "hidden",
              border: "1px solid rgba(255,215,0,0.3)",
              background: "#0A0A0A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Prévia do card do treino"
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              />
            ) : (
              <span style={{ color: "#8A8A8A", fontFamily: "var(--font-inter)", fontSize: 13, padding: 16, textAlign: "center" }}>
                {status === "error" ? "Não foi possível gerar o card do treino." : "Gerando card..."}
              </span>
            )}
          </div>

          <div style={{ display: "grid", gap: 10, width: "100%" }}>
            {status !== "error" && (
              <BeeButton variant="primary" size="lg" fullWidth disabled={isBusy || !previewUrl} onClick={onShare}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Instagram size={18} />
                  {status === "sharing" ? "Abrindo..." : shareLabel}
                </span>
              </BeeButton>
            )}
            <BeeButton variant="dark" size="lg" fullWidth onClick={onClose}>
              Ir para o feed
            </BeeButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
