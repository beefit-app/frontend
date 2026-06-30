import { useEffect, useMemo, useRef, useState } from "react";
import { IonCard, IonCardContent, IonCol, IonGrid, IonRow, IonText } from "@ionic/react";
import { Check, Dumbbell, FolderKanban } from "lucide-react";
import { ActiveWorkoutScreen } from "./ActiveWorkoutScreen";
import { BeeButton } from "./BeeButton";
import { PageBackground } from "./PageBackground";
import { useAuth } from "../auth/AuthContext";
import { workoutService } from "../services/workoutService";
import { workoutDraftStorage } from "../storage/workoutDraftStorage";
import { persistWorkoutPhoto, removePersistedWorkoutPhoto, restoreWorkoutPhoto } from "../platform/workoutPhoto";
import type { ExerciseCatalogItem, WorkoutCompletionDraft, WorkoutExercise } from "../types/workout";

const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

function HexIcon({
  icon,
  background,
  color,
  border,
}: {
  icon: React.ReactNode;
  background: string;
  color: string;
  border: string;
}) {
  return (
    <div
      style={{
        width: 40,
        aspectRatio: "0.87 / 1",
        clipPath: HEX_CLIP,
        background,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
  );
}

interface WorkoutStartScreenProps {
  ghostModeEnabled?: boolean;
  onActiveWorkoutChange?: (workout: { selectedGroups: string[]; startedAt: number } | null) => void;
  onWorkoutCompleted?: (draft: WorkoutCompletionDraft) => void;
}

export function WorkoutStartScreen({
  ghostModeEnabled = false,
  onActiveWorkoutChange,
  onWorkoutCompleted,
}: WorkoutStartScreenProps) {
  const { user } = useAuth();
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [workoutTemplates, setWorkoutTemplates] = useState(() => workoutService.getTemplates());
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [startError, setStartError] = useState("");
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [activeWorkoutConfig, setActiveWorkoutConfig] = useState<{
    workoutId: string | null;
    title: string;
    subtitle: string;
    selectedGroups: string[];
    startedAt: number;
    initialExerciseIds: string[];
    initialSessionExercises: WorkoutExercise[];
    initialFinishPhotoFile?: File | null;
  } | null>(null);
  const isClosingWorkoutRef = useRef(false);

  // Esta tela depende só da interface do service; quando a API entrar,
  // a troca deve acontecer na implementação do service, não aqui.
  const muscleGroups = useMemo(() => workoutService.getMuscleGroups(), []);

  const selectedTemplate = useMemo(
    () => workoutService.getTemplateById(selectedTemplateId),
    [selectedTemplateId, workoutTemplates],
  );

  const canStartWorkout = selectedGroups.length > 0 || selectedTemplate !== null;

  function resetWorkoutState() {
    setSelectedGroups([]);
    setSelectedTemplateId(null);
    setActiveWorkoutConfig(null);
  }

  async function closeActiveWorkout() {
    isClosingWorkoutRef.current = true;
    const draft = await workoutDraftStorage.get();
    await removePersistedWorkoutPhoto(draft?.photoFileName);
    resetWorkoutState();
    await workoutDraftStorage.clear();
    onActiveWorkoutChange?.(null);
  }

  function toggleGroup(groupId: string) {
    setSelectedTemplateId(null);
    setSelectedGroups((current) =>
      current.includes(groupId) ? current.filter((item) => item !== groupId) : [...current, groupId],
    );
  }

  function selectTemplate(templateId: string) {
    setSelectedGroups([]);
    setSelectedTemplateId((current) => (current === templateId ? null : templateId));
  }

  useEffect(() => {
    let active = true;

    async function loadWorkoutData() {
      try {
        await workoutService.loadCatalog();
        if (active) setCatalogRevision(Date.now());
        const templates = await workoutService.loadTemplates();
        if (active) setWorkoutTemplates(templates);
      } catch {
        if (active) setStartError("Não foi possível carregar catálogo e templates.");
      }
    }

    void loadWorkoutData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreActiveWorkout() {
      try {
        const session = await workoutService.getActiveWorkout();
        if (!active || !session) {
          if (active) await workoutDraftStorage.clear();
          return;
        }
        const persisted = await workoutDraftStorage.get();
        const startedAt = session.startedAt;
        const exercises = persisted?.workoutId === session.id ? persisted.exercises : session.exercises;
        const groups = session.muscleGroups;
        const restoredPhoto = persisted?.photoFileName ? await restoreWorkoutPhoto(persisted.photoFileName) : null;
        setActiveWorkoutConfig({
          workoutId: session.id,
          title: persisted?.title || "Treino em andamento",
          subtitle: "Sessão recuperada. Seus dados locais foram restaurados quando disponíveis.",
          selectedGroups: groups,
          startedAt,
          initialExerciseIds: [],
          initialSessionExercises: exercises,
          initialFinishPhotoFile: restoredPhoto,
        });
        onActiveWorkoutChange?.({ selectedGroups: groups, startedAt });
      } catch (error) {
        if (active) setStartError(error instanceof Error ? error.message : "Não foi possível recuperar o treino ativo.");
      }
    }

    void restoreActiveWorkout();
    return () => { active = false; };
  }, [onActiveWorkoutChange]);

  async function handleStartWorkout() {
    if (!canStartWorkout) return;
    if (workoutService.getCatalog().length === 0) {
      setStartError("O catálogo de exercícios ainda não foi carregado. Aguarde e tente novamente.");
      return;
    }
    setIsStartingWorkout(true);
    setStartError("");

    try {
      if (selectedTemplate) {
        const startedSession = await workoutService.startWorkout({
          selectedGroups: selectedTemplate.groups,
          isPrivate: ghostModeEnabled,
          templateId: selectedTemplate.id,
        });
        const templateExercises = workoutService.getTemplateExercises(selectedTemplate.id);
        isClosingWorkoutRef.current = false;
        setActiveWorkoutConfig({
          workoutId: startedSession.id,
          title: selectedTemplate.name,
          subtitle: "Sessão iniciada por template. Adicione exercícios e registre séries durante o treino.",
          selectedGroups: startedSession.muscleGroups,
          startedAt: startedSession.startedAt,
          initialExerciseIds: templateExercises.map((exercise) => exercise.id),
          initialSessionExercises: startedSession.exercises,
        });
        onActiveWorkoutChange?.({ selectedGroups: startedSession.muscleGroups, startedAt: startedSession.startedAt });
        return;
      }

      const labels = workoutService.getSelectedGroupLabels(selectedGroups);
      const startedSession = await workoutService.startWorkout({
        selectedGroups,
        isPrivate: ghostModeEnabled,
      });
      isClosingWorkoutRef.current = false;
      setActiveWorkoutConfig({
        workoutId: startedSession.id,
        title: "Treino livre",
        subtitle: `Foco selecionado: ${labels.join(", ")}. O catálogo continua livre para adicionar qualquer exercício.`,
        selectedGroups: startedSession.muscleGroups.length > 0 ? startedSession.muscleGroups : labels,
        startedAt: startedSession.startedAt,
        initialExerciseIds: [],
        initialSessionExercises: startedSession.exercises,
      });
      onActiveWorkoutChange?.({
        selectedGroups: startedSession.muscleGroups.length > 0 ? startedSession.muscleGroups : labels,
        startedAt: startedSession.startedAt,
      });
    } catch (error) {
      setStartError(error instanceof Error ? error.message : "Não foi possível iniciar o treino.");
    } finally {
      setIsStartingWorkout(false);
    }
  }

  if (activeWorkoutConfig) {
    return (
      <ActiveWorkoutScreen
        workoutId={activeWorkoutConfig.workoutId}
        startedAt={activeWorkoutConfig.startedAt}
        title={activeWorkoutConfig.title}
        subtitle={activeWorkoutConfig.subtitle}
        selectedGroups={activeWorkoutConfig.selectedGroups}
        bodyWeightKg={user?.weight ?? 75}
        initialExercises={activeWorkoutConfig.initialExerciseIds
          .map((exerciseId) => workoutService.getCatalogItemById(exerciseId))
          .filter((exercise): exercise is ExerciseCatalogItem => exercise !== null)}
        catalogRevision={catalogRevision}
        initialSessionExercises={activeWorkoutConfig.initialSessionExercises}
        initialFinishPhotoFile={activeWorkoutConfig.initialFinishPhotoFile}
        ghostModeEnabled={ghostModeEnabled}
        onWorkoutComplete={(draft) => {
          void (async () => {
            try {
              await workoutService.finishWorkout(draft);
              await closeActiveWorkout();
              onWorkoutCompleted?.(draft);
            } catch (error) {
              const photoFileName = draft.photoFile ? await persistWorkoutPhoto(draft.photoFile) : null;
              await workoutDraftStorage.set({
                workoutId: draft.workoutId ?? activeWorkoutConfig.workoutId ?? "",
                startedAt: activeWorkoutConfig.startedAt,
                selectedGroups: draft.selectedGroups,
                exercises: draft.exercises,
                title: draft.title,
                shouldPostWorkout: draft.shouldPostWorkout,
                photoUrl: draft.photoUrl,
                photoFileName,
                pendingFinish: true,
                updatedAt: Date.now(),
              });
              window.alert(error instanceof Error ? error.message : "Não foi possível finalizar o treino.");
            }
          })();
        }}
        onSessionGroupsChange={(groups) => {
          if (isClosingWorkoutRef.current) return;
          onActiveWorkoutChange?.({ selectedGroups: groups, startedAt: activeWorkoutConfig.startedAt });
        }}
        onDraftChange={(draft) => {
          void workoutDraftStorage.set({
            workoutId: activeWorkoutConfig.workoutId ?? "",
            startedAt: activeWorkoutConfig.startedAt,
            selectedGroups: draft.selectedGroups,
            exercises: draft.exercises,
            title: activeWorkoutConfig.title,
            shouldPostWorkout: !ghostModeEnabled,
            photoUrl: null,
            photoFileName: null,
            pendingFinish: false,
            updatedAt: Date.now(),
          });
        }}
        onCancelWorkout={async () => {
          if (!activeWorkoutConfig.workoutId || !window.confirm("Cancelar este treino? Os registros não poderão ser recuperados.")) return false;
          try {
            await workoutService.cancelWorkout(activeWorkoutConfig.workoutId);
            await closeActiveWorkout();
            return true;
          } catch (error) {
            window.alert(error instanceof Error ? error.message : "Não foi possível cancelar o treino.");
            return false;
          }
        }}
        onSaveTemplate={async (groups, exercises) => {
          if (exercises.length === 0) {
            window.alert("Adicione ao menos um exercício antes de salvar o template.");
            return false;
          }
          const name = window.prompt("Nome do template");
          if (!name?.trim()) return false;
          try {
            await workoutService.createTemplate({
              name: name.trim(),
              groups,
              exerciseIds: exercises.map((exercise) => exercise.catalogId),
            });
            setWorkoutTemplates(await workoutService.loadTemplates());
            window.alert("Template salvo.");
            return true;
          } catch (error) {
            window.alert(error instanceof Error ? error.message : "Não foi possível salvar o template.");
            return false;
          }
        }}
        onBack={() => {}}
      />
    );
  }

  return (
    <PageBackground>
      <IonGrid fixed className="relative z-10 px-3 py-5" style={{ maxWidth: 393 }}>
        <IonRow>
          <IonCol size="12">
            <div style={{ display: "grid", gap: 0 }}>
              <h1
                style={{
                  margin: 0,
                  color: "#FFFFFF",
                  fontFamily: "var(--font-montserrat)",
                  fontSize: 34,
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                Início do treino<span style={{ color: "#FFD700" }}>.</span>
              </h1>
              <IonText
                style={{
                  marginTop: 8,
                  color: "#B5B5B5",
                  fontFamily: "var(--font-inter)",
                  fontSize: 14,
                  lineHeight: 1.45,
                }}
              >
                Escolha os grupos musculares ou use um template salvo para começar.
              </IonText>
            </div>
          </IonCol>
        </IonRow>

        <IonRow className="mt-7">
          <IonCol size="12">
            <IonCard
              style={
                {
                  "--background": "rgba(26,26,26,0.92)",
                  "--color": "#FFFFFF",
                  "--border-radius": "24px",
                  margin: 0,
                  border: "1px solid #2D2D2D",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.24)",
                } as React.CSSProperties
              }
            >
              <IonCardContent style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                  <HexIcon
                    icon={<Dumbbell size={18} />}
                    background="rgba(255,215,0,0.12)"
                    color="#FFD700"
                    border="1px solid rgba(255,215,0,0.2)"
                  />
                  <div>
                    <div
                      style={{
                        color: "#FFFFFF",
                        fontFamily: "var(--font-montserrat)",
                        fontSize: 18,
                        fontWeight: 700,
                      }}
                    >
                      Grupos musculares
                    </div>
                    <IonText
                      style={{
                        color: "#A3A3A3",
                        fontFamily: "var(--font-inter)",
                        fontSize: 13,
                      }}
                    >
                      Selecione um ou mais focos para iniciar o treino.
                    </IonText>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {muscleGroups.map((group) => {
                    const selected = selectedGroups.includes(group.id);
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        style={{
                          borderRadius: 20,
                          padding: "14px 46px 14px 14px",
                          textAlign: "left",
                          border: `1px solid ${selected ? group.accent : "#2D2D2D"}`,
                          background: selected ? group.glow : "rgba(16,16,16,0.9)",
                          boxShadow: selected ? `0 0 0 1px ${group.accent} inset` : "none",
                          transition: "all 160ms ease",
                          display: "flex",
                          height: "100%",
                          alignItems: "flex-start",
                          position: "relative",
                        }}
                      >
                        <div className="w-full">
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                color: "#FFFFFF",
                                fontFamily: "var(--font-montserrat)",
                                fontSize: 16,
                                fontWeight: 700,
                                marginBottom: 6,
                              }}
                            >
                              {group.label}
                            </div>
                            <div
                              style={{
                                color: "#A3A3A3",
                                fontFamily: "var(--font-inter)",
                                fontSize: 12,
                                lineHeight: 1.45,
                              }}
                            >
                              {group.description}
                            </div>
                          </div>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              position: "absolute",
                              top: 14,
                              right: 14,
                              borderRadius: 999,
                              border: `1px solid ${selected ? group.accent : "#3D3D3D"}`,
                              background: selected ? group.accent : "transparent",
                              color: selected ? "#0A0A0A" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Check size={14} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </IonCardContent>
            </IonCard>
          </IonCol>
        </IonRow>

        <IonRow className="mt-5">
          <IonCol size="12">
            <div className="flex items-center gap-3 mb-4">
              <HexIcon
                icon={<FolderKanban size={18} />}
                background="rgba(59,130,246,0.12)"
                color="#60A5FA"
                border="1px solid rgba(59,130,246,0.2)"
              />
              <div>
                <div
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "var(--font-montserrat)",
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  Templates salvos
                </div>
                <IonText
                  style={{
                    color: "#A3A3A3",
                    fontFamily: "var(--font-inter)",
                    fontSize: 13,
                  }}
                >
                  Escolha um treino pronto e inicie com um clique.
                </IonText>
              </div>
            </div>

            <div className="grid gap-3">
              {workoutTemplates.map((template) => {
                const selected = template.id === selectedTemplateId;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => selectTemplate(template.id)}
                    style={{
                      borderRadius: 22,
                      padding: 16,
                      textAlign: "left",
                      border: `1px solid ${selected ? "#3B82F6" : "#2D2D2D"}`,
                      background: selected ? "rgba(59,130,246,0.12)" : "rgba(16,16,16,0.9)",
                      boxShadow: selected ? "0 0 0 1px rgba(59,130,246,0.2) inset" : "none",
                      transition: "all 160ms ease",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div
                          style={{
                            color: "#FFFFFF",
                            fontFamily: "var(--font-montserrat)",
                            fontSize: 17,
                            fontWeight: 700,
                            marginBottom: 8,
                          }}
                        >
                          {template.name}
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {template.groups.map((group) => (
                            <span
                              key={group}
                              style={{
                                borderRadius: 999,
                                padding: "4px 10px",
                                border: "1px solid #2D2D2D",
                                background: "rgba(255,255,255,0.03)",
                                color: "#D4D4D4",
                                fontFamily: "var(--font-inter)",
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {group}
                            </span>
                          ))}
                        </div>
                        <div
                          style={{
                            color: "#A3A3A3",
                            fontFamily: "var(--font-inter)",
                            fontSize: 12,
                          }}
                        >
                          {template.exercises} exercícios · {template.duration}
                        </div>
                      </div>
                      <div
                        style={{
                          minWidth: 26,
                          height: 26,
                          borderRadius: 999,
                          border: `1px solid ${selected ? "#3B82F6" : "#3D3D3D"}`,
                          background: selected ? "#3B82F6" : "transparent",
                          color: selected ? "#FFFFFF" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Check size={14} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </IonCol>
        </IonRow>

        <IonRow className="mt-6">
          <IonCol size="12">
            <div className="flex flex-col gap-3">
              <BeeButton
                variant={canStartWorkout ? "primary" : "dark"}
                size="lg"
                fullWidth
                onClick={handleStartWorkout}
                disabled={!canStartWorkout || isStartingWorkout}
              >
                {isStartingWorkout ? "Iniciando..." : "Iniciar treino"}
              </BeeButton>
              {startError && (
                <IonText style={{ color: "#FCA5A5", fontFamily: "var(--font-inter)", fontSize: 13 }}>
                  {startError}
                </IonText>
              )}
            </div>
          </IonCol>
        </IonRow>
      </IonGrid>
    </PageBackground>
  );
}
