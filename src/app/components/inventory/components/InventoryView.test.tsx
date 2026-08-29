import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InventoryView } from "./InventoryView";

const baseProps = {
  cards: [],
  templates: [],
  catalog: [],
  filters: { rarity: null, muscleGroup: null },
  totalElements: 0,
  isLoading: false,
  isLoadingMore: false,
  isLoadingTemplates: false,
  isSavingTemplate: false,
  hasMore: false,
  error: null,
  templatesError: null,
  onLoadMore: vi.fn(),
  onRetry: vi.fn(),
  onRetryTemplates: vi.fn(),
  onResetFilters: vi.fn(),
  onRarityChange: vi.fn(),
  onMuscleGroupChange: vi.fn(),
  onCreateTemplate: vi.fn(),
  onUpdateTemplate: vi.fn(),
  onDeleteTemplate: vi.fn(),
};

describe("InventoryView", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn(() => ({
        observe: vi.fn(),
        disconnect: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderiza o loading inicial sem quebrar", () => {
    render(<InventoryView {...baseProps} isLoading />);

    // Por papel e nao por texto exato: o titulo carrega um ponto final, e a
    // assercao anterior so passava porque ele vivia num span separado.
    expect(screen.getByRole("heading", { name: /Inventário/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /cartas/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /templates/i })).toBeInTheDocument();
    expect(screen.getByText("Filtrar")).toBeInTheDocument();
  });

  it("mostra estado vazio por filtro quando não há resultados", () => {
    render(
      <InventoryView
        {...baseProps}
        filters={{ rarity: "LEGENDARY", muscleGroup: null }}
      />,
    );

    expect(screen.getByText("Nenhuma carta encontrada")).toBeInTheDocument();
    expect(screen.getByText("Limpar filtros")).toBeInTheDocument();
  });

  it("renderiza uma carta do inventário com dados normalizados", () => {
    render(
      <InventoryView
        {...baseProps}
        cards={[
          {
            id: "card-1",
            workoutSessionId: "session-1",
            attackPower: 150,
            rarity: "LEGENDARY",
            rarityLabel: "Lendário",
            muscleGroup: "BACK",
            exerciseName: "Remada Curvada",
            bestSetWeightKg: 80,
            bestSetReps: 10,
            improvementPercentage: 5.5,
            muscleIntensities: { "upper-back": 4, biceps: 2 },
            isPersonalRecord: true,
            bodyWeightAtGeneration: 80,
            generatedAt: "2026-06-27T15:00:00Z",
          },
        ]}
        totalElements={1}
      />,
    );

    expect(screen.getByText("Remada Curvada")).toBeInTheDocument();
    expect(screen.getByText("80 kg × 10")).toBeInTheDocument();
    expect(screen.getByText("PR")).toBeInTheDocument();
    expect(screen.getByLabelText("Mapa muscular do exercício")).toBeInTheDocument();
  });

  it("mostra templates salvos na aba de templates", async () => {
    render(
      <InventoryView
        {...baseProps}
        templates={[
          {
            id: "template-1",
            name: "Upper pesado",
            groups: ["Peito", "Costas"],
            duration: "",
            exercises: 2,
            exerciseIds: ["exercise-1", "exercise-2"],
          },
        ]}
        catalog={[
          {
            id: "exercise-1",
            name: "Supino reto",
            group: "Peito",
            groupId: "peito",
            notes: "",
            lastPerformed: "",
            bestWeight: "",
            lastWeight: "",
          },
          {
            id: "exercise-2",
            name: "Remada curvada",
            group: "Costas",
            groupId: "costas",
            notes: "",
            lastPerformed: "",
            bestWeight: "",
            lastWeight: "",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /templates/i }));

    await waitFor(() => expect(screen.getByText("Upper pesado")).toBeInTheDocument());
    expect(screen.getByText("Supino reto")).toBeInTheDocument();
    expect(screen.getByLabelText("Criar novo template")).toBeInTheDocument();
  });

  it("filtra exercícios por grupo muscular ao montar template", async () => {
    render(
      <InventoryView
        {...baseProps}
        catalog={[
          {
            id: "exercise-1",
            name: "Supino reto",
            group: "Peito",
            groupId: "peito",
            notes: "",
            lastPerformed: "",
            bestWeight: "",
            lastWeight: "",
          },
          {
            id: "exercise-2",
            name: "Remada curvada",
            group: "Costas",
            groupId: "costas",
            notes: "",
            lastPerformed: "",
            bestWeight: "",
            lastWeight: "",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /templates/i }));
    await waitFor(() => expect(screen.getByLabelText("Criar novo template")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Criar novo template"));

    expect(screen.getByText("Supino reto")).toBeInTheDocument();
    expect(screen.getByText("Remada curvada")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Costas" }));

    expect(screen.getByText("Remada curvada")).toBeInTheDocument();
    expect(screen.queryByText("Supino reto")).not.toBeInTheDocument();
  });
});
