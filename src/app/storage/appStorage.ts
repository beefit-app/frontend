import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isNative() {
  return Capacitor.isNativePlatform();
}

// Mesmo padrao de storage/sessionStorage.ts: no nativo usa o armazenamento do
// Capacitor, no web cai para localStorage. A API ja era assincrona, entao nenhum
// call site muda.
export const appStorage = {
  async getItem<T>(key: string) {
    const serializedValue = isNative()
      ? (await Preferences.get({ key })).value
      : hasLocalStorage()
        ? window.localStorage.getItem(key)
        : null;

    if (!serializedValue) return null;

    try {
      return JSON.parse(serializedValue) as T;
    } catch {
      return null;
    }
  },

  async setItem<T>(key: string, value: T) {
    const serializedValue = JSON.stringify(value);

    if (isNative()) {
      await Preferences.set({ key, value: serializedValue });
      return;
    }

    if (!hasLocalStorage()) return;
    window.localStorage.setItem(key, serializedValue);
  },

  async removeItem(key: string) {
    if (isNative()) {
      await Preferences.remove({ key });
      return;
    }

    if (!hasLocalStorage()) return;
    window.localStorage.removeItem(key);
  },

  async keys(prefix: string) {
    if (isNative()) {
      const { keys } = await Preferences.keys();
      return keys.filter((key) => key.startsWith(prefix));
    }

    if (!hasLocalStorage()) return [];

    const matches: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(prefix)) matches.push(key);
    }
    return matches;
  },
};
