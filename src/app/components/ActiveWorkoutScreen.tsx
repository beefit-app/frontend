import { useEffect, useMemo, useRef, useState } from "react";
import { IonCol, IonGrid, IonInput, IonRow, IonText } from "@ionic/react";
import { ChevronLeft, ChevronRight, Clock3, Flame, MoreVertical, Plus } from "lucide-react";
import { BeeButton } from "./BeeButton";
import { PageBackground } from "./PageBackground";
import { workoutService } from "../services/workoutService";
import type { ExerciseCatalogItem, WorkoutExercise, WorkoutSet } from "../types/workout";

interface ActiveWorkoutScreenProps {
  title: string;
  subtitle: string;
  selectedGroups: string[];
  onBack: () => void;
}

const MUSCLE_STYLE: Record<string, { border: string; text: string; bg: string }> = {
  Braços: { border: "#F97316", text: "#FDBA74", bg: "rgba(249,115,22,0.14)" },
  Core: { border: "#EF4444", text: "#FCA5A5", bg: "rgba(239,68,68,0.14)" },
  Costas: { border: "#3B82F6", text: "#60A5FA", bg: "rgba(59,130,246,0.14)" },
  Ombros: { border: "#A855F7", text: "#C084FC", bg: "rgba(168,85,247,0.14)" },
  Peito: { border: "#FFD700", text: "#FFE44D", bg: "rgba(255,215,0,0.14)" },
  Pernas: { border: "#22C55E", text: "#86EFAC", bg: "rgba(34,197,94,0.14)" },
};

const DEFAULT_MUSCLE_STYLE = { border: "#737373", text: "#D4D4D4", bg: "rgba(115,115,115,0.14)" };

const ACTIVE_WORKOUT_SLIDE_STYLE: React.CSSProperties = {
  minWidth: "100%",
  flex: "0 0 100%",
  scrollSnapAlign: "start",
  display: "flex",
  justifyContent: "center",
  alignItems: "stretch",
  height: 448,
  boxSizing: "border-box",
};

const ACTIVE_WORKOUT_CARD_STYLE: React.CSSProperties = {
  width: "calc(100% - 24px)",
  maxWidth: 348,
  height: "100%",
};

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createSet(): WorkoutSet {
  return { id: createId("set"), weight: "", reps: "" };
}

function formatElapsedTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function createExerciseCard(exercise: ExerciseCatalogItem): WorkoutExercise {
  return {
    id: createId("exercise"),
    catalogId: exercise.id,
    name: exercise.name,
    group: exercise.group,
    groupId: exercise.groupId,
    sets: [createSet()],
  };
}

function muscleStyle(group: string) {
  return MUSCLE_STYLE[group] ?? DEFAULT_MUSCLE_STYLE;
}

function MuscleTag({ group }: { group: string }) {
  const style = muscleStyle(group);

  return (
    <span
      style={{
        border: `1px solid ${style.border}`,
        color: style.text,
        background: style.bg,
        borderRadius: 999,
        padding: "7px 12px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "flex-start",
        width: "fit-content",
        maxWidth: "100%",
        flex: "0 0 auto",
        fontFamily: "var(--font-inter)",
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {group}
    </span>
  );
}

function SurfaceCard({
  children,
  border = "#2D2D2D",
  background = "rgba(20,20,20,0.92)",
  style,
}: {
  children: React.ReactNode;
  border?: string;
  background?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        borderRadius: 24,
        border: `1px solid ${border}`,
        background,
        padding: 16,
        display: "grid",
        gap: 14,
        boxShadow: "0 18px 48px rgba(0,0,0,0.18)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ActiveWorkoutScreen({ selectedGroups, onBack }: ActiveWorkoutScreenProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [activeCatalogGroupId, setActiveCatalogGroupId] = useState("peito");
  const [catalogDetailExerciseId, setCatalogDetailExerciseId] = useState<string | null>(null);
  const [isWorkoutMenuOpen, setIsWorkoutMenuOpen] = useState(false);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [pendingExerciseFocusId, setPendingExerciseFocusId] = useState<string | null>(null);
  const [pendingSetFocusExerciseId, setPendingSetFocusExerciseId] = useState<string | null>(null);
  const exerciseSlideRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const seriesContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Esta tela depende só da interface do service; quando a API entrar,
  // a troca deve acontecer na implementação do service, não aqui.
  const catalog = useMemo(() => workoutService.getCatalog(), []);
  const groupOrder = useMemo(() => workoutService.getGroupOrder(), []);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsedSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!pendingExerciseFocusId) return;

    const frame = window.requestAnimationFrame(() => {
      const targetSlide = exerciseSlideRefs.current[pendingExerciseFocusId];

      if (targetSlide) {
        targetSlide.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }

      setPendingExerciseFocusId(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [exercises, pendingExerciseFocusId]);

  useEffect(() => {
    if (!pendingSetFocusExerciseId) return;

    const frame = window.requestAnimationFrame(() => {
      const targetContainer = seriesContainerRefs.current[pendingSetFocusExerciseId];

      if (targetContainer) {
        targetContainer.scrollTo({ top: targetContainer.scrollHeight, behavior: "smooth" });
      }

      setPendingSetFocusExerciseId(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [exercises, pendingSetFocusExerciseId]);

  const groupedExercises = useMemo(
    () => workoutService.getGroupedCatalog(),
    [],
  );

  const activeCatalogExercise = useMemo(
    () => workoutService.getCatalogItemById(catalogDetailExerciseId),
    [catalogDetailExerciseId],
  );

  const visibleCatalogItems = useMemo(
    () => workoutService.getCatalogByGroupId(activeCatalogGroupId),
    [activeCatalogGroupId],
  );

  const sessionGroups = useMemo(() => {
    return workoutService.getSessionGroups(selectedGroups, exercises);
  }, [exercises, selectedGroups]);

  function addExercise(exercise: ExerciseCatalogItem) {
    const newExercise = createExerciseCard(exercise);

    setExercises((current) => [...current, newExercise]);
    setPendingExerciseFocusId(newExercise.id);
    setCatalogDetailExerciseId(null);
    setIsCatalogOpen(false);
  }

  function addSet(exerciseId: string) {
    const newSet = createSet();

    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, sets: [...exercise.sets, newSet] } : exercise,
      ),
    );
    setPendingSetFocusExerciseId(exerciseId);
  }

  function updateSet(exerciseId: string, setId: string, field: "weight" | "reps", value: string) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) => (set.id === setId ? { ...set, [field]: value } : set)),
            }
          : exercise,
      ),
    );
  }

  const selectedCatalogIds = new Set(exercises.map((exercise) => exercise.catalogId));

  if (isCatalogOpen) {
    if (activeCatalogExercise) {
      const style = muscleStyle(activeCatalogExercise.group);
      const alreadyAdded = selectedCatalogIds.has(activeCatalogExercise.id);

      return (
        <PageBackground>
          <IonGrid fixed style={{ maxWidth: 393, padding: "32px 12px 0", position: "relative", zIndex: 1 }}>
            <IonRow>
              <IonCol size="12">
                <button
                  type="button"
                  onClick={() => setCatalogDetailExerciseId(null)}
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
                  Voltar para o catálogo
                </button>

                <div style={{ display: "grid", gap: 12 }}>
                  <MuscleTag group={activeCatalogExercise.group} />
                  <h1 style={{ margin: 0, color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 30, fontWeight: 800 }}>
                    {activeCatalogExercise.name}
                  </h1>
                  <IonText style={{ color: "#B5B5B5", fontFamily: "var(--font-inter)", fontSize: 15, lineHeight: 1.6 }}>
                    {activeCatalogExercise.notes}
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
                          { label: "Última vez", value: activeCatalogExercise.lastPerformed },
                          { label: "Melhor carga", value: activeCatalogExercise.bestWeight },
                          { label: "Última carga", value: activeCatalogExercise.lastWeight },
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
                        if (!alreadyAdded) addExercise(activeCatalogExercise);
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

    return (
      <PageBackground>
        <IonGrid fixed style={{ maxWidth: 393, padding: "32px 12px 0", position: "relative", zIndex: 1 }}>
          <IonRow>
            <IonCol size="12">
              <button
                type="button"
                onClick={() => setIsCatalogOpen(false)}
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
                  Adicionar exercício
                </h1>
                <IonText style={{ color: "#B5B5B5", fontFamily: "var(--font-inter)", fontSize: 15, lineHeight: 1.6 }}>
                  Navegue pelas abas dos grupos musculares e abra um exercício para ver os detalhes.
                </IonText>
              </div>
            </IonCol>
          </IonRow>

          <IonRow className="mt-5">
            <IonCol size="12">
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  overflowX: "auto",
                  padding: 6,
                  marginBottom: 18,
                  borderRadius: 18,
                  border: "1px solid #242424",
                  background: "rgba(12,12,12,0.78)",
                  backdropFilter: "blur(10px)",
                }}
              >
                {groupedExercises.map(({ group, items }) => {
                  const groupId = items[0]?.groupId;
                  const active = groupId === activeCatalogGroupId;
                  const style = muscleStyle(group);

                  return (
                    <button
                      key={group}
                      type="button"
                      onClick={() => groupId && setActiveCatalogGroupId(groupId)}
                      style={{
                        border: "none",
                        background: active ? "rgba(255,255,255,0.05)" : "transparent",
                        color: active ? "#FFFFFF" : "#8F8F8F",
                        borderRadius: 14,
                        padding: "11px 14px 10px",
                        whiteSpace: "nowrap",
                        fontFamily: "var(--font-montserrat)",
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: "0.02em",
                        position: "relative",
                        boxShadow: active ? "inset 0 0 0 1px rgba(255,255,255,0.04)" : "none",
                        transition: "background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
                        cursor: "pointer",
                      }}
                    >
                      <span>{group}</span>
                      {active && (
                        <span
                          style={{
                            position: "absolute",
                            left: 12,
                            right: 12,
                            bottom: 5,
                            height: 2,
                            borderRadius: 999,
                            background: style.border,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {visibleCatalogItems.map((exercise) => {
                  const alreadyAdded = selectedCatalogIds.has(exercise.id);
                  const style = muscleStyle(exercise.group);

                  return (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => setCatalogDetailExerciseId(exercise.id)}
                      style={{
                        border: `1px solid ${alreadyAdded ? style.border : "#2D2D2D"}`,
                        background: alreadyAdded ? style.bg : "#141414",
                        borderRadius: 22,
                        padding: 18,
                        textAlign: "left",
                        display: "grid",
                        gap: 10,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ display: "grid", gap: 8 }}>
                          <span style={{ color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 18, fontWeight: 700 }}>
                            {exercise.name}
                          </span>
                          <MuscleTag group={exercise.group} />
                        </div>
                        <ChevronRight size={18} color={alreadyAdded ? style.text : "#A3A3A3"} />
                      </div>
                      <span style={{ color: "#8F8F8F", fontFamily: "var(--font-inter)", fontSize: 13, lineHeight: 1.5 }}>
                        {exercise.notes}
                      </span>
                    </button>
                  );
                })}
              </div>
            </IonCol>
          </IonRow>
        </IonGrid>
      </PageBackground>
    );
  }

  return (
    <PageBackground>
      <IonGrid fixed style={{ maxWidth: 393, padding: "24px 12px 0", position: "relative", zIndex: 1 }}>
        <IonRow>
          <IonCol size="12">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12, position: "relative" }}>
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
                  cursor: "pointer",
                  fontFamily: "var(--font-inter)",
                  fontSize: 14,
                }}
              >
                <ChevronLeft size={16} />
                Voltar
              </button>

              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setIsWorkoutMenuOpen((current) => !current)}
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
                      onClick={onBack}
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
              {exercises.map((exercise) => {
                return (
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
                          <div style={{ display: "grid", gap: 8 }}>
                            <span style={{ color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 22, fontWeight: 700 }}>
                              {exercise.name}
                            </span>
                            <MuscleTag group={exercise.group} />
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
                              <div
                                key={set.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                              >
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
                                      updateSet(exercise.id, set.id, "weight", String(event.detail.value ?? ""))
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
                                      updateSet(exercise.id, set.id, "reps", String(event.detail.value ?? ""))
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
                          <BeeButton variant="secondary" size="sm" onClick={() => addSet(exercise.id)}>
                            Adicionar Série
                          </BeeButton>
                        </div>
                      </div>
                    </SurfaceCard>
                  </div>
                );
              })}

              <div
                style={ACTIVE_WORKOUT_SLIDE_STYLE}
              >
                <button
                  type="button"
                  onClick={() => setIsCatalogOpen(true)}
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
            <BeeButton variant="primary" size="lg" fullWidth>
              Concluir treino
            </BeeButton>
          </IonCol>
        </IonRow>
      </IonGrid>
    </PageBackground>
  );
}
