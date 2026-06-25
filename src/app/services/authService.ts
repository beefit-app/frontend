import { sessionStorage } from "../storage/sessionStorage";
import type {
  AuthApiUser,
  AuthSession,
  AuthUser,
  LoginInput,
  RegisterApiInput,
  RegisterInput,
} from "../types/auth";
import { ApiError, apiClient } from "./apiClient";

const DEV_AUTH_BYPASS_ENABLED =
  import.meta.env?.VITE_DEV_AUTH_BYPASS === "true" || !import.meta.env?.VITE_API_URL;
const MOCK_TOKEN_PREFIX = "beefit-dev-token";
const AUTH_LOGIN_PATH = "/auth/login";
const AUTH_REGISTER_PATH = "/auth/register";
const CURRENT_USER_PATHS = ["/auth/me", "/api/profile/me", "/users/me"] as const;

interface BackendAuthSessionResponse {
  accessToken: string;
  user: AuthApiUser;
}

interface LegacyBackendAuthSessionResponse {
  token: string;
  userResponseDTO: AuthApiUser;
}

interface BackendTokenOnlyResponse {
  accessToken?: string;
  token?: string;
}

interface BackendProfileResponse {
  fullName: string;
  username?: string | null;
}

interface AuthGateway {
  login(input: LoginInput): Promise<AuthSession>;
  register(input: RegisterInput): Promise<AuthSession>;
  restoreSession(): Promise<AuthSession | null>;
  logout(): Promise<void>;
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

function mapAuthApiUserToAuthUser(apiUser: AuthApiUser): AuthUser {
  return {
    id: apiUser.id,
    name: apiUser.fullName,
    email: apiUser.email,
    username: apiUser.username,
    weeklyGoal: apiUser.weeklyGoal,
    weight: apiUser.bodyWeight,
  };
}

function mapSessionResponseToAuthSession(accessToken: string, apiUser: AuthApiUser): AuthSession {
  return {
    accessToken,
    user: mapAuthApiUserToAuthUser(apiUser),
  };
}

function mergeCurrentUserResponse(value: unknown, fallbackUser: AuthUser | null): AuthUser {
  if (
    isObject(value) &&
    typeof value.fullName === "string" &&
    typeof value.email === "string" &&
    typeof value.id === "string"
  ) {
    return mapAuthApiUserToAuthUser(value as AuthApiUser);
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
  };
}

async function persistSession(session: AuthSession) {
  await sessionStorage.setToken(session.accessToken);
  await sessionStorage.setUser(session.user);
  return session;
}

async function clearStoredSession() {
  await sessionStorage.clearToken();
  await sessionStorage.clearUser();
}

const mockAuthGateway: AuthGateway = {
  async login(input) {
    const accessToken = buildMockToken(input.email);
    const session = {
      accessToken,
      user: buildMockUser(input.email),
    };

    return persistSession(session);
  },

  async register(input) {
    const accessToken = buildMockToken(input.email);
    const session = {
      accessToken,
      user: {
        ...buildMockUser(input.email),
        name: input.name.trim() || buildMockUser(input.email).name,
        username: input.username.trim() || buildMockUser(input.email).username,
        weeklyGoal: input.weeklyGoal,
        weight: input.weight,
      },
    };

    return persistSession(session);
  },

  async restoreSession() {
    const token = await sessionStorage.getToken();
    const email = readEmailFromMockToken(token);

    if (!token || !email) {
      if (token) {
        await clearStoredSession();
      }
      return null;
    }

    return {
      accessToken: token,
      user: buildMockUser(email),
    };
  },

  async logout() {
    await clearStoredSession();
  },

  async getCurrentUser() {
    const session = await this.restoreSession();

    if (!session) {
      throw new Error("Sessão mock inválida.");
    }

    return session.user;
  },
};

async function fetchCurrentUserFromApi(fallbackUser: AuthUser | null) {
  for (const path of CURRENT_USER_PATHS) {
    try {
      const response = await apiClient.get<unknown>(path, { auth: true, logoutOnUnauthorized: true });
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

async function createSessionFromToken(accessToken: string) {
  const cachedUser = await sessionStorage.getUser<AuthUser>();
  await sessionStorage.setToken(accessToken);

  try {
    const user = await fetchCurrentUserFromApi(cachedUser);
    return persistSession({ accessToken, user });
  } catch (error) {
    await clearStoredSession();
    throw error;
  }
}

async function normalizeApiSession(response: unknown, credentials?: LoginInput): Promise<AuthSession> {
  if (isBackendAuthSessionResponse(response)) {
    return persistSession(mapSessionResponseToAuthSession(response.accessToken, response.user));
  }

  if (isLegacyBackendAuthSessionResponse(response)) {
    return persistSession(mapSessionResponseToAuthSession(response.token, response.userResponseDTO));
  }

  if (isBackendTokenOnlyResponse(response)) {
    const accessToken = response.accessToken ?? response.token;
    if (!accessToken) {
      throw new Error("Resposta de autenticação inválida.");
    }

    return createSessionFromToken(accessToken);
  }

  if (credentials) {
    const loginResponse = await apiClient.post<unknown>(AUTH_LOGIN_PATH, credentials);
    return normalizeApiSession(loginResponse);
  }

  throw new Error("Resposta de autenticação inválida.");
}

const apiAuthGateway: AuthGateway = {
  async login(input) {
    const response = await apiClient.post<unknown>(AUTH_LOGIN_PATH, input);
    return normalizeApiSession(response);
  },

  async register(input) {
    const response = await apiClient.post<unknown>(AUTH_REGISTER_PATH, mapRegisterInputToApi(input));
    return normalizeApiSession(response, {
      email: input.email,
      password: input.password,
    });
  },

  async restoreSession() {
    const accessToken = await sessionStorage.getToken();

    if (!accessToken) {
      return null;
    }

    try {
      const cachedUser = await sessionStorage.getUser<AuthUser>();
      const user = await fetchCurrentUserFromApi(cachedUser);
      return persistSession({ accessToken, user });
    } catch {
      await clearStoredSession();
      return null;
    }
  },

  async logout() {
    await clearStoredSession();
  },

  async getCurrentUser() {
    return fetchCurrentUserFromApi();
  },
};

const authGateway = DEV_AUTH_BYPASS_ENABLED ? mockAuthGateway : apiAuthGateway;

export const authService = {
  login(input: LoginInput) {
    return authGateway.login(input);
  },

  register(input: RegisterInput) {
    return authGateway.register(input);
  },

  restoreSession() {
    return authGateway.restoreSession();
  },

  logout() {
    return authGateway.logout();
  },

  getCurrentUser() {
    return authGateway.getCurrentUser();
  },
};
