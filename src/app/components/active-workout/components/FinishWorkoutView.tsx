import { useRef } from "react";
import { IonCol, IonGrid, IonRow, IonText } from "@ionic/react";
import { CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Bookmark, Camera, ChevronLeft, Flame, ImageIcon, Weight } from "lucide-react";
import { BeeButton } from "../../BeeButton";
import { BeeInput } from "../../BeeInput";
import { PageBackground } from "../../PageBackground";
import { formatElapsedTime } from "../utils";
import { SurfaceCard } from "./shared";
import { BeeAlert } from "../../BeeAlert";
import { captureWorkoutPhoto } from "../../../platform/workoutPhoto";
import { compressImageFile } from "../../../platform/imageCompression";

export function FinishWorkoutView({
  finishPhotoInputRef: _unusedPhotoInputRef,
  finishPhotoUrl,
  finishTitle,
  finishTitleError,
  elapsedSeconds,
  totalVolumeKg,
  estimatedCalories,
  shouldPostWorkout,
  shouldSaveTemplate,
  ghostModeEnabled,
  onBack,
  onPhotoChange,
  onTitleChange,
  onTogglePost,
  onToggleSaveTemplate,
  onFinish,
}: {
  finishPhotoInputRef: React.RefObject<HTMLInputElement | null>;
  finishPhotoUrl: string | null;
  finishTitle: string;
  finishTitleError: string;
  elapsedSeconds: number;
  totalVolumeKg: number;
  estimatedCalories: number;
  shouldPostWorkout: boolean;
  shouldSaveTemplate: boolean;
  ghostModeEnabled: boolean;
  onBack: () => void;
  onPhotoChange: (file: File | null) => void;
  onTitleChange: (value: string) => void;
  onTogglePost: () => void;
  onToggleSaveTemplate: () => void;
  onFinish: () => void;
}) {
  const finishCameraInputRef = useRef<HTMLInputElement | null>(null);
  const finishGalleryInputRef = useRef<HTMLInputElement | null>(null);

  async function handleTakePhoto() {
    if (Capacitor.isNativePlatform()) {
      try {
        const file = await captureWorkoutPhoto(CameraSource.Camera);
        if (file) {
          onPhotoChange(file);
          return;
        }
      } catch (err) {
        console.warn("Native camera failed, falling back to input", err);
      }
    }
    finishCameraInputRef.current?.click();
  }

  async function handlePickGallery() {
    if (Capacitor.isNativePlatform()) {
      try {
        const file = await captureWorkoutPhoto(CameraSource.Photos);
        if (file) {
          onPhotoChange(file);
          return;
        }
      } catch (err) {
        console.warn("Native gallery failed, falling back to input", err);
      }
    }
    finishGalleryInputRef.current?.click();
  }

  async function handleFileInputChange(file: File | null) {
    if (!file) {
      onPhotoChange(null);
      return;
    }
    const compressed = await compressImageFile(file, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.8,
    });
    onPhotoChange(compressed);
  }

  const formattedVolume = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(totalVolumeKg);
  const formattedCalories = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(estimatedCalories);
  const formattedDuration = formatElapsedTime(elapsedSeconds);

  return (
    <PageBackground>
      <IonGrid fixed style={{ padding: "32px 12px 24px", position: "relative", zIndex: 1 }}>
        <IonRow>
          <IonCol size="12">
            <button
              type="button"
              onClick={onBack}
              className="beefit-tap-target"
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

            <div style={{ display: "grid", gap: 6 }}>
              <h1
                style={{
                  margin: 0,
                  color: "#FFFFFF",
                  fontFamily: "var(--font-montserrat)",
                  fontSize: 32,
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                }}
              >
                Concluir Treino
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
                ref={finishCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void handleFileInputChange(file);
                  event.target.value = "";
                }}
              />
              <input
                ref={finishGalleryInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void handleFileInputChange(file);
                  event.target.value = "";
                }}
              />

              {finishPhotoUrl ? (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    minHeight: 230,
                    borderRadius: 24,
                    overflow: "hidden",
                    border: "1px solid rgba(255,215,0,0.3)",
                    background: `url(${finishPhotoUrl}) center / cover no-repeat`,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.75) 100%)",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      display: "flex",
                      gap: 10,
                      justifyContent: "center",
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleTakePhoto}
                      style={{
                        borderRadius: 14,
                        background: "rgba(20,20,20,0.85)",
                        border: "1px solid rgba(255,215,0,0.3)",
                        padding: "10px 14px",
                        color: "#FFD700",
                        fontFamily: "var(--font-montserrat)",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                      }}
                    >
                      <Camera size={15} />
                      Nova foto
                    </button>
                    <button
                      type="button"
                      onClick={handlePickGallery}
                      style={{
                        borderRadius: 14,
                        background: "rgba(20,20,20,0.85)",
                        border: "1px solid #404040",
                        padding: "10px 14px",
                        color: "#FFFFFF",
                        fontFamily: "var(--font-montserrat)",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                      }}
                    >
                      <ImageIcon size={15} />
                      Galeria
                    </button>
                    <button
                      type="button"
                      onClick={() => onPhotoChange(null)}
                      style={{
                        borderRadius: 14,
                        background: "rgba(239,68,68,0.15)",
                        border: "1px solid rgba(239,68,68,0.35)",
                        padding: "10px 14px",
                        color: "#FCA5A5",
                        fontFamily: "var(--font-montserrat)",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    width: "100%",
                    borderRadius: 24,
                    border: "1px dashed rgba(255,215,0,0.35)",
                    background: "rgba(255,215,0,0.04)",
                    padding: "24px 18px",
                    display: "grid",
                    placeItems: "center",
                    textAlign: "center",
                    gap: 16,
                  }}
                >
                  <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        background: "rgba(255,215,0,0.12)",
                        border: "1px solid rgba(255,228,77,0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFE44D",
                      }}
                    >
                      <Camera size={24} />
                    </div>
                    <span style={{ color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 18, fontWeight: 700 }}>
                      Foto do treino
                    </span>
                    <span style={{ color: "#8A8A8A", fontFamily: "var(--font-inter)", fontSize: 13, maxWidth: 280, lineHeight: 1.45 }}>
                      Mostre o pump, a academia ou um momento da sessão.
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 320 }}>
                    <button
                      type="button"
                      onClick={handleTakePhoto}
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        background: "rgba(255,215,0,0.14)",
                        border: "1px solid rgba(255,215,0,0.35)",
                        padding: "12px 10px",
                        color: "#FFD700",
                        fontFamily: "var(--font-montserrat)",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        cursor: "pointer",
                      }}
                    >
                      <Camera size={16} />
                      Tirar foto
                    </button>
                    <button
                      type="button"
                      onClick={handlePickGallery}
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        background: "#1C1C1C",
                        border: "1px solid #333333",
                        padding: "12px 10px",
                        color: "#FFFFFF",
                        fontFamily: "var(--font-montserrat)",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        cursor: "pointer",
                      }}
                    >
                      <ImageIcon size={16} />
                      Galeria
                    </button>
                  </div>
                </div>
              )}

              <SurfaceCard border="#2D2D2D" background="rgba(20,20,20,0.96)">
                <div style={{ display: "grid", gap: 18 }}>
                  {/* Tres colunas fixas deixam 51px de conteudo por card a 320px, mas o
                      maior valor ("1 kcal" a 24px) mede 87px e vaza da caixa. O piso de
                      120px = 87 de conteudo + 28 de padding + folga, entao auto-fit so
                      forma a terceira coluna quando ela cabe de verdade. */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
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
                        <ImageIcon size={16} color="#60A5FA" />
                        <span
                          style={{
                            fontFamily: "var(--font-inter)",
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "#8A8A8A",
                          }}
                        >
                          Duração
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
                        {formattedDuration}
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
                        <Weight size={16} color="#FFE44D" />
                        <span
                          style={{
                            fontFamily: "var(--font-inter)",
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "#8A8A8A",
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
                            color: "#8A8A8A",
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
                    maxLength={80}
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
                      <span style={{ display: "block", fontFamily: "var(--font-inter)", fontSize: 12, lineHeight: 1.6, color: "#8A8A8A" }}>
                        {ghostModeEnabled
                          ? "Modo fantasma ativo: a publicação começa desmarcada."
                          : "Seu treino pode aparecer no feed e no perfil."}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={onTogglePost}
                      aria-pressed={shouldPostWorkout}
                      className="beefit-tap-target"
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
                        Salvar como template
                      </span>
                      <span style={{ display: "block", fontFamily: "var(--font-inter)", fontSize: 12, lineHeight: 1.6, color: "#8A8A8A" }}>
                        Usa o título como nome e salva apenas grupos e exercícios.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={onToggleSaveTemplate}
                      aria-pressed={shouldSaveTemplate}
                      aria-label={shouldSaveTemplate ? "Não salvar template" : "Salvar template"}
                      className="beefit-tap-target"
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        border: "1px solid",
                        borderColor: shouldSaveTemplate ? "#FFD700" : "#404040",
                        background: shouldSaveTemplate ? "rgba(255,215,0,0.18)" : "#101010",
                        color: shouldSaveTemplate ? "#FFD700" : "#8A8A8A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        flexShrink: 0,
                      }}
                    >
                      <Bookmark size={18} fill={shouldSaveTemplate ? "#FFD700" : "none"} />
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
                <div style={{ marginBottom: 4 }}>
                  <BeeAlert title="Aviso de Ofensiva">
                    Treinos com menos de 30 minutos de duração não contabilizam para manter ou aumentar sua ofensiva de <strong>honeys</strong>.
                  </BeeAlert>
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
