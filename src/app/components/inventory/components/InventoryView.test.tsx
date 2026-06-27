import { render, screen } from "@testing-library/react";
import { InventoryView } from "./InventoryView";

const baseProps = {
  cards: [],
  filters: { rarity: null, muscleGroup: null },
  totalElements: 0,
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  error: null,
  onLoadMore: vi.fn(),
  onRetry: vi.fn(),
  onResetFilters: vi.fn(),
  onRarityChange: vi.fn(),
  onMuscleGroupChange: vi.fn(),
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

    expect(screen.getByText("Inventário")).toBeInTheDocument();
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
            isPersonalRecord: true,
            bodyWeightAtGeneration: 80,
            generatedAt: "2026-06-27T15:00:00Z",
          },
        ]}
        totalElements={1}
      />,
    );

    expect(screen.getByText("Carta de Costas")).toBeInTheDocument();
    expect(screen.getByText("Poder de ataque")).toBeInTheDocument();
    expect(screen.getByText("PR")).toBeInTheDocument();
  });
});
