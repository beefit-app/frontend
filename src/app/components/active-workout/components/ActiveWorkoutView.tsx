import { useState, useRef, useEffect } from "react";
import { IonCol, IonGrid, IonInput, IonRow } from "@ionic/react";
import { Clock3, Ellipsis, Plus, ChevronLeft, Trash2 } from "lucide-react";
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
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
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

    // The width of each snap point is the slide's width plus the gap (16px)
    // Actually, each slide fills the container width (flex 0 0 100%) and gap is 16
    const slideWidth = container.clientWidth + 16;
    const index = Math.round(container.scrollLeft / slideWidth);
    
    // Safety clamp in case of overscroll
    const safeIndex = Math.max(0, Math.min(index, exercises.length));
    setActiveSlideIndex(safeIndex);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      handleScroll();
    }, 100);
    return () => window.clearTimeout(timer);
  }, [exercises]);

  const isInteractiveElement = (target: HTMLElement | null) => {
    if (!target) return false;
    return !!target.closest(
      "button:not([data-flip-card]), input, textarea, select, ion-input, ion-button, [role='button']:not([data-flip-card]), [data-no-card-flip]"
    );
  };

  const handleCardClick = (exerciseId: string, isCurrentlyFlipped: boolean, e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target || isInteractiveElement(target)) {
      return;
    }
    setFlippedExerciseId(isCurrentlyFlipped ? null : exerciseId);
  };

  return (
    <PageBackground style={{ display: "flex", flexDirection: "column", minHeight: "100%", height: "100%" }}>
      <IonGrid
        fixed
        style={{
          padding: "10px 12px calc(10px + var(--ion-safe-area-bottom, 0px))",
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          flex: 1,
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

        <IonRow style={{ flex: "1 1 auto", marginTop: 12, marginBottom: 12, alignItems: "stretch" }}>
          <IonCol size="12" style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%" }}>
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
                  <SurfaceCard
                    border="#2D2D2D"
                    background="rgba(20,20,20,0.96)"
                    onClick={(e) => handleCardClick(exercise.id, flippedExerciseId === exercise.id, e)}
                    style={{ ...ACTIVE_WORKOUT_CARD_STYLE, position: "relative", overflow: "hidden", cursor: "pointer" }}
                  >
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
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleExerciseMenu(exercise.id);
                              }}
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
                                <BeeButton variant="red" fullWidth onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveExercise(exercise.id);
                                }}>
                                  Remover exercício
                                </BeeButton>
                              </div>
                            </SheetContent>
                          </Sheet>
                        </div>
                      </div>

                      <div
                        style={{
                          gridArea: "1 / 1",
                          visibility: flippedExerciseId === exercise.id ? "hidden" : "visible",
                          opacity: flippedExerciseId === exercise.id ? 0 : 1,
                          transition: "opacity 180ms ease-out, visibility 180ms ease-out",
                          pointerEvents: flippedExerciseId === exercise.id ? "none" : "auto",
                          display: "grid",
                          gap: 14,
                          height: "100%",
                          gridTemplateRows: "auto minmax(0, 1fr) auto",
                          alignContent: "start",
                        }}
                      >
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
                              display: "flex",
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
                            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", alignItems: "center", gap: 10 }}>
                              <span style={{ paddingLeft: 16 }}>Peso</span>
                              <span style={{ paddingLeft: 16 }}>Reps</span>
                            </div>
                            <span style={{ width: 32, flexShrink: 0 }}></span>
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

                                <button
                                  type="button"
                                  onClick={() => onRemoveSet(exercise.id, set.id)}
                                  aria-label="Remover série"
                                  style={{
                                    width: 32,
                                    height: 32,
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "transparent",
                                    border: "none",
                                    padding: 0,
                                    color: "#555555",
                                    cursor: "pointer",
                                  }}
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                      <div style={{ paddingTop: 6 }} data-no-card-flip="true" onClick={(e) => e.stopPropagation()}>
                        <BeeButton variant="secondary" size="sm" onClick={() => onAddSet(exercise.id)}>
                          Adicionar Série
                        </BeeButton>
                      </div>

                      {(() => {
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
                        
                        const isFlipped = flippedExerciseId === exercise.id;
                        const history = (isFlipped && historyState.kind === "loaded") ? historyState.history : null;

                        return (
                          <div
                            style={{
                              gridArea: "1 / 1",
                              visibility: isFlipped ? "visible" : "hidden",
                              opacity: isFlipped ? 1 : 0,
                              transition: "opacity 180ms ease-out, visibility 180ms ease-out",
                              pointerEvents: isFlipped ? "auto" : "none",
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                              paddingBottom: 2,
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
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                textAlign: "left",
                                minWidth: 0,
                              }}
                              aria-label={`Voltar às séries de ${exercise.name}`}
                            >
                              <ChevronLeft size={20} style={{ color: "#A3A3A3", flexShrink: 0 }} />
                              <span
                                className="line-clamp-2"
                                style={{ fontFamily: "var(--font-montserrat)", fontSize: 18, fontWeight: 700 }}
                              >
                                {exercise.name}
                              </span>
                            </button>

                            <ExerciseMuscleMap
                              muscles={anatomicalMuscles}
                              primaryMuscles={primaryMuscles}
                              secondaryMuscles={secondaryMuscles}
                            />

                            <SurfaceCard border="#262626" background="rgba(255,255,255,0.02)" style={{ padding: 12 }}>
                              <div style={{ display: "grid", gap: 8 }}>
                                <span style={{ color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 14, fontWeight: 700 }}>
                                  Histórico recente
                                </span>

                                <div style={{ display: "grid", gap: 4 }}>
                                  {[
                                    { label: "Última vez", value: formatDate(history?.lastPerformedAt) },
                                    { label: "Melhor desempenho", value: formatHistoryPerformance(history?.bestWeightKg, history?.bestReps) },
                                    { label: "Último desempenho", value: formatHistoryPerformance(history?.lastWeightKg, history?.lastReps) },
                                  ].map((item) => (
                                    <div
                                      key={item.label}
                                      style={{
                                        borderRadius: 10,
                                        background: "rgba(255,255,255,0.03)",
                                        padding: "6px 10px",
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
                                        {isFlipped && historyState.kind === "loading" ? "…" : item.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </SurfaceCard>
                          </div>
                        );
                      })()}
                    </div>
                  </SurfaceCard>
                </div>
              ))}

              <div style={ACTIVE_WORKOUT_SLIDE_STYLE}>
                <div
                  role="button"
                  tabIndex={0}
                  className="beefit-tap-target"
                  onClick={onOpenCatalog}
                  style={{
                    ...ACTIVE_WORKOUT_CARD_STYLE,
                    height: "100%",
                    border: "2px dashed rgba(255,215,0,0.6)",
                    background: "rgba(255,215,0,0.12)",
                    borderRadius: 24,
                    padding: 22,
                    display: "grid",
                    alignContent: "center",
                    justifyItems: "center",
                    gap: 12,
                    color: "#FFD700",
                    fontFamily: "var(--font-montserrat)",
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxSizing: "border-box",
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
                  <div style={{ display: "grid", gap: 6, textAlign: "center", justifyItems: "center" }}>
                    <span style={{ color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 22, fontWeight: 700 }}>
                      Adicionar exercício
                    </span>
                    <span style={{ color: "#A3A3A3", fontFamily: "var(--font-inter)", fontSize: 14, lineHeight: 1.6 }}>
                      Abra o catálogo, navegue pelas abas musculares e escolha o próximo exercício.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </IonCol>
        </IonRow>

        <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "4px 0 16px" }}>
          {Array.from({ length: exercises.length + 1 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: i === activeSlideIndex ? "#FFFFFF" : "rgba(255,255,255,0.2)",
                transition: "background 0.2s",
              }}
            />
          ))}
        </div>

        <IonRow style={{ flex: "0 0 auto", marginTop: "auto" }}>
          <IonCol size="12">
            {finishValidationError && (
              <div style={{ margin: "0 2px 10px" }}>
                <BeeAlert plain>{finishValidationError}</BeeAlert>
              </div>
            )}
            {activeSlideIndex === exercises.length ? (
              <BeeButton variant="primary" size="lg" fullWidth onClick={onOpenFinish}>
                Concluir treino
              </BeeButton>
            ) : (
              <BeeButton variant="secondary" size="lg" fullWidth onClick={onOpenCatalog}>
                Adicionar Exercício
              </BeeButton>
            )}
          </IonCol>
        </IonRow>
      </IonGrid>
    </PageBackground>
  );
}
