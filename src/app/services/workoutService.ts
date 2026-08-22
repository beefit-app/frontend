import type {
  ExerciseCatalogItem,
  WorkoutCompletionDraft,
  WorkoutCompletionResult,
  WorkoutRecoveryResult,
  WorkoutExercise,
  WorkoutCompletionSummary,
  WorkoutTemplate,
} from "../types/workout";
import { workoutDataSource } from "./workoutDataSource";
import { apiClient } from "./apiClient";
import type { StartWorkoutRequest, WorkoutTemplateRequest } from "../types/api";

interface BackendPage<T> {
  content?: T[];
  last?: boolean;
  number?: number;
  totalPages?: number;
}

interface BackendCatalogExercise {
  id: string;
  name: string;
  instructions?: string | null;
  primaryMuscleGroupsList?: string[] | null;
  secondaryMuscleGroupsList?: string[] | null;
}

interface BackendTemplateExercise {
  catalogExerciseId: string;
  catalogExerciseName?: string | null;
  order: number;
}

interface BackendTemplate {
  id: string;
  name: string;
  muscleGroups: string[];
  exercises: BackendTemplateExercise[];
}

interface BackendSessionExercise {
  id: string;
  catalogExerciseId: string;
  catalogExerciseName: string;
  order: number;
  sets: {
    id: string;
    order: number;
    weightKg: number;
    reps: number;
  }[];
}

interface BackendWorkoutSession {
  id: string;
  status: string;
  startedAt: string;
  finishedAt?: string | null;
  durationSeconds?: number | null;
  estimatedCalories?: number | null;
  totalVolume?: number | null;
  muscleGroups: string[];
  isPrivate: boolean;
  exercises: BackendSessionExercise[];
  // WorkoutCardResponseDTO nao expoe muscleIntensities; esse campo so chega pelo
  // evento SSE CARD_GENERATED.
  card?: {
    id: string;
    attackPower: number;
    rarity: string;
    muscleGroup: string;
    isPersonalRecord: boolean;
  } | null;
}

// /api/exercises serializa a entidade CatalogExercise crua, entao devolve o nome do
// enum ("CHEST"). /api/workout e /api/templates passam pelo WorkoutMuscleGroupMapper
// e falam o slug ("peito"). Ler os dois formatos e obrigatorio; escrever, nunca:
// o mapper do backend so aceita o slug e lanca InvalidMuscleGroupException no resto.
const GROUP_ID_BY_ENUM: Record<string, string> = {
  CHEST: "peito",
  BACK: "costas",
  LEGS: "pernas",
  GLUTES: "gluteos",
  SHOULDERS: "ombros",
  ARMS: "bracos",
  CORE: "core",
  TRAPS: "trapezio",
};

// O catalogo tem ~873 exercicios e e o mesmo para todo mundo. Duas telas o pedem
// na montagem (WorkoutStartScreen e useActiveWorkoutSession), entao abrir um treino
// disparava dois downloads completos em sequencia.
const CATALOG_TTL_MS = 15 * 60 * 1000;

let catalogCache: ExerciseCatalogItem[] = [];
let catalogLoadedAt = 0;
let catalogRequest: Promise<ExerciseCatalogItem[]> | null = null;
let templatesCache: WorkoutTemplate[] = [];

// O logout nao cancela requisicao em voo: ela resolve depois e grava no cache que
// acabou de ser limpo. Para templates isso e vazamento entre contas, porque
// getTemplates e lido de forma sincrona na montagem da tela de treino. O contador
// marca de qual sessao e cada requisicao; quem volta com o numero velho e descartado.
let cacheGeneration = 0;

function extractList<T>(response: T[] | BackendPage<T>) {
  if (Array.isArray(response)) return response;
  return response.content ?? [];
}

function normalizeGroupId(value: string | null | undefined) {
  if (!value) return "core";
  const cleanValue = value.trim();
  return (
    GROUP_ID_BY_ENUM[cleanValue.toUpperCase()] ??
    cleanValue
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
  );
}

function getGroupLabel(groupId: string) {
  return workoutDataSource.getMuscleGroups().find((group) => group.id === groupId)?.label ?? groupId;
}

// Aceita id ("peito") ou rotulo ("Bra\u00e7os"): selectedGroups carrega id enquanto o
// usuario seleciona e rotulo depois que a sessao comeca.
function toApiMuscleGroup(value: string) {
  return normalizeGroupId(value);
}

function normalizeCatalogExercise(exercise: BackendCatalogExercise): ExerciseCatalogItem {
  const groupId = normalizeGroupId(
    exercise.primaryMuscleGroupsList?.[0] ?? exercise.secondaryMuscleGroupsList?.[0],
  );

  return {
    id: exercise.id,
    name: exercise.name,
    group: getGroupLabel(groupId),
    groupId,
    notes: exercise.instructions ?? "",
    lastPerformed: "",
    bestWeight: "",
    lastWeight: "",
  };
}

function normalizeTemplate(template: BackendTemplate): WorkoutTemplate {
  return {
    id: template.id,
    name: template.name,
    groups: template.muscleGroups.map((group) => getGroupLabel(normalizeGroupId(group))),
    duration: "",
    exercises: template.exercises.length,
    exerciseIds: template.exercises
      .slice()
      .sort((first, second) => first.order - second.order)
      .map((exercise) => exercise.catalogExerciseId),
  };
}

function normalizeSessionExercise(exercise: BackendSessionExercise): WorkoutExercise {
  const catalogItem = catalogCache.find((item) => item.id === exercise.catalogExerciseId);
  const groupId = catalogItem?.groupId ?? "core";

  return {
    id: exercise.id,
    sessionExerciseId: exercise.id,
    catalogId: exercise.catalogExerciseId,
    name: exercise.catalogExerciseName,
    group: catalogItem?.group ?? getGroupLabel(groupId),
    groupId,
    sets: exercise.sets
      .slice()
      .sort((first, second) => first.order - second.order)
      .map((set) => ({
        id: set.id,
        backendId: set.id,
        weight: String(set.weightKg),
        reps: String(set.reps),
      })),
  };
}

function normalizeStartedSession(response: BackendWorkoutSession) {
  return {
    id: response.id,
    startedAt: new Date(response.startedAt).getTime(),
    muscleGroups: response.muscleGroups.map((group) => getGroupLabel(normalizeGroupId(group))),
    exercises: response.exercises.map(normalizeSessionExercise),
  };
}

function normalizeCompletionSummary(response: BackendWorkoutSession): WorkoutCompletionSummary {
  return {
    workoutId: response.id,
    durationSeconds: response.durationSeconds ?? 0,
    estimatedCalories: response.estimatedCalories ?? 0,
    totalVolume: response.totalVolume ?? 0,
  };
}

function normalizeWorkoutResult(response: BackendWorkoutSession): WorkoutCompletionResult {
  return {
    ...normalizeCompletionSummary(response),
    card: response.card
      ? {
          id: response.card.id,
          attackPower: response.card.attackPower,
          rarity: response.card.rarity,
          muscleGroup: normalizeGroupId(response.card.muscleGroup),
          isPersonalRecord: response.card.isPersonalRecord,
        }
      : null,
  };
}

function toFinishPayload(draft: WorkoutCompletionDraft) {
  return {
    // O backend guarda um hash deste corpo junto da Idempotency-Key e recusa a
    // mesma chave com conteudo divergente, entao o carimbo vem do rascunho e
    // nao pode ser recalculado a cada tentativa.
    finishedAt: draft.finishedAt,
    title: draft.title,
    shouldPostWorkout: draft.shouldPostWorkout,
    muscleGroups: draft.selectedGroups.map(toApiMuscleGroup),
    exercises: draft.exercises.map((exercise, exerciseIndex) => ({
      sessionExerciseId: exercise.sessionExerciseId ?? null,
      catalogExerciseId: exercise.catalogId,
      catalogExerciseName: exercise.name,
      order: exerciseIndex + 1,
      sets: exercise.sets.map((set, setIndex) => ({
        id: set.backendId ?? null,
        order: setIndex + 1,
        weightKg: Number(set.weight.replace(",", ".")) || 0,
        reps: Number.parseInt(set.reps, 10) || 0,
      })),
    })),
  };
}

function toTemplatePayload(draft: WorkoutCompletionDraft) {
  return {
    name: draft.title,
    muscleGroups: draft.selectedGroups.map(toApiMuscleGroup),
    exercises: draft.exercises.map((exercise, exerciseIndex) => ({
      catalogExerciseId: exercise.catalogId,
      order: exerciseIndex + 1,
    })),
  };
}

// Camada intermediária mínima para centralizar o ponto de troca entre mocks locais
// e a futura integração com a API de treino.
export const workoutService = {
  getCatalog() {
    return catalogCache;
  },

  hasCatalogLoaded() {
    return catalogCache.length > 0;
  },

  // Caches de modulo sobrevivem a troca de usuario porque a SPA nao recarrega no
  // logout. templatesCache e por usuario e getTemplates() e lido de forma sincrona
  // na montagem da tela de treino, entao sem este reset o proximo usuario ve os
  // templates do anterior ate o refetch responder.
  resetCaches() {
    cacheGeneration += 1;
    catalogCache = [];
    catalogLoadedAt = 0;
    catalogRequest = null;
    templatesCache = [];
  },

  async loadCatalog(options?: { force?: boolean }) {
    const isFresh = catalogCache.length > 0 && Date.now() - catalogLoadedAt < CATALOG_TTL_MS;
    if (!options?.force && isFresh) return catalogCache;

    // Duas telas pedem o catalogo quase ao mesmo tempo; sem esta deduplicacao a
    // segunda dispara um download identico enquanto a primeira ainda esta em voo.
    if (catalogRequest) return catalogRequest;

    const generationAoPedir = cacheGeneration;
    catalogRequest = (async () => {
      const response = await apiClient.get<BackendCatalogExercise[] | BackendPage<BackendCatalogExercise>>(
        "/api/exercises?size=1000",
        { auth: true },
      );
      const catalog = extractList(response).map(normalizeCatalogExercise);

      // O catalogo e o mesmo para todo mundo, entao chegar tarde nao vaza dado de
      // conta — mas gravar num cache ja limpo deixaria catalogLoadedAt mentindo
      // sobre a validade da entrada.
      if (generationAoPedir !== cacheGeneration) return catalog;

      catalogCache = catalog;
      catalogLoadedAt = Date.now();
      return catalogCache;
    })().finally(() => {
      catalogRequest = null;
    });

    return catalogRequest;
  },

  getGroupOrder() {
    return workoutDataSource.getGroupOrder();
  },

  getMuscleGroups() {
    return workoutDataSource.getMuscleGroups();
  },

  getTemplates() {
    return templatesCache;
  },

  async loadTemplates() {
    const generationAoPedir = cacheGeneration;
    const response = await apiClient.get<BackendTemplate[] | null>("/api/templates", {
      auth: true,
    });
    const templates = response ? response.map(normalizeTemplate) : [];

    // Chegou depois de um resetCaches: devolve ao chamador, que ja esta
    // desmontando, mas nao grava — o cache pertence a sessao seguinte.
    if (generationAoPedir !== cacheGeneration) return templates;

    templatesCache = templates;
    return templatesCache;
  },

  getTemplateById(templateId: string | null) {
    if (!templateId) return null;
    return templatesCache.find((template) => template.id === templateId) ?? null;
  },

  getTemplateExercises(templateId: string | null) {
    const template = this.getTemplateById(templateId);

    if (!template) return [];

    const exercises = catalogCache;

    return template.exerciseIds
      .map((exerciseId) => exercises.find((exercise) => exercise.id === exerciseId) ?? null)
      .filter((exercise): exercise is (typeof exercises)[number] => exercise !== null);
  },

  getSelectedGroupLabels(groupIds: string[]) {
    return workoutDataSource
      .getMuscleGroups()
      .filter((group) => groupIds.includes(group.id))
      .map((group) => group.label);
  },

  getGroupedCatalog(exercises: ExerciseCatalogItem[] = catalogCache) {
    const groupOrder: readonly string[] = workoutDataSource.getGroupOrder();

    return workoutDataSource
      .getMuscleGroups()
      .slice()
      .sort((first, second) => groupOrder.indexOf(first.label) - groupOrder.indexOf(second.label))
      .map((group) => ({
        groupId: group.id,
        group: group.label,
        items: exercises.filter((exercise) => exercise.groupId === group.id),
      }));
  },

  getCatalogByGroupId(groupId: string, exercises: ExerciseCatalogItem[] = catalogCache) {
    return exercises.filter((exercise) => exercise.groupId === groupId);
  },

  getCatalogItemById(exerciseId: string | null, exercises: ExerciseCatalogItem[] = catalogCache) {
    if (!exerciseId) return null;
    return exercises.find((exercise) => exercise.id === exerciseId) ?? null;
  },

  getSessionGroups(selectedGroups: string[], exercises: WorkoutExercise[]) {
    const groupOrder = workoutDataSource.getGroupOrder();
    const values = [...selectedGroups, ...exercises.map((exercise) => exercise.group)];
    const unique = Array.from(new Set(values));

    return [
      ...groupOrder.filter((group) => unique.includes(group)),
      ...unique.filter((group) => !groupOrder.includes(group as (typeof groupOrder)[number])),
    ];
  },

  async startWorkout(input: {
    selectedGroups: string[];
    isPrivate: boolean;
    templateId?: string | null;
  }) {
    const response = await apiClient.post<BackendWorkoutSession>(
      "/api/workout/start",
      {
        muscleGroups: input.selectedGroups.map(toApiMuscleGroup),
        isPrivate: input.isPrivate,
        templateId: input.templateId ?? undefined,
        exercises: [],
      } satisfies StartWorkoutRequest,
      { auth: true },
    );

    return normalizeStartedSession(response);
  },

  async getActiveWorkout() {
    const response = await apiClient.get<BackendWorkoutSession | null>("/api/workout/active", {
      auth: true,
    });
    if (!response) return null;
    return normalizeStartedSession(response);
  },

  async finishWorkout(
    draft: WorkoutCompletionDraft,
    onPrepared?: (preparedDraft: WorkoutCompletionDraft) => Promise<void>,
  ): Promise<WorkoutCompletionResult> {
    if (!draft.workoutId) {
      throw new Error("Sessão de treino sem ID do backend.");
    }

    // O mediaId entra no hash de idempotencia do backend: a foto sobe uma vez so e
    // o id resultante e devolvido ao chamador antes do POST, para que uma retomada
    // reproduza o mesmo corpo em vez de subir a foto de novo.
    const photoMediaId =
      draft.photoMediaId ?? (draft.photoFile ? await this.uploadWorkoutPhoto(draft.photoFile) : null);
    const preparedDraft: WorkoutCompletionDraft = { ...draft, photoMediaId };
    await onPrepared?.(preparedDraft);

    const response = await apiClient.post<BackendWorkoutSession>(
      `/api/workout/${draft.workoutId}/finish`,
      { ...toFinishPayload(preparedDraft), photoMediaId },
      { auth: true, headers: { "Idempotency-Key": draft.idempotencyKey } },
    );

    // shouldSaveTemplate nao existe no FinishWorkoutSnapshotRequestDTO; salvar o
    // template e uma chamada separada.
    if (draft.shouldSaveTemplate) {
      const createdTemplate = await apiClient.post<BackendTemplate>(
        "/api/templates",
        toTemplatePayload(preparedDraft),
        { auth: true },
      );
      templatesCache = [
        normalizeTemplate(createdTemplate),
        ...templatesCache.filter((template) => template.id !== createdTemplate.id),
      ];
    }

    return normalizeWorkoutResult(response);
  },

  async getWorkout(workoutId: string): Promise<WorkoutRecoveryResult> {
    const response = await apiClient.get<BackendWorkoutSession>(`/api/workout/${workoutId}`, { auth: true });
    return {
      ...normalizeWorkoutResult(response),
      status: response.status,
      startedAt: new Date(response.startedAt).getTime(),
      muscleGroups: response.muscleGroups.map((group) => getGroupLabel(normalizeGroupId(group))),
      exercises: response.exercises.map(normalizeSessionExercise),
    };
  },

  async addMuscleGroup(workoutId: string, groupId: string) {
    return apiClient.post<BackendWorkoutSession>(
      `/api/workout/${workoutId}/muscle-groups/${encodeURIComponent(toApiMuscleGroup(groupId))}`,
      undefined,
      { auth: true },
    );
  },

  async cancelWorkout(workoutId: string | null | undefined) {
    if (!workoutId) {
      throw new Error("Sessão de treino sem ID do backend.");
    }

    await apiClient.post(`/api/workout/${workoutId}/cancel`, undefined, { auth: true });
  },

  async createTemplate(input: { name: string; groups: string[]; exerciseIds: string[] }) {
    const response = await apiClient.post<BackendTemplate>(
      "/api/templates",
      {
        name: input.name,
        muscleGroups: input.groups.map(toApiMuscleGroup),
        exercises: input.exerciseIds.map((catalogExerciseId, index) => ({ catalogExerciseId, order: index + 1 })),
      } satisfies WorkoutTemplateRequest,
      { auth: true },
    );
    const template = normalizeTemplate(response);
    templatesCache = [...templatesCache.filter((item) => item.id !== template.id), template];
    return template;
  },

  async updateTemplate(templateId: string, input: { name: string; groups: string[]; exerciseIds: string[] }) {
    const response = await apiClient.put<BackendTemplate>(
      `/api/templates/${templateId}`,
      {
        name: input.name,
        muscleGroups: input.groups.map(toApiMuscleGroup),
        exercises: input.exerciseIds.map((catalogExerciseId, index) => ({ catalogExerciseId, order: index + 1 })),
      },
      { auth: true },
    );
    const template = normalizeTemplate(response);
    templatesCache = templatesCache.map((item) => (item.id === template.id ? template : item));
    return template;
  },

  async deleteTemplate(templateId: string) {
    await apiClient.delete(`/api/templates/${templateId}`, undefined, { auth: true });
    templatesCache = templatesCache.filter((item) => item.id !== templateId);
  },

  async uploadWorkoutPhoto(file: File) {
    const formData = new FormData();
    formData.append("file", file, file.name || "workout-photo.jpg");
    const response = await apiClient.post<{ mediaId: string }>("/api/media/workout-photo", formData, { auth: true });
    return response.mediaId;
  },
};
