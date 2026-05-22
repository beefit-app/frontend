import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { authService } from "../services/authService";
import { AUTH_UNAUTHORIZED_EVENT, ApiError } from "../services/apiClient";
import { sessionStorage } from "../storage/sessionStorage";
import type { AuthUser, LoginInput, RegisterInput } from "../types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  isSubmitting: boolean;
  authError: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Não foi possível completar a autenticação.";
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    async function restoreSession() {
      const token = await sessionStorage.getToken();

      if (!token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        setAccessToken(token);
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch {
        await sessionStorage.clearToken();
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsBootstrapping(false);
      }
    }

    restoreSession();
  }, []);

  useEffect(() => {
    async function handleUnauthorized() {
      await sessionStorage.clearToken();
      setAccessToken(null);
      setUser(null);
      setAuthError(null);
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  async function establishSession(token: string) {
    await sessionStorage.setToken(token);
    setAccessToken(token);
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  }

  async function login(input: LoginInput) {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const { accessToken: token } = await authService.login(input);
      await establishSession(token);
    } catch (error) {
      await sessionStorage.clearToken();
      setAccessToken(null);
      setUser(null);
      setAuthError(getErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function register(input: RegisterInput) {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      await authService.register(input);
      const { accessToken: token } = await authService.login({
        email: input.email,
        password: input.password,
      });
      await establishSession(token);
    } catch (error) {
      await sessionStorage.clearToken();
      setAccessToken(null);
      setUser(null);
      setAuthError(getErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logout() {
    await sessionStorage.clearToken();
    setAccessToken(null);
    setUser(null);
    setAuthError(null);
  }

  function clearAuthError() {
    setAuthError(null);
  }

  const value: AuthContextValue = {
    user,
    accessToken,
    isAuthenticated: Boolean(user && accessToken),
    isBootstrapping,
    isSubmitting,
    authError,
    login,
    register,
    logout,
    clearAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
