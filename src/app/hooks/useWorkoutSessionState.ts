import { useEffect, useState } from "react";
import { resetActiveWorkoutMemory } from "../components/WorkoutStartScreen";

export interface ActiveWorkoutBannerState {
  workoutId?: string | null;
  selectedGroups: string[];
  startedAt: number;
}

export function useWorkoutSessionState() {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutBannerState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [workoutScreenInstance, setWorkoutScreenInstance] = useState(0);

  useEffect(() => {
    if (!activeWorkout) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - activeWorkout.startedAt) / 1000)));
    };

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);

    return () => window.clearInterval(timer);
  }, [activeWorkout]);

  function resetWorkoutFlow() {
    resetActiveWorkoutMemory();
    setActiveWorkout(null);
    setWorkoutScreenInstance((current) => current + 1);
  }

  function completeWorkout() {
    resetWorkoutFlow();
  }

  function formatElapsedTime(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return {
    activeWorkout,
    elapsedSeconds,
    workoutScreenInstance,
    setActiveWorkout,
    completeWorkout,
    formatElapsedTime,
  };
}
