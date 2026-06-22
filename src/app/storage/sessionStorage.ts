const ACCESS_TOKEN_KEY = "beefit.auth.accessToken";
const AUTH_USER_KEY = "beefit.auth.user";

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

async function readFromFallbackStorage() {
  if (!hasBrowserStorage()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

function isNative() {
  return Capacitor.isNativePlatform();
}

async function writeToFallbackStorage(token: string) {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

async function clearFallbackStorage() {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

async function readUserFromFallbackStorage() {
  if (!hasBrowserStorage()) return null;

  const serializedUser = window.localStorage.getItem(AUTH_USER_KEY);
  if (!serializedUser) return null;

  try {
    const parsedUser = JSON.parse(serializedUser);
    return typeof parsedUser === "object" && parsedUser !== null ? parsedUser : null;
  } catch {
    window.localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

async function writeUserToFallbackStorage(user: unknown) {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

async function clearUserFallbackStorage() {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(AUTH_USER_KEY);
}

// This adapter keeps the auth layer async so a native secure storage backend
// can replace the fallback implementation without changing call sites.
export const sessionStorage = {
  async getToken() {
    if (isNative()) {
      const token = await SecureStorage.get(ACCESS_TOKEN_KEY);
      return typeof token === "string" ? token : null;
    }
    return readFromFallbackStorage();
  },

  async setToken(token: string) {
    if (isNative()) {
      await SecureStorage.set(ACCESS_TOKEN_KEY, token);
      return;
    }
    await writeToFallbackStorage(token);
  },

  async getUser<T>() {
    if (isNative()) {
      return (await SecureStorage.get(AUTH_USER_KEY)) as T | null;
    }
    return (await readUserFromFallbackStorage()) as T | null;
  },

  async setUser(user: unknown) {
    if (isNative()) {
      await SecureStorage.set(AUTH_USER_KEY, user as Record<string, unknown>);
      return;
    }
    await writeUserToFallbackStorage(user);
  },

  async clearToken() {
    if (isNative()) {
      await SecureStorage.remove(ACCESS_TOKEN_KEY);
      return;
    }
    await clearFallbackStorage();
  },

  async clearUser() {
    if (isNative()) {
      await SecureStorage.remove(AUTH_USER_KEY);
      return;
    }
    await clearUserFallbackStorage();
  },
};
import { Capacitor } from "@capacitor/core";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";
