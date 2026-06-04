import { IonCol, IonGrid, IonInput, IonRow } from "@ionic/react";
import { ChevronRight, Clock3, MoreVertical, Plus } from "lucide-react";
import { BeeButton } from "../../BeeButton";
import { PageBackground } from "../../PageBackground";
import type { WorkoutExercise } from "../../../types/workout";
import { ACTIVE_WORKOUT_CARD_STYLE, ACTIVE_WORKOUT_SLIDE_STYLE } from "../constants";
import { formatElapsedTime } from "../utils";
import { MuscleTag, SurfaceCard } from "./shared";

export function ActiveWorkoutView({
  sessionGroups,
  elapsedSeconds,
  exercises,
  finishValidationError,
  exerciseSlideRefs,
  seriesContainerRefs,
  isWorkoutMenuOpen,
  onToggleWorkoutMenu,
  onCancelWorkout,
  onOpenExerciseInfo,
  onUpdateSet,
  onAddSet,
  onOpenCatalog,
  onOpenFinish,
}: {
  sessionGroups: string[];
  elapsedSeconds: number;
  exercises: WorkoutExercise[];
  finishValidationError: string;
  exerciseSlideRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  seriesContainerRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  isWorkoutMenuOpen: boolean;
  onToggleWorkoutMenu: () => void;
  onCancelWorkout: () => void;
  onOpenExerciseInfo: (catalogId: string) => void;
  onUpdateSet: (exerciseId: string, setId: string, field: "weight" | "reps", value: string) => void;
  onAddSet: (exerciseId: string) => void;
  onOpenCatalog: () => void;
  onOpenFinish: () => void;
}) {
  return (
    <PageBackground>
      <IonGrid fixed style={{ width: "100%", maxWidth: 393, margin: "0 auto", padding: "24px 12px 0", position: "relative", zIndex: 1 }}>
        <IonRow>
          <IonCol size="12">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-end", gap: 10, marginBottom: 12, position: "relative" }}>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={onToggleWorkoutMenu}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    border: "1px solid #2D2D2D",
                    background: "#141414",
                    color: "#D4D4D4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <MoreVertical size={18} />
                </button>

                {isWorkoutMenuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: 48,
                      right: 0,
                      minWidth: 168,
                      borderRadius: 18,
                      border: "1px solid #2D2D2D",
                      background: "rgba(20,20,20,0.98)",
                      boxShadow: "0 18px 48px rgba(0,0,0,0.26)",
                      padding: 8,
                      zIndex: 3,
                    }}
                  >
                    <button
                      type="button"
                      onClick={onCancelWorkout}
                      style={{
                        width: "100%",
                        border: "none",
                        background: "transparent",
                        color: "#FCA5A5",
                        borderRadius: 12,
                        padding: "12px 14px",
                        textAlign: "left",
                        fontFamily: "var(--font-inter)",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Cancelar treino
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {sessionGroups.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {sessionGroups.map((group) => (
                    <MuscleTag key={group} group={group} />
                  ))}
                </div>
              )}
            </div>
          </IonCol>
        </IonRow>

        <IonRow className="mt-3">
          <IonCol size="12">
            <SurfaceCard border="#2D2D2D" background="rgba(20,20,20,0.92)">
              <div style={{ position: "relative", minHeight: 54 }}>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 54,
                    height: 54,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 18,
                      background: "rgba(255,215,0,0.14)",
                      border: "1px solid #2D2D2D",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#FFE44D",
                    }}
                  >
                    <Clock3 size={22} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 54 }}>
                  <div style={{ display: "grid", justifyItems: "center", gap: 4 }}>
                    <span
                      style={{
                        color: "#7A7A7A",
                        fontFamily: "var(--font-inter)",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        lineHeight: 1,
                      }}
                    >
                      Tempo decorrido
                    </span>
                    <span
                      style={{
                        color: "#FFFFFF",
                        fontFamily: "var(--font-montserrat)",
                        fontSize: 32,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        minWidth: 132,
                        lineHeight: 1,
                        textAlign: "center",
                      }}
                    >
                      {formatElapsedTime(elapsedSeconds)}
                    </span>
                  </div>
                </div>
              </div>
            </SurfaceCard>
          </IonCol>
        </IonRow>

        <IonRow className="mt-4">
          <IonCol size="12">
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: 16,
                overflowX: "auto",
                padding: "4px 2px 8px",
                scrollSnapType: "x proximity",
              }}
            >
              {exercises.map((exercise) => (
                <div
                  key={exercise.id}
                  ref={(node) => {
                    exerciseSlideRefs.current[exercise.id] = node;
                  }}
                  style={ACTIVE_WORKOUT_SLIDE_STYLE}
                >
                  <SurfaceCard border="#2D2D2D" background="rgba(20,20,20,0.96)" style={ACTIVE_WORKOUT_CARD_STYLE}>
                    <div style={{ display: "grid", gap: 14, height: "100%", gridTemplateRows: "auto minmax(0, 1fr) auto", alignContent: "start" }}>
                      <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                            <span style={{ color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 22, fontWeight: 700 }}>
                              {exercise.name}
                            </span>
                            <MuscleTag group={exercise.group} />
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenExerciseInfo(exercise.catalogId)}
                            aria-label={`Ver informações de ${exercise.name}`}
                            style={{
                              border: "1px solid #2D2D2D",
                              background: "#171717",
                              color: "#D4D4D4",
                              borderRadius: 12,
                              width: 40,
                              height: 40,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                          >
                            <ChevronRight size={16} color="#A3A3A3" />
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          borderRadius: 22,
                          border: "1px solid #262626",
                          background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                          padding: 14,
                          display: "grid",
                          gridTemplateRows: "auto minmax(0, 1fr)",
                          gap: 12,
                          minHeight: 0,
                          alignContent: "start",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "32px minmax(0, 1fr)",
                            alignItems: "center",
                            columnGap: 10,
                            color: "#8F8F8F",
                            fontFamily: "var(--font-inter)",
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            position: "sticky",
                            top: 0,
                            zIndex: 1,
                          }}
                        >
                          <span style={{ width: 32, flexShrink: 0, paddingLeft: 8 }}>#</span>
                          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", alignItems: "center", gap: 10 }}>
                            <span style={{ paddingLeft: 16 }}>Peso</span>
                            <span style={{ paddingLeft: 16 }}>Reps</span>
                          </div>
                        </div>

                        <div
                          ref={(node) => {
                            seriesContainerRefs.current[exercise.id] = node;
                          }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-start",
                            gap: 10,
                            minHeight: 0,
                            maxHeight: 212,
                            overflowY: "auto",
                            paddingRight: 2,
                            alignItems: "stretch",
                          }}
                        >
                          {exercise.sets.map((set, setIndex) => (
                            <div key={set.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span
                                style={{
                                  width: 32,
                                  flexShrink: 0,
                                  color: "#D4D4D4",
                                  fontFamily: "var(--font-montserrat)",
                                  fontSize: 16,
                                  fontWeight: 700,
                                  textAlign: "center",
                                }}
                              >
                                {setIndex + 1}
                              </span>

                              <div
                                style={{
                                  flex: 1,
                                  display: "grid",
                                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                                  gap: 10,
                                  alignItems: "center",
                                }}
                              >
                                <IonInput
                                  type="number"
                                  inputmode="decimal"
                                  value={set.weight}
                                  placeholder="kg"
                                  onIonInput={(event) =>
                                    onUpdateSet(exercise.id, set.id, "weight", String(event.detail.value ?? ""))
                                  }
                                  style={
                                    {
                                      "--background": "#111111",
                                      "--border-radius": "18px",
                                      "--padding-start": "16px",
                                      "--padding-end": "16px",
                                      minHeight: 56,
                                      border: "none",
                                      boxShadow: "none",
                                      color: "#FFFFFF",
                                      fontFamily: "var(--font-montserrat)",
                                      fontSize: 16,
                                      fontWeight: 700,
                                    } as React.CSSProperties
                                  }
                                />

                                <IonInput
                                  type="number"
                                  inputmode="numeric"
                                  value={set.reps}
                                  placeholder="reps"
                                  onIonInput={(event) =>
                                    onUpdateSet(exercise.id, set.id, "reps", String(event.detail.value ?? ""))
                                  }
                                  style={
                                    {
                                      "--background": "#111111",
                                      "--border-radius": "18px",
                                      "--padding-start": "16px",
                                      "--padding-end": "16px",
                                      minHeight: 56,
                                      border: "none",
                                      boxShadow: "none",
                                      color: "#FFFFFF",
                                      fontFamily: "var(--font-montserrat)",
                                      fontSize: 16,
                                      fontWeight: 700,
                                    } as React.CSSProperties
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ paddingTop: 6 }}>
                        <BeeButton variant="secondary" size="sm" onClick={() => onAddSet(exercise.id)}>
                          Adicionar Série
                        </BeeButton>
                      </div>
                    </div>
                  </SurfaceCard>
                </div>
              ))}

              <div style={ACTIVE_WORKOUT_SLIDE_STYLE}>
                <button
                  type="button"
                  onClick={onOpenCatalog}
                  style={{
                    ...ACTIVE_WORKOUT_CARD_STYLE,
                    border: "1px dashed #FFD700",
                    background: "rgba(255,215,0,0.12)",
                    borderRadius: 24,
                    padding: 22,
                    display: "grid",
                    alignContent: "center",
                    justifyItems: "center",
                    gap: 16,
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
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
                    <Plus size={24} />
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <span style={{ color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 22, fontWeight: 700 }}>
                      Adicionar exercício
                    </span>
                    <span style={{ color: "#A3A3A3", fontFamily: "var(--font-inter)", fontSize: 14, lineHeight: 1.6 }}>
                      Abra o catálogo, navegue pelas abas musculares e escolha o próximo exercício.
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </IonCol>
        </IonRow>

        <IonRow className="mt-6">
          <IonCol size="12">
            {finishValidationError && (
              <p
                style={{
                  margin: "0 2px 10px",
                  fontFamily: "var(--font-inter)",
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "#F87171",
                }}
              >
                {finishValidationError}
              </p>
            )}
            <BeeButton variant="primary" size="lg" fullWidth onClick={onOpenFinish}>
              Concluir treino
            </BeeButton>
          </IonCol>
        </IonRow>
      </IonGrid>
    </PageBackground>
  );
}
