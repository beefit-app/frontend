import { describe, expect, it } from "vitest";
import { appendSetCopyingLast, createSet } from "./utils";
import type { WorkoutExercise } from "../../types/workout";

function exercise(id: string, sets: WorkoutExercise["sets"]): WorkoutExercise {
  return {
    id,
    catalogId: `catalog-${id}`,
    name: id,
    group: "Peito",
    groupId: "peito",
    anatomicalMuscles: [],
    primaryAnatomicalMuscles: [],
    secondaryAnatomicalMuscles: [],
    sets,
  };
}

describe("createSet", () => {
  it("sem série anterior vem vazia", () => {
    expect(createSet()).toMatchObject({ backendId: null, weight: "", reps: "" });
  });

  it("copia peso e repetições da série anterior", () => {
    expect(createSet({ weight: "80", reps: "10" })).toMatchObject({ weight: "80", reps: "10" });
  });

  it("copia só o que a série anterior tiver", () => {
    expect(createSet({ weight: "80", reps: "" })).toMatchObject({ weight: "80", reps: "" });
  });

  it("nunca copia o id nem o id do backend", () => {
    const previous = { id: "set-1", backendId: "backend-1", weight: "80", reps: "10" };
    const next = createSet(previous);
    expect(next.id).not.toBe("set-1");
    expect(next.backendId).toBeNull();
  });
});

describe("appendSetCopyingLast", () => {
  it("adiciona ao exercício certo copiando a última série dele", () => {
    const exercises = [
      exercise("supino", [
        { id: "s1", weight: "70", reps: "12" },
        { id: "s2", weight: "80", reps: "10" },
      ]),
      exercise("crucifixo", [{ id: "c1", weight: "20", reps: "15" }]),
    ];

    const result = appendSetCopyingLast(exercises, "supino", "s3");

    expect(result[0].sets).toHaveLength(3);
    expect(result[0].sets[2]).toMatchObject({ id: "s3", backendId: null, weight: "80", reps: "10" });
    expect(result[1]).toBe(exercises[1]);
  });

  it("série anterior vazia gera série nova vazia", () => {
    const result = appendSetCopyingLast([exercise("supino", [{ id: "s1", weight: "", reps: "" }])], "supino", "s2");
    expect(result[0].sets[1]).toMatchObject({ weight: "", reps: "" });
  });

  it("exercício sem séries ganha uma série vazia", () => {
    const result = appendSetCopyingLast([exercise("supino", [])], "supino", "s1");
    expect(result[0].sets).toEqual([{ id: "s1", backendId: null, weight: "", reps: "" }]);
  });

  it("não altera a série original", () => {
    const original = { id: "s1", weight: "80", reps: "10" };
    const result = appendSetCopyingLast([exercise("supino", [original])], "supino", "s2");
    result[0].sets[1].weight = "90";
    expect(original.weight).toBe("80");
  });
});
