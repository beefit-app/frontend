import { useRef, useState } from "react";
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
import { SocialFeedScreen } from "./components/SocialFeedScreen";
import { SocialScreen } from "./components/SocialScreen";
import { InventoryScreen } from "./components/InventoryScreen";
import { WorkoutStartScreen } from "./components/WorkoutStartScreen";
import { useAuth } from "./auth/AuthContext";
import { useAppNavigation, type TabId } from "./hooks/useAppNavigation";
import { useStreakState } from "./hooks/useStreakState";
import { useWorkoutSessionState } from "./hooks/useWorkoutSessionState";
import type { WorkoutCompletionDraft } from "./types/workout";

setupIonicReact({ mode: "md" });

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

export default function App() {
  const { isAuthenticated, isBootstrapping, user } = useAuth();
  const contentRef = useRef<HTMLIonContentElement | null>(null);
  const { authScreen, screen, setAuthScreen, setScreen, handleTabChange } = useAppNavigation(isAuthenticated);
  const { activeWorkout, elapsedSeconds, workoutScreenInstance, setActiveWorkout, completeWorkout, formatElapsedTime } =
    useWorkoutSessionState();
  const { streak, isStreakFedToday, feedStreak, clearPendingFeed, scheduleFeed } = useStreakState(
    isAuthenticated ? (user ?? null) : null,
  );
  const [accountSettings, setAccountSettings] = useState<AccountSettingsData>(DEFAULT_ACCOUNT_SETTINGS);

  function handleWorkoutCompleted(draft: WorkoutCompletionDraft) {
    clearPendingFeed();
    completeWorkout();
    setScreen("feed");

    if (!draft.shouldPostWorkout) {
      feedStreak();
      return;
    }

    window.setTimeout(() => {
      void contentRef.current?.scrollToTop(320);
      scheduleFeed(420);
    }, 40);
  }

  const activeWorkoutLabel = activeWorkout?.selectedGroups.join(" · ");
  return (
    <IonApp>
      <IonPage>
        <IonContent
          ref={contentRef}
          fullscreen
          scrollY
          forceOverscroll
          style={
            {
              "--background":
                "linear-gradient(180deg, rgba(255,215,0,0.07) 0%, transparent 100%) center var(--beefit-page-gradient-top) / 100% var(--beefit-page-gradient-height) no-repeat, #0A0A0A",
              "--color": "#ffffff",
            } as React.CSSProperties
          }
        >
          {isBootstrapping && (
            <div className="flex min-h-full items-center justify-center px-6 text-center">
              <div className="max-w-[280px]">
                <span className="block font-montserrat text-[14px] font-bold uppercase tracking-[0.12em] text-[#B8A65A]">
                  BeeFit
                </span>
                <span className="mt-3 block font-inter text-[15px] text-[#D4D4D4]">
                  Restaurando sua sessão...
                </span>
              </div>
            </div>
          )}

          {!isBootstrapping && isAuthenticated && activeWorkout && screen !== "workout" && (
            <div className="px-3 pt-3">
              <button
                type="button"
                onClick={() => setScreen("workout")}
                className="mx-auto flex w-full max-w-[393px] items-center justify-between gap-3 rounded-[20px] border border-[rgba(255,215,0,0.28)] bg-[linear-gradient(135deg,rgba(255,215,0,0.14)_0%,rgba(20,20,20,0.98)_34%,rgba(20,20,20,0.98)_100%)] px-4 py-3 text-left shadow-[0_12px_30px_rgba(0,0,0,0.24)]"
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

          {!isBootstrapping && !isAuthenticated && authScreen === "login" && (
            <LoginScreen
              onNavigateToRegister={() => setAuthScreen("register")}
            />
          )}
          {!isBootstrapping && !isAuthenticated && authScreen === "register" && (
            <RegisterScreen
              onNavigateToLogin={() => setAuthScreen("login")}
            />
          )}
          {!isBootstrapping && isAuthenticated && (
            <>
              <div style={{ display: screen === "feed" ? "block" : "none" }}>
                <SocialFeedScreen
                  streakCount={streak.count}
                  isStreakFedToday={isStreakFedToday}
                  streakBurstToken={streak.burstToken}
                />
              </div>
              <div style={{ display: screen === "social" ? "block" : "none" }}>
                <SocialScreen isActive={screen === "social"} />
              </div>
              <div style={{ display: screen === "workout" ? "block" : "none" }}>
                <WorkoutStartScreen
                  key={workoutScreenInstance}
                  ghostModeEnabled={accountSettings.ghostModeEnabled}
                  onActiveWorkoutChange={setActiveWorkout}
                  onWorkoutCompleted={handleWorkoutCompleted}
                />
              </div>
              <div style={{ display: screen === "inventory" ? "block" : "none" }}>
                <InventoryScreen />
              </div>
              <div style={{ display: screen === "profile" ? "block" : "none" }}>
                <ProfileScreen
                  accountSettings={accountSettings}
                  onAccountSettingsChange={setAccountSettings}
                />
              </div>
            </>
          )}

        </IonContent>

        {!isBootstrapping && isAuthenticated && (
          <IonFooter
            className="ion-no-border"
            data-testid="bottom-navigation"
            style={{
              background: "#0A0A0A",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <nav
              aria-label="Navegação principal"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                width: "100%",
                maxWidth: 393,
                height: 68,
                margin: "0 auto",
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
                      color: active ? "#FFD700" : "#737373",
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
                      letterSpacing: "0.05em",
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
    </IonApp>
  );
}
