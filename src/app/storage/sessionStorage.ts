import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";

const ACCESS_TOKEN_KEY = "beefit.auth.accessToken";
const REFRESH_TOKEN_KEY = "beefit.auth.refreshToken";
const AUTH_USER_KEY = "beefit.auth.user";
const DEVICE_ID_KEY = "beefit.auth.deviceId";
const NATIVE_RESTORE_BLOCK_KEY = "beefit.auth.restoreBlocked";
const WEB_GENERATION_KEY = "beefit.auth.generation";
const LEGACY_GENERATION_KEY = "beefit.auth.legacyGeneration";

interface TokenPair {
  accessToken: string | null;
  refreshToken: string | null;
}

interface SessionState {
  controller: AbortController;
  active: boolean;
  detached?: boolean;
  generation?: string | null;
}

let session: SessionState = { controller: new AbortController(), active: true };
let storageTail = Promise.resolve();
const externalChanges = new Set<() => void>();

function isNative() {
  return Capacitor.isNativePlatform();
}

function browserStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readGeneration(storage: Storage) {
  return storage.getItem(WEB_GENERATION_KEY) ?? storage.getItem(LEGACY_GENERATION_KEY);
}

function tokensKey(generation: string) {
  return `beefit.auth.tokens.${generation}`;
}

function userKey(generation: string) {
  return `${AUTH_USER_KEY}.${generation}`;
}

function parseObject<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value as T : null;
  } catch {
    return null;
  }
}

function migrateLegacyWebSession(storage: Storage) {
  const accessToken = storage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = storage.getItem(REFRESH_TOKEN_KEY);
  const user = storage.getItem(AUTH_USER_KEY);
  if (!accessToken && !refreshToken && !user) return readGeneration(storage);

  const generation = newId();
  storage.setItem(tokensKey(generation), JSON.stringify({ accessToken, refreshToken } satisfies TokenPair));
  if (user) storage.setItem(userKey(generation), user);
  // A migração nunca altera o ponteiro de um login/logout explícito de outra aba.
  if (readGeneration(storage) === null) storage.setItem(LEGACY_GENERATION_KEY, generation);
  const published = readGeneration(storage);
  if (published !== generation) {
    storage.removeItem(tokensKey(generation));
    storage.removeItem(userKey(generation));
    return published;
  }
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
  storage.removeItem(AUTH_USER_KEY);
  return generation;
}

function syncWebGeneration() {
  if (isNative() || session.detached) return;
  try {
    const storage = browserStorage();
    if (storage) {
      const generation = readGeneration(storage);
      if (session.generation === undefined) {
        const initial = generation ?? migrateLegacyWebSession(storage);
        session.generation = initial;
        // Uma geração pode ter sido publicada no logout ou antes de o login terminar.
        if (initial !== null && storage.getItem(tokensKey(initial)) === null) session.active = false;
        if (readGeneration(storage) === initial) return;
      } else if (session.generation === generation) return;
    }
  } catch {
    // Se não pudermos confirmar a identidade, os dados da aba deixam de ser utilizáveis.
  }
  session.detached = true;
  session.active = false;
  session.controller.abort();
  externalChanges.forEach((notify) => notify());
}

// O evento é só uma notificação: não usamos newValue nem observamos chaves de credenciais.
export function watchExternalSessionChange(notify?: () => void) {
  if (isNative() || typeof window === "undefined") return () => undefined;
  if (notify) externalChanges.add(notify);
  const onStorage = ({ key }: StorageEvent) => {
    if (key === WEB_GENERATION_KEY || key === LEGACY_GENERATION_KEY || key === null) syncWebGeneration();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    if (notify) externalChanges.delete(notify);
  };
}

export function getSessionSignal(): AbortSignal | null {
  syncWebGeneration();
  return session.active ? session.controller.signal : null;
}

// Uma troca ainda não confirmada observa a geração sem encerrar a sessão.
// Também funciona para login explícito quando a aba já está deslogada.
export function captureSessionGuard() {
  syncWebGeneration();
  const previous = session;
  const storage = isNative() ? null : browserStorage();
  const generation = storage ? readGeneration(storage) : null;
  return () => {
    syncWebGeneration();
    if (session !== previous || (storage && readGeneration(storage) !== generation)) {
      throw new DOMException("Sessão encerrada.", "AbortError");
    }
  };
}

// AbortSignal.throwIfAborted() não existe no iOS 15.0–15.3.
export function throwIfAborted(signal?: AbortSignal | null) {
  if (signal?.aborted) throw new DOMException("Operação cancelada.", "AbortError");
}

export function assertSessionTransition(signal: AbortSignal | null): void {
  if (signal === session.controller.signal) syncWebGeneration();
  if (!signal || signal !== session.controller.signal || signal.aborted || session.detached) {
    throw new DOMException("Sessão encerrada.", "AbortError");
  }
}

export function assertSessionActive(signal: AbortSignal | null): void {
  assertSessionTransition(signal);
  if (!session.active) throw new DOMException("Sessão encerrada.", "AbortError");
}

export async function withSessionRefreshLock<T>(signal: AbortSignal, refresh: () => Promise<T>): Promise<T> {
  assertSessionActive(signal);
  if (isNative() || session.generation == null || typeof navigator === "undefined") return refresh();
  const locks = navigator.locks;
  if (typeof locks?.request !== "function") return refresh();

  // A geração é compartilhada entre abas, não é uma credencial e muda no login/logout.
  return locks.request(`beefit.auth.refresh.${session.generation}`, { signal }, () => {
    assertSessionActive(signal);
    return refresh();
  });
}

// Serializa só operações locais: no Secure Storage uma escrita já enviada ao
// plugin precisa terminar antes da limpeza. Nenhuma chamada HTTP ocupa a fila.
export function withSessionStorage<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageTail.then(operation);
  storageTail = result.then(() => undefined, () => undefined);
  return result;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readWebTokens(storage: Storage, generation: string): TokenPair {
  const pair = parseObject<Partial<TokenPair>>(storage.getItem(tokensKey(generation)));
  return { accessToken: stringOrNull(pair?.accessToken), refreshToken: stringOrNull(pair?.refreshToken) };
}

export function beginSessionChange(mode: "replace" | "end" = "end") {
  const previous = session;
  const next: SessionState = { controller: new AbortController(), active: false };
  session = next;
  const native = isNative();
  let storage: Storage | null = null;
  let generation: string | null = null;
  let ownsStorage = native;
  const failures: string[] = [];
  if (!native) {
    try {
      storage = browserStorage();
      if (!storage) throw new Error("localStorage indisponível");
      generation = readGeneration(storage);
      ownsStorage = mode === "replace" || (!previous.detached &&
        (previous.generation === undefined || previous.generation === generation));
      if (ownsStorage) {
        next.generation = newId();
        storage.setItem(WEB_GENERATION_KEY, next.generation);
      } else {
        next.detached = true;
      }
    } catch {
      failures.push("bloqueio da restauração web");
      next.detached = true;
    }
  }
  previous.controller.abort();
  const { signal } = next.controller;

  return {
    signal,
    async clearCredentials<T>(revoke: boolean) {
      let user: T | null = null;
      let refreshToken: string | null = null;
      let deviceId: string | null = null;
      if (!ownsStorage) return { user, refreshToken, deviceId, failures, ownsStorage };
      async function attempt<T>(label: string, run: () => T | Promise<T>) {
        try {
          return await run();
        } catch {
          failures.push(label);
          return null;
        }
      }

      // Só o bloqueio não secreto fica no Preferences; credenciais nativas continuam no Secure Storage.
      if (native) await attempt("bloqueio da restauração nativa", () => Preferences.set({ key: NATIVE_RESTORE_BLOCK_KEY, value: "1" }));
      const storedUserKey = generation === null ? AUTH_USER_KEY : userKey(generation);
      [user, refreshToken, deviceId] = await Promise.all([
        attempt("leitura do usuário", () => storage
          ? parseObject<T>(storage.getItem(storedUserKey))
          : SecureStorage.get(storedUserKey) as Promise<T | null>),
        revoke ? attempt("leitura do refresh token", async () => {
          if (!storage) return stringOrNull(await SecureStorage.get(REFRESH_TOKEN_KEY));
          return generation === null ? storage.getItem(REFRESH_TOKEN_KEY) : readWebTokens(storage, generation).refreshToken;
        }) : null,
        revoke ? attempt("leitura do dispositivo", () => sessionStorage.getDeviceId()) : null,
      ]);
      const keys = [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, AUTH_USER_KEY];
      if (storage && generation !== null) keys.push(tokensKey(generation), storedUserKey);
      await Promise.all(keys.map((key) => attempt(`remoção de ${key.split(".")[2]}`, async () => {
        if (storage) storage.removeItem(key);
        else await SecureStorage.remove(key);
      })));
      if (storage && generation !== null && next.generation !== undefined) {
        await attempt("remoção do marcador legado", () => {
          if (storage.getItem(WEB_GENERATION_KEY) !== null && storage.getItem(LEGACY_GENERATION_KEY) === generation) {
            storage.removeItem(LEGACY_GENERATION_KEY);
          }
        });
      }
      return { user, refreshToken, deviceId, failures, ownsStorage };
    },
  };
}

export async function canRestoreStoredSession(signal: AbortSignal) {
  assertSessionActive(signal);
  if (!isNative()) return true;
  let allowed = false;
  try {
    allowed = (await Preferences.get({ key: NATIVE_RESTORE_BLOCK_KEY })).value === null;
    return allowed;
  } finally {
    assertSessionActive(signal);
    if (!allowed) {
      session.active = false;
      session.controller.abort();
    }
  }
}

function writeWebValue(signal: AbortSignal, key: string, value: string) {
  assertSessionTransition(signal);
  const storage = browserStorage()!;
  storage.setItem(key, value);
  try {
    assertSessionTransition(signal);
  } catch (error) {
    // A chave pertence exclusivamente à geração antiga, nunca à conta nova.
    storage.removeItem(key);
    throw error;
  }
}

async function writeTokens(signal: AbortSignal, accessToken: string, refreshToken: string) {
  assertSessionTransition(signal);
  if (isNative()) {
    await SecureStorage.set(ACCESS_TOKEN_KEY, accessToken);
    assertSessionTransition(signal);
    await SecureStorage.set(REFRESH_TOKEN_KEY, refreshToken);
    assertSessionTransition(signal);
  } else if (session.generation != null) {
    writeWebValue(signal, tokensKey(session.generation), JSON.stringify({ accessToken, refreshToken } satisfies TokenPair));
  }
}

async function writeUser(signal: AbortSignal, user: unknown) {
  assertSessionTransition(signal);
  if (isNative()) {
    await SecureStorage.set(AUTH_USER_KEY, user as Record<string, unknown>);
    assertSessionTransition(signal);
  } else if (session.generation != null) {
    writeWebValue(signal, userKey(session.generation), JSON.stringify(user));
  }
}

export const sessionStorage = {
  async getToken(signal = getSessionSignal()) {
    if (!signal) return null;
    assertSessionActive(signal);
    if (isNative()) {
      if (!await canRestoreStoredSession(signal)) return null;
      assertSessionActive(signal);
      const token = await SecureStorage.get(ACCESS_TOKEN_KEY);
      assertSessionActive(signal);
      return stringOrNull(token);
    }
    return session.generation == null ? null : readWebTokens(browserStorage()!, session.generation).accessToken;
  },

  async getTokens(signal: AbortSignal) {
    assertSessionActive(signal);
    if (!isNative()) {
      return session.generation == null
        ? { accessToken: null, refreshToken: null }
        : readWebTokens(browserStorage()!, session.generation);
    }
    if (!await canRestoreStoredSession(signal)) return { accessToken: null, refreshToken: null };
    assertSessionActive(signal);
    const [accessToken, refreshToken] = await Promise.all([
      SecureStorage.get(ACCESS_TOKEN_KEY), SecureStorage.get(REFRESH_TOKEN_KEY),
    ]);
    assertSessionActive(signal);
    return { accessToken: stringOrNull(accessToken), refreshToken: stringOrNull(refreshToken) };
  },

  async getUser<T>(signal: AbortSignal) {
    assertSessionActive(signal);
    const generation = session.generation;
    if (!await canRestoreStoredSession(signal)) return null;
    assertSessionActive(signal);
    const user = isNative()
      ? await SecureStorage.get(AUTH_USER_KEY) as T | null
      : generation == null ? null : parseObject<T>(browserStorage()?.getItem(userKey(generation)) ?? null);
    assertSessionActive(signal);
    return user;
  },

  async replaceTokens(signal: AbortSignal, accessToken: string, refreshToken: string) {
    assertSessionActive(signal);
    await writeTokens(signal, accessToken, refreshToken);
  },

  async setUser(signal: AbortSignal, user: unknown) {
    assertSessionActive(signal);
    await writeUser(signal, user);
  },

  async activate(signal: AbortSignal, accessToken: string, refreshToken: string, user: unknown) {
    await writeTokens(signal, accessToken, refreshToken);
    if (user) await writeUser(signal, user);
    assertSessionTransition(signal);
    if (isNative()) await Preferences.remove({ key: NATIVE_RESTORE_BLOCK_KEY });
    assertSessionTransition(signal);
    session.active = true;
  },

  async getDeviceId() {
    if (isNative()) return stringOrNull(await SecureStorage.get(DEVICE_ID_KEY));
    return browserStorage()?.getItem(DEVICE_ID_KEY) ?? null;
  },

  async ensureDeviceId() {
    const existingDeviceId = await this.getDeviceId();
    if (existingDeviceId) return existingDeviceId;
    // No web, outra aba pode ter criado o identificador enquanto aguardávamos a leitura.
    const storage = isNative() ? null : browserStorage();
    const shared = storage?.getItem(DEVICE_ID_KEY);
    if (shared) return shared;
    const deviceId = newId();
    if (storage) storage.setItem(DEVICE_ID_KEY, deviceId);
    else if (isNative()) await SecureStorage.set(DEVICE_ID_KEY, deviceId);
    return deviceId;
  },
};
