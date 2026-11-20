import { afterEach, describe, expect, it, vi } from "vitest";
import { persistWorkoutPhoto, removePersistedWorkoutPhoto } from "./workoutPhoto";

function mockIndexedDb() {
  const request = {
    result: "web:foto",
    error: null as DOMException | null,
    readyState: "pending" as IDBRequestReadyState,
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };
  const transaction = {
    objectStore: () => ({ put: () => request, delete: () => request }),
    error: null as DOMException | null,
    oncomplete: null as (() => void) | null,
    onabort: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };
  const database = { transaction: () => transaction, close: vi.fn() };
  const opening = { result: database, onsuccess: null as (() => void) | null };
  vi.stubGlobal("indexedDB", { open: () => opening });

  return { opening, database, transaction, request };
}

describe("workoutPhoto no web", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["persistir", () => persistWorkoutPhoto(new File(["foto"], "treino.jpg")), /^web:.+:treino\.jpg$/],
    ["remover", () => removePersistedWorkoutPhoto("web:foto"), undefined],
  ] as const)("só termina de %s a foto após o commit da transação", async (_operation, start, expected) => {
    const { opening, database, transaction, request } = mockIndexedDb();
    const result = start();
    const settled = vi.fn();
    void result.then(settled, settled);

    opening.onsuccess?.();
    await Promise.resolve();
    request.readyState = "done";
    request.onsuccess?.();
    // Dá um turno às promessas sem disparar o evento de commit.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(settled).not.toHaveBeenCalled();

    transaction.oncomplete?.();
    if (expected) await expect(result).resolves.toMatch(expected);
    else await expect(result).resolves.toBeUndefined();
    expect(database.close).toHaveBeenCalledOnce();
  });

  it("rejeita e fecha a conexão se a transação abortar após o sucesso do put", async () => {
    const { opening, database, transaction, request } = mockIndexedDb();
    const result = persistWorkoutPhoto(new File(["foto"], "treino.jpg"));
    const error = new DOMException("Gravação abortada", "AbortError");

    opening.onsuccess?.();
    await Promise.resolve();
    request.readyState = "done";
    request.onsuccess?.();
    transaction.error = error;
    transaction.onabort?.();

    await expect(result).rejects.toBe(error);
    expect(database.close).toHaveBeenCalledOnce();
  });

  it("propaga o erro da requisição e fecha a conexão", async () => {
    const { opening, database, transaction, request } = mockIndexedDb();
    const result = persistWorkoutPhoto(new File(["foto"], "treino.jpg"));
    const error = new DOMException("Sem espaço", "QuotaExceededError");

    opening.onsuccess?.();
    await Promise.resolve();
    request.readyState = "done";
    request.error = error;
    // O evento de erro da requisição sobe para a transação.
    request.onerror?.();
    transaction.onerror?.();
    transaction.error = error;
    transaction.onabort?.();

    await expect(result).rejects.toBe(error);
    expect(database.close).toHaveBeenCalledOnce();
  });
});
