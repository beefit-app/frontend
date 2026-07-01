import { InventoryView } from "./components/InventoryView";
import { useInventoryScreenState } from "./hooks/useInventoryScreenState";

export function InventoryScreen() {
  const {
    cards,
    templates,
    catalog,
    filters,
    totalElements,
    isLoading,
    isLoadingMore,
    isLoadingTemplates,
    isSavingTemplate,
    hasMore,
    error,
    templatesError,
    loadMore,
    retry,
    retryTemplates,
    updateFilters,
    resetFilters,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = useInventoryScreenState();

  return (
    <InventoryView
      cards={cards}
      templates={templates}
      catalog={catalog}
      filters={filters}
      totalElements={totalElements}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      isLoadingTemplates={isLoadingTemplates}
      isSavingTemplate={isSavingTemplate}
      hasMore={hasMore}
      error={error}
      templatesError={templatesError}
      onLoadMore={loadMore}
      onRetry={retry}
      onRetryTemplates={retryTemplates}
      onResetFilters={resetFilters}
      onRarityChange={(rarity) => updateFilters({ rarity })}
      onMuscleGroupChange={(muscleGroup) => updateFilters({ muscleGroup })}
      onCreateTemplate={createTemplate}
      onUpdateTemplate={updateTemplate}
      onDeleteTemplate={deleteTemplate}
    />
  );
}
