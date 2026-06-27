import { useCallback, useEffect, useRef, useState } from "react";
import { inventoryService } from "../../../services/inventoryService";
import { DEFAULT_INVENTORY_FILTERS } from "../constants";
import type { InventoryCard, InventoryFilters } from "../types";

const PAGE_SIZE = 12;

function mergeCards(current: InventoryCard[], incoming: InventoryCard[]) {
  return Array.from(new Map([...current, ...incoming].map((card) => [card.id, card])).values());
}

export function useInventoryScreenState() {
  const [cards, setCards] = useState<InventoryCard[]>([]);
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_INVENTORY_FILTERS);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  return {
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
  };
}
