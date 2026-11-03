import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { authService, type SocialLoginProvider } from "../services/authService";
import { AUTH_UNAUTHORIZED_EVENT, ApiError } from "../services/apiClient";
import type { AuthSession, AuthUser, LoginInput, RegisterInput } from "../types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  isSubmitting: boolean;
  authError: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: (options?: { isAccountDeletion?: boolean }) => Promise<void>;
  clearAuthError: () => void;
  loginWithProvider: (provider: SocialLoginProvider) => Promise<void>;
  loginWithSocialCode: (code: string) => Promise<void>;
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
      try {
        const session = await authService.restoreSession();

        if (session) {
          setAccessToken(session.accessToken);
          setUser(session.user);
        } else {
          setAccessToken(null);
          setUser(null);
        }
      } catch {
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
      await authService.logout();
      setAccessToken(null);
      setUser(null);
      setAuthError(null);
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  function establishSession(session: AuthSession) {
    setAccessToken(session.accessToken);
    setUser(session.user);
  }

  async function login(input: LoginInput) {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const session = await authService.login(input);
      establishSession(session);
    } catch (error) {
      await authService.logout();
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
      const session = await authService.register(input);
      establishSession(session);
    } catch (error) {
      await authService.logout();
      setAccessToken(null);
      setUser(null);
      setAuthError(getErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function loginWithProvider(provider: SocialLoginProvider) {
    setAuthError(null);

    try {
      await authService.startSocialLogin(provider);
    } catch (error) {
      setAuthError(getErrorMessage(error));
      throw error;
    }
  }

  async function loginWithSocialCode(code: string) {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const session = await authService.exchangeSocialCode(code);
      establishSession(session);
    } catch (error) {
      await authService.logout();
      setAccessToken(null);
      setUser(null);
      setAuthError(getErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logout(options?: { isAccountDeletion?: boolean }) {
    await authService.logout(options);
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
    loginWithProvider,
    loginWithSocialCode,
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
