import { beforeEach, describe, expect, it, vi } from "vitest";

// Duplos: nem o Capacitor nem o Preferences reais rodam no jsdom.
const isNativePlatform = vi.hoisted(() => vi.fn(() => false));
const nativeStore = vi.hoisted(() => new Map<string, string>());

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform } }));
vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: nativeStore.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => {
      nativeStore.set(key, value);
    },
    remove: async ({ key }: { key: string }) => {
      nativeStore.delete(key);
    },
    keys: async () => ({ keys: [...nativeStore.keys()] }),
  },
}));

const DRAFT_KEY = "beefit.workoutDraft.user-1.workout-1";

describe("appStorage", () => {
  beforeEach(() => {
    vi.resetModules();
    nativeStore.clear();
    window.localStorage.clear();
    isNativePlatform.mockReturnValue(false);
  });

  describe("no web", () => {
    it("le e escreve no localStorage", async () => {
      const { appStorage } = await import("./appStorage");

      await appStorage.setItem(DRAFT_KEY, { title: "Push" });

      expect(await appStorage.getItem(DRAFT_KEY)).toEqual({ title: "Push" });
      expect(nativeStore.size).toBe(0);
    });
  });

  describe("no nativo, migrando de uma instalacao anterior", () => {
    beforeEach(() => {
      isNativePlatform.mockReturnValue(true);
    });

    it("devolve o rascunho que so existe no localStorage e o transfere", async () => {
      // Estado de quem tinha o app antes da migracao para o Preferences.
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ title: "Push", pendingFinish: true }));
      const { appStorage } = await import("./appStorage");

      const draft = await appStorage.getItem(DRAFT_KEY);

      // Sem isto, atualizar o app faria sumir uma finalizacao pendente.
      expect(draft).toEqual({ title: "Push", pendingFinish: true });
      expect(nativeStore.get(DRAFT_KEY)).toBeDefined();
      expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
    });

    it("na segunda leitura ja nao depende do legado", async () => {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ title: "Push" }));
      const { appStorage } = await import("./appStorage");

      await appStorage.getItem(DRAFT_KEY);
      window.localStorage.clear();

      expect(await appStorage.getItem(DRAFT_KEY)).toEqual({ title: "Push" });
    });

    it("keys enxerga chave que so existe no legado", async () => {
      // E o caso decisivo: getCurrentDraft descobre o rascunho varrendo por
      // prefixo. Se keys ignorasse o legado, getItem nunca seria chamado para
      // essa chave e ela nunca migraria.
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ title: "Push" }));
      nativeStore.set("beefit.workoutDraft.user-1.workout-2", JSON.stringify({ title: "Pull" }));
      const { appStorage } = await import("./appStorage");

      const keys = await appStorage.keys("beefit.workoutDraft.user-1.");

      expect(keys).toHaveLength(2);
      expect(keys).toEqual(expect.arrayContaining([DRAFT_KEY, "beefit.workoutDraft.user-1.workout-2"]));
    });

    it("keys nao devolve chave de outro prefixo vinda do Preferences", async () => {
      nativeStore.set("beefit.workoutDraft.user-2.workout-1", JSON.stringify({ title: "Outro" }));
      nativeStore.set(DRAFT_KEY, JSON.stringify({ title: "Push" }));
      const { appStorage } = await import("./appStorage");

      expect(await appStorage.keys("beefit.workoutDraft.user-1.")).toEqual([DRAFT_KEY]);
    });

    it("remover apaga dos dois lados, para o dado nao ressuscitar", async () => {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ title: "Push" }));
      nativeStore.set(DRAFT_KEY, JSON.stringify({ title: "Push" }));
      const { appStorage } = await import("./appStorage");

      await appStorage.removeItem(DRAFT_KEY);

      expect(await appStorage.getItem(DRAFT_KEY)).toBeNull();
      expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
    });
  });
});
