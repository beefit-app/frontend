function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export const appStorage = {
  async getItem<T>(key: string) {
    if (!hasLocalStorage()) return null;

    const serializedValue = window.localStorage.getItem(key);
    if (!serializedValue) return null;

    try {
      return JSON.parse(serializedValue) as T;
    } catch {
      return null;
    }
  },

  async setItem<T>(key: string, value: T) {
    if (!hasLocalStorage()) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  },

  async removeItem(key: string) {
    if (!hasLocalStorage()) return;
    window.localStorage.removeItem(key);
  },
};
