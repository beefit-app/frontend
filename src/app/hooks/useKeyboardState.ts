import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

export function useKeyboardState(): boolean {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const showListener = Keyboard.addListener("keyboardWillShow", () => {
        setIsKeyboardVisible(true);
      });
      const hideListener = Keyboard.addListener("keyboardWillHide", () => {
        setIsKeyboardVisible(false);
      });

      return () => {
        void showListener.then((handle) => handle.remove());
        void hideListener.then((handle) => handle.remove());
      };
    }

    // Web fallback using visualViewport
    if (typeof window !== "undefined" && window.visualViewport) {
      const handleResize = () => {
        if (!window.visualViewport) return;
        const isShrunk = window.visualViewport.height < window.innerHeight * 0.75;
        setIsKeyboardVisible(isShrunk);
      };

      window.visualViewport.addEventListener("resize", handleResize);
      return () => {
        window.visualViewport?.removeEventListener("resize", handleResize);
      };
    }

    return undefined;
  }, []);

  return isKeyboardVisible;
}
