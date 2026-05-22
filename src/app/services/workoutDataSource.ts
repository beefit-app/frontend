import { EXERCISES, GROUP_ORDER, MUSCLE_GROUPS, WORKOUT_TEMPLATES } from "../mocks/workoutData";

export const workoutDataSource = {
  getExercises() {
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
};
