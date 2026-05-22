import type { AuthTokenResponse, AuthUser, LoginInput, RegisterInput } from "../types/auth";
import { apiClient } from "./apiClient";

const DEV_AUTH_BYPASS_ENABLED =
  import.meta.env?.VITE_DEV_AUTH_BYPASS === "true" || !import.meta.env?.VITE_API_URL;
const MOCK_TOKEN_PREFIX = "beefit-dev-token";

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

export const authService = {
  login(input: LoginInput) {
    if (DEV_AUTH_BYPASS_ENABLED) {
      return Promise.resolve<AuthTokenResponse>({
        accessToken: buildMockToken(input.email),
      });
    }

    return apiClient.post<AuthTokenResponse>("/auth/login", input);
  },

  register(input: RegisterInput) {
    if (DEV_AUTH_BYPASS_ENABLED) {
      return Promise.resolve({
        message: "Usuário criado em modo de desenvolvimento.",
        email: input.email,
      });
    }

    return apiClient.post<unknown>("/auth/register", input);
  },

  getCurrentUser() {
    if (DEV_AUTH_BYPASS_ENABLED) {
      const token =
        typeof window !== "undefined" ? window.localStorage.getItem("beefit.auth.accessToken") : null;
      const email = readEmailFromMockToken(token);

      if (!email) {
        return Promise.reject(new Error("Sessão mock inválida."));
      }

      return Promise.resolve<AuthUser>(buildMockUser(email));
    }

    return apiClient.get<AuthUser>("/users/me", { auth: true });
  },
};
