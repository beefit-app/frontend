import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { authService, type SocialLoginProvider } from "../services/authService";
import { AUTH_UNAUTHORIZED_EVENT, ApiError, PROFILE_INCOMPLETE_EVENT } from "../services/apiClient";
import type {
  AuthSession,
  AuthUser,
  CompleteProfileInput,
  LoginInput,
  RegisterInput,
} from "../types/auth";

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
  /** Pro deep link mobile reportar "?error=oauth_failed" sem precisar simular uma troca de código. */
  setSocialLoginError: (message: string) => void;
  /** Conta criada via login social que ainda não informou peso, meta e aceite dos termos. */
  needsProfileCompletion: boolean;
  completeProfile: (input: CompleteProfileInput) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Rota de callback web do login social (ver SocialLoginCallbackScreen/App.tsx):
// essa página sempre estabelece sua própria sessão a partir do código de troca,
// então o restore automático de sessão (abaixo) é pulado aqui — rodar os dois em
// paralelo correria o risco de um sobrescrever o resultado do outro (ex: uma
// sessão antiga inválida sendo limpa depois que o login social acabou de suceder).
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

  useEffect(() => {
    if (window.location.pathname === SOCIAL_CALLBACK_PATHNAME) {
      setIsBootstrapping(false);
      return;
    }

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

  // O backend é a fonte da verdade: se ele recusou por cadastro incompleto, a
  // sessão local (possivelmente restaurada do cache) estava desatualizada.
  useEffect(() => {
    function handleProfileIncomplete() {
      setUser((current) => (current ? { ...current, profileComplete: false } : current));
    }

    window.addEventListener(PROFILE_INCOMPLETE_EVENT, handleProfileIncomplete);

    return () => {
      window.removeEventListener(PROFILE_INCOMPLETE_EVENT, handleProfileIncomplete);
    };
  }, []);

  const establishSession = useCallback((session: AuthSession) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
  }, []);

  // Compartilhado por login/register/loginWithSocialCode: os três tratavam falha
  // exatamente da mesma forma (limpar sessão local, setar authError, repropagar).
  const resetSessionAfterFailure = useCallback(async (error: unknown): Promise<never> => {
    await authService.logout();
    setAccessToken(null);
    setUser(null);
    setAuthError(getErrorMessage(error));
    throw error;
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      setIsSubmitting(true);
      setAuthError(null);

      try {
        const session = await authService.login(input);
        establishSession(session);
      } catch (error) {
        await resetSessionAfterFailure(error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [establishSession, resetSessionAfterFailure],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      setIsSubmitting(true);
      setAuthError(null);

      try {
        const session = await authService.register(input);
        establishSession(session);
      } catch (error) {
        await resetSessionAfterFailure(error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [establishSession, resetSessionAfterFailure],
  );

  const loginWithProvider = useCallback(async (provider: SocialLoginProvider) => {
    // isSubmitting já desabilita os botões sociais na tela (mesma prop usada pro
    // form tradicional) — sem isso, um duplo toque no nativo podia abrir dois
    // navegadores/redirects OAuth2 concorrentes antes do primeiro Browser.open resolver.
    setIsSubmitting(true);
    setAuthError(null);

    try {
      await authService.startSocialLogin(provider);
    } catch (error) {
      setAuthError(getErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const loginWithSocialCode = useCallback(
    async (code: string) => {
      setIsSubmitting(true);
      setAuthError(null);

      try {
        const session = await authService.exchangeSocialCode(code);
        establishSession(session);
      } catch (error) {
        await resetSessionAfterFailure(error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [establishSession, resetSessionAfterFailure],
  );

  const logout = useCallback(async (options?: { isAccountDeletion?: boolean }) => {
    await authService.logout(options);
    setAccessToken(null);
    setUser(null);
    setAuthError(null);
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const setSocialLoginError = useCallback((message: string) => {
    setAuthError(message);
  }, []);

  // Diferente de login/register, uma falha aqui não derruba a sessão: o usuário
  // continua autenticado na tela de completar e pode corrigir e reenviar.
  const completeProfile = useCallback(async (input: CompleteProfileInput) => {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      setUser(await authService.completeProfile(input));
    } catch (error) {
      setAuthError(getErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

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
    setSocialLoginError,
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
