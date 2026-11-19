import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { authService, type SocialLoginProvider } from "../services/authService";
import { AUTH_UNAUTHORIZED_EVENT, ApiError, PROFILE_INCOMPLETE_EVENT } from "../services/apiClient";
import { assertSessionActive, getSessionSignal, watchExternalSessionChange } from "../storage/sessionStorage";
import type { AuthSession, AuthUser, CompleteProfileInput, LoginInput, RegisterInput } from "../types/auth";

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
  setSocialLoginError: (message: string) => void;
  needsProfileCompletion: boolean;
  completeProfile: (input: CompleteProfileInput) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const SOCIAL_CALLBACK_PATHNAME = "/oauth-callback";

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
  const authOperation = useRef(0);
  const authSubmission = useRef(0);
  const providerStarting = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const unwatch = watchExternalSessionChange(() => {
      const operation = ++authOperation.current;
      setAccessToken(null);
      setUser(null);
      setIsBootstrapping(false);
      setIsSubmitting(false);
      setAuthError(null);
      void authService.clearExternalSession().catch((error: unknown) => {
        if (!cancelled && operation === authOperation.current) setAuthError(getErrorMessage(error));
      });
    });
    const operation = authOperation.current;
    const isCurrent = () => !cancelled && operation === authOperation.current;

    async function restoreSession() {
      try {
        const signal = getSessionSignal();
        const session = await authService.restoreSession();
        if (session) assertSessionActive(signal);
        if (isCurrent()) {
          setAccessToken(session?.accessToken ?? null);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        if (isCurrent()) {
          setAccessToken(null);
          setUser(null);
          setAuthError(getErrorMessage(error));
        }
      } finally {
        if (isCurrent()) setIsBootstrapping(false);
      }
    }

    // No callback web, a restauração não concorre com a troca de código. A aba
    // continua observando mudanças externas mesmo sem restaurar a sessão.
    if (window.location.pathname === SOCIAL_CALLBACK_PATHNAME) setIsBootstrapping(false);
    else void restoreSession();
    return () => {
      cancelled = true;
      unwatch();
    };
  }, []);

  const logout = useCallback(async (options?: { isAccountDeletion?: boolean }) => {
    const operation = ++authOperation.current;
    setAccessToken(null);
    setUser(null);
    setIsBootstrapping(false);
    setIsSubmitting(false);
    setAuthError(null);
    try {
      await authService.logout(options);
    } catch (error) {
      if (operation === authOperation.current) setAuthError(getErrorMessage(error));
      throw error;
    }
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      void logout().catch(() => undefined);
    }
    function handleProfileIncomplete() {
      setUser((current) => (current ? { ...current, profileComplete: false } : current));
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    window.addEventListener(PROFILE_INCOMPLETE_EVENT, handleProfileIncomplete);
    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
      window.removeEventListener(PROFILE_INCOMPLETE_EVENT, handleProfileIncomplete);
    };
  }, [logout]);

  const beginSubmission = useCallback(() => {
    const submission = ++authSubmission.current;
    setIsSubmitting(true);
    setAuthError(null);
    return (operation: number) => submission === authSubmission.current && operation === authOperation.current;
  }, []);

  const submitAuth = useCallback(async (authenticate: (onReplace: () => void) => Promise<AuthSession>) => {
    let operation = authOperation.current;
    const isCurrent = beginSubmission();
    try {
      const session = await authenticate(() => {
        // Para login social, o serviço só chama isto após confirmar a troca.
        operation = ++authOperation.current;
        setAccessToken(null);
        setUser(null);
        setIsBootstrapping(false);
      });
      if (operation !== authOperation.current) throw new DOMException("Sessão encerrada.", "AbortError");
      assertSessionActive(getSessionSignal());
      setAccessToken(session.accessToken);
      setUser(session.user);
    } catch (error) {
      if (isCurrent(operation)) setAuthError(getErrorMessage(error));
      throw error;
    } finally {
      if (isCurrent(operation)) setIsSubmitting(false);
    }
  }, [beginSubmission]);

  const login = useCallback((input: LoginInput) => submitAuth((onReplace) => authService.login(input, onReplace)), [submitAuth]);
  const register = useCallback((input: RegisterInput) => submitAuth((onReplace) => authService.register(input, onReplace)), [submitAuth]);
  const loginWithSocialCode = useCallback((code: string) => submitAuth((onReplace) => authService.exchangeSocialCode(code, onReplace)), [submitAuth]);

  const loginWithProvider = useCallback(async (provider: SocialLoginProvider) => {
    if (providerStarting.current) return;
    providerStarting.current = true;
    const operation = authOperation.current;
    const isCurrent = beginSubmission();
    try {
      await authService.startSocialLogin(provider);
    } catch (error) {
      if (isCurrent(operation)) setAuthError(getErrorMessage(error));
      throw error;
    } finally {
      providerStarting.current = false;
      if (isCurrent(operation)) setIsSubmitting(false);
    }
  }, [beginSubmission]);

  const completeProfile = useCallback(async (input: CompleteProfileInput) => {
    const operation = authOperation.current;
    const signal = getSessionSignal();
    const isCurrent = beginSubmission();
    try {
      assertSessionActive(signal);
      const updatedUser = await authService.completeProfile(input);
      assertSessionActive(signal);
      if (operation === authOperation.current) setUser(updatedUser);
    } catch (error) {
      if (isCurrent(operation)) setAuthError(getErrorMessage(error));
      throw error;
    } finally {
      if (isCurrent(operation)) setIsSubmitting(false);
    }
  }, [beginSubmission]);

  const clearAuthError = useCallback(() => setAuthError(null), []);
  const isAuthenticated = Boolean(user && accessToken);
  const value: AuthContextValue = {
    user,
    accessToken,
    isAuthenticated,
    isBootstrapping,
    isSubmitting,
    authError,
    login,
    register,
    logout,
    clearAuthError,
    loginWithProvider,
    loginWithSocialCode,
    setSocialLoginError: setAuthError,
    needsProfileCompletion: isAuthenticated && user?.profileComplete === false,
    completeProfile,
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
