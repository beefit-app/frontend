import type {
  ExerciseCatalogItem,
  WorkoutCompletionDraft,
  WorkoutExercise,
  WorkoutCompletionSummary,
  WorkoutTemplate,
} from "../types/workout";
import { workoutDataSource } from "./workoutDataSource";
import { apiClient } from "./apiClient";

interface BackendPage<T> {
  content?: T[];
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
}

const GROUP_LABEL_BY_ID: Record<string, string> = {
  peito: "Peito",
  costas: "Costas",
  pernas: "Pernas",
  ombros: "Ombros",
  bracos: "Braços",
  core: "Core",
};

const GROUP_ID_BY_BACKEND: Record<string, string> = {
  CHEST: "peito",
  BACK: "costas",
  LEGS: "pernas",
  SHOULDERS: "ombros",
  ARMS: "bracos",
  CORE: "core",
};

const BACKEND_GROUP_BY_ID: Record<string, string> = {
  peito: "CHEST",
  costas: "BACK",
  pernas: "LEGS",
  ombros: "SHOULDERS",
  bracos: "ARMS",
  core: "CORE",
};

let catalogCache: ExerciseCatalogItem[] = workoutDataSource.getExercises();
let templatesCache: WorkoutTemplate[] = workoutDataSource.getTemplates();

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

function toBackendGroup(value: string) {
  const groupId = normalizeGroupId(value);
  return BACKEND_GROUP_BY_ID[groupId] ?? value;
}

function normalizeCatalogExercise(exercise: BackendCatalogExercise): ExerciseCatalogItem {
  const groupId = normalizeGroupId(exercise.primaryMuscleGroupsList?.[0]);

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

function toFinishPayload(draft: WorkoutCompletionDraft) {
  return {
    finishedAt: new Date().toISOString(),
    title: draft.title,
    shouldPostWorkout: draft.shouldPostWorkout,
    muscleGroups: draft.selectedGroups.map(toBackendGroup),
    exercises: draft.exercises.map((exercise, exerciseIndex) => ({
      sessionExerciseId: exercise.sessionExerciseId ?? null,
      catalogExerciseId: exercise.catalogId,
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
    muscleGroups: draft.selectedGroups.map(toBackendGroup),
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

  async loadCatalog() {
    const response = await apiClient.get<BackendCatalogExercise[] | BackendPage<BackendCatalogExercise>>(
      "/api/exercises?size=1000",
      { auth: true, suppressUnauthorizedEvent: true },
    );
    catalogCache = extractList(response).map(normalizeCatalogExercise);
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
    const response = await apiClient.get<BackendTemplate[] | null>("/api/templates", {
      auth: true,
      suppressUnauthorizedEvent: true,
    });
    if (!response) {
      templatesCache = [];
      return templatesCache;
    }

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

  getGroupedCatalog(exercises: ExerciseCatalogItem[] = catalogCache) {
    const groupOrder = workoutDataSource.getGroupOrder();

    return groupOrder.map((group) => ({
      group,
      items: exercises.filter((exercise) => exercise.group === group),
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
        muscleGroups: input.selectedGroups.map(toBackendGroup),
        isPrivate: input.isPrivate,
        templateId: input.templateId ?? null,
        exercises: [],
      },
      { auth: true },
    );

    return normalizeStartedSession(response);
  },

  async getActiveWorkout() {
    const response = await apiClient.get<BackendWorkoutSession | null>("/api/workout/active", {
      auth: true,
      suppressUnauthorizedEvent: true,
    });
    if (!response) return null;
    return normalizeStartedSession(response);
  },

  async finishWorkout(draft: WorkoutCompletionDraft) {
    if (!draft.workoutId) {
      throw new Error("Sessão de treino sem ID do backend.");
    }

    const response = await apiClient.post<BackendWorkoutSession>(
      `/api/workout/${draft.workoutId}/finish`,
      toFinishPayload(draft),
      { auth: true },
    );

    if (draft.shouldSaveTemplate) {
      const createdTemplate = await apiClient.post<BackendTemplate>("/api/templates", toTemplatePayload(draft), { auth: true });
      templatesCache = [normalizeTemplate(createdTemplate), ...templatesCache.filter((template) => template.id !== createdTemplate.id)];
    }

    return normalizeCompletionSummary(response);
  },

  async cancelWorkout(workoutId: string | null | undefined) {
    if (!workoutId) {
      throw new Error("Sessão de treino sem ID do backend.");
    }

    await apiClient.post(`/api/workout/${workoutId}/cancel`, undefined, { auth: true });
  },
};
