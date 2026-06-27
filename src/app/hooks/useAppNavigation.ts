import { useEffect, useState } from "react";

export type AuthScreen = "login" | "register";
export type AppScreen = "feed" | "social" | "workout" | "inventory" | "profile";
export type TabId = "feed" | "social" | "workout" | "inventory" | "profile";

export function useAppNavigation(isAuthenticated: boolean) {
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const [screen, setScreen] = useState<AppScreen>("feed");

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
    setAuthScreen,
    setScreen,
    handleTabChange,
  };
}
