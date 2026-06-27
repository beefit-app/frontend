import { InventoryView } from "./components/InventoryView";
import { useInventoryScreenState } from "./hooks/useInventoryScreenState";

export function InventoryScreen() {
  const {
    cards,
    filters,
    totalElements,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    retry,
    updateFilters,
    resetFilters,
  } = useInventoryScreenState();

  return (
    <InventoryView
      cards={cards}
      filters={filters}
      totalElements={totalElements}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      hasMore={hasMore}
      error={error}
      onLoadMore={loadMore}
      onRetry={retry}
      onResetFilters={resetFilters}
      onRarityChange={(rarity) => updateFilters({ rarity })}
      onMuscleGroupChange={(muscleGroup) => updateFilters({ muscleGroup })}
    />
  );
}
