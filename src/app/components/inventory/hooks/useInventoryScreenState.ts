import { useCallback, useEffect, useRef, useState } from "react";
import { inventoryService } from "../../../services/inventoryService";
import { workoutService } from "../../../services/workoutService";
import { subscribeSocialEvents } from "../../../services/socialEventsService";
import { pageCacheStorage } from "../../../storage/pageCacheStorage";
import { useAuth } from "../../../auth/AuthContext";
import type { ExerciseCatalogItem, WorkoutTemplate } from "../../../types/workout";
import { DEFAULT_INVENTORY_FILTERS } from "../constants";
import type { InventoryCard, InventoryFilters } from "../types";

const PAGE_SIZE = 12;
const INVENTORY_TTL_MS = 2 * 60 * 1000;
const WORKOUT_DATA_TTL_MS = 15 * 60 * 1000;

function mergeCards(current: InventoryCard[], incoming: InventoryCard[]) {
  return Array.from(new Map([...current, ...incoming].map((card) => [card.id, card])).values());
}

export function useInventoryScreenState() {
  const { user } = useAuth();
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
  const hasMoreRef = useRef(true);
  const requestGenerationRef = useRef(0);

  const loadPage = useCallback(
    async (targetPage: number, nextFilters: InventoryFilters, replace = false, hydrateCache = false) => {
      if ((loadingRef.current && !replace) || (!replace && !hasMoreRef.current)) return;

      const requestGeneration = replace ? requestGenerationRef.current + 1 : requestGenerationRef.current;
      if (replace) requestGenerationRef.current = requestGeneration;
      loadingRef.current = true;
      if (replace) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      const cacheKey = `inventory.${targetPage}.${nextFilters.rarity ?? "all"}.${nextFilters.muscleGroup ?? "all"}`;
      if (hydrateCache) {
        const cached = await pageCacheStorage.get<Awaited<ReturnType<typeof inventoryService.loadPage>>>(user?.id, cacheKey, INVENTORY_TTL_MS);
        if (requestGeneration !== requestGenerationRef.current) return;
        if (cached) {
          setCards((current) => (replace ? cached.cards : mergeCards(current, cached.cards)));
          setPage(cached.page);
          setTotalElements(cached.totalElements);
          setHasMore(!cached.last);
          hasMoreRef.current = !cached.last;
          setIsLoading(false);
          loadingRef.current = false;
          return;
        }
      }

      try {
        const result = await inventoryService.loadPage({
          page: targetPage,
          size: PAGE_SIZE,
          filters: nextFilters,
        });
        if (requestGeneration !== requestGenerationRef.current) return;

        setCards((current) => (replace ? result.cards : mergeCards(current, result.cards)));
        setPage(result.page);
        setTotalElements(result.totalElements);
        setHasMore(!result.last);
        hasMoreRef.current = !result.last;
        void pageCacheStorage.set(user?.id, cacheKey, result);
      } catch (cause) {
        if (requestGeneration === requestGenerationRef.current) {
          setError(cause instanceof Error ? cause.message : "Não foi possível carregar o inventário.");
        }
      } finally {
        if (requestGeneration === requestGenerationRef.current) {
          loadingRef.current = false;
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [user?.id],
  );

  useEffect(() => {
    void loadPage(0, filters, true, true);
  }, [filters, loadPage]);

  const loadTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    setTemplatesError(null);

    try {
      const [cachedCatalog, cachedTemplates] = await Promise.all([
        pageCacheStorage.get<ExerciseCatalogItem[]>(user?.id, "workout.catalog", WORKOUT_DATA_TTL_MS),
        pageCacheStorage.get<WorkoutTemplate[]>(user?.id, "workout.templates", WORKOUT_DATA_TTL_MS),
      ]);
      if (cachedCatalog) {
        workoutService.hydrateCatalog(cachedCatalog);
        setCatalog(cachedCatalog);
      }
      if (cachedTemplates) {
        workoutService.hydrateTemplates(cachedTemplates);
        setTemplates(cachedTemplates);
      }
      const [loadedCatalog, loadedTemplates] = await Promise.all([
        cachedCatalog ? Promise.resolve(cachedCatalog) : workoutService.loadCatalog({ force: true }),
        cachedTemplates ? Promise.resolve(cachedTemplates) : workoutService.loadTemplates(),
      ]);
      if (!cachedCatalog) {
        setCatalog(loadedCatalog);
        void pageCacheStorage.set(user?.id, "workout.catalog", loadedCatalog);
      }
      if (!cachedTemplates) {
        setTemplates(loadedTemplates);
        void pageCacheStorage.set(user?.id, "workout.templates", loadedTemplates);
      }
    } catch (cause) {
      setTemplatesError(cause instanceof Error ? cause.message : "Não foi possível carregar os templates.");
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    const controller = new AbortController();
    void subscribeSocialEvents(async (event) => {
      if (event.type === "TEMPLATE_IMPORTED") {
        try {
          const loadedTemplates = await workoutService.loadTemplates();
          setTemplates(loadedTemplates);
          void pageCacheStorage.set(user?.id, "workout.templates", loadedTemplates);
        } catch {
          // A próxima abertura da tela recarrega os templates pela API.
        }
      }
      if (event.type === "CARD_GENERATED") {
        void pageCacheStorage.remove(user?.id, `inventory.0.${filters.rarity ?? "all"}.${filters.muscleGroup ?? "all"}`);
        void loadPage(0, filters, true);
      }
    }, controller.signal);
    return () => {
      controller.abort();
    };
  }, [filters, loadPage, user?.id]);

  const updateFilters = useCallback((nextFilters: Partial<InventoryFilters>) => {
    setCards([]);
    setPage(0);
    setTotalElements(0);
    hasMoreRef.current = true;
    setHasMore(true);
    setFilters((current) => ({ ...current, ...nextFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setCards([]);
    setPage(0);
    setTotalElements(0);
    hasMoreRef.current = true;
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
        void pageCacheStorage.set(user?.id, "workout.templates", workoutService.getTemplates());
        return template;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Não foi possível salvar o template.";
        setTemplatesError(message);
        throw new Error(message, { cause });
      } finally {
        setIsSavingTemplate(false);
      }
    },
    [catalog, user?.id],
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
        void pageCacheStorage.set(user?.id, "workout.templates", workoutService.getTemplates());
        return template;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Não foi possível atualizar o template.";
        setTemplatesError(message);
        throw new Error(message, { cause });
      } finally {
        setIsSavingTemplate(false);
      }
    },
    [catalog, user?.id],
  );

  const deleteTemplate = useCallback(async (templateId: string) => {
    setIsSavingTemplate(true);
    setTemplatesError(null);

    try {
      await workoutService.deleteTemplate(templateId);
      setTemplates(workoutService.getTemplates());
      void pageCacheStorage.set(user?.id, "workout.templates", workoutService.getTemplates());
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível excluir o template.";
      setTemplatesError(message);
      throw new Error(message, { cause });
    } finally {
      setIsSavingTemplate(false);
    }
  }, [user?.id]);

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
