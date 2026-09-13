import { useEffect, useState } from "react";
import { IonCol, IonGrid, IonRow, IonText } from "@ionic/react";
import { ChevronLeft, Flame } from "lucide-react";
import { BeeButton } from "../../BeeButton";
import { PageBackground } from "../../PageBackground";
import type { ExerciseCatalogItem, ExerciseHistory } from "../../../types/workout";
import type { DetailViewSource } from "../types";
import { muscleStyle } from "../utils";
import { workoutService } from "../../../services/workoutService";
import { MuscleTag, SurfaceCard } from "./shared";
import { ExerciseMuscleMap } from "./ExerciseMuscleMap";

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
  const [history, setHistory] = useState<ExerciseHistory | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    setHistory(null);
    setHistoryError(null);

    void workoutService.getExerciseHistory(exercise.id)
      .then((loadedHistory) => {
        if (active) setHistory(loadedHistory);
      })
      .catch(() => {
        if (active) setHistoryError("Não foi possível carregar o histórico agora.");
      });

    return () => {
      active = false;
    };
  }, [exercise.id]);

  const formatDate = (value: string | null) => {
    if (!value) return "Ainda não realizado";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Ainda não realizado"
      : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  };
  const formatPerformance = (weight: number | null, reps: number | null) => {
    if (weight === null || reps === null) return "—";
    return weight === 0 ? `${reps} repetições` : `${weight} kg × ${reps}`;
  };

  return (
    <PageBackground>
      <IonGrid fixed style={{ padding: "32px 12px calc(16px + var(--ion-safe-area-bottom, 0px))", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
        <IonRow style={{ flex: "0 0 auto" }}>
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
              {detailViewSource === "session" ? "Voltar para o treino" : "Voltar para o catálogo"}
            </button>

            <div style={{ display: "grid", gap: 12 }}>
              <MuscleTag group={exercise.group} />
              <h1 style={{ margin: 0, color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 30, fontWeight: 800 }}>
                {exercise.name}
              </h1>
              <div style={{ display: "grid", gap: 4 }}>
                <IonText
                  style={{
                    color: "#B5B5B5",
                    fontFamily: "var(--font-inter)",
                    fontSize: 15,
                    lineHeight: 1.6,
                    ...(isExpanded ? {} : {
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    })
                  }}
                >
                  {exercise.notes}
                </IonText>
                {exercise.notes && exercise.notes.length > 80 && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#FFFFFF",
                      fontFamily: "var(--font-inter)",
                      fontSize: 13,
                      fontWeight: 600,
                      padding: 0,
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    {isExpanded ? "Ver menos" : "Ler mais"}
                  </button>
                )}
              </div>
            </div>
          </IonCol>
        </IonRow>

        <IonRow className="mt-5" style={{ flex: "0 0 auto" }}>
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
                      Músculos primários e secundários do exercício.
                    </span>
                  </div>
                </div>

                <ExerciseMuscleMap
                  muscles={exercise.anatomicalMuscles}
                  primaryMuscles={exercise.primaryAnatomicalMuscles}
                  secondaryMuscles={exercise.secondaryAnatomicalMuscles}
                />
              </div>
            </SurfaceCard>
          </IonCol>
        </IonRow>

        <IonRow className="mt-4" style={{ flex: "1 1 auto", display: "flex", minHeight: 0 }}>
          <IonCol size="12" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", minHeight: 0 }}>
              <SurfaceCard style={{ flex: "1 1 auto", overflowY: "auto", display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{ display: "grid", gap: 14, flex: "0 0 auto" }}>
                  <span style={{ color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 18, fontWeight: 700 }}>
                    Histórico recente
                  </span>

                  {historyError ? (
                    <span className="font-inter text-sm text-[#FCA5A5]">{historyError}</span>
                  ) : !history ? (
                    <span className="font-inter text-sm text-[#A3A3A3]">Carregando histórico…</span>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                    {[
                      { label: "Última vez", value: formatDate(history.lastPerformedAt) },
                      { label: "Melhor desempenho", value: formatPerformance(history.bestWeightKg, history.bestReps) },
                      { label: "Último desempenho", value: formatPerformance(history.lastWeightKg, history.lastReps) },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          borderRadius: 18,
                          background: "rgba(255,255,255,0.035)",
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
                  )}
                  </div>
              </SurfaceCard>

              <div style={{ display: "flex", justifyContent: "center", width: "100%", flex: "0 0 auto", marginTop: "auto" }}>
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
