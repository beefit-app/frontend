import { ActiveWorkoutView } from "./components/ActiveWorkoutView";
import { FinishWorkoutView } from "./components/FinishWorkoutView";
import { WorkoutCatalogDetailView } from "./components/WorkoutCatalogDetailView";
import { WorkoutCatalogView } from "./components/WorkoutCatalogView";
import { useActiveWorkoutSession } from "./hooks/useActiveWorkoutSession";
import type { ActiveWorkoutScreenProps } from "./types";

export type { ActiveWorkoutScreenProps } from "./types";

export function ActiveWorkoutScreen(props: ActiveWorkoutScreenProps) {
  const session = useActiveWorkoutSession(props);

  if (session.isFinishingWorkout) {
    return (
      <FinishWorkoutView
        finishPhotoInputRef={session.finishPhotoInputRef}
        finishPhotoUrl={session.finishPhotoUrl}
        finishTitle={session.finishTitle}
        finishTitleError={session.finishTitleError}
        totalVolumeKg={session.totalVolumeKg}
        estimatedCalories={session.estimatedCalories}
        shouldPostWorkout={session.shouldPostWorkout}
        ghostModeEnabled={props.ghostModeEnabled ?? false}
        onBack={() => {
          session.setFinishValidationError("");
          session.setIsFinishingWorkout(false);
        }}
        onPhotoChange={(file) => {
          session.setFinishPhotoFile(file);
          session.setFinishPhotoUrl(file ? URL.createObjectURL(file) : null);
        }}
        onTitleChange={(value) => {
          session.setFinishTitle(value);
          session.setFinishTitleError("");
        }}
        onTogglePost={() => session.setShouldPostWorkout((current) => !current)}
        onFinish={session.handleFinishWorkout}
      />
    );
  }

  if (session.isCatalogOpen && session.activeCatalogExercise) {
    return (
      <WorkoutCatalogDetailView
        exercise={session.activeCatalogExercise}
        detailViewSource={session.detailViewSource}
        alreadyAdded={session.selectedCatalogIds.has(session.activeCatalogExercise.id)}
        onBack={() => {
          session.setCatalogDetailExerciseId(null);
          if (session.detailViewSource === "session") {
            session.setIsCatalogOpen(false);
          }
        }}
        onAddExercise={() => session.addExercise(session.activeCatalogExercise!)}
      />
    );
  }

  if (session.isCatalogOpen) {
    return (
      <WorkoutCatalogView
        groupedExercises={session.groupedExercises}
        activeCatalogGroupId={session.activeCatalogGroupId}
        visibleCatalogItems={session.visibleCatalogItems}
        selectedCatalogIds={session.selectedCatalogIds}
        onBack={() => session.setIsCatalogOpen(false)}
        onSelectGroup={session.setActiveCatalogGroupId}
        onOpenExercise={(exerciseId) => {
          session.setDetailViewSource("catalog");
          session.setCatalogDetailExerciseId(exerciseId);
        }}
      />
    );
  }

  return (
    <ActiveWorkoutView
      sessionGroups={session.sessionGroups}
      elapsedSeconds={session.elapsedSeconds}
      exercises={session.exercises}
      finishValidationError={session.finishValidationError}
      exerciseSlideRefs={session.exerciseSlideRefs}
      seriesContainerRefs={session.seriesContainerRefs}
      isWorkoutMenuOpen={session.isWorkoutMenuOpen}
      onToggleWorkoutMenu={() => session.setIsWorkoutMenuOpen((current) => !current)}
      onCancelWorkout={() => void props.onCancelWorkout?.()}
      onSaveTemplate={() => void props.onSaveTemplate?.(session.sessionGroups, session.exercises)}
      onOpenExerciseInfo={(catalogId) => {
        session.setDetailViewSource("session");
        session.setCatalogDetailExerciseId(catalogId);
        session.setIsCatalogOpen(true);
      }}
      onUpdateSet={session.updateSet}
      onAddSet={session.addSet}
      onOpenCatalog={() => session.setIsCatalogOpen(true)}
      onOpenFinish={session.openFinishWorkout}
    />
  );
}
