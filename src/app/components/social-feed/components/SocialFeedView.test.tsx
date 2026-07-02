import { render, screen } from "@testing-library/react";
import { SocialFeedView } from "./SocialFeedView";

describe("SocialFeedView", () => {
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

  it("renderiza o estado de carregamento sem quebrar", () => {
    render(
      <SocialFeedView
        posts={[]}
        liveFriends={[]}
        streakCount={0}
        isStreakFedToday={false}
        streakBurstToken={0}
        onToggleLike={vi.fn()}
        onSaveTemplate={vi.fn()}
        isLoading
        isLoadingMore={false}
        hasMore={false}
        error={null}
        onLoadMore={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText("Carregando os treinos da colmeia...")).toBeInTheDocument();
  });

  it("não ativa carregamento infinito enquanto há erro", () => {
    const onLoadMore = vi.fn();

    render(
      <SocialFeedView
        posts={[]}
        liveFriends={[]}
        streakCount={0}
        isStreakFedToday={false}
        streakBurstToken={0}
        onToggleLike={vi.fn()}
        onSaveTemplate={vi.fn()}
        isLoading={false}
        isLoadingMore={false}
        hasMore
        error="Credenciais inválidas."
        onLoadMore={onLoadMore}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText("Credenciais inválidas.")).toBeInTheDocument();
    expect(IntersectionObserver).not.toHaveBeenCalled();
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
