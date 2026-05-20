import { useEffect, useState } from "react";
import {
  setupIonicReact,
  IonApp,
  IonPage,
  IonContent,
  IonFooter,
  IonTabBar,
  IonTabButton,
  IonLabel,
} from "@ionic/react";
import { ChevronRight, Dumbbell, Newspaper, Package2, Users, User } from "lucide-react";
import { LoginScreen } from "./components/LoginScreen";
import { RegisterScreen } from "./components/RegisterScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { SocialFeedScreen } from "./components/SocialFeedScreen";
import { WorkoutStartScreen } from "./components/WorkoutStartScreen";

setupIonicReact({ mode: "md" });

type AuthScreen = "login" | "register";
type AppScreen = "feed" | "workout" | "profile";
type TabId = "feed" | "social" | "workout" | "search" | "profile";

interface ActiveWorkoutBannerState {
  selectedGroups: string[];
  startedAt: number;
}

const TAB_ITEMS: {
  id: TabId;
  label: string;
  implemented: boolean;
  Icon: React.FC<{ size: number; active: boolean }>;
}[] = [
  { id: "feed", label: "Feed", implemented: true, Icon: ({ size }) => <Newspaper size={size} /> },
  { id: "social", label: "Social", implemented: false, Icon: ({ size }) => <Users size={size} /> },
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
  { id: "search", label: "Inventário", implemented: false, Icon: ({ size }) => <Package2 size={size} /> },
  { id: "profile", label: "Perfil", implemented: true, Icon: ({ size }) => <User size={size} /> },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const [screen, setScreen] = useState<AppScreen>("feed");
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutBannerState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!activeWorkout) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - activeWorkout.startedAt) / 1000)));
    };

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);

    return () => window.clearInterval(timer);
  }, [activeWorkout]);

  function enterApp() {
    setIsAuthenticated(true);
    setScreen("feed");
  }

  function handleTabChange(tabId: TabId, implemented: boolean) {
    if (tabId === "workout") {
      setScreen("workout");
      return;
    }

    if (implemented) {
      setScreen(tabId as AppScreen);
    }
  }

  function formatElapsedTime(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  const activeWorkoutLabel = activeWorkout?.selectedGroups.join(" · ");

  return (
    <IonApp>
      <IonPage>
        <IonContent
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
          {isAuthenticated && activeWorkout && screen !== "workout" && (
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

          {!isAuthenticated && authScreen === "login" && (
            <LoginScreen
              onNavigateToRegister={() => setAuthScreen("register")}
              onLoginSuccess={enterApp}
            />
          )}
          {!isAuthenticated && authScreen === "register" && (
            <RegisterScreen
              onNavigateToLogin={() => setAuthScreen("login")}
              onRegisterSuccess={enterApp}
            />
          )}
          {isAuthenticated && (
            <>
              <div style={{ display: screen === "feed" ? "block" : "none" }}>
                <SocialFeedScreen />
              </div>
              <div style={{ display: screen === "workout" ? "block" : "none" }}>
                <WorkoutStartScreen onActiveWorkoutChange={setActiveWorkout} />
              </div>
              <div style={{ display: screen === "profile" ? "block" : "none" }}>
                <ProfileScreen />
              </div>
            </>
          )}
        </IonContent>

        {isAuthenticated && (
        <IonFooter className="ion-no-border">
          <IonTabBar
            style={
              {
                "--background": "#0A0A0A",
                "--border": "1px solid #2D2D2D",
                "--color": "#737373",
                "--color-selected": "#FFD700",
                height: "68px",
                maxWidth: "393px",
                margin: "0 auto",
                borderTopLeftRadius: "22px",
                borderTopRightRadius: "22px",
                borderLeft: "1px solid #2D2D2D",
                borderRight: "1px solid #2D2D2D",
                paddingBottom: "env(safe-area-inset-bottom)",
              } as React.CSSProperties
            }
          >
            {TAB_ITEMS.map(({ id, label, implemented, Icon }) => {
              const active = screen === id;
              return (
              <IonTabButton
                key={id}
                tab={id}
                selected={active}
                onClick={() => handleTabChange(id, implemented)}
                style={
                  {
                    "--color": active ? "#FFD700" : "#737373",
                    "--color-selected": "#FFD700",
                    "--background": "#0A0A0A",
                    opacity: implemented || id === "workout" ? 1 : 0.72,
                  } as React.CSSProperties
                }
              >
                <Icon size={id === "workout" ? 18 : 22} active={active} />
                <IonLabel>{label}</IonLabel>
              </IonTabButton>
              );
            })}
          </IonTabBar>
        </IonFooter>
        )}
      </IonPage>
    </IonApp>
  );
}
