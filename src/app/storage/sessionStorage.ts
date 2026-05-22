const ACCESS_TOKEN_KEY = "beefit.auth.accessToken";

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

async function readFromFallbackStorage() {
  if (!hasBrowserStorage()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

async function writeToFallbackStorage(token: string) {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

async function clearFallbackStorage() {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

// This adapter keeps the auth layer async so a native secure storage backend
// can replace the fallback implementation without changing call sites.
export const sessionStorage = {
  async getToken() {
    return readFromFallbackStorage();
  },

  async setToken(token: string) {
    await writeToFallbackStorage(token);
  },

  async clearToken() {
    await clearFallbackStorage();
  },
};
