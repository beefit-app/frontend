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
  const [history, setHistory] = useState<AppScreen[]>(["feed"]);

  function setScreen(nextScreen: AppScreen) {
    setScreenState((currentScreen) => {
      if (currentScreen !== nextScreen) {
        const currentIdx = TAB_ORDER[currentScreen] ?? 0;
        const nextIdx = TAB_ORDER[nextScreen] ?? 0;
        setDirection(nextIdx >= currentIdx ? 1 : -1);
        setHistory((currentHistory) => [...currentHistory, nextScreen]);
      }
      return nextScreen;
    });
  }

  function goBack(): boolean {
    if (history.length <= 1) {
      return false;
    }
    const nextHistory = [...history];
    nextHistory.pop(); // remove current screen
    const previousScreen = nextHistory[nextHistory.length - 1];
    setHistory(nextHistory);
    const currentIdx = TAB_ORDER[screen] ?? 0;
    const prevIdx = TAB_ORDER[previousScreen] ?? 0;
    setDirection(prevIdx >= currentIdx ? 1 : -1);
    setScreenState(previousScreen);
    return true;
  }

  useEffect(() => {
    if (isAuthenticated) {
      setScreenState("feed");
      setHistory(["feed"]);
      return;
    }

    setAuthScreen("login");
    setScreenState("feed");
    setHistory(["feed"]);
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
    goBack,
    handleTabChange,
  };
}
