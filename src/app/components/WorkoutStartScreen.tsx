import { useEffect, useMemo, useRef, useState } from "react";
import { IonCard, IonCardContent, IonCol, IonGrid, IonRow, IonText } from "@ionic/react";
import { Check, Dumbbell, FolderKanban } from "lucide-react";
import { ActiveWorkoutScreen } from "./ActiveWorkoutScreen";
import { BeeButton } from "./BeeButton";
import { BeeAlert } from "./BeeAlert";
import { PageBackground } from "./PageBackground";
import { InteractiveTabPager } from "./ui/InteractiveTabPager";
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
import { assertSessionActive, getSessionSignal } from "../storage/sessionStorage";
import { pageCacheStorage } from "../storage/pageCacheStorage";
import type { ActiveWorkoutBannerState } from "../hooks/useWorkoutSessionState";
import type {
  ExerciseCatalogItem,
  PendingWorkoutFinish,
  WorkoutCompletionDraft,
  WorkoutCompletionResult,
  WorkoutCompletionSummary,
  WorkoutDraft,
  WorkoutExercise,
} from "../types/workout";

const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
const WORKOUT_DATA_TTL_MS = 15 * 60 * 1000;

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

export interface ActiveWorkoutConfig {
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
}

type FinishAttempt =
  | { type: "new"; draft: WorkoutCompletionDraft; startedAt: number }
  | { type: "resume"; draft: WorkoutDraft };

type FinishProgress = { title: string } & (
  | { phase: "saving" | "syncing" }
  | { phase: "pending"; error: string }
);

let activeWorkoutMemoryConfig: {
  userId: string | null;
  config: ActiveWorkoutConfig;
} | null = null;

export function resetActiveWorkoutMemory() {
  activeWorkoutMemoryConfig = null;
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
  const [originatingSession] = useState(getSessionSignal);
  const ownsCurrentSession = () => originatingSession !== null && getSessionSignal() === originatingSession;
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [startMode, setStartMode] = useState<"groups" | "templates">("groups");
  const [workoutTemplates, setWorkoutTemplates] = useState(() => workoutService.getTemplates());
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [startError, setStartError] = useState("");
  const [workoutDataError, setWorkoutDataError] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [isRestoringWorkout, setIsRestoringWorkout] = useState(true);
  const [finishProgress, setFinishProgress] = useState<FinishProgress | null>(null);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);

  const initialActiveWorkoutConfig =
    activeWorkoutMemoryConfig && activeWorkoutMemoryConfig.userId === (user?.id ?? null)
      ? activeWorkoutMemoryConfig.config
      : null;

  const [activeWorkoutConfig, setActiveWorkoutConfigState] = useState<ActiveWorkoutConfig | null>(initialActiveWorkoutConfig);

  function setActiveWorkoutConfig(config: ActiveWorkoutConfig | null) {
    if (config) {
      activeWorkoutMemoryConfig = {
        userId: user?.id ?? null,
        config,
      };
    } else {
      activeWorkoutMemoryConfig = null;
    }
    setActiveWorkoutConfigState(config);
  }

  const isClosingWorkoutRef = useRef(false);
  const generatedCardEventRef = useRef<CardGeneratedEvent | null>(null);
  const workoutOperation = useRef<"finish" | "cancel" | null>(null);
  const retryAfterFinish = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Esta tela depende só da interface do service; quando a API entrar,
  // a troca deve acontecer na implementação do service, não aqui.
  const muscleGroups = useMemo(() => workoutService.getMuscleGroups(), []);

  const selectedTemplate = useMemo(
    () => workoutService.getTemplateById(selectedTemplateId),
    [selectedTemplateId, workoutTemplates],
  );

  const canStartWorkout = !isRestoringWorkout && (selectedGroups.length > 0 || selectedTemplate !== null);

  function resetWorkoutState() {
    setSelectedGroups([]);
    setSelectedTemplateId(null);
    activeWorkoutMemoryConfig = null;
    setActiveWorkoutConfigState(null);
    generatedCardEventRef.current = null;
  }


  async function runFinish(attempt: FinishAttempt) {
    const userId = user?.id;
    const { draft } = attempt;
    const workoutId = draft.workoutId;
    const isCurrent = () => mounted.current && ownsCurrentSession();
    if (!userId || !workoutId || !isCurrent() || workoutOperation.current) return;

    workoutOperation.current = "finish";
    const resuming = attempt.type === "resume";
    let title = draft.title;
    let saved = resuming;
    let retryableFailure = false;
    setFinishProgress({ phase: resuming ? "syncing" : "saving", title });

    try {
      let snapshot: PendingWorkoutFinish;
      let photoFile: File | null = null;
      if (attempt.type === "new") {
        const selectedPhoto = attempt.draft.photoFile ?? null;
        const photoFileName = selectedPhoto && !draft.photoMediaId ? await persistWorkoutPhoto(selectedPhoto) : null;
        if (selectedPhoto && !draft.photoMediaId && !photoFileName) {
          throw new Error("Não foi possível salvar a foto no aparelho. Tente novamente ou retire a foto.");
        }
        // Grave também se houve logout durante a cópia: o snapshot continua sendo do dono.
        snapshot = await workoutDraftStorage.savePendingFinish({
          userId, workoutId, title,
          selectedGroups: draft.selectedGroups,
          exercises: draft.exercises,
          shouldPostWorkout: draft.shouldPostWorkout,
          shouldSaveTemplate: draft.shouldSaveTemplate,
          startedAt: attempt.startedAt,
          pendingFinish: true,
          idempotencyKey: attempt.draft.idempotencyKey,
          finishedAt: attempt.draft.finishedAt,
          photoMediaId: draft.photoMediaId ?? null,
          photoFileName,
          updatedAt: Date.now(),
        });
        if (photoFileName === (snapshot.photoFileName ?? null)) photoFile = selectedPhoto;
        else if (photoFileName) await removePersistedWorkoutPhoto(photoFileName).catch(() => undefined);
      } else {
        snapshot = await workoutDraftStorage.savePendingFinish({
          ...attempt.draft,
          pendingFinish: true,
          idempotencyKey: attempt.draft.idempotencyKey || crypto.randomUUID(),
          finishedAt: attempt.draft.finishedAt || new Date().toISOString(),
        });
      }
      saved = true;
      title = snapshot.title;
      if (!isCurrent()) return;
      setFinishProgress({ phase: "syncing", title });

      let result: WorkoutCompletionResult | undefined;
      if (resuming) {
        // A resposta anterior pode ter se perdido depois do commit. Consulte a sessão exata.
        const session = await workoutService.getWorkout(workoutId);
        if (!isCurrent()) return;
        if (session.status === "FINISHED") result = session;
        else if (session.status !== "IN_PROGRESS") {
          // O treino foi encerrado por outro caminho e o snapshot nunca será aceito.
          // Mantê-lo prenderia a aba numa tentativa que falha sempre.
          await workoutDraftStorage.removeDraft(userId, workoutId).catch(() => undefined);
          await removePersistedWorkoutPhoto(snapshot.photoFileName).catch(() => undefined);
          if (!isCurrent()) return;
          isClosingWorkoutRef.current = true;
          resetWorkoutState();
          setFinishProgress(null);
          onActiveWorkoutChange?.(null);
          setStartError("A finalização pendente não pôde ser retomada porque o treino não está mais ativo.");
          return;
        }
      }
      if (!result && !snapshot.photoMediaId && snapshot.photoFileName && !photoFile) {
        photoFile = await restoreWorkoutPhoto(snapshot.photoFileName);
        if (!isCurrent()) return;
        if (!photoFile) throw new Error("Não foi possível recuperar a foto salva no aparelho.");
      }
      const completion: WorkoutCompletionDraft = {
        workoutId,
        title,
        photoUrl: null,
        photoFile,
        shouldPostWorkout: snapshot.shouldPostWorkout,
        shouldSaveTemplate: snapshot.shouldSaveTemplate ?? false,
        selectedGroups: snapshot.selectedGroups,
        elapsedSeconds: snapshot.startedAt === undefined
          ? 0 : Math.max(0, Math.floor((Date.parse(snapshot.finishedAt) - snapshot.startedAt) / 1000)),
        exercises: snapshot.exercises,
        idempotencyKey: snapshot.idempotencyKey,
        finishedAt: snapshot.finishedAt,
        photoMediaId: snapshot.photoMediaId ?? null,
      };
      result ??= await workoutService.finishWorkout(completion, async ({ photoMediaId }) => {
        if (photoMediaId && !snapshot.photoMediaId) {
          // O ID pertence ao corpo idempotente; só deixe o POST sair depois de gravá-lo.
          await workoutDraftStorage.saveFinishPhotoId(snapshot, photoMediaId);
        }
        assertSessionActive(originatingSession);
      });
      if (!isCurrent()) return;

      const cardEvent = getGeneratedCardEvent(workoutId);
      // Uma falha de limpeza não desfaz a confirmação. Se o rascunho sobrar, a consulta o reconhece.
      await workoutDraftStorage.removeDraft(userId, workoutId).catch(() => undefined);
      await removePersistedWorkoutPhoto(snapshot.photoFileName).catch(() => undefined);
      if (!isCurrent()) return;
      isClosingWorkoutRef.current = true;
      resetWorkoutState();
      setFinishProgress(null);
      onActiveWorkoutChange?.(null);
      showWorkoutCompletionMessage(result);
      onWorkoutCompleted?.(completion, result);
      showGeneratedCardMessage(cardEvent, result);
    } catch (error) {
      if (!isCurrent()) return;
      const message = error instanceof Error ? error.message : messages.actionFailed("finalizar o treino");
      if (saved) {
        retryableFailure = true;
        setFinishProgress({ phase: "pending", title, error: message });
      } else {
        setFinishProgress(null);
        toast.error(message);
      }
    } finally {
      workoutOperation.current = null;
      if (retryAfterFinish.current && retryableFailure && isCurrent()) {
        setRecoveryAttempt((current) => current + 1);
      }
      retryAfterFinish.current = false;
    }
  }

  async function closeActiveWorkout() {
    const workoutId = activeWorkoutConfig?.workoutId;
    if (!workoutId || workoutOperation.current || !ownsCurrentSession()) return false;
    workoutOperation.current = "cancel";
    try {
      await workoutService.cancelWorkout(workoutId);
      assertSessionActive(originatingSession);
      isClosingWorkoutRef.current = true;
      const draft = await workoutDraftStorage.getDraft(user?.id, workoutId).catch(() => null);
      await workoutDraftStorage.removeDraft(user?.id, workoutId).catch(() => undefined);
      await removePersistedWorkoutPhoto(draft?.photoFileName).catch(() => undefined);
      if (!mounted.current || !ownsCurrentSession()) return false;
      resetWorkoutState();
      onActiveWorkoutChange?.(null);
      return true;
    } catch (error) {
      if (ownsCurrentSession()) toast.error(error instanceof Error ? error.message : messages.actionFailed("cancelar o treino"));
      return false;
    } finally {
      workoutOperation.current = null;
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
    const retryRecovery = () => {
      // A rede pode voltar antes de a tentativa anterior falhar. Reaproveite o sinal uma vez.
      if (workoutOperation.current === "finish") retryAfterFinish.current = true;
      else if (!workoutOperation.current) setRecoveryAttempt((current) => current + 1);
    };
    window.addEventListener("online", retryRecovery);
    return () => window.removeEventListener("online", retryRecovery);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadWorkoutData() {
      let latestError = "";

      const [cachedCatalog, cachedTemplates] = await Promise.all([
        pageCacheStorage.get<ExerciseCatalogItem[]>(user?.id, "workout.catalog", WORKOUT_DATA_TTL_MS),
        pageCacheStorage.get<typeof workoutTemplates>(user?.id, "workout.templates", WORKOUT_DATA_TTL_MS),
      ]);
      if (!active) return;
      if (cachedCatalog) {
        workoutService.hydrateCatalog(cachedCatalog);
        setCatalogRevision((current) => current + 1);
      }
      if (cachedTemplates) {
        workoutService.hydrateTemplates(cachedTemplates);
        setWorkoutTemplates(cachedTemplates);
      }

      try {
        const catalog = cachedCatalog ?? await workoutService.loadCatalog({ force: true });
        if (active && !cachedCatalog) {
          setCatalogRevision((current) => current + 1);
          void pageCacheStorage.set(user?.id, "workout.catalog", catalog);
        }
      } catch (error) {
        latestError = error instanceof Error ? error.message : messages.actionFailed("carregar o catálogo");
      }

      try {
        const templates = cachedTemplates ?? await workoutService.loadTemplates();
        if (active && !cachedTemplates) {
          setWorkoutTemplates(templates);
          void pageCacheStorage.set(user?.id, "workout.templates", templates);
        }
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
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    const canRestore = () => active && ownsCurrentSession() && !workoutOperation.current && !isClosingWorkoutRef.current;

    async function restoreActiveWorkout() {
      try {
        if (!canRestore()) return;
        const persisted = await workoutDraftStorage.getCurrentDraft(user?.id);
        if (!canRestore()) return;
        if (persisted?.pendingFinish) {
          await runFinish({ type: "resume", draft: persisted });
          return;
        }

        const session = await workoutService.getActiveWorkout();
        if (!canRestore() || !session) return;
        const startedAt = session.startedAt;
        const restoredDraft = persisted?.workoutId === session.id ? persisted : null;
        const exercises = restoredDraft?.exercises ?? session.exercises;
        const groups = session.muscleGroups;
        const restoredPhoto = restoredDraft?.photoFileName
          ? await restoreWorkoutPhoto(restoredDraft.photoFileName)
          : null;
        if (!canRestore()) return;
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
        if (active && ownsCurrentSession()) {
          setStartError(error instanceof Error ? error.message : "Não foi possível recuperar o treino ativo.");
        }
      } finally {
        if (active) setIsRestoringWorkout(false);
      }
    }

    void restoreActiveWorkout();
    return () => { active = false; };
  }, [onActiveWorkoutChange, recoveryAttempt]);

  useEffect(() => {
    const workoutId = activeWorkoutConfig?.workoutId;
    if (!workoutId) return;

    const controller = new AbortController();
    void subscribeSocialEvents((event) => {
      if (event.type !== "CARD_GENERATED" || event.data.workoutId !== workoutId) return;

      generatedCardEventRef.current = event.data;
    }, controller.signal);

    return () => {
      controller.abort();
    };
  }, [activeWorkoutConfig?.workoutId]);

  function getGeneratedCardEvent(workoutId: string | null | undefined) {
    return generatedCardEventRef.current?.workoutId === workoutId
      ? generatedCardEventRef.current
      : null;
  }

  function showGeneratedCardMessage(cardEvent: CardGeneratedEvent | null, summary: WorkoutCompletionResult) {
    const card = cardEvent ?? (summary.card
      ? {
          workoutId: summary.workoutId,
          cardId: summary.card.id,
          exerciseName: summary.card.exerciseName,
          bestSetWeightKg: summary.card.bestSetWeightKg,
          bestSetReps: summary.card.bestSetReps,
          rarity: summary.card.rarity,
          muscleGroup: summary.card.muscleGroup,
          isPersonalRecord: summary.card.isPersonalRecord,
          occurredAt: new Date().toISOString(),
        }
      : null);

    if (!card) return;

    const title = card.isPersonalRecord ? "Novo Recorde Pessoal!" : "Card de Exercício Gerado!";
    const setPerformance = card.bestSetWeightKg && card.bestSetWeightKg > 0
      ? `${card.bestSetWeightKg} kg × ${card.bestSetReps}`
      : card.bestSetReps
        ? `${card.bestSetReps} reps`
        : null;
    const details = [
      card.exerciseName ?? "Exercício",
      setPerformance,
      `Raridade: ${card.rarity.toUpperCase()}`,
    ]
      .filter(Boolean)
      .join(" · ");

    toast.success(title, {
      description: details,
      duration: 6000,
    });
  }

  function showWorkoutCompletionMessage(summary: WorkoutCompletionResult) {
    const message = formatCompletionSummary(summary);
    setCompletionMessage(message);
    toast.success("Treino finalizado!", { description: message, duration: 6000 });
    if (summary.templateSaveError) {
      toast.error("O treino foi finalizado, mas o template não foi salvo.", {
        description: summary.templateSaveError,
      });
    }
  }

  async function handleStartWorkout() {
    if (!canStartWorkout || isStartingWorkout) return;

    setIsStartingWorkout(true);
    setStartError("");
    setCompletionMessage("");

    try {
      assertSessionActive(originatingSession);
      if (selectedTemplate) {
        const startedSession = await workoutService.startWorkout({
          selectedGroups: selectedTemplate.groups,
          isPrivate: ghostModeEnabled,
          templateId: selectedTemplate.id,
        });
        assertSessionActive(originatingSession);
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
      assertSessionActive(originatingSession);
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
      if (ownsCurrentSession()) setStartError(error instanceof Error ? error.message : messages.actionFailed("iniciar o treino"));
    } finally {
      setIsStartingWorkout(false);
    }
  }

  const finishNotice = finishProgress && (
    <PageBackground>
      <IonGrid fixed className="px-3 py-8">
        <IonRow>
          <IonCol size="12" className="grid gap-3">
            <h1 className="font-montserrat text-2xl font-bold text-white">{finishProgress.title}</h1>
            <BeeAlert
              title={finishProgress.phase === "pending" ? "Finalização pendente" : undefined}
              variant={finishProgress.phase === "pending" ? "error" : "info"}
            >
              {finishProgress.phase === "saving" && "Salvando treino no aparelho…"}
              {finishProgress.phase === "syncing" && "Treino salvo no aparelho. Confirmando com o servidor…"}
              {finishProgress.phase === "pending" && `Treino salvo no aparelho. ${finishProgress.error}`}
            </BeeAlert>
            {finishProgress.phase === "pending" && (
              <BeeButton fullWidth onClick={() => setRecoveryAttempt((current) => current + 1)}>
                Tentar novamente
              </BeeButton>
            )}
          </IonCol>
        </IonRow>
      </IonGrid>
    </PageBackground>
  );

  if (finishProgress && finishProgress.phase !== "saving") return finishNotice;

  if (activeWorkoutConfig) {
    return (
      <>
      {finishNotice}
      <div hidden={finishProgress?.phase === "saving"}>
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
        pendingFinish={finishProgress !== null}
        onWorkoutComplete={(draft) => void runFinish({ type: "new", draft, startedAt: activeWorkoutConfig.startedAt })}
        onSessionGroupsChange={(groups) => {
          if (isClosingWorkoutRef.current) return;
          if (activeWorkoutMemoryConfig && activeWorkoutMemoryConfig.userId === user?.id) {
            activeWorkoutMemoryConfig.config = {
              ...activeWorkoutMemoryConfig.config,
              selectedGroups: groups,
            };
          }
          onActiveWorkoutChange?.({
            workoutId: activeWorkoutConfig.workoutId,
            selectedGroups: groups,
            startedAt: activeWorkoutConfig.startedAt,
          });
        }}
        onDraftChange={(draft) => {
          if (activeWorkoutMemoryConfig && activeWorkoutMemoryConfig.userId === user?.id) {
            activeWorkoutMemoryConfig.config = {
              ...activeWorkoutMemoryConfig.config,
              selectedGroups: draft.selectedGroups,
              initialSessionExercises: draft.exercises,
            };
          }
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
          return confirmed ? closeActiveWorkout() : false;
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
            const templates = await workoutService.loadTemplates();
            setWorkoutTemplates(templates);
            void pageCacheStorage.set(user?.id, "workout.templates", templates);
            toast.success("Template salvo.");
            return true;
          } catch (error) {
            toast.error(error instanceof Error ? error.message : messages.actionFailed("salvar o template"));
            return false;
          }
        }}
        onBack={() => {}}
      />
      </div>
      {confirmDialog}
      </>
    );
  }

  return (
    <PageBackground className="min-h-full flex flex-col box-border">
      <IonGrid fixed style={{ padding: "24px 12px 24px", minHeight: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
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
              <p
                style={{
                  margin: "8px 0 0",
                  color: "#A3A3A3",
                  fontFamily: "var(--font-inter)",
                  fontSize: 14,
                  lineHeight: 1.45,
                }}
              >
                Defina o foco do treino antes de começar.
              </p>
            </div>
          </IonCol>
        </IonRow>

        {completionMessage && (
          <IonRow className="mt-4">
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

        <IonRow className="mt-4">
          <IonCol size="12">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                background: "#141414",
                border: "1px solid #2D2D2D",
                borderRadius: 16,
                padding: 4,
                gap: 4,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setStartMode("groups");
                  setSelectedTemplateId(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  background: startMode === "groups" ? "rgba(255,215,0,0.15)" : "transparent",
                  color: startMode === "groups" ? "#FFD700" : "#8A8A8A",
                  fontFamily: "var(--font-montserrat)",
                  fontSize: 13,
                  fontWeight: 700,
                  transition: "all 0.18s ease",
                }}
              >
                <Dumbbell size={16} />
                Grupos musculares
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartMode("templates");
                  setSelectedGroups([]);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  background: startMode === "templates" ? "rgba(255,215,0,0.15)" : "transparent",
                  color: startMode === "templates" ? "#FFD700" : "#8A8A8A",
                  fontFamily: "var(--font-montserrat)",
                  fontSize: 13,
                  fontWeight: 700,
                  transition: "all 0.18s ease",
                }}
              >
                <FolderKanban size={16} />
                Templates salvos
              </button>
            </div>
          </IonCol>
        </IonRow>

        <div className="mt-5 w-full flex-1">
          <InteractiveTabPager
            activeIndex={startMode === "groups" ? 0 : 1}
            onChangeIndex={(idx) => {
              if (idx === 0) {
                setStartMode("groups");
                setSelectedTemplateId(null);
              } else {
                setStartMode("templates");
                setSelectedGroups([]);
              }
            }}
          >
            <div className="pr-1">
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

                  <div className="flex flex-col gap-3">
                    {muscleGroups.map((group) => {
                      const selected = selectedGroups.includes(group.id);
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          style={{
                            borderRadius: 16,
                            padding: "16px",
                            textAlign: "left",
                            border: `1px solid ${selected ? group.accent : "#2D2D2D"}`,
                            background: selected ? group.glow : "rgba(16,16,16,0.9)",
                            boxShadow: selected ? `0 0 0 1px ${group.accent} inset, 0 4px 16px ${group.glow}` : "none",
                            transition: "all 160ms ease",
                            display: "flex",
                            width: "100%",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 14,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                color: selected ? "#FFFFFF" : "#EEEEEE",
                                fontFamily: "var(--font-montserrat)",
                                fontSize: 15,
                                fontWeight: 700,
                                marginBottom: 3,
                              }}
                            >
                              {group.label}
                            </div>
                            <div
                              style={{
                                color: "#8A8A8A",
                                fontFamily: "var(--font-inter)",
                                fontSize: 12,
                                lineHeight: 1.4,
                              }}
                            >
                              {group.description}
                            </div>
                          </div>
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 999,
                              border: `1px solid ${selected ? group.accent : "#3D3D3D"}`,
                              background: selected ? group.accent : "rgba(255,255,255,0.04)",
                              color: selected ? "#0A0A0A" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              transition: "all 160ms ease",
                            }}
                          >
                            <Check size={15} strokeWidth={3} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </IonCardContent>
              </IonCard>
            </div>

            <div className="pl-1">
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

              {workoutTemplates.length === 0 ? (
                <div
                  style={{
                    borderRadius: 20,
                    border: "1px dashed #2D2D2D",
                    background: "rgba(16,16,16,0.7)",
                    padding: "28px 20px",
                    textAlign: "center",
                    display: "grid",
                    gap: 8,
                    justifyItems: "center",
                  }}
                >
                  <span style={{ color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 16, fontWeight: 700 }}>
                    Nenhum template salvo ainda
                  </span>
                  <span style={{ color: "#8A8A8A", fontFamily: "var(--font-inter)", fontSize: 13, maxWidth: 280 }}>
                    Você pode criar e personalizar templates na aba de <strong>Inventário</strong> ou salvar ao final de um treino.
                  </span>
                </div>
              ) : (
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                  {workoutTemplates.map((template) => {
                    const selected = template.id === selectedTemplateId;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => selectTemplate(template.id)}
                        style={{
                          borderRadius: 20,
                          padding: 16,
                          textAlign: "left",
                          border: `1px solid ${selected ? "#FFD700" : "#2D2D2D"}`,
                          background: selected ? "rgba(255,215,0,0.1)" : "rgba(16,16,16,0.9)",
                          boxShadow: selected ? "0 0 0 1px rgba(255,215,0,0.25) inset" : "none",
                          transition: "all 160ms ease",
                          cursor: "pointer",
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
                                    borderRadius: 8,
                                    padding: "3px 8px",
                                    border: "1px solid #2D2D2D",
                                    background: "rgba(255,255,255,0.04)",
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
                              border: `1px solid ${selected ? "#FFD700" : "#3D3D3D"}`,
                              background: selected ? "#FFD700" : "transparent",
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
              )}
            </div>
          </InteractiveTabPager>
        </div>

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
