import { IonCol, IonGrid, IonRow, IonText } from "@ionic/react";
import { ChevronLeft, Flame } from "lucide-react";
import { BeeButton } from "../../BeeButton";
import { PageBackground } from "../../PageBackground";
import type { ExerciseCatalogItem } from "../../../types/workout";
import type { DetailViewSource } from "../types";
import { muscleStyle } from "../utils";
import { MuscleTag, SurfaceCard } from "./shared";

export function WorkoutCatalogDetailView({
  exercise,
  detailViewSource,
  alreadyAdded,
  onBack,
  onAddExercise,
}: {
  exercise: ExerciseCatalogItem;
  detailViewSource: DetailViewSource;
  alreadyAdded: boolean;
  onBack: () => void;
  onAddExercise: () => void;
}) {
  const style = muscleStyle(exercise.group);

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
              {detailViewSource === "session" ? "Voltar para o treino" : "Voltar para o catálogo"}
            </button>

            <div style={{ display: "grid", gap: 12 }}>
              <MuscleTag group={exercise.group} />
              <h1 style={{ margin: 0, color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 30, fontWeight: 800 }}>
                {exercise.name}
              </h1>
              <IonText style={{ color: "#B5B5B5", fontFamily: "var(--font-inter)", fontSize: 15, lineHeight: 1.6 }}>
                {exercise.notes}
              </IonText>
            </div>
          </IonCol>
        </IonRow>

        <IonRow className="mt-5">
          <IonCol size="12">
            <SurfaceCard border={style.border} background={style.bg}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${style.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: style.text,
                    }}
                  >
                    <Flame size={18} />
                  </div>
                  <div style={{ display: "grid", gap: 2 }}>
                    <span style={{ color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 18, fontWeight: 700 }}>
                      Mapa muscular
                    </span>
                    <span style={{ color: "#B5B5B5", fontFamily: "var(--font-inter)", fontSize: 13 }}>
                      Espaço reservado para o mapa de calor dos músculos.
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    minHeight: 220,
                    borderRadius: 22,
                    border: `1px dashed ${style.border}`,
                    background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: style.text,
                    fontFamily: "var(--font-montserrat)",
                    fontSize: 16,
                    fontWeight: 700,
                    textAlign: "center",
                    padding: 20,
                  }}
                >
                  Heatmap muscular
                </div>
              </div>
            </SurfaceCard>
          </IonCol>
        </IonRow>

        <IonRow className="mt-4">
          <IonCol size="12">
            <div style={{ display: "grid", gap: 12 }}>
              <SurfaceCard>
                <div style={{ display: "grid", gap: 14 }}>
                  <span style={{ color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 18, fontWeight: 700 }}>
                    Histórico recente
                  </span>

                  <div style={{ display: "grid", gap: 10 }}>
                    {[
                      { label: "Última vez", value: exercise.lastPerformed },
                      { label: "Melhor carga", value: exercise.bestWeight },
                      { label: "Última carga", value: exercise.lastWeight },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          borderRadius: 18,
                          border: "1px solid #2D2D2D",
                          background: "#121212",
                          padding: 16,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <span style={{ color: "#A3A3A3", fontFamily: "var(--font-inter)", fontSize: 13, fontWeight: 600 }}>
                          {item.label}
                        </span>
                        <span style={{ color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 16, fontWeight: 700 }}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </SurfaceCard>

              <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                <BeeButton
                  variant={alreadyAdded ? "secondary" : "primary"}
                  size="lg"
                  fullWidth
                  onClick={() => {
                    if (!alreadyAdded) onAddExercise();
                  }}
                  disabled={alreadyAdded}
                >
                  {alreadyAdded ? "Exercício já adicionado" : "Adicionar ao treino"}
                </BeeButton>
              </div>
            </div>
          </IonCol>
        </IonRow>
      </IonGrid>
    </PageBackground>
  );
}
