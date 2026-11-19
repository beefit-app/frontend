import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import {
  assertSessionActive,
  assertSessionTransition,
  beginSessionChange,
  canRestoreStoredSession,
  captureSessionGuard,
  getSessionSignal,
  sessionStorage,
  withSessionStorage,
} from "../storage/sessionStorage";
import type {
  AuthApiUser,
  AuthSession,
  AuthUser,
  CompleteProfileInput,
  LoginInput,
  RegisterApiInput,
  RegisterInput,
} from "../types/auth";
import type { CompleteProfileRequest, LoginRequest, LogoutRequest, RegisterRequest } from "../types/api";
import { API_BASE_URL, ApiError, apiClient } from "./apiClient";
import { clearLocalUserData } from "./sessionTeardown";

const DEV_AUTH_BYPASS_ENABLED =
  import.meta.env?.DEV === true && import.meta.env?.VITE_DEV_AUTH_BYPASS === "true";
const MOCK_TOKEN_PREFIX = "beefit-dev-token";
const AUTH_LOGIN_PATH = "/auth/login";
const AUTH_REGISTER_PATH = "/auth/register";
const AUTH_SOCIAL_EXCHANGE_PATH = "/auth/social/exchange";
const AUTH_COMPLETE_PROFILE_PATH = "/auth/complete-profile";
const CURRENT_USER_PATHS = ["/auth/me", "/api/profile/me"] as const;

export type SocialLoginProvider = "google" | "microsoft" | "apple";

interface BackendAuthSessionResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthApiUser;
}

interface LegacyBackendAuthSessionResponse {
  token: string;
  refreshToken?: string;
  userResponseDTO: AuthApiUser;
}

interface BackendTokenOnlyResponse {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
}

interface BackendProfileResponse {
  fullName: string;
  username?: string | null;
}

interface AuthGateway {
  login(input: LoginInput, signal: AbortSignal): Promise<AuthSession>;
  register(input: RegisterInput, signal: AbortSignal): Promise<AuthSession>;
  restoreSession(): Promise<AuthSession | null>;
  logout(options?: { isAccountDeletion?: boolean }): Promise<void>;
  getCurrentUser(): Promise<AuthUser>;
}

function buildMockToken(email: string) {
  return `${MOCK_TOKEN_PREFIX}:${encodeURIComponent(email.trim().toLowerCase())}`;
}

function readEmailFromMockToken(token: string | null) {
  if (!token || !token.startsWith(`${MOCK_TOKEN_PREFIX}:`)) return null;
  return decodeURIComponent(token.slice(MOCK_TOKEN_PREFIX.length + 1));
}

function buildMockUser(email: string): AuthUser {
  const usernameBase = email.split("@")[0]?.trim() || "beefit";
  const username = usernameBase.toLowerCase().replace(/[^a-z0-9._-]/g, "");
  const displayName = usernameBase
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    id: `dev-${username || "user"}`,
    name: displayName || "BeeFit Dev",
    email,
    username: username || "beefit",
    weeklyGoal: 4,
    weight: 75,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBackendAuthSessionResponse(value: unknown): value is BackendAuthSessionResponse {
  return (
    isObject(value) &&
    typeof value.accessToken === "string" &&
    typeof value.refreshToken === "string" &&
    isObject(value.user) &&
    typeof value.user.fullName === "string"
  );
}

function isLegacyBackendAuthSessionResponse(value: unknown): value is LegacyBackendAuthSessionResponse {
  return (
    isObject(value) &&
    typeof value.token === "string" &&
    isObject(value.userResponseDTO) &&
    typeof value.userResponseDTO.fullName === "string"
  );
}

function isBackendTokenOnlyResponse(value: unknown): value is BackendTokenOnlyResponse {
  return (
    isObject(value) &&
    (typeof value.accessToken === "string" || typeof value.token === "string")
  );
}

function isBackendProfileResponse(value: unknown): value is BackendProfileResponse {
  return isObject(value) && typeof value.fullName === "string";
}

function mapAuthApiUserToAuthUser(apiUser: AuthApiUser, profileComplete = true): AuthUser {
  return {
    id: apiUser.id,
    name: apiUser.fullName,
    email: apiUser.email,
    username: apiUser.username,
    weeklyGoal: apiUser.weeklyGoal,
    weight: apiUser.bodyWeight,
    profileComplete: apiUser.profileComplete ?? profileComplete,
  };
}

function mergeCurrentUserResponse(value: unknown, fallbackUser: AuthUser | null): AuthUser {
  if (
    isObject(value) &&
    typeof value.fullName === "string" &&
    typeof value.email === "string" &&
    typeof value.id === "string"
  ) {
    return mapAuthApiUserToAuthUser(
      value as unknown as AuthApiUser,
      fallbackUser?.id === value.id ? fallbackUser.profileComplete : undefined,
    );
  }

  if (isBackendProfileResponse(value)) {
    return {
      id: fallbackUser?.id ?? "",
      name: value.fullName,
      email: fallbackUser?.email ?? "",
      username:
        typeof value.username === "string"
          ? value.username
          : fallbackUser?.username ?? null,
      weeklyGoal: fallbackUser?.weeklyGoal ?? null,
      weight: fallbackUser?.weight ?? null,
      profileComplete: fallbackUser?.profileComplete,
    };
  }

  if (isObject(value) && typeof value.name === "string" && typeof value.email === "string") {
    return {
      id: typeof value.id === "string" ? value.id : fallbackUser?.id ?? "",
      name: value.name,
      email: value.email,
      username:
        typeof value.username === "string"
          ? value.username
          : fallbackUser?.username ?? null,
      weeklyGoal:
        typeof value.weeklyGoal === "number"
          ? value.weeklyGoal
          : fallbackUser?.weeklyGoal ?? null,
      weight:
        typeof value.weight === "number" ? value.weight : fallbackUser?.weight ?? null,
      profileComplete:
        typeof value.profileComplete === "boolean" ? value.profileComplete : fallbackUser?.profileComplete,
    };
  }

  throw new Error("Resposta de autenticação inválida.");
}

function mapRegisterInputToApi(input: RegisterInput): RegisterApiInput {
  return {
    fullName: input.name,
    username: input.username,
    email: input.email,
    password: input.password,
    weeklyGoal: input.weeklyGoal,
    bodyWeight: input.weight,
    acceptedTermsVersion: input.acceptedTermsVersion,
    acceptedPrivacyVersion: input.acceptedPrivacyVersion,
  };
}

function writeNewSession(signal: AbortSignal, accessToken: string, refreshToken: string, user: AuthUser | null) {
  return withSessionStorage(() => sessionStorage.activate(signal, accessToken, refreshToken, user));
}

function reportCleanupFailures(failures: string[]) {
  if (failures.length) throw new Error(`Falha na limpeza local da sessão (${failures.join(", ")}).`);
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

// Todo encerramento ou substituição usa o mesmo teardown, que preserva os rascunhos por usuário.
async function clearStoredSession(change: ReturnType<typeof beginSessionChange>, options?: { isAccountDeletion?: boolean }, revoke = false) {
  const { credentials, failures } = await withSessionStorage(async () => {
    const stored = await change.clearCredentials<AuthUser>(revoke);
    const { user, refreshToken, deviceId, ownsStorage } = stored;
    const cacheFailures = await clearLocalUserData(user?.id, { ...options, memoryOnly: !ownsStorage });
    return {
      credentials: refreshToken && deviceId ? { refreshToken, deviceId } satisfies LogoutRequest : null,
      failures: [...stored.failures, ...cacheFailures],
    };
  });
  if (credentials) {
    const revocation = apiClient.post("/auth/logout", credentials).catch(() => {
      // Saída local não depende da rede. Não registre corpos nem credenciais.
      console.warn("Não foi possível revogar a sessão no servidor.");
    });
    if (!failures.length) await revocation;
  }
  reportCleanupFailures(failures);
}

async function endStoredSession(signal: AbortSignal) {
  try {
    assertSessionTransition(signal);
  } catch (error) {
    if (isAbortError(error)) return;
    throw error;
  }
  await clearStoredSession(beginSessionChange());
}

async function startAuthentication(authenticate: (signal: AbortSignal) => Promise<AuthSession>, onReplace?: () => void) {
  const change = beginSessionChange("replace");
  onReplace?.();
  await clearStoredSession(change);
  assertSessionTransition(change.signal);
  const result = await authenticate(change.signal);
  assertSessionActive(change.signal);
  return result;
}

const mockAuthGateway: AuthGateway = {
  async login(input, signal) {
    const accessToken = buildMockToken(input.email);
    const refreshToken = `refresh-${accessToken}`;
    const session = {
      accessToken,
      refreshToken,
      user: buildMockUser(input.email),
    };

    await writeNewSession(signal, session.accessToken, session.refreshToken, session.user);
    return session;
  },

  async register(input, signal) {
    const accessToken = buildMockToken(input.email);
    const refreshToken = `refresh-${accessToken}`;
    const session = {
      accessToken,
      refreshToken,
      user: {
        ...buildMockUser(input.email),
        name: input.name.trim() || buildMockUser(input.email).name,
        username: input.username.trim() || buildMockUser(input.email).username,
        weeklyGoal: input.weeklyGoal,
        weight: input.weight,
      },
    };

    await writeNewSession(signal, session.accessToken, session.refreshToken, session.user);
    return session;
  },

  async restoreSession() {
    const signal = getSessionSignal();
    if (!signal) return null;
    let token: string | null;
    try {
      token = await withSessionStorage(() => sessionStorage.getToken(signal));
      assertSessionActive(signal);
    } catch (error) {
      if (isAbortError(error)) return null;
      throw error;
    }
    const email = readEmailFromMockToken(token);

    if (!token || !email) {
      await endStoredSession(signal);
      return null;
    }

    return {
      accessToken: token,
      refreshToken: `refresh-${token}`,
      user: buildMockUser(email),
    };
  },

  async logout(options) {
    await clearStoredSession(beginSessionChange(), options);
  },

  async getCurrentUser() {
    const session = await this.restoreSession();

    if (!session) {
      throw new Error("Sessão mock inválida.");
    }

    return session.user;
  },
};

async function fetchCurrentUserFromApi(signal: AbortSignal, fallbackUser: AuthUser | null, logoutOnUnauthorized = true) {
  for (const path of CURRENT_USER_PATHS) {
    try {
      assertSessionActive(signal);
      const response = await apiClient.get<unknown>(path, { auth: true, logoutOnUnauthorized });
      assertSessionActive(signal);
      return mergeCurrentUserResponse(response, fallbackUser);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Endpoint de usuário autenticado não encontrado.");
}

function readValidatedSession(signal: AbortSignal, user: AuthUser, updateCachedUser = true): Promise<AuthSession | null> {
  return withSessionStorage(async () => {
    // A leitura autenticada pode ter rotacionado o par; só o perfil deve ser gravado aqui.
    const { accessToken, refreshToken } = await sessionStorage.getTokens(signal);
    assertSessionActive(signal);
    if (!accessToken || !refreshToken) return null;
    if (updateCachedUser) await sessionStorage.setUser(signal, user);
    assertSessionActive(signal);
    return { accessToken, refreshToken, user };
  });
}

async function createValidatedSession(signal: AbortSignal, accessToken: string, refreshToken: string, fallbackUser: AuthUser | null) {
  try {
    await writeNewSession(signal, accessToken, refreshToken, fallbackUser);
    // A própria tentativa faz a limpeza e reporta a falha, sem logout global concorrente.
    const user = await fetchCurrentUserFromApi(signal, fallbackUser, false);
    const session = await readValidatedSession(signal, user);
    if (!session) throw new DOMException("Sessão encerrada.", "AbortError");
    return session;
  } catch (error) {
    await endStoredSession(signal);
    throw error;
  }
}

async function normalizeApiSession(signal: AbortSignal, response: unknown, credentials?: LoginInput): Promise<AuthSession> {
  assertSessionTransition(signal);
  if (isBackendAuthSessionResponse(response)) {
    return createValidatedSession(signal, response.accessToken, response.refreshToken, mapAuthApiUserToAuthUser(response.user));
  }

  if (isLegacyBackendAuthSessionResponse(response)) {
    return createValidatedSession(
      signal,
      response.token,
      response.refreshToken ?? response.token,
      mapAuthApiUserToAuthUser(response.userResponseDTO),
    );
  }

  if (isBackendTokenOnlyResponse(response)) {
    const accessToken = response.accessToken ?? response.token;
    if (!accessToken) {
      throw new Error("Resposta de autenticação inválida.");
    }

    return createValidatedSession(signal, accessToken, response.refreshToken ?? accessToken, null);
  }

  if (credentials) {
    const deviceId = await ensureDeviceForAuthentication(signal);
    assertSessionTransition(signal);
    const loginResponse = await apiClient.post<unknown>(AUTH_LOGIN_PATH, { ...credentials, deviceId });
    return normalizeApiSession(signal, loginResponse);
  }

  throw new Error("Resposta de autenticação inválida.");
}

async function ensureDeviceForAuthentication(signal: AbortSignal) {
  return withSessionStorage(() => {
    assertSessionTransition(signal);
    return sessionStorage.ensureDeviceId();
  });
}

const apiAuthGateway: AuthGateway = {
  async login(input, signal) {
    const deviceId = await ensureDeviceForAuthentication(signal);
    assertSessionTransition(signal);
    const body: LoginRequest = { ...input, deviceId };
    const response = await apiClient.post<unknown>(AUTH_LOGIN_PATH, body);
    return normalizeApiSession(signal, response);
  },

  async register(input, signal) {
    const deviceId = await ensureDeviceForAuthentication(signal);
    assertSessionTransition(signal);
    // Tipado pelo contrato do backend: campo obrigatorio esquecido aqui vira erro
    // de compilacao, e nao 400 em producao.
    const body: RegisterRequest = { ...mapRegisterInputToApi(input), deviceId };
    const response = await apiClient.post<unknown>(AUTH_REGISTER_PATH, body);
    return normalizeApiSession(signal, response, {
      email: input.email,
      password: input.password,
    });
  },

  async restoreSession() {
    const signal = getSessionSignal();
    if (!signal) return null;
    try {
      if (!await canRestoreStoredSession(signal)) return null;
      const [{ accessToken, refreshToken }, cachedUser] = await withSessionStorage(() => Promise.all([
        sessionStorage.getTokens(signal), sessionStorage.getUser<AuthUser>(signal),
      ]));
      assertSessionActive(signal);
      if (!accessToken || !refreshToken) {
        await endStoredSession(signal);
        return null;
      }

      let user: AuthUser;
      try {
        user = await fetchCurrentUserFromApi(signal, cachedUser);
      } catch (cause) {
        if (getSessionSignal() !== signal || isAbortError(cause)) return null;
        if (cachedUser && !(cause instanceof ApiError && cause.status === 401)) {
          return await readValidatedSession(signal, cachedUser, false);
        }
        await endStoredSession(signal);
        return null;
      }
      return await readValidatedSession(signal, user);
    } catch (error) {
      if (isAbortError(error)) return null;
      throw error;
    }
  },

  async logout(options) {
    await clearStoredSession(beginSessionChange(), options, true);
  },

  async getCurrentUser() {
    const signal = getSessionSignal();
    if (!signal) throw new DOMException("Sessão encerrada.", "AbortError");
    const cachedUser = await withSessionStorage(() => sessionStorage.getUser<AuthUser>(signal));
    return fetchCurrentUserFromApi(signal, cachedUser);
  },
};

// Dispara o fluxo OAuth2 Authorization Code do backend (spring-boot-starter-oauth2-client).
// O backend orquestra o redirect pro provedor e a troca do code usando client-secret;
// aqui só precisamos abrir essa URL inicial — ela nunca passa por fetch/XHR (CORS não
// se aplica a navegação de browser), então não dá pra usar o apiClient.
async function startSocialLogin(provider: SocialLoginProvider) {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_URL não configurada.");
  }

  const assertUnchanged = captureSessionGuard();
  const deviceId = await withSessionStorage(() => sessionStorage.ensureDeviceId());
  assertUnchanged();
  const isNative = Capacitor.isNativePlatform();
  const platform = isNative ? "mobile" : "web";
  const url =
    `${API_BASE_URL}/oauth2/authorization/${provider}` +
    `?platform=${platform}&deviceId=${encodeURIComponent(deviceId)}`;

  if (isNative) {
    await Browser.open({ url });
    return;
  }

  window.location.href = url;
}

let socialExchangeAttempt = 0;

async function exchangeSocialCode(code: string, onReplace?: () => void): Promise<AuthSession> {
  const attempt = ++socialExchangeAttempt;
  const assertUnchanged = captureSessionGuard();
  // Não desmonte a sessão na abertura do provedor nem se o código for recusado.
  const response = await apiClient.post<unknown>(AUTH_SOCIAL_EXCHANGE_PATH, { code });
  assertUnchanged();
  if (attempt !== socialExchangeAttempt) throw new DOMException("Operação cancelada.", "AbortError");
  if (!isBackendAuthSessionResponse(response) || !response.accessToken || !response.refreshToken ||
    typeof response.user.id !== "string" || !response.user.id) {
    throw new Error("Resposta de autenticação inválida.");
  }
  return startAuthentication((signal) => normalizeApiSession(signal, response), onReplace);
}

// Fecha o cadastro de uma conta criada via login social (peso, meta e aceite dos
// termos). O backend devolve o usuário atualizado, já com profileComplete=true.
async function completeProfile(input: CompleteProfileInput): Promise<AuthUser> {
  const signal = getSessionSignal();
  if (!signal) throw new DOMException("Sessão encerrada.", "AbortError");
  const body: CompleteProfileRequest = {
    bodyWeight: input.weight,
    weeklyGoal: input.weeklyGoal,
    acceptedTermsVersion: input.acceptedTermsVersion,
    acceptedPrivacyVersion: input.acceptedPrivacyVersion,
  };
  const response = await apiClient.post<AuthApiUser>(AUTH_COMPLETE_PROFILE_PATH, body, { auth: true });
  const user = mapAuthApiUserToAuthUser(response);
  return withSessionStorage(async () => {
    assertSessionActive(signal);
    await sessionStorage.setUser(signal, user);
    assertSessionActive(signal);
    return user;
  });
}

const authGateway = DEV_AUTH_BYPASS_ENABLED ? mockAuthGateway : apiAuthGateway;

export const authService = {
  login(input: LoginInput, onReplace?: () => void) {
    return startAuthentication((signal) => authGateway.login(input, signal), onReplace);
  },

  register(input: RegisterInput, onReplace?: () => void) {
    return startAuthentication((signal) => authGateway.register(input, signal), onReplace);
  },

  restoreSession() {
    return authGateway.restoreSession();
  },

  logout(options?: { isAccountDeletion?: boolean }) {
    return authGateway.logout(options);
  },

  getCurrentUser() {
    return authGateway.getCurrentUser();
  },

  startSocialLogin,
  exchangeSocialCode,
  completeProfile,

  clearExternalSession() {
    // A aba que trocou de sessão já limpa a persistência compartilhada.
    return withSessionStorage(async () => reportCleanupFailures(await clearLocalUserData(null, { memoryOnly: true })));
  },
};
