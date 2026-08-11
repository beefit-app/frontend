import "@testing-library/jest-dom/vitest";

const storageState = new Map<string, string>();

// Precisa implementar length e key(): sem eles qualquer varredura de chaves
// devolve vazio, e todo codigo que enumera o storage — recuperacao de rascunho de
// treino, limpeza no logout — passaria nos testes sem nunca ter rodado de fato.
Object.defineProperty(window, "localStorage", {
  writable: true,
  value: {
    getItem: (key: string) => storageState.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storageState.set(key, String(value));
    },
    removeItem: (key: string) => {
      storageState.delete(key);
    },
    clear: () => {
      storageState.clear();
    },
    key: (index: number) => [...storageState.keys()][index] ?? null,
    get length() {
      return storageState.size;
    },
  },
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
