import { useState, useRef, useEffect } from "react";
import { IonCol, IonGrid, IonInput, IonRow } from "@ionic/react";
import { Clock3, Ellipsis, Plus, ChevronRight, ChevronLeft } from "lucide-react";
import { BeeButton } from "../../BeeButton";
import { PageBackground } from "../../PageBackground";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../ui/sheet";
import type { ExerciseHistory, WorkoutExercise } from "../../../types/workout";
import { ACTIVE_WORKOUT_CARD_STYLE, ACTIVE_WORKOUT_SLIDE_STYLE } from "../constants";
import { formatElapsedTime } from "../utils";
import { MuscleTag, SurfaceCard } from "./shared";
import { BeeAlert } from "../../BeeAlert";
import { ExerciseMuscleMap } from "./ExerciseMuscleMap";
import { workoutService } from "../../../services/workoutService";

type HistoryState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded"; history: ExerciseHistory }
  | { kind: "error" };

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatHistoryPerformance(weight: number | null | undefined, reps: number | null | undefined) {
  if (weight === null || weight === undefined || reps === null || reps === undefined) return "—";
  return weight === 0 ? `${reps} reps` : `${weight} kg × ${reps}`;
}

function EllipsisActionButton({
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`beefit-tap-target flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#2D2D2D] bg-[#181818] text-[#A3A3A3] transition-colors hover:border-[#525252] hover:text-white ${className}`}
      {...props}
    >
      <Ellipsis size={16} />
    </button>
  );
}

export function ActiveWorkoutView({
  sessionGroups,
  elapsedSeconds,
  exercises,
  finishValidationError,
  exerciseSlideRefs,
  seriesContainerRefs,
  isWorkoutMenuOpen,
  activeExerciseMenuId,
  onToggleWorkoutMenu,
  onCancelWorkout,
  onSaveTemplate,
  onToggleExerciseMenu,
  onRemoveExercise,
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
  activeExerciseMenuId: string | null;
  onToggleWorkoutMenu: () => void;
  onCancelWorkout: () => void;
  onSaveTemplate: () => void;
  onToggleExerciseMenu: (exerciseId: string) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onUpdateSet: (exerciseId: string, setId: string, field: "weight" | "reps", value: string) => void;
  onAddSet: (exerciseId: string) => void;
  onOpenCatalog: () => void;
  onOpenFinish: () => void;
}) {
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [flippedExerciseId, setFlippedExerciseId] = useState<string | null>(null);
  const [historyState, setHistoryState] = useState<HistoryState>({ kind: "idle" });
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const exercise = exercises.find((item) => item.id === flippedExerciseId);
    if (!exercise) {
      setHistoryState({ kind: "idle" });
      return;
    }

    let active = true;
    setHistoryState({ kind: "loading" });
    void workoutService.getExerciseHistory(exercise.catalogId)
      .then((history) => {
        if (active) setHistoryState({ kind: "loaded", history });
      })
      .catch(() => {
        if (active) setHistoryState({ kind: "error" });
      });

    return () => {
      active = false;
    };
  }, [exercises, flippedExerciseId]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setShowLeftArrow(container.scrollLeft > 20);

    const isCloseToEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 20;
    setShowRightArrow(!isCloseToEnd);
  };

  const handleScrollLeft = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth + 16;
    container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  };

  const handleScrollRight = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth + 16;
    container.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  useEffect(() => {
    if (exercises.length > 0) {
      setShowLeftArrow(false);
      setShowRightArrow(true);
    } else {
      setShowLeftArrow(false);
      setShowRightArrow(false);
    }

    const timer = window.setTimeout(() => {
      handleScroll();
    }, 100);
    return () => window.clearTimeout(timer);
  }, [exercises]);

  return (
    <PageBackground style={{ minHeight: "100%", height: "100%" }}>
      <IonGrid
        fixed
        style={{
          padding: "16px 12px calc(16px + var(--ion-safe-area-bottom, 0px))",
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100%",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        <IonRow style={{ flex: "0 0 auto" }}>
          <IonCol size="12">
            <SurfaceCard border="#2D2D2D" background="rgba(20,20,20,0.92)">
              <div
                style={{
                  position: "relative",
                  minHeight: 54,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
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
                    flexShrink: 0,
                  }}
                >
                  <Clock3 size={22} />
                </div>

                <div style={{ display: "grid", justifyItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
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
                      lineHeight: 1,
                      textAlign: "center",
                    }}
                  >
                    {formatElapsedTime(elapsedSeconds)}
                  </span>
                </div>

                <div style={{ width: 54, display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
                  <Sheet
                    open={isWorkoutMenuOpen}
                    onOpenChange={(open) => {
                      if (!open && isWorkoutMenuOpen) onToggleWorkoutMenu();
                    }}
                  >
                    <EllipsisActionButton
                      type="button"
                      onClick={onToggleWorkoutMenu}
                      aria-label="Abrir ações do treino"
                    />
                    <SheetContent side="bottom" className="beefit-sheet-width rounded-t-[28px] border-[#2D2D2D] bg-[#141414] px-5 pb-7 pt-3 text-white">
                      <SheetHeader className="px-0 pb-3 pt-3 text-left">
                        <SheetTitle className="font-montserrat text-[20px] font-bold text-white">Ações do treino</SheetTitle>
                        <SheetDescription className="font-inter text-[13px] text-[#8A8A8A]">
                          Escolha uma ação para o treino em andamento.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="flex flex-col gap-2.5">
                        <BeeButton variant="dark" fullWidth onClick={onSaveTemplate}>
                          Salvar como template
                        </BeeButton>
                        <BeeButton variant="red" fullWidth onClick={onCancelWorkout}>
                          Cancelar treino
                        </BeeButton>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </SurfaceCard>
          </IonCol>
        </IonRow>

        {sessionGroups.length > 0 && (
          <IonRow className="mt-3" style={{ flex: "0 0 auto" }}>
            <IonCol size="12">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {sessionGroups.map((group) => (
                  <MuscleTag key={group} group={group} />
                ))}
              </div>
            </IonCol>
          </IonRow>
        )}

        <IonRow style={{ flex: "1 1 0%", minHeight: 0, marginTop: 12, marginBottom: 12 }}>
          <IonCol size="12" style={{ position: "relative", height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: 16,
                overflowX: "auto",
                padding: "4px 2px 8px",
                scrollSnapType: "x mandatory",
                height: "100%",
                minHeight: 0,
                flex: 1,
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
                  <SurfaceCard border="#2D2D2D" background="rgba(20,20,20,0.96)" style={{ ...ACTIVE_WORKOUT_CARD_STYLE, position: "relative", overflow: "hidden" }}>
                    <div style={{ display: "grid", gap: 14, height: "100%", gridTemplateRows: "auto minmax(0, 1fr) auto", alignContent: "start" }}>
                      <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                          <button
                            type="button"
                            onClick={() => setFlippedExerciseId(exercise.id)}
                            aria-label={`Ver mapa muscular e histórico de ${exercise.name}`}
                            style={{ display: "grid", gap: 8, minWidth: 0, border: "none", padding: 0, background: "transparent", textAlign: "left", cursor: "pointer" }}
                          >
                            <span
                              className="line-clamp-2"
                              style={{ color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 22, fontWeight: 700 }}
                            >
                              {exercise.name}
                            </span>
                            <MuscleTag group={exercise.group} />
                            <span style={{ color: "#737373", fontFamily: "var(--font-inter)", fontSize: 12 }}>
                              Toque para ver mapa e histórico
                            </span>
                          </button>
                          <Sheet
                            open={activeExerciseMenuId === exercise.id}
                            onOpenChange={(open) => {
                              if (!open && activeExerciseMenuId === exercise.id) onToggleExerciseMenu(exercise.id);
                            }}
                          >
                            <EllipsisActionButton
                              type="button"
                              onClick={() => onToggleExerciseMenu(exercise.id)}
                              aria-label={`Abrir ações de ${exercise.name}`}
                            />
                            <SheetContent side="bottom" className="beefit-sheet-width rounded-t-[28px] border-[#2D2D2D] bg-[#141414] px-5 pb-7 pt-3 text-white">
                              <SheetHeader className="px-0 pb-3 pt-3 text-left">
                                <SheetTitle className="font-montserrat text-[20px] font-bold text-white">{exercise.name}</SheetTitle>
                                <SheetDescription className="font-inter text-[13px] text-[#8A8A8A]">
                                  Escolha uma ação para este exercício.
                                </SheetDescription>
                              </SheetHeader>
                              <div className="flex flex-col gap-2.5">
                                <BeeButton variant="red" fullWidth onClick={() => onRemoveExercise(exercise.id)}>
                                  Remover exercício
                                </BeeButton>
                              </div>
                            </SheetContent>
                          </Sheet>
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
                            flex: 1,
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
                    {flippedExerciseId === exercise.id && (() => {
                      const catalogItem = workoutService.getCatalogItemById(exercise.catalogId);
                      const primaryMuscles = exercise.primaryAnatomicalMuscles?.length
                        ? exercise.primaryAnatomicalMuscles
                        : catalogItem?.primaryAnatomicalMuscles;
                      const secondaryMuscles = exercise.secondaryAnatomicalMuscles?.length
                        ? exercise.secondaryAnatomicalMuscles
                        : catalogItem?.secondaryAnatomicalMuscles;
                      const anatomicalMuscles = exercise.anatomicalMuscles?.length
                        ? exercise.anatomicalMuscles
                        : catalogItem?.anatomicalMuscles;
                      const history = historyState.kind === "loaded" ? historyState.history : null;

                      return (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 2,
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                            padding: "16px 16px 20px",
                            background: "rgba(20,20,20,0.99)",
                            animation: "fade-in 180ms ease-out",
                            overflowY: "auto",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setFlippedExerciseId(null)}
                            className="beefit-tap-target"
                            style={{
                              border: "none",
                              padding: 0,
                              background: "transparent",
                              color: "#FFFFFF",
                              cursor: "pointer",
                              display: "grid",
                              gap: 2,
                              textAlign: "left",
                              minWidth: 0,
                            }}
                            aria-label={`Voltar às séries de ${exercise.name}`}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#A3A3A3", fontFamily: "var(--font-inter)", fontSize: 12 }}>
                              <ChevronLeft size={14} />
                              <span>Voltar às séries</span>
                            </div>
                            <span
                              className="line-clamp-2"
                              style={{ fontFamily: "var(--font-montserrat)", fontSize: 20, fontWeight: 700 }}
                            >
                              {exercise.name}
                            </span>
                          </button>

                          <ExerciseMuscleMap
                            muscles={anatomicalMuscles}
                            primaryMuscles={primaryMuscles}
                            secondaryMuscles={secondaryMuscles}
                          />

                          <SurfaceCard border="#262626" background="rgba(255,255,255,0.02)">
                            <div style={{ display: "grid", gap: 10 }}>
                              <span style={{ color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 14, fontWeight: 700 }}>
                                Histórico recente
                              </span>

                              <div style={{ display: "grid", gap: 6 }}>
                                {[
                                  { label: "Última vez", value: formatDate(history?.lastPerformedAt) },
                                  { label: "Melhor desempenho", value: formatHistoryPerformance(history?.bestWeightKg, history?.bestReps) },
                                  { label: "Último desempenho", value: formatHistoryPerformance(history?.lastWeightKg, history?.lastReps) },
                                ].map((item) => (
                                  <div
                                    key={item.label}
                                    style={{
                                      borderRadius: 12,
                                      background: "rgba(255,255,255,0.03)",
                                      padding: "8px 12px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      gap: 8,
                                    }}
                                  >
                                    <span style={{ color: "#A3A3A3", fontFamily: "var(--font-inter)", fontSize: 12, fontWeight: 600 }}>
                                      {item.label}
                                    </span>
                                    <span style={{ color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 13, fontWeight: 700 }}>
                                      {historyState.kind === "loading" ? "…" : item.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </SurfaceCard>
                        </div>
                      );
                    })()}
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

            {exercises.length > 0 && showLeftArrow && (
              <button
                type="button"
                onClick={handleScrollLeft}
                aria-label="Ver exercício anterior"
                style={{
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(20, 20, 20, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255, 255, 255, 0.55)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                  zIndex: 10,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(20, 20, 20, 0.75)";
                  e.currentTarget.style.color = "#FFFFFF";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(20, 20, 20, 0.4)";
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.55)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                }}
              >
                <ChevronLeft size={20} />
              </button>
            )}

            {exercises.length > 0 && showRightArrow && (
              <button
                type="button"
                onClick={handleScrollRight}
                aria-label="Ver próximo exercício"
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(20, 20, 20, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255, 255, 255, 0.55)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                  zIndex: 10,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(20, 20, 20, 0.75)";
                  e.currentTarget.style.color = "#FFFFFF";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(20, 20, 20, 0.4)";
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.55)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                }}
              >
                <ChevronRight size={20} />
              </button>
            )}
          </IonCol>
        </IonRow>

        <IonRow style={{ flex: "0 0 auto", marginTop: "auto" }}>
          <IonCol size="12">
            {finishValidationError && (
              <div style={{ margin: "0 2px 10px" }}>
                <BeeAlert plain>{finishValidationError}</BeeAlert>
              </div>
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
