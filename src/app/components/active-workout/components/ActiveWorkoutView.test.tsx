import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActiveWorkoutView } from "./ActiveWorkoutView";
import type { WorkoutExercise } from "../../../types/workout";

vi.mock("../../../services/workoutService", () => ({
  workoutService: {
    getExerciseHistory: vi.fn().mockResolvedValue({
      lastPerformedAt: "2026-08-20T10:00:00.000Z",
      bestWeightKg: 100,
      bestReps: 8,
      lastWeightKg: 95,
      lastReps: 10,
    }),
    getCatalogItemById: vi.fn().mockReturnValue({
      id: "catalog-supino",
      name: "Supino Reto",
      group: "Peito",
      groupId: "peito",
      notes: "Controle a descida",
      primaryAnatomicalMuscles: ["CHEST"],
      secondaryAnatomicalMuscles: ["TRICEPS", "DELTOIDS"],
      anatomicalMuscles: ["CHEST", "TRICEPS", "DELTOIDS"],
    }),
  },
}));

const mockExercise: WorkoutExercise = {
  id: "exercise-1",
  catalogId: "catalog-supino",
  name: "Supino Reto",
  group: "Peito",
  groupId: "peito",
  anatomicalMuscles: ["CHEST", "TRICEPS", "DELTOIDS"],
  primaryAnatomicalMuscles: ["CHEST"],
  secondaryAnatomicalMuscles: ["TRICEPS", "DELTOIDS"],
  sets: [{ id: "set-1", weight: "80", reps: "10" }],
};

describe("ActiveWorkoutView", () => {
  it("exibe o mapa muscular no topo e o histórico recente embaixo ao clicar no card do exercício", async () => {
    const exerciseSlideRefs = { current: {} };
    const seriesContainerRefs = { current: {} };

    render(
      <ActiveWorkoutView
        sessionGroups={["Peito"]}
        elapsedSeconds={120}
        exercises={[mockExercise]}
        finishValidationError=""
        exerciseSlideRefs={exerciseSlideRefs}
        seriesContainerRefs={seriesContainerRefs}
        isWorkoutMenuOpen={false}
        activeExerciseMenuId={null}
        onToggleWorkoutMenu={vi.fn()}
        onCancelWorkout={vi.fn()}
        onSaveTemplate={vi.fn()}
        onToggleExerciseMenu={vi.fn()}
        onRemoveExercise={vi.fn()}
        onUpdateSet={vi.fn()}
        onAddSet={vi.fn()}
        onOpenCatalog={vi.fn()}
        onOpenFinish={vi.fn()}
      />
    );

    // Initial state: shows sets and prompt to view map and history
    expect(screen.getByText("Toque para ver mapa e histórico")).toBeInTheDocument();
    expect(screen.getByText("Adicionar Série")).toBeInTheDocument();

    // Click on exercise header/card to flip
    fireEvent.click(screen.getByLabelText("Ver mapa muscular e histórico de Supino Reto"));

    // Verify Muscle Map is shown
    expect(screen.getByLabelText("Mapa muscular do exercício")).toBeInTheDocument();

    // Verify History is shown (at the bottom) with all 3 fields
    expect(screen.getByText("Histórico recente")).toBeInTheDocument();
    expect(screen.getByText("Última vez")).toBeInTheDocument();
    expect(screen.getByText("Melhor desempenho")).toBeInTheDocument();
    expect(screen.getByText("Último desempenho")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("100 kg × 8")).toBeInTheDocument();
      expect(screen.getByText("95 kg × 10")).toBeInTheDocument();
      expect(screen.getByText(/20 de ago/i)).toBeInTheDocument();
    });

    // Click "Voltar às séries" to return
    fireEvent.click(screen.getByLabelText("Voltar às séries de Supino Reto"));

    // Verify returned to sets view
    expect(screen.getByText("Adicionar Série")).toBeInTheDocument();
  });

  it("vira o card ao clicar em parte não interagível e desvira ao clicar no verso", async () => {
    const exerciseSlideRefs = { current: {} };
    const seriesContainerRefs = { current: {} };

    render(
      <ActiveWorkoutView
        sessionGroups={["Peito"]}
        elapsedSeconds={120}
        exercises={[mockExercise]}
        finishValidationError=""
        exerciseSlideRefs={exerciseSlideRefs}
        seriesContainerRefs={seriesContainerRefs}
        isWorkoutMenuOpen={false}
        activeExerciseMenuId={null}
        onToggleWorkoutMenu={vi.fn()}
        onCancelWorkout={vi.fn()}
        onSaveTemplate={vi.fn()}
        onToggleExerciseMenu={vi.fn()}
        onRemoveExercise={vi.fn()}
        onUpdateSet={vi.fn()}
        onAddSet={vi.fn()}
        onOpenCatalog={vi.fn()}
        onOpenFinish={vi.fn()}
      />
    );

    const muscleMap = screen.getByLabelText("Mapa muscular do exercício");
    expect(muscleMap).not.toBeVisible();

    // Click on subtitle text to flip to back
    fireEvent.click(screen.getByText("Toque para ver mapa e histórico"));
    expect(muscleMap).toBeVisible();

    // Click on recent history title on the back to flip back to front
    fireEvent.click(screen.getByText("Histórico recente"));
    expect(muscleMap).not.toBeVisible();
  });

  it("não vira o card ao clicar em elementos interativos (botão de 3 pontos, adicionar série, remover série)", () => {
    const exerciseSlideRefs = { current: {} };
    const seriesContainerRefs = { current: {} };
    const onToggleExerciseMenu = vi.fn();
    const onAddSet = vi.fn();

    render(
      <ActiveWorkoutView
        sessionGroups={["Peito"]}
        elapsedSeconds={120}
        exercises={[mockExercise]}
        finishValidationError=""
        exerciseSlideRefs={exerciseSlideRefs}
        seriesContainerRefs={seriesContainerRefs}
        isWorkoutMenuOpen={false}
        activeExerciseMenuId={null}
        onToggleWorkoutMenu={vi.fn()}
        onCancelWorkout={vi.fn()}
        onSaveTemplate={vi.fn()}
        onToggleExerciseMenu={onToggleExerciseMenu}
        onRemoveExercise={vi.fn()}
        onUpdateSet={vi.fn()}
        onAddSet={onAddSet}
        onOpenCatalog={vi.fn()}
        onOpenFinish={vi.fn()}
      />
    );

    const muscleMap = screen.getByLabelText("Mapa muscular do exercício");
    expect(muscleMap).not.toBeVisible();

    // Click 3 dots button
    const exerciseMenuBtn = screen.getByLabelText(`Abrir ações de ${mockExercise.name}`);
    expect(exerciseMenuBtn).toHaveClass("rounded-[14px]");
    expect(exerciseMenuBtn).toHaveClass("border-[#404040]");
    expect(exerciseMenuBtn).toHaveClass("bg-[#1A1A1A]");
    expect(exerciseMenuBtn).toHaveClass("text-white");

    fireEvent.click(exerciseMenuBtn);
    expect(onToggleExerciseMenu).toHaveBeenCalledWith("exercise-1");
    // Should NOT have flipped to back
    expect(muscleMap).not.toBeVisible();

    // Click Adicionar Série
    fireEvent.click(screen.getByText("Adicionar Série"));
    expect(onAddSet).toHaveBeenCalledWith("exercise-1");
    expect(muscleMap).not.toBeVisible();
  });

  it("configura o scroll container com CSS scroll-snapping mandatory", () => {
    const exerciseSlideRefs = { current: {} };
    const seriesContainerRefs = { current: {} };

    const { container } = render(
      <ActiveWorkoutView
        sessionGroups={["Peito"]}
        elapsedSeconds={120}
        exercises={[mockExercise]}
        finishValidationError=""
        exerciseSlideRefs={exerciseSlideRefs}
        seriesContainerRefs={seriesContainerRefs}
        isWorkoutMenuOpen={false}
        activeExerciseMenuId={null}
        onToggleWorkoutMenu={vi.fn()}
        onCancelWorkout={vi.fn()}
        onSaveTemplate={vi.fn()}
        onToggleExerciseMenu={vi.fn()}
        onRemoveExercise={vi.fn()}
        onUpdateSet={vi.fn()}
        onAddSet={vi.fn()}
        onOpenCatalog={vi.fn()}
        onOpenFinish={vi.fn()}
      />
    );

    const scrollContainer = container.querySelector("[style*='overflow-x: auto']");
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer?.getAttribute("style")).toContain("scroll-snap-type: x mandatory");
  });

  it("renderiza o timer no topo com o botão de 3 pontos integrado e as tags de grupo muscular abaixo", () => {
    const exerciseSlideRefs = { current: {} };
    const seriesContainerRefs = { current: {} };
    const onToggleWorkoutMenu = vi.fn();

    render(
      <ActiveWorkoutView
        sessionGroups={["Peito", "Braços"]}
        elapsedSeconds={300}
        exercises={[mockExercise]}
        finishValidationError=""
        exerciseSlideRefs={exerciseSlideRefs}
        seriesContainerRefs={seriesContainerRefs}
        isWorkoutMenuOpen={false}
        activeExerciseMenuId={null}
        onToggleWorkoutMenu={onToggleWorkoutMenu}
        onCancelWorkout={vi.fn()}
        onSaveTemplate={vi.fn()}
        onToggleExerciseMenu={vi.fn()}
        onRemoveExercise={vi.fn()}
        onUpdateSet={vi.fn()}
        onAddSet={vi.fn()}
        onOpenCatalog={vi.fn()}
        onOpenFinish={vi.fn()}
      />
    );

    // Timer display
    expect(screen.getByText("Tempo decorrido")).toBeInTheDocument();
    expect(screen.getByText("05:00")).toBeInTheDocument();

    // 3-dots action button inside timer container
    const menuButton = screen.getByLabelText("Abrir ações do treino");
    expect(menuButton).toBeInTheDocument();
    fireEvent.click(menuButton);
    expect(onToggleWorkoutMenu).toHaveBeenCalled();

    // Muscle tags below timer
    expect(screen.getAllByText("Peito").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Braços")).toBeInTheDocument();
  });
});
