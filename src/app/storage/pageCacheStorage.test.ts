import { beforeEach, describe, expect, it, vi } from "vitest";

const getItem = vi.hoisted(() => vi.fn());
const setItem = vi.hoisted(() => vi.fn());
const removeItem = vi.hoisted(() => vi.fn());
const keys = vi.hoisted(() => vi.fn());

vi.mock("./appStorage", () => ({ appStorage: { getItem, setItem, removeItem, keys } }));

import { pageCacheStorage } from "./pageCacheStorage";

describe("pageCacheStorage", () => {
  beforeEach(() => {
    getItem.mockReset();
    setItem.mockReset();
    removeItem.mockReset();
    keys.mockReset();
  });

  it("devolve apenas a entrada valida do usuario solicitado", async () => {
    getItem.mockResolvedValue({ version: 1, savedAt: Date.now(), value: { cards: ["c-1"] } });

    await expect(pageCacheStorage.get("user a", "inventory.default", 60_000)).resolves.toEqual({ cards: ["c-1"] });
    expect(getItem).toHaveBeenCalledWith("beefit.page-cache.user%20a.inventory.default");
  });

  it("descarta entradas vencidas sem devolve-las", async () => {
    getItem.mockResolvedValue({ version: 1, savedAt: Date.now() - 60_001, value: { id: "old" } });

    await expect(pageCacheStorage.get("user-1", "profile", 60_000)).resolves.toBeNull();
    expect(removeItem).toHaveBeenCalledWith("beefit.page-cache.user-1.profile");
  });

  it("descarta entradas de outra versao", async () => {
    getItem.mockResolvedValue({ version: 0, savedAt: Date.now(), value: { id: "legacy" } });

    await expect(pageCacheStorage.get("user-1", "profile", 60_000)).resolves.toBeNull();
    expect(removeItem).toHaveBeenCalledWith("beefit.page-cache.user-1.profile");
  });

  it("remove todas as chaves de cache somente do usuario que encerrou a sessao", async () => {
    keys.mockResolvedValue([
      "beefit.page-cache.user-1.profile",
      "beefit.page-cache.user-1.feed.page-0",
    ]);

    await pageCacheStorage.clearUser("user-1");

    expect(keys).toHaveBeenCalledWith("beefit.page-cache.user-1.");
    expect(removeItem).toHaveBeenCalledTimes(2);
  });
});
