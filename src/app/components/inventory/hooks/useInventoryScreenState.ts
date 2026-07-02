import { useCallback, useEffect, useRef, useState } from "react";
import { inventoryService } from "../../../services/inventoryService";
import { workoutService } from "../../../services/workoutService";
import { subscribeSocialEvents } from "../../../services/socialEventsService";
import type { ExerciseCatalogItem, WorkoutTemplate } from "../../../types/workout";
import { DEFAULT_INVENTORY_FILTERS } from "../constants";
import type { InventoryCard, InventoryFilters } from "../types";

const PAGE_SIZE = 12;

function mergeCards(current: InventoryCard[], incoming: InventoryCard[]) {
  return Array.from(new Map([...current, ...incoming].map((card) => [card.id, card])).values());
}

export function useInventoryScreenState() {
  const [cards, setCards] = useState<InventoryCard[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(() => workoutService.getTemplates());
  const [catalog, setCatalog] = useState<ExerciseCatalogItem[]>(() => workoutService.getCatalog());
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_INVENTORY_FILTERS);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const loadPage = useCallback(
    async (targetPage: number, nextFilters: InventoryFilters, replace = false) => {
      if (loadingRef.current || (!replace && !hasMore)) return;

      loadingRef.current = true;
      if (replace) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const result = await inventoryService.loadPage({
          page: targetPage,
          size: PAGE_SIZE,
          filters: nextFilters,
        });

        setCards((current) => (replace ? result.cards : mergeCards(current, result.cards)));
        setPage(result.page);
        setTotalElements(result.totalElements);
        setHasMore(!result.last);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível carregar o inventário.");
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [hasMore],
  );

  useEffect(() => {
    void loadPage(0, filters, true);
  }, [filters, loadPage]);

  const loadTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    setTemplatesError(null);

    try {
      const [loadedCatalog, loadedTemplates] = await Promise.all([
        workoutService.loadCatalog(),
        workoutService.loadTemplates(),
      ]);
      setCatalog(loadedCatalog);
      setTemplates(loadedTemplates);
    } catch (cause) {
      setTemplatesError(cause instanceof Error ? cause.message : "Não foi possível carregar os templates.");
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    const controller = new AbortController();
    void subscribeSocialEvents(async (type, _data) => {
      if (type === "TEMPLATE_IMPORTED") {
        try {
          const loadedTemplates = await workoutService.loadTemplates();
          setTemplates(loadedTemplates);
        } catch (err) {
          console.error("Failed to auto-reload templates via SSE", err);
        }
      }
    }, controller.signal);
    return () => {
      controller.abort();
    };
  }, []);

  const updateFilters = useCallback((nextFilters: Partial<InventoryFilters>) => {
    setCards([]);
    setPage(0);
    setTotalElements(0);
    setHasMore(true);
    setFilters((current) => ({ ...current, ...nextFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setCards([]);
    setPage(0);
    setTotalElements(0);
    setHasMore(true);
    setFilters(DEFAULT_INVENTORY_FILTERS);
  }, []);

  const loadMore = useCallback(() => {
    void loadPage(page + 1, filters);
  }, [filters, loadPage, page]);

  const retry = useCallback(() => {
    void loadPage(cards.length === 0 ? 0 : page + 1, filters, cards.length === 0);
  }, [cards.length, filters, loadPage, page]);

  const retryTemplates = useCallback(() => {
    void loadTemplates();
  }, [loadTemplates]);

  function getTemplateGroupIds(exerciseIds: string[]) {
    return Array.from(
      new Set(
        exerciseIds
          .map((exerciseId) => catalog.find((exercise) => exercise.id === exerciseId)?.groupId)
          .filter((groupId): groupId is string => Boolean(groupId)),
      ),
    );
  }

  const createTemplate = useCallback(
    async (input: { name: string; exerciseIds: string[] }) => {
      setIsSavingTemplate(true);
      setTemplatesError(null);

      try {
        const template = await workoutService.createTemplate({
          name: input.name,
          groups: getTemplateGroupIds(input.exerciseIds),
          exerciseIds: input.exerciseIds,
        });
        setTemplates(workoutService.getTemplates());
        return template;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Não foi possível salvar o template.";
        setTemplatesError(message);
        throw new Error(message);
      } finally {
        setIsSavingTemplate(false);
      }
    },
    [catalog],
  );

  const updateTemplate = useCallback(
    async (templateId: string, input: { name: string; exerciseIds: string[] }) => {
      setIsSavingTemplate(true);
      setTemplatesError(null);

      try {
        const template = await workoutService.updateTemplate(templateId, {
          name: input.name,
          groups: getTemplateGroupIds(input.exerciseIds),
          exerciseIds: input.exerciseIds,
        });
        setTemplates(workoutService.getTemplates());
        return template;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Não foi possível atualizar o template.";
        setTemplatesError(message);
        throw new Error(message);
      } finally {
        setIsSavingTemplate(false);
      }
    },
    [catalog],
  );

  const deleteTemplate = useCallback(async (templateId: string) => {
    setIsSavingTemplate(true);
    setTemplatesError(null);

    try {
      await workoutService.deleteTemplate(templateId);
      setTemplates(workoutService.getTemplates());
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível excluir o template.";
      setTemplatesError(message);
      throw new Error(message);
    } finally {
      setIsSavingTemplate(false);
    }
  }, []);

  return {
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
  };
}
