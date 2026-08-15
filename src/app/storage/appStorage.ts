import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isNative() {
  return Capacitor.isNativePlatform();
}

function readLegacy(key: string) {
  if (!hasLocalStorage()) return null;
  return window.localStorage.getItem(key);
}

function listLocalStorageKeys(prefix: string) {
  if (!hasLocalStorage()) return [];

  const matches: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(prefix)) matches.push(key);
  }
  return matches;
}

// Mesmo padrao de storage/sessionStorage.ts: no nativo usa o armazenamento do
// Capacitor, no web cai para localStorage. A API ja era assincrona, entao nenhum
// call site muda.
export const appStorage = {
  async getItem<T>(key: string) {
    let serializedValue: string | null;

    if (isNative()) {
      serializedValue = (await Preferences.get({ key })).value;

      // No Android e no iOS o Preferences (SharedPreferences / UserDefaults) e um
      // armazenamento separado do localStorage do WebView, onde os dados de quem
      // ja tinha o app instalado estao. Sem esta leitura de fallback, atualizar o
      // app faria sumir rascunho de treino e, pior, finalizacao pendente — um
      // treino ja concluido esperando conexao para ser enviado.
      if (serializedValue === null) {
        const legacyValue = readLegacy(key);
        if (legacyValue !== null) {
          await Preferences.set({ key, value: legacyValue });
          window.localStorage.removeItem(key);
          serializedValue = legacyValue;
        }
      }
    } else {
      serializedValue = hasLocalStorage() ? window.localStorage.getItem(key) : null;
    }

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
      // Uma chave ainda nao migrada so existe no legado; remover de um lado so
      // deixaria o dado ressuscitar na proxima leitura.
      if (hasLocalStorage()) window.localStorage.removeItem(key);
      return;
    }

    if (!hasLocalStorage()) return;
    window.localStorage.removeItem(key);
  },

  async keys(prefix: string) {
    if (isNative()) {
      const { keys } = await Preferences.keys();
      // A uniao com o legado e o que faz a migracao acontecer no caso que mais
      // importa: getCurrentDraft e clearAllDrafts descobrem o rascunho varrendo
      // por prefixo. Uma chave que ainda so existe no localStorage nao apareceria
      // aqui, entao getItem nunca seria chamado para ela e ela nunca migraria.
      const merged = new Set([...keys, ...listLocalStorageKeys(prefix)]);
      return [...merged].filter((key) => key.startsWith(prefix));
    }

    return listLocalStorageKeys(prefix);
  },
};
