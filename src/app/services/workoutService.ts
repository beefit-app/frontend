import type { WorkoutExercise } from "../types/workout";
import { workoutDataSource } from "./workoutDataSource";

// Camada intermediária mínima para centralizar o ponto de troca entre mocks locais
// e a futura integração com a API de treino.
export const workoutService = {
  getCatalog() {
    return workoutDataSource.getExercises();
  },

  getGroupOrder() {
    return workoutDataSource.getGroupOrder();
  },

  getMuscleGroups() {
    return workoutDataSource.getMuscleGroups();
  },

  getTemplates() {
    return workoutDataSource.getTemplates();
  },

  getTemplateById(templateId: string | null) {
    if (!templateId) return null;
    return workoutDataSource.getTemplates().find((template) => template.id === templateId) ?? null;
  },

  getTemplateExercises(templateId: string | null) {
    const template = this.getTemplateById(templateId);

    if (!template) return [];

    const exercises = workoutDataSource.getExercises();

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
    const groupOrder = workoutDataSource.getGroupOrder();
    const exercises = workoutDataSource.getExercises();

    return groupOrder.map((group) => ({
      group,
      items: exercises.filter((exercise) => exercise.group === group),
    }));
  },

  getCatalogByGroupId(groupId: string) {
    return workoutDataSource.getExercises().filter((exercise) => exercise.groupId === groupId);
  },

  getCatalogItemById(exerciseId: string | null) {
    if (!exerciseId) return null;
    return workoutDataSource.getExercises().find((exercise) => exercise.id === exerciseId) ?? null;
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
};
