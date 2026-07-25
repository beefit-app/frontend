import type {
  ExerciseCatalogItem,
  WorkoutCompletionDraft,
  WorkoutCompletionResult,
  WorkoutExercise,
  WorkoutTemplate,
} from "../types/workout";
import { workoutDataSource } from "./workoutDataSource";
import { apiClient } from "./apiClient";

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
  card?: {
    id: string;
    attackPower: number;
    rarity: string;
    muscleGroup: string;
    isPersonalRecord: boolean;
  } | null;
}

const GROUP_LABEL_BY_ID: Record<string, string> = {
  peito: "Peito",
  costas: "Costas",
  pernas: "Pernas",
  gluteos: "Glúteos",
  ombros: "Ombros",
  bracos: "Braços",
  core: "Core",
  trapezio: "Trapézio",
};

const GROUP_ID_BY_BACKEND: Record<string, string> = {
  CHEST: "peito",
  BACK: "costas",
  LEGS: "pernas",
  GLUTES: "gluteos",
  SHOULDERS: "ombros",
  ARMS: "bracos",
  CORE: "core",
  TRAPS: "trapezio",
};

let catalogCache: ExerciseCatalogItem[] = [];
let templatesCache: WorkoutTemplate[] = [];

function extractList<T>(response: T[] | BackendPage<T>) {
  if (Array.isArray(response)) return response;
  return response.content ?? [];
}

function normalizeGroupId(value: string | null | undefined) {
  if (!value) return "core";
  const cleanValue = value.trim();
  return (
    GROUP_ID_BY_BACKEND[cleanValue] ??
    cleanValue
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
  );
}

function getGroupLabel(groupId: string) {
  return GROUP_LABEL_BY_ID[groupId] ?? groupId;
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

function toFinishPayload(draft: WorkoutCompletionDraft) {
  return {
    finishedAt: new Date().toISOString(),
    muscleGroups: draft.selectedGroups.map(toApiMuscleGroup),
    title: draft.title,
    shouldPostWorkout: draft.shouldPostWorkout,
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

function toApiMuscleGroup(value: string) {
  return normalizeGroupId(value);
}

function normalizeWorkoutResult(response: BackendWorkoutSession): WorkoutCompletionResult {
  return {
    id: response.id,
    durationSeconds: response.durationSeconds ?? null,
    estimatedCalories: response.estimatedCalories ?? null,
    totalVolume: response.totalVolume ?? null,
    card: response.card ?? null,
  };
}

// O catálogo de exercícios e os templates devem vir exclusivamente da API.
// Apenas a taxonomia visual dos grupos permanece local.
export const workoutService = {
  getCatalog() {
    return catalogCache;
  },

  hasCatalogLoaded() {
    return catalogCache.length > 0;
  },

  async loadCatalog() {
    const exercises: BackendCatalogExercise[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await apiClient.get<BackendCatalogExercise[] | BackendPage<BackendCatalogExercise>>(
        `/api/exercises?size=200&page=${page}`,
        { auth: true },
      );

      exercises.push(...extractList(response));

      if (Array.isArray(response)) {
        hasMore = false;
        continue;
      }

      const currentPage = response.number ?? page;
      const totalPages = response.totalPages ?? currentPage + 1;
      hasMore = response.last === false || currentPage + 1 < totalPages;
      page = currentPage + 1;
    }

    catalogCache = exercises.map(normalizeCatalogExercise);
    return catalogCache;
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
    const response = await apiClient.get<BackendTemplate[]>("/api/templates", { auth: true });
    templatesCache = response.map(normalizeTemplate);
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

  getGroupedCatalog() {
    const groups = workoutDataSource.getMuscleGroups();
    const exercises = catalogCache;

    return groups.map((group) => ({
      groupId: group.id,
      group: group.label,
      items: exercises.filter((exercise) => exercise.groupId === group.id),
    }));
  },

  getCatalogByGroupId(groupId: string) {
    return catalogCache.filter((exercise) => exercise.groupId === groupId);
  },

  getCatalogItemById(exerciseId: string | null) {
    if (!exerciseId) return null;
    return catalogCache.find((exercise) => exercise.id === exerciseId) ?? null;
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
        templateId: input.templateId ?? null,
        exercises: [],
      },
      { auth: true },
    );

    return {
      id: response.id,
      startedAt: new Date(response.startedAt).getTime(),
      muscleGroups: response.muscleGroups.map((group) => getGroupLabel(normalizeGroupId(group))),
      exercises: response.exercises.map(normalizeSessionExercise),
    };
  },

  async finishWorkout(draft: WorkoutCompletionDraft) {
    if (!draft.workoutId) {
      throw new Error("Sessão de treino sem ID do backend.");
    }

    let photoMediaId: string | null = null;
    if (draft.photoFile && draft.shouldPostWorkout) {
      photoMediaId = await this.uploadWorkoutPhoto(draft.photoFile);
    }

    const response = await apiClient.post<BackendWorkoutSession>(
      `/api/workout/${draft.workoutId}/finish`,
      { ...toFinishPayload(draft), photoMediaId },
      { auth: true, headers: { "Idempotency-Key": draft.idempotencyKey } },
    );
    return normalizeWorkoutResult(response);
  },

  async getActiveWorkout() {
    const response = await apiClient.get<BackendWorkoutSession | null>("/api/workout/active", { auth: true });
    if (!response) return null;
    return {
      id: response.id,
      startedAt: new Date(response.startedAt).getTime(),
      muscleGroups: response.muscleGroups.map((group) => getGroupLabel(normalizeGroupId(group))),
      exercises: response.exercises.map(normalizeSessionExercise),
    };
  },

  async cancelWorkout(workoutId: string) {
    return apiClient.post<BackendWorkoutSession>(`/api/workout/${workoutId}/cancel`, undefined, { auth: true });
  },

  async addMuscleGroup(workoutId: string, groupId: string) {
    return apiClient.post<BackendWorkoutSession>(
      `/api/workout/${workoutId}/muscle-groups/${encodeURIComponent(groupId)}`,
      undefined,
      { auth: true },
    );
  },

  async createTemplate(input: { name: string; groups: string[]; exerciseIds: string[] }) {
    const response = await apiClient.post<BackendTemplate>(
      "/api/templates",
      {
        name: input.name,
        muscleGroups: input.groups.map(toApiMuscleGroup),
        exercises: input.exerciseIds.map((catalogExerciseId, index) => ({ catalogExerciseId, order: index + 1 })),
      },
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
