import { useEffect, useState } from "react";

export type AuthScreen = "login" | "register";
export type AppScreen = "feed" | "social" | "workout" | "inventory" | "profile";
export type TabId = "feed" | "social" | "workout" | "inventory" | "profile";

export const TAB_ORDER: Record<AppScreen, number> = {
  feed: 0,
  social: 1,
  workout: 2,
  inventory: 3,
  profile: 4,
};

export function useAppNavigation(isAuthenticated: boolean) {
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const [screen, setScreenState] = useState<AppScreen>("feed");
  const [direction, setDirection] = useState<number>(1);

  function setScreen(nextScreen: AppScreen) {
    setScreenState((currentScreen) => {
      if (currentScreen !== nextScreen) {
        const currentIdx = TAB_ORDER[currentScreen] ?? 0;
        const nextIdx = TAB_ORDER[nextScreen] ?? 0;
        setDirection(nextIdx >= currentIdx ? 1 : -1);
      }
      return nextScreen;
    });
  }

  useEffect(() => {
    if (isAuthenticated) {
      setScreen("feed");
      return;
    }

    setAuthScreen("login");
    setScreen("feed");
  }, [isAuthenticated]);

  function handleTabChange(tabId: TabId, implemented: boolean) {
    if (tabId === "workout") {
      setScreen("workout");
      return;
    }

    if (implemented) {
      setScreen(tabId as AppScreen);
    }
  }

  return {
    authScreen,
    screen,
    direction,
    setAuthScreen,
    setScreen,
    handleTabChange,
  };
}
