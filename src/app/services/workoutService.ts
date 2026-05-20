import type { WorkoutExercise } from "../types/workout";
import { EXERCISES, GROUP_ORDER, MUSCLE_GROUPS, WORKOUT_TEMPLATES } from "../mocks/workoutData";

// Camada intermediária mínima para centralizar o ponto de troca entre mocks locais
// e a futura integração com a API de treino.
export const workoutService = {
  getCatalog() {
    return EXERCISES;
  },

  getGroupOrder() {
    return GROUP_ORDER;
  },

  getMuscleGroups() {
    return MUSCLE_GROUPS;
  },

  getTemplates() {
    return WORKOUT_TEMPLATES;
  },

  getTemplateById(templateId: string | null) {
    if (!templateId) return null;
    return WORKOUT_TEMPLATES.find((template) => template.id === templateId) ?? null;
  },

  getTemplateExercises(templateId: string | null) {
    const template = this.getTemplateById(templateId);

    if (!template) return [];

    return template.exerciseIds
      .map((exerciseId) => EXERCISES.find((exercise) => exercise.id === exerciseId) ?? null)
      .filter((exercise): exercise is (typeof EXERCISES)[number] => exercise !== null);
  },

  getSelectedGroupLabels(groupIds: string[]) {
    return MUSCLE_GROUPS
      .filter((group) => groupIds.includes(group.id))
      .map((group) => group.label);
  },

  getGroupedCatalog() {
    return GROUP_ORDER.map((group) => ({
      group,
      items: EXERCISES.filter((exercise) => exercise.group === group),
    }));
  },

  getCatalogByGroupId(groupId: string) {
    return EXERCISES.filter((exercise) => exercise.groupId === groupId);
  },

  getCatalogItemById(exerciseId: string | null) {
    if (!exerciseId) return null;
    return EXERCISES.find((exercise) => exercise.id === exerciseId) ?? null;
  },

  getSessionGroups(selectedGroups: string[], exercises: WorkoutExercise[]) {
    const values = [...selectedGroups, ...exercises.map((exercise) => exercise.group)];
    const unique = Array.from(new Set(values));

    return [
      ...GROUP_ORDER.filter((group) => unique.includes(group)),
      ...unique.filter((group) => !GROUP_ORDER.includes(group as (typeof GROUP_ORDER)[number])),
    ];
  },
};
