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
import { LayoutGrid, LogIn, Newspaper, UserPlus, User } from "lucide-react";
import { LoginScreen } from "./components/LoginScreen";
import { RegisterScreen } from "./components/RegisterScreen";
import { ComponentsShowcase } from "./components/ComponentsShowcase";
import { ProfileScreen } from "./components/ProfileScreen";
import { SocialFeedScreen } from "./components/SocialFeedScreen";

setupIonicReact({ mode: "md" });

type Screen = "login" | "register" | "components" | "feed" | "profile";

const TAB_ITEMS: { id: Screen; label: string; Icon: React.FC<{ size: number }> }[] = [
  { id: "components", label: "Componentes", Icon: ({ size }) => <LayoutGrid size={size} /> },
  { id: "feed", label: "Feed", Icon: ({ size }) => <Newspaper size={size} /> },
  { id: "login", label: "Login", Icon: ({ size }) => <LogIn size={size} /> },
  { id: "register", label: "Cadastro", Icon: ({ size }) => <UserPlus size={size} /> },
  { id: "profile", label: "Perfil", Icon: ({ size }) => <User size={size} /> },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("components");

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
          {screen === "components" && <ComponentsShowcase />}
          {screen === "feed" && <SocialFeedScreen />}
          {screen === "login" && (
            <LoginScreen onNavigateToRegister={() => setScreen("register")} />
          )}
          {screen === "register" && (
            <RegisterScreen onNavigateToLogin={() => setScreen("login")} />
          )}
          {screen === "profile" && <ProfileScreen />}
        </IonContent>

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
            {TAB_ITEMS.map(({ id, label, Icon }) => (
              <IonTabButton
                key={id}
                tab={id}
                selected={screen === id}
                onClick={() => setScreen(id)}
                style={
                  {
                    "--color": screen === id ? "#FFD700" : "#737373",
                    "--color-selected": "#FFD700",
                    "--background": "#0A0A0A",
                  } as React.CSSProperties
                }
              >
                <Icon size={22} />
                <IonLabel>{label}</IonLabel>
              </IonTabButton>
            ))}
          </IonTabBar>
        </IonFooter>
      </IonPage>
    </IonApp>
  );
}
