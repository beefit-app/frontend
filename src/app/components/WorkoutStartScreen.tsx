import { useEffect, useMemo, useRef, useState } from "react";
import { IonCard, IonCardContent, IonCol, IonGrid, IonRow, IonText } from "@ionic/react";
import { Check, Dumbbell, FolderKanban } from "lucide-react";
import { ActiveWorkoutScreen } from "./ActiveWorkoutScreen";
import { BeeButton } from "./BeeButton";
import { PageBackground } from "./PageBackground";
import { toast } from "sonner";
import { useAuth } from "../auth/AuthContext";
import { messages } from "../constants/messages";
import { useConfirm } from "../hooks/useConfirm";
import {
  persistWorkoutPhoto,
  removePersistedWorkoutPhoto,
  restoreWorkoutPhoto,
} from "../platform/workoutPhoto";
import { subscribeSocialEvents, type CardGeneratedEvent } from "../services/socialEventsService";
import { workoutService } from "../services/workoutService";
import { workoutDraftStorage } from "../storage/workoutDraftStorage";
import type { ActiveWorkoutBannerState } from "../hooks/useWorkoutSessionState";
import type {
  ExerciseCatalogItem,
  WorkoutCompletionDraft,
  WorkoutCompletionResult,
  WorkoutCompletionSummary,
  WorkoutDraft,
  WorkoutExercise,
} from "../types/workout";

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

function formatCompletionSummary(summary: WorkoutCompletionSummary) {
  const minutes = Math.max(0, Math.round(summary.durationSeconds / 60));
  const calories = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(summary.estimatedCalories);
  const volume = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(summary.totalVolume);

  return `Treino finalizado: ${minutes} min, ${calories} kcal, ${volume} kg.`;
}

interface WorkoutStartScreenProps {
  ghostModeEnabled?: boolean;
  onActiveWorkoutChange?: (workout: ActiveWorkoutBannerState | null) => void;
  onWorkoutCompleted?: (draft: WorkoutCompletionDraft, summary: WorkoutCompletionSummary) => void;
}

export function WorkoutStartScreen({
  ghostModeEnabled = false,
  onActiveWorkoutChange,
  onWorkoutCompleted,
}: WorkoutStartScreenProps) {
  const { user } = useAuth();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [workoutTemplates, setWorkoutTemplates] = useState(() => workoutService.getTemplates());
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [startError, setStartError] = useState("");
  const [workoutDataError, setWorkoutDataError] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);
  const [activeWorkoutConfig, setActiveWorkoutConfig] = useState<{
    workoutId: string | null;
    title: string;
    subtitle: string;
    selectedGroups: string[];
    startedAt: number;
    initialExerciseIds: string[];
    initialSessionExercises: WorkoutExercise[];
    initialDraft: WorkoutDraft | null;
    initialFinishPhotoFile?: File | null;
    initialFinishIdempotencyKey?: string | null;
    initialFinishFinishedAt?: string | null;
    initialFinishPhotoMediaId?: string | null;
    initialFinishTitle?: string | null;
    initialShouldPostWorkout?: boolean;
    pendingFinish?: boolean;
  } | null>(null);
  const isClosingWorkoutRef = useRef(false);
  const generatedCardEventRef = useRef<CardGeneratedEvent | null>(null);
  const generatedCardResolverRef = useRef<((event: CardGeneratedEvent) => void) | null>(null);
  const finishRequestRef = useRef<Promise<WorkoutCompletionResult> | null>(null);
  const isPreparingFinishRef = useRef(false);

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
    generatedCardEventRef.current = null;
    generatedCardResolverRef.current = null;
  }

  async function clearActiveWorkoutLocally() {
    isClosingWorkoutRef.current = true;
    const draft = await workoutDraftStorage.getCurrentDraft(user?.id);
    await removePersistedWorkoutPhoto(draft?.photoFileName);
    resetWorkoutState();
    await workoutDraftStorage.clearDrafts(user?.id);
    onActiveWorkoutChange?.(null);
  }

  // Marca o rascunho local como "finalizacao pendente" antes do POST. O backend
  // guarda um hash de finishedAt|muscleGroups|exercises|title|shouldPostWorkout|
  // photoMediaId junto da Idempotency-Key e recusa a mesma chave com conteudo
  // divergente, entao esses campos precisam sobreviver ao fechamento do app para
  // que a retomada seja tratada como repeticao e nao como conflito.
  async function persistPendingFinish(
    draft: WorkoutCompletionDraft,
    startedAt: number,
    photoFileName: string | null | undefined,
  ) {
    if (!user?.id || !draft.workoutId) return;

    await workoutDraftStorage.saveDraft({
      userId: user.id,
      workoutId: draft.workoutId,
      title: draft.title,
      selectedGroups: draft.selectedGroups,
      exercises: draft.exercises,
      shouldPostWorkout: draft.shouldPostWorkout,
      shouldSaveTemplate: draft.shouldSaveTemplate,
      startedAt,
      pendingFinish: true,
      idempotencyKey: draft.idempotencyKey,
      finishedAt: draft.finishedAt,
      photoMediaId: draft.photoMediaId ?? null,
      photoUrl: draft.photoUrl,
      photoFileName: photoFileName ?? null,
      updatedAt: Date.now(),
    });
  }

  async function finishPersistedDraft(
    draft: WorkoutCompletionDraft,
    startedAt: number,
    photoFileName: string | null | undefined,
  ): Promise<WorkoutCompletionResult> {
    // Montagem da tela, retomada automatica e clique do usuario disputam o mesmo
    // POST; manter uma requisicao em voo por vez evita gastar a Idempotency-Key
    // em paralelo.
    if (finishRequestRef.current) return finishRequestRef.current;

    const request = (async () => {
      const result = await workoutService.finishWorkout(draft, (preparedDraft) =>
        persistPendingFinish(preparedDraft, startedAt, photoFileName),
      );
      // Limpeza so no caminho de sucesso: se falhar, o rascunho tem de sobreviver
      // para a proxima tentativa.
      await removePersistedWorkoutPhoto(photoFileName);
      await workoutDraftStorage.removeDraft(user?.id, draft.workoutId);
      return result;
    })();

    finishRequestRef.current = request;
    try {
      return await request;
    } finally {
      finishRequestRef.current = null;
    }
  }

  async function closeActiveWorkout() {
    if (!activeWorkoutConfig?.workoutId) {
      await clearActiveWorkoutLocally();
      return;
    }

    try {
      await workoutService.cancelWorkout(activeWorkoutConfig.workoutId);
      await workoutDraftStorage.removeDraft(user?.id, activeWorkoutConfig.workoutId);
      await clearActiveWorkoutLocally();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : messages.actionFailed("cancelar o treino"));
    }
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
    const retryRecovery = () => setRecoveryAttempt((current) => current + 1);
    window.addEventListener("online", retryRecovery);
    return () => window.removeEventListener("online", retryRecovery);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadWorkoutData() {
      let latestError = "";

      try {
        await workoutService.loadCatalog();
      } catch (error) {
        latestError = error instanceof Error ? error.message : messages.actionFailed("carregar o catálogo");
      }

      try {
        const templates = await workoutService.loadTemplates();
        if (active) setWorkoutTemplates(templates);
      } catch (error) {
        latestError = error instanceof Error ? error.message : messages.actionFailed("carregar os templates");
      }

      // A restauracao da sessao ativa pertence inteiramente ao efeito de
      // restoreActiveWorkout; duplica-la aqui gerava duas configuracoes
      // concorrentes para o mesmo treino.
      if (active) setWorkoutDataError(latestError);
    }

    void loadWorkoutData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreActiveWorkout() {
      const persisted = await workoutDraftStorage.getCurrentDraft(user?.id);
      try {
        if (persisted?.pendingFinish && persisted.workoutId) {
          // Rascunhos gravados antes de startedAt passar a ser persistido nao tem o
          // carimbo de inicio; sem ele o tempo decorrido comeca do zero.
          const persistedStartedAt = persisted.startedAt ?? Date.now();
          // A foto so precisa voltar do disco enquanto nao virou mediaId; depois
          // disso o backend ja tem o arquivo.
          const restoredPhoto = persisted.photoFileName && !persisted.photoMediaId
            ? await restoreWorkoutPhoto(persisted.photoFileName)
            : null;
          const pendingDraft: WorkoutCompletionDraft = {
            workoutId: persisted.workoutId,
            title: persisted.title,
            photoUrl: persisted.photoUrl ?? null,
            photoFile: restoredPhoto,
            shouldPostWorkout: persisted.shouldPostWorkout,
            shouldSaveTemplate: persisted.shouldSaveTemplate ?? false,
            selectedGroups: persisted.selectedGroups,
            elapsedSeconds: Math.max(0, Math.floor((Date.now() - persistedStartedAt) / 1000)),
            exercises: persisted.exercises,
            idempotencyKey: persisted.idempotencyKey || crypto.randomUUID(),
            finishedAt: persisted.finishedAt || new Date().toISOString(),
            photoMediaId: persisted.photoMediaId ?? null,
          };
          await persistPendingFinish(pendingDraft, persistedStartedAt, persisted.photoFileName);

          const persistedSession = await workoutService.getWorkout(persisted.workoutId);
          if (!active) return;
          if (persistedSession.status === "FINISHED") {
            await removePersistedWorkoutPhoto(persisted.photoFileName);
            await workoutDraftStorage.clearDrafts(user?.id);
            onActiveWorkoutChange?.(null);
            onWorkoutCompleted?.(pendingDraft, persistedSession);
            showGeneratedCardMessage(null, persistedSession);
            return;
          }

          if (persistedSession.status !== "IN_PROGRESS") {
            await removePersistedWorkoutPhoto(persisted.photoFileName);
            await workoutDraftStorage.clearDrafts(user?.id);
            setStartError("A finalização pendente não pôde ser retomada porque o treino não está mais ativo.");
            return;
          }

          setActiveWorkoutConfig({
            workoutId: persistedSession.workoutId,
            title: persisted.title || "Treino em andamento",
            subtitle: "Finalização pendente recuperada. Tentando concluir automaticamente.",
            selectedGroups: persisted.selectedGroups,
            startedAt: persistedStartedAt,
            initialExerciseIds: [],
            initialSessionExercises: persisted.exercises,
            initialDraft: persisted,
            initialFinishPhotoFile: restoredPhoto,
            initialFinishIdempotencyKey: pendingDraft.idempotencyKey,
            initialFinishFinishedAt: pendingDraft.finishedAt,
            initialFinishPhotoMediaId: pendingDraft.photoMediaId,
            initialFinishTitle: pendingDraft.title,
            initialShouldPostWorkout: pendingDraft.shouldPostWorkout,
            pendingFinish: true,
          });
          onActiveWorkoutChange?.({
            workoutId: persistedSession.workoutId,
            selectedGroups: persisted.selectedGroups,
            startedAt: persistedStartedAt,
          });

          const result = await finishPersistedDraft(pendingDraft, persistedStartedAt, persisted.photoFileName);
          if (!active) return;
          const cardEvent = await waitForGeneratedCardEvent(pendingDraft.workoutId);
          // O treino acabou de ser finalizado: limpar so o estado local. Passar por
          // closeActiveWorkout tentaria cancelar uma sessao ja FINISHED.
          await clearActiveWorkoutLocally();
          setCompletionMessage(formatCompletionSummary(result));
          onWorkoutCompleted?.(pendingDraft, result);
          showGeneratedCardMessage(cardEvent, result);
          return;
        }

        const session = await workoutService.getActiveWorkout();
        if (!active || !session) {
          if (active) await workoutDraftStorage.clearDrafts(user?.id);
          return;
        }
        const startedAt = session.startedAt;
        const restoredDraft = persisted?.workoutId === session.id ? persisted : null;
        const exercises = restoredDraft?.exercises ?? session.exercises;
        const groups = session.muscleGroups;
        const restoredPhoto = restoredDraft?.photoFileName
          ? await restoreWorkoutPhoto(restoredDraft.photoFileName)
          : null;
        if (!active) return;
        isClosingWorkoutRef.current = false;
        setActiveWorkoutConfig({
          workoutId: session.id,
          title: restoredDraft?.title || "Treino em andamento",
          subtitle: restoredDraft
            ? "Sessão restaurada com o rascunho local deste aparelho."
            : "Sessão restaurada do backend. Continue registrando suas séries normalmente.",
          selectedGroups: groups,
          startedAt,
          initialExerciseIds: [],
          initialSessionExercises: exercises,
          initialDraft: restoredDraft,
          initialFinishPhotoFile: restoredPhoto,
          initialFinishIdempotencyKey: restoredDraft?.idempotencyKey,
          initialFinishFinishedAt: restoredDraft?.finishedAt,
          initialFinishPhotoMediaId: restoredDraft?.photoMediaId,
        });
        onActiveWorkoutChange?.({ workoutId: session.id, selectedGroups: groups, startedAt });
      } catch (error) {
        if (active) {
          setStartError(persisted?.pendingFinish
            ? "A finalização continua salva e será tentada automaticamente quando houver conexão e sessão válida."
            : error instanceof Error ? error.message : "Não foi possível recuperar o treino ativo.");
        }
      }
    }

    void restoreActiveWorkout();
    return () => { active = false; };
  }, [onActiveWorkoutChange, recoveryAttempt]);

  useEffect(() => {
    const workoutId = activeWorkoutConfig?.workoutId;
    if (!workoutId) return;

    const controller = new AbortController();
    void subscribeSocialEvents((type, data) => {
      if (type !== "CARD_GENERATED" || !isCardGeneratedEvent(data) || data.workoutId !== workoutId) return;

      generatedCardEventRef.current = data;
      generatedCardResolverRef.current?.(data);
      generatedCardResolverRef.current = null;
    }, controller.signal);

    return () => {
      controller.abort();
    };
  }, [activeWorkoutConfig?.workoutId]);

  function waitForGeneratedCardEvent(workoutId: string | null | undefined) {
    if (!workoutId) return Promise.resolve<CardGeneratedEvent | null>(null);
    if (generatedCardEventRef.current?.workoutId === workoutId) {
      return Promise.resolve(generatedCardEventRef.current);
    }

    return new Promise<CardGeneratedEvent | null>((resolve) => {
      let active = true;
      const timeout = window.setTimeout(() => {
        active = false;
        generatedCardResolverRef.current = null;
        resolve(null);
      }, 1200);

      generatedCardResolverRef.current = (event) => {
        if (!active) return;
        active = false;
        window.clearTimeout(timeout);
        generatedCardResolverRef.current = null;
        resolve(event);
      };
    });
  }

  function showGeneratedCardMessage(event: CardGeneratedEvent | null, result: WorkoutCompletionResult | null) {
    const card = event ?? result?.card;
    if (!card) return;

    const rarity = formatCardRarity(card.rarity);
    const attackPower = Math.round(card.attackPower);
    const recordMessage = card.isPersonalRecord ? " Novo recorde pessoal." : "";
    toast.success(`Carta ${rarity} gerada`, {
      description: `${attackPower} de poder.${recordMessage}`,
    });
  }

  async function handleStartWorkout() {
    if (!canStartWorkout) return;
    if (workoutService.getCatalog().length === 0) {
      setStartError("O catálogo de exercícios ainda não foi carregado. Aguarde e tente novamente.");
      return;
    }
    setIsStartingWorkout(true);
    setStartError("");
    setCompletionMessage("");

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
          initialDraft: null,
        });
        onActiveWorkoutChange?.({
          workoutId: startedSession.id,
          selectedGroups: startedSession.muscleGroups,
          startedAt: startedSession.startedAt,
        });
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
        initialDraft: null,
      });
      onActiveWorkoutChange?.({
        workoutId: startedSession.id,
        selectedGroups: startedSession.muscleGroups.length > 0 ? startedSession.muscleGroups : labels,
        startedAt: startedSession.startedAt,
      });
    } catch (error) {
      setStartError(error instanceof Error ? error.message : messages.actionFailed("iniciar o treino"));
    } finally {
      setIsStartingWorkout(false);
    }
  }

  if (activeWorkoutConfig) {
    return (
      <>
      <ActiveWorkoutScreen
        workoutId={activeWorkoutConfig.workoutId}
        userId={user?.id}
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
        initialDraft={activeWorkoutConfig.initialDraft}
        ghostModeEnabled={ghostModeEnabled}
        initialFinishPhotoFile={activeWorkoutConfig.initialFinishPhotoFile}
        initialFinishIdempotencyKey={activeWorkoutConfig.initialFinishIdempotencyKey}
        initialFinishFinishedAt={activeWorkoutConfig.initialFinishFinishedAt}
        initialFinishPhotoMediaId={activeWorkoutConfig.initialFinishPhotoMediaId}
        initialFinishTitle={activeWorkoutConfig.initialFinishTitle}
        initialShouldPostWorkout={activeWorkoutConfig.initialShouldPostWorkout}
        pendingFinish={activeWorkoutConfig.pendingFinish}
        onWorkoutComplete={(draft) => {
          if (isPreparingFinishRef.current) return;
          isPreparingFinishRef.current = true;
          const startedAt = activeWorkoutConfig.startedAt;
          void (async () => {
            let photoFileName: string | null = null;
            try {
              // A foto vai para o disco antes do POST para que uma queda entre o
              // clique e a resposta nao perca a imagem que ainda so existe em memoria.
              if (draft.photoFile && !draft.photoMediaId) {
                photoFileName = await persistWorkoutPhoto(draft.photoFile);
              }
              await persistPendingFinish(draft, startedAt, photoFileName);

              const result = await finishPersistedDraft(draft, startedAt, photoFileName);
              const cardEvent = await waitForGeneratedCardEvent(draft.workoutId);
              setCompletionMessage(formatCompletionSummary(result));
              await clearActiveWorkoutLocally();
              onWorkoutCompleted?.(draft, result);
              showGeneratedCardMessage(cardEvent, result);
            } catch (error) {
              // O rascunho pendente continua salvo; a retomada tenta de novo quando
              // houver conexao, reusando a mesma Idempotency-Key.
              toast.error(error instanceof Error ? error.message : messages.actionFailed("finalizar o treino"));
            } finally {
              isPreparingFinishRef.current = false;
            }
          })();
        }}
        onSessionGroupsChange={(groups) => {
          if (isClosingWorkoutRef.current) return;
          onActiveWorkoutChange?.({
            workoutId: activeWorkoutConfig.workoutId,
            selectedGroups: groups,
            startedAt: activeWorkoutConfig.startedAt,
          });
        }}
        onCancelWorkout={async () => {
          if (!activeWorkoutConfig.workoutId) return false;
          const confirmed = await confirm({
            title: "Cancelar este treino?",
            description: "Os registros desta sessão não poderão ser recuperados.",
            confirmLabel: "Cancelar treino",
            cancelLabel: "Continuar treinando",
            destructive: true,
          });
          if (!confirmed) return false;
          // closeActiveWorkout ja cancela no backend, remove o rascunho e limpa a
          // tela. Cancelar aqui antes fazia a segunda chamada falhar — o treino ja
          // nao estava em andamento — e o catch de closeActiveWorkout impedia a
          // limpeza, prendendo o usuario na tela do treino.
          await closeActiveWorkout();
          return true;
        }}
        onSaveTemplate={async (groups, exercises) => {
          if (exercises.length === 0) {
            toast.error("Adicione ao menos um exercício antes de salvar o template.");
            return false;
          }
          const name = await confirm({
            title: "Salvar como template",
            description: "O template guarda os grupos e exercícios desta sessão.",
            confirmLabel: "Salvar",
            input: {
              label: "Nome do template",
              placeholder: "Ex: Peito e tríceps",
              validate: (value) => (value.trim() ? "" : messages.required("um nome para o template")),
            },
          });
          if (typeof name !== "string" || !name.trim()) return false;
          try {
            await workoutService.createTemplate({
              name: name.trim(),
              groups,
              exerciseIds: exercises.map((exercise) => exercise.catalogId),
            });
            setWorkoutTemplates(await workoutService.loadTemplates());
            toast.success("Template salvo.");
            return true;
          } catch (error) {
            toast.error(error instanceof Error ? error.message : messages.actionFailed("salvar o template"));
            return false;
          }
        }}
        onBack={() => {}}
      />
      {confirmDialog}
      </>
    );
  }

  return (
    <PageBackground>
      <IonGrid fixed style={{ padding: "32px 12px 24px" }}>
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
                Início do treino.
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

        {completionMessage && (
          <IonRow className="mt-5">
            <IonCol size="12">
              <IonCard
                style={
                  {
                    "--background": "rgba(34,197,94,0.1)",
                    "--color": "#FFFFFF",
                    "--border-radius": "20px",
                    margin: 0,
                    border: "1px solid rgba(34,197,94,0.28)",
                  } as React.CSSProperties
                }
              >
                <IonCardContent style={{ padding: 16 }}>
                  <IonText style={{ color: "#BBF7D0", fontFamily: "var(--font-inter)", fontSize: 14, lineHeight: 1.6 }}>
                    {completionMessage}
                  </IonText>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        )}

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

                {/* auto-fit em vez de sm:/lg:grid-cols: os prefixos do Tailwind
                    consultam a largura da TELA, mas este grid vive dentro do shell,
                    que e limitado. A 1280px o lg: pedia 4 colunas dentro de 640px e
                    "Desenvolvimento" quebrava no meio da palavra. */}
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
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
                          {template.duration ? `${template.exercises} exercícios · ${template.duration}` : `${template.exercises} exercícios`}
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
                shape="soft"
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
              {workoutDataError && (
                <IonText style={{ color: "#FCA5A5", fontFamily: "var(--font-inter)", fontSize: 13, lineHeight: 1.5 }}>
                  {workoutDataError}
                </IonText>
              )}
            </div>
          </IonCol>
        </IonRow>
      </IonGrid>
    </PageBackground>
  );
}

function isCardGeneratedEvent(data: unknown): data is CardGeneratedEvent {
  return (
    typeof data === "object" &&
    data !== null &&
    "workoutId" in data &&
    "cardId" in data &&
    "attackPower" in data &&
    "rarity" in data &&
    "muscleGroup" in data &&
    "isPersonalRecord" in data
  );
}

function formatCardRarity(value: string) {
  const labels: Record<string, string> = {
    COMMON: "Comum",
    RARE: "Rara",
    EPIC: "Epica",
    LEGENDARY: "Lendaria",
  };

  return labels[value] ?? value;
}
