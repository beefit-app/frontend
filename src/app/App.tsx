import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { motion as Motion } from "motion/react";
import {
  setupIonicReact,
  IonApp,
  IonPage,
  IonContent,
  IonFooter,
} from "@ionic/react";
import { ChevronRight, Dumbbell, Newspaper, Package2, Users, User } from "lucide-react";
import { LoginScreen } from "./components/LoginScreen";
import { RegisterScreen } from "./components/RegisterScreen";
import { DEFAULT_ACCOUNT_SETTINGS, ProfileScreen, type AccountSettingsData } from "./components/ProfileScreen";
import { WorkoutStartScreen } from "./components/WorkoutStartScreen";
import { LegalDocuments } from "./components/LegalDocuments";
import { SocialLoginCallbackScreen } from "./components/SocialLoginCallbackScreen";
import { CompleteProfileScreen } from "./components/CompleteProfileScreen";
import { WorkoutShareSheet, type WorkoutShareTarget } from "./components/workout-share";
import { App as CapApp } from "@capacitor/app";
import { useAuth } from "./auth/AuthContext";
import { useAppNavigation, type TabId } from "./hooks/useAppNavigation";
import { useSocialLoginDeepLink } from "./hooks/useSocialLoginDeepLink";
import { useStreakState } from "./hooks/useStreakState";
import { useWorkoutSessionState } from "./hooks/useWorkoutSessionState";
import { useKeyboardState } from "./hooks/useKeyboardState";
import { warmupAppData } from "./services/appWarmupService";
import { profileService } from "./services/profileService";
import { pageCacheStorage } from "./storage/pageCacheStorage";
import { resetFeedCache } from "./components/social-feed/hooks/useSocialFeedState";
import type { WorkoutCompletionDraft, WorkoutCompletionSummary } from "./types/workout";
import { Toaster } from "./components/ui/sonner";
import logoImg from "../imports/logo.png";

setupIonicReact({ mode: "md" });

const SocialFeedScreen = lazy(() => import("./components/SocialFeedScreen").then(({ SocialFeedScreen }) => ({ default: SocialFeedScreen })));
const SocialScreen = lazy(() => import("./components/SocialScreen").then(({ SocialScreen }) => ({ default: SocialScreen })));
const InventoryScreen = lazy(() => import("./components/InventoryScreen").then(({ InventoryScreen }) => ({ default: InventoryScreen })));
const AdminScreen = lazy(() => import("./components/admin/AdminScreen").then(({ AdminScreen }) => ({ default: AdminScreen })));

// O app nao usa IonHeader/IonToolbar em nenhuma tela e todos os IonContent sao
// fullscreen, entao o Ionic nao aplica o recuo do notch sozinho. Consumimos aqui
// a variavel que o proprio Ionic ja define em html (core.css), que resolve para
// 0px no browser desktop.
const SAFE_AREA_TOP_PADDING = {
  "--padding-top": "var(--ion-safe-area-top, 0px)",
} as React.CSSProperties;

function DeferredScreen({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="p-6 text-center font-inter text-sm text-[#A3A3A3]">Carregando…</div>}>{children}</Suspense>;
}

const TAB_ITEMS: {
  id: TabId;
  label: string;
  implemented: boolean;
  Icon: React.FC<{ size: number; active: boolean }>;
}[] = [
  { id: "feed", label: "Feed", implemented: true, Icon: ({ size }) => <Newspaper size={size} /> },
  { id: "social", label: "Social", implemented: true, Icon: ({ size }) => <Users size={size} /> },
  {
    id: "workout",
    label: "Treino",
    implemented: true,
    Icon: ({ size }) => (
      <span
        className="flex items-center justify-center"
        style={{
          width: 34,
          height: 38,
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          background: "#FFD700",
          color: "#0A0A0A",
          boxShadow: "0 4px 20px rgba(255,215,0,0.3)",
        }}
      >
        <Dumbbell size={size} />
      </span>
    ),
  },
  { id: "inventory", label: "Inventário", implemented: true, Icon: ({ size }) => <Package2 size={size} /> },
  { id: "profile", label: "Perfil", implemented: true, Icon: ({ size }) => <User size={size} /> },
];

class ScreenErrorBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(previousProps: { resetKey: string }) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-full items-center justify-center px-6 text-center">
          <div className="max-w-[320px] rounded-[22px] border border-[rgba(248,113,113,0.32)] bg-[#141414] px-5 py-6">
            <p className="font-montserrat text-[15px] font-bold text-[#FCA5A5]">
              Não foi possível renderizar esta tela.
            </p>
            <p className="mt-2 font-inter text-[13px] leading-5 text-[#A3A3A3]">
              {this.state.error.message || "Erro inesperado de interface."}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const { isAuthenticated: hasSession, isBootstrapping, user, needsProfileCompletion } = useAuth();
  // Conta social com cadastro incompleto tem sessão, mas o app em si (e as rotas
  // /api/** no backend) fica travado até a CompleteProfileScreen: para tudo abaixo
  // — navegação, warmup, streak, abas — ela conta como não autenticada.
  const isAuthenticated = hasSession && !needsProfileCompletion;
  const contentRef = useRef<HTMLIonContentElement | null>(null);
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const { authScreen, screen, direction: _direction, setAuthScreen, setScreen, goBack, handleTabChange } = useAppNavigation(isAuthenticated);
  const isKeyboardVisible = useKeyboardState();
  useSocialLoginDeepLink();
  const { activeWorkout, elapsedSeconds, workoutScreenInstance, setActiveWorkout, completeWorkout, formatElapsedTime } =
    useWorkoutSessionState();
  const { streak, isStreakFedToday, clearPendingFeed, syncStreakCount } = useStreakState(
    isAuthenticated ? user : null,
  );
  const [accountSettings, setAccountSettings] = useState<AccountSettingsData>(DEFAULT_ACCOUNT_SETTINGS);
  const [feedRefreshToken, setFeedRefreshToken] = useState(0);
  const [profileRefreshToken, setProfileRefreshToken] = useState(0);
  const [socialProfileUsername, setSocialProfileUsername] = useState<string | null>(null);
  const [socialProfileReturnScreen, setSocialProfileReturnScreen] = useState<"feed" | "social">("social");
  const [workoutShareTarget, setWorkoutShareTarget] = useState<WorkoutShareTarget | null>(null);
  const isAdminRoute = pathname.startsWith("/admin");
  const legalDocument = pathname === "/privacy" ? "privacy" : pathname === "/terms" ? "terms" : null;
  // Não pode começar com /auth: o vite.config.ts faz proxy de /auth/** pro
  // backend em dev, e essa rota nunca chegaria na SPA se começasse assim.
  const isSocialCallbackRoute = pathname === "/oauth-callback";

  const [visitedScreens, setVisitedScreens] = useState<Set<TabId>>(() => new Set(["feed"]));

  useEffect(() => {
    setVisitedScreens((prev) => {
      if (prev.has(screen)) return prev;
      const next = new Set(prev);
      next.add(screen);
      return next;
    });
    void contentRef.current?.scrollToTop(0);
  }, [screen]);

  useEffect(() => {
    if (isAuthenticated && user) {
      void warmupAppData(user);
    }
  }, [isAuthenticated, user]);

  // O alvo guarda a foto do treino em memória; quem entra depois de um logout não
  // pode reabrir o card de outra conta.
  useEffect(() => {
    if (!isAuthenticated) setWorkoutShareTarget(null);
  }, [isAuthenticated]);

  useEffect(() => {
    const backListener = CapApp.addListener("backButton", () => {
      if (socialProfileUsername !== null) {
        setSocialProfileUsername(null);
        if (socialProfileReturnScreen !== "social") {
          setScreen(socialProfileReturnScreen);
        }
        return;
      }
      const hasPopped = goBack();
      if (!hasPopped) {
        void CapApp.exitApp();
      }
    });

    return () => {
      void backListener.then((handle) => handle.remove());
    };
  }, [goBack, setScreen, socialProfileReturnScreen, socialProfileUsername]);

  if (isSocialCallbackRoute) {
    return (
      <IonApp>
        <IonPage>
          <IonContent fullscreen style={SAFE_AREA_TOP_PADDING}>
            <SocialLoginCallbackScreen
              onDone={() => {
                window.history.replaceState(null, "", "/");
                setPathname("/");
              }}
            />
          </IonContent>
        </IonPage>
      </IonApp>
    );
  }

  if (legalDocument) {
    return (
      <IonApp>
        <IonPage>
          <IonContent fullscreen style={SAFE_AREA_TOP_PADDING}>
            <LegalDocuments document={legalDocument} />
          </IonContent>
        </IonPage>
      </IonApp>
    );
  }

  // Depois de /terms e /privacy (os links do aceite abrem em nova aba e precisam
  // renderizar o documento) e antes de qualquer tela do app ou do admin.
  if (!isBootstrapping && needsProfileCompletion) {
    return (
      <IonApp>
        <IonPage>
          <IonContent fullscreen style={SAFE_AREA_TOP_PADDING}>
            <CompleteProfileScreen />
          </IonContent>
        </IonPage>
      </IonApp>
    );
  }

  function handleWorkoutCompleted(draft: WorkoutCompletionDraft, summary: WorkoutCompletionSummary) {
    setWorkoutShareTarget({ draft, summary });
    clearPendingFeed();
    completeWorkout();
    resetFeedCache();
    void pageCacheStorage.remove(user?.id, "feed.page-0");
    void pageCacheStorage.remove(user?.id, "profile.posts");
    void pageCacheStorage.remove(user?.id, "profile.trained-days");
    setFeedRefreshToken((v) => v + 1);
    setScreen("feed");
    void contentRef.current?.scrollToTop(320);
    void (async () => {
      try {
        const profile = await profileService.getProfile(user);
        syncStreakCount(profile.streak);
      } catch {
        // Mantem o valor atual quando o refresh do perfil falha.
      }
    })();
  }

  function handleWorkoutDeleted(source: "feed" | "profile") {
    if (source === "feed") {
      setProfileRefreshToken((v) => v + 1);
    } else {
      setFeedRefreshToken((v) => v + 1);
    }
    void (async () => {
      try {
        const profile = await profileService.getProfile(user);
        syncStreakCount(profile.streak);
      } catch {
        // Mantem o valor atual quando o refresh do perfil falha.
      }
    })();
  }

  function openSocialProfile(username: string) {
    setSocialProfileUsername(username);
    setSocialProfileReturnScreen("feed");
    setScreen("social");
  }

  const activeWorkoutLabel = activeWorkout?.selectedGroups.join(" · ");

  if (isAdminRoute) {
    return (
      <IonApp>
        <IonPage>
          <IonContent
            fullscreen
            scrollY
            style={
              {
                "--background": "#0A0A0A",
                "--color": "#ffffff",
                ...SAFE_AREA_TOP_PADDING,
              } as React.CSSProperties
            }
          >
            {isBootstrapping && (
              <div className="flex min-h-full items-center justify-center px-6 text-center">
                <Motion.div
                  initial={{ opacity: 0.4, scale: 0.95 }}
                  animate={{ opacity: [0.4, 1, 0.4], scale: [0.95, 1.02, 0.95] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="flex flex-col items-center"
                >
                  <img
                    src={logoImg}
                    alt="BeeFit"
                    className="h-20 w-20 object-contain drop-shadow-[0_0_24px_rgba(255,215,0,0.25)]"
                  />
                </Motion.div>
              </div>
            )}
            {!isBootstrapping && (
              <ScreenErrorBoundary resetKey={`admin:${isAuthenticated}:${user?.email ?? ""}`}>
                {!isAuthenticated && (
                  <LoginScreen
                    onNavigateToRegister={() => {
                      window.location.pathname = "/";
                    }}
                  />
                )}
                {isAuthenticated && <DeferredScreen><AdminScreen /></DeferredScreen>}
              </ScreenErrorBoundary>
            )}
          </IonContent>
        </IonPage>
      </IonApp>
    );
  }

  return (
    <IonApp>
      <IonPage>
        <IonContent
          ref={contentRef}
          fullscreen
          scrollY
          style={
            {
              "--background":
                "linear-gradient(180deg, rgba(255,215,0,0.07) 0%, transparent 100%) center var(--beefit-page-gradient-top) / 100% var(--beefit-page-gradient-height) no-repeat, #0A0A0A",
              "--color": "#ffffff",
              overscrollBehaviorY: "none",
              ...SAFE_AREA_TOP_PADDING,
            } as React.CSSProperties
          }
        >
          {isBootstrapping && (
            <div className="flex min-h-full items-center justify-center px-6 text-center">
              <Motion.div
                initial={{ opacity: 0.4, scale: 0.95 }}
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.95, 1.02, 0.95] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="flex flex-col items-center"
              >
                <img
                  src={logoImg}
                  alt="BeeFit"
                  className="h-20 w-20 rounded-2xl object-contain drop-shadow-[0_0_24px_rgba(255,215,0,0.25)]"
                />
              </Motion.div>
            </div>
          )}

          {!isBootstrapping && isAuthenticated && activeWorkout && screen !== "workout" && (
            <div className="px-3 pt-3">
              <button
                type="button"
                onClick={() => setScreen("workout")}
                className="beefit-shell-width flex items-center justify-between gap-3 rounded-[20px] border border-[rgba(255,215,0,0.28)] bg-[linear-gradient(135deg,rgba(255,215,0,0.14)_0%,rgba(20,20,20,0.98)_34%,rgba(20,20,20,0.98)_100%)] px-4 py-3 text-left shadow-[0_12px_30px_rgba(0,0,0,0.24)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[rgba(255,215,0,0.24)] bg-[rgba(255,215,0,0.12)] text-[#FFD700]">
                    <Dumbbell size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="block font-montserrat text-[11px] font-bold uppercase tracking-[0.12em] text-[#B8A65A]">
                      Treino ativo
                    </span>
                    <span className="block truncate font-montserrat text-[14px] font-bold text-white">
                      {activeWorkoutLabel}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-montserrat text-[16px] font-bold text-[#FFD700]">
                    {formatElapsedTime(elapsedSeconds)}
                  </span>
                  <ChevronRight size={16} color="#FFD700" />
                </div>
              </button>
            </div>
          )}

          {!isBootstrapping && (
            <ScreenErrorBoundary
              resetKey={`${isAuthenticated}:${authScreen}:${screen}:${feedRefreshToken}:${workoutScreenInstance}:${profileRefreshToken}`}
            >
              {!isAuthenticated && authScreen === "login" && (
                <LoginScreen
                  onNavigateToRegister={() => setAuthScreen("register")}
                />
              )}
              {!isAuthenticated && authScreen === "register" && (
                <RegisterScreen
                  onNavigateToLogin={() => setAuthScreen("login")}
                />
              )}
              {isAuthenticated && (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    minHeight: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {visitedScreens.has("feed") && (
                    <div
                      style={{
                        display: screen === "feed" ? "block" : "none",
                        width: "100%",
                      }}
                    >
                      <DeferredScreen>
                        <SocialFeedScreen
                          key={feedRefreshToken}
                          streakCount={streak.count}
                          isStreakFedToday={isStreakFedToday}
                          streakBurstToken={streak.burstToken}
                          onOpenUserProfile={openSocialProfile}
                          onWorkoutDeleted={() => handleWorkoutDeleted("feed")}
                        />
                      </DeferredScreen>
                    </div>
                  )}

                  {visitedScreens.has("social") && (
                    <div
                      style={{
                        display: screen === "social" ? "block" : "none",
                        width: "100%",
                      }}
                    >
                      <DeferredScreen>
                        <SocialScreen
                          isActive={screen === "social"}
                          profileUsername={socialProfileUsername}
                          onOpenProfileFromSocial={() => setSocialProfileReturnScreen("social")}
                          onProfileClosed={() => {
                            setSocialProfileUsername(null);
                            if (socialProfileReturnScreen !== "social") {
                              setScreen(socialProfileReturnScreen);
                            }
                          }}
                        />
                      </DeferredScreen>
                    </div>
                  )}

                  {visitedScreens.has("workout") && (
                    <div
                      style={{
                        display: screen === "workout" ? "block" : "none",
                        width: "100%",
                      }}
                    >
                      <WorkoutStartScreen
                        key={workoutScreenInstance}
                        ghostModeEnabled={accountSettings.ghostModeEnabled}
                        onActiveWorkoutChange={setActiveWorkout}
                        onWorkoutCompleted={handleWorkoutCompleted}
                      />
                    </div>
                  )}

                  {visitedScreens.has("inventory") && (
                    <div
                      style={{
                        display: screen === "inventory" ? "block" : "none",
                        width: "100%",
                      }}
                    >
                      <DeferredScreen>
                        <InventoryScreen />
                      </DeferredScreen>
                    </div>
                  )}

                  {visitedScreens.has("profile") && (
                    <div
                      style={{
                        display: screen === "profile" ? "block" : "none",
                        width: "100%",
                      }}
                    >
                      <ProfileScreen
                        key={profileRefreshToken}
                        accountSettings={accountSettings}
                        onAccountSettingsChange={setAccountSettings}
                        onWorkoutDeleted={() => handleWorkoutDeleted("profile")}
                      />
                    </div>
                  )}
                </div>
              )}
            </ScreenErrorBoundary>
          )}

        </IonContent>

        {!isBootstrapping && isAuthenticated && !isKeyboardVisible && (
          <IonFooter
            className="ion-no-border"
            data-testid="bottom-navigation"
            style={{
              background: "#0A0A0A",
              paddingBottom: "var(--ion-safe-area-bottom, 0px)",
            }}
          >
            <nav
              aria-label="Navegação principal"
              className="beefit-shell-width"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                height: 68,
                background: "#0A0A0A",
                borderTop: "2px solid #FFD700",
                borderLeft: "1px solid #2D2D2D",
                borderRight: "1px solid #2D2D2D",
                borderTopLeftRadius: 22,
                borderTopRightRadius: 22,
                boxShadow: "0 -12px 32px rgba(0,0,0,0.42)",
                overflow: "hidden",
              }}
            >
              {TAB_ITEMS.map(({ id, label, implemented, Icon }) => {
                const active = screen === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => handleTabChange(id, implemented)}
                    style={{
                      minWidth: 0,
                      border: "none",
                      background: "transparent",
                      color: active ? "#FFD700" : "#8A8A8A",
                      opacity: implemented || id === "workout" ? 1 : 0.72,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: "6px 4px",
                      fontFamily: "var(--font-montserrat)",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    <Icon size={id === "workout" ? 18 : 22} active={active} />
                    <span
                      style={{
                        display: "block",
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </IonFooter>
        )}
      </IonPage>
      {isAuthenticated && (
        <WorkoutShareSheet target={workoutShareTarget} onClose={() => setWorkoutShareTarget(null)} />
      )}
      <Toaster />
    </IonApp>
  );
}
