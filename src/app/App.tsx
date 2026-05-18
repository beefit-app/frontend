import { useState } from "react";
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
import { Dumbbell, Newspaper, Search, Users, User } from "lucide-react";
import { LoginScreen } from "./components/LoginScreen";
import { RegisterScreen } from "./components/RegisterScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { SocialFeedScreen } from "./components/SocialFeedScreen";

setupIonicReact({ mode: "md" });

type AuthScreen = "login" | "register";
type AppScreen = "feed" | "profile";
type TabId = "feed" | "social" | "workout" | "search" | "profile";

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
    implemented: false,
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
  { id: "search", label: "Buscar", implemented: false, Icon: ({ size }) => <Search size={size} /> },
  { id: "profile", label: "Perfil", implemented: true, Icon: ({ size }) => <User size={size} /> },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const [screen, setScreen] = useState<AppScreen>("feed");

  function enterApp() {
    setIsAuthenticated(true);
    setScreen("feed");
  }

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
            } as React.CSSProperties
          }
        >
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
          {isAuthenticated && screen === "feed" && <SocialFeedScreen />}
          {isAuthenticated && screen === "profile" && <ProfileScreen />}
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
                height: "60px",
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
                onClick={() => {
                  if (implemented) setScreen(id as AppScreen);
                }}
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
