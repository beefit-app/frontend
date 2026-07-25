import { IonCol, IonGrid, IonRow, IonText } from "@ionic/react";
import { Camera, ChevronLeft, Flame, ImageIcon, Weight, AlertTriangle } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { CameraSource } from "@capacitor/camera";
import { BeeButton } from "../../BeeButton";
import { BeeInput } from "../../BeeInput";
import { PageBackground } from "../../PageBackground";
import { SurfaceCard } from "./shared";
import { captureWorkoutPhoto } from "../../../platform/workoutPhoto";

export function FinishWorkoutView({
  finishPhotoInputRef,
  finishPhotoUrl,
  finishTitle,
  finishTitleError,
  totalVolumeKg,
  estimatedCalories,
  shouldPostWorkout,
  ghostModeEnabled,
  elapsedSeconds,
  onBack,
  onPhotoChange,
  onTitleChange,
  onTogglePost,
  onFinish,
}: {
  finishPhotoInputRef: React.RefObject<HTMLInputElement | null>;
  finishPhotoUrl: string | null;
  finishTitle: string;
  finishTitleError: string;
  totalVolumeKg: number;
  estimatedCalories: number;
  shouldPostWorkout: boolean;
  ghostModeEnabled: boolean;
  elapsedSeconds: number;
  onBack: () => void;
  onPhotoChange: (file: File | null) => void;
  onTitleChange: (value: string) => void;
  onTogglePost: () => void;
  onFinish: () => void;
}) {
  const formattedVolume = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(totalVolumeKg);
  const formattedCalories = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(estimatedCalories);

  return (
    <PageBackground>
      <IonGrid fixed style={{ maxWidth: 393, padding: "32px 12px 24px", position: "relative", zIndex: 1 }}>
        <IonRow>
          <IonCol size="12">
            <button
              type="button"
              onClick={onBack}
              style={{
                border: "none",
                background: "transparent",
                color: "#A3A3A3",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: 0,
                marginBottom: 18,
                cursor: "pointer",
                fontFamily: "var(--font-inter)",
                fontSize: 14,
              }}
            >
              <ChevronLeft size={16} />
              Voltar para o treino
            </button>

            <div style={{ display: "grid", gap: 8 }}>
              <h1 style={{ margin: 0, color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 30, fontWeight: 800 }}>
                Concluir treino
              </h1>
              <IonText style={{ color: "#B5B5B5", fontFamily: "var(--font-inter)", fontSize: 15, lineHeight: 1.6 }}>
                Adicione uma foto, escolha um título e defina se este treino deve ser publicado no seu perfil.
              </IonText>
            </div>
          </IonCol>
        </IonRow>

        <IonRow className="mt-5">
          <IonCol size="12">
            <div style={{ display: "grid", gap: 16 }}>
              <input
                ref={finishPhotoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(event) => onPhotoChange(event.target.files?.[0] ?? null)}
              />

              <button
                type="button"
                onClick={() => {
                  if (!Capacitor.isNativePlatform()) {
                    finishPhotoInputRef.current?.click();
                    return;
                  }
                  void captureWorkoutPhoto(CameraSource.Prompt).then((file) => onPhotoChange(file));
                }}
                style={{
                  width: "100%",
                  minHeight: 220,
                  borderRadius: 24,
                  border: "1px dashed #FFD700",
                  background: finishPhotoUrl
                    ? `linear-gradient(rgba(10,10,10,0.18), rgba(10,10,10,0.5)), url(${finishPhotoUrl}) center / cover`
                    : "rgba(255,215,0,0.08)",
                  padding: 22,
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                {finishPhotoUrl ? (
                  <div
                    style={{
                      borderRadius: 999,
                      background: "rgba(10,10,10,0.72)",
                      border: "1px solid rgba(255,215,0,0.22)",
                      padding: "10px 14px",
                      color: "#FFFFFF",
                      fontFamily: "var(--font-inter)",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    Trocar foto
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 12, justifyItems: "center" }}>
                    <div
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 18,
                        background: "rgba(255,215,0,0.14)",
                        border: "1px solid rgba(255,228,77,0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFE44D",
                      }}
                    >
                      <Camera size={24} />
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <span style={{ color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 22, fontWeight: 700 }}>
                        Adicionar foto do treino
                      </span>
                      <span style={{ color: "#A3A3A3", fontFamily: "var(--font-inter)", fontSize: 14, lineHeight: 1.6 }}>
                        Mostre o pump, a academia ou algum momento da sessão.
                      </span>
                    </div>
                  </div>
                )}
              </button>

              <SurfaceCard border="#2D2D2D" background="rgba(20,20,20,0.96)">
                <div style={{ display: "grid", gap: 18 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div
                      style={{
                        borderRadius: 18,
                        border: "1px solid #2D2D2D",
                        background: "#171717",
                        padding: 14,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Weight size={16} color="#FFE44D" />
                        <span
                          style={{
                            fontFamily: "var(--font-inter)",
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "#737373",
                          }}
                        >
                          Volume total
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-montserrat)",
                          fontSize: 24,
                          fontWeight: 800,
                          color: "#FFFFFF",
                          lineHeight: 1,
                        }}
                      >
                        {formattedVolume} kg
                      </span>
                    </div>

                    <div
                      style={{
                        borderRadius: 18,
                        border: "1px solid #2D2D2D",
                        background: "#171717",
                        padding: 14,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Flame size={16} color="#F97316" />
                        <span
                          style={{
                            fontFamily: "var(--font-inter)",
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "#737373",
                          }}
                        >
                          Calorias
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-montserrat)",
                          fontSize: 24,
                          fontWeight: 800,
                          color: "#FFFFFF",
                          lineHeight: 1,
                        }}
                      >
                        {formattedCalories} kcal
                      </span>
                    </div>
                  </div>

                  <BeeInput
                    label="Título do treino"
                    value={finishTitle}
                    placeholder="Ex: Push pesado de sexta"
                    onChange={(event) => onTitleChange(event.target.value)}
                    error={finishTitleError}
                    icon={<ImageIcon size={18} />}
                  />

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      padding: "16px 14px",
                      borderRadius: 18,
                      border: "1px solid #2D2D2D",
                      background: "#171717",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontFamily: "var(--font-montserrat)", fontSize: 14, fontWeight: 700, color: "#FFFFFF", marginBottom: 4 }}>
                        Postar treino no perfil
                      </span>
                      <span style={{ display: "block", fontFamily: "var(--font-inter)", fontSize: 12, lineHeight: 1.6, color: "#737373" }}>
                        {ghostModeEnabled
                          ? "Modo fantasma ativo: a publicação começa desmarcada."
                          : "Seu treino pode aparecer no feed e no perfil."}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={onTogglePost}
                      aria-pressed={shouldPostWorkout}
                      style={{
                        width: 56,
                        height: 32,
                        borderRadius: 999,
                        border: "1px solid",
                        borderColor: shouldPostWorkout ? "#FFD700" : "#404040",
                        background: shouldPostWorkout ? "rgba(255,215,0,0.18)" : "#101010",
                        padding: 3,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: shouldPostWorkout ? "flex-end" : "flex-start",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: shouldPostWorkout ? "#FFD700" : "#737373",
                          boxShadow: shouldPostWorkout ? "0 0 12px rgba(255,215,0,0.35)" : "none",
                          transition: "all 0.2s ease",
                        }}
                      />
                    </button>
                  </div>
                </div>
              </SurfaceCard>
            </div>
          </IonCol>
        </IonRow>

        <IonRow className="mt-6">
          <IonCol size="12">
            <div style={{ display: "grid", gap: 12 }}>
              {elapsedSeconds < 1800 && (
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(239, 68, 68, 0.28)",
                    background: "rgba(239, 68, 68, 0.08)",
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 4,
                  }}
                >
                  <AlertTriangle size={18} color="#F87171" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ display: "grid", gap: 3 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-montserrat)",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#F87171",
                      }}
                    >
                      Aviso de Ofensiva
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-inter)",
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: "#D4D4D4",
                      }}
                    >
                      Treinos com menos de 30 minutos de duração não contabilizam para manter ou aumentar sua ofensiva de <strong>honeys</strong>.
                    </span>
                  </div>
                </div>
              )}
              <BeeButton variant="primary" size="lg" fullWidth onClick={onFinish}>
                Finalizar treino
              </BeeButton>
              <BeeButton variant="dark" size="lg" fullWidth onClick={onBack}>
                Continuar editando
              </BeeButton>
            </div>
          </IonCol>
        </IonRow>
      </IonGrid>
    </PageBackground>
  );
}
