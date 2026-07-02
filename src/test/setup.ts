import "@testing-library/jest-dom/vitest";

const storageState = new Map<string, string>();

Object.defineProperty(window, "localStorage", {
  writable: true,
  value: {
    getItem: (key: string) => storageState.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storageState.set(key, value);
    },
    removeItem: (key: string) => {
      storageState.delete(key);
    },
    clear: () => {
      storageState.clear();
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
