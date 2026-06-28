import { GROUP_ORDER, MUSCLE_GROUPS } from "../mocks/workoutData";

export const workoutDataSource = {
  getGroupOrder() {
    return GROUP_ORDER;
  },

  getMuscleGroups() {
    return MUSCLE_GROUPS;
  },
};
