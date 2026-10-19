import type { WorkoutCompletionDraft, WorkoutCompletionSummary } from "../../types/workout";

export interface WorkoutShareTarget {
  draft: WorkoutCompletionDraft;
  summary: WorkoutCompletionSummary;
}
