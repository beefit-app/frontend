import { useEffect, useRef, useState } from "react";
import { App as CapApp, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../auth/AuthContext";
import { socialLoginErrorMessage } from "../utils/socialLoginErrors";

// Mesmo callback registrado no AndroidManifest.xml e no Info.plist.
export function useSocialLoginDeepLink() {
  const { isBootstrapping, loginWithSocialCode, setSocialLoginError } = useAuth();
  const [callback, setCallback] = useState<URL | null>(null);
  const lastCode = useRef<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listening = true;

    function handleCallbackUrl(rawUrl: string) {
      if (!listening) return;
      let url: URL;
      try {
        url = new URL(rawUrl);
      } catch {
        return;
      }
      if (url.protocol !== "com.beefit.app:" || url.host !== "auth" || url.pathname !== "/callback") return;
      setCallback(url);
    }

    const listener = CapApp.addListener("appUrlOpen", (event: URLOpenListenerEvent) => handleCallbackUrl(event.url));
    function reportListenerFailure() {
      if (listening) setSocialLoginError("Não foi possível receber o retorno do login social. Tente novamente.");
    }
    void listener.catch(reportListenerFailure);

    // No cold start do Android, appUrlOpen pode não disparar.
    void CapApp.getLaunchUrl().then((launch) => {
      if (launch?.url) handleCallbackUrl(launch.url);
    }).catch(reportListenerFailure);

    return () => {
      listening = false;
      void listener.then((handle) => handle.remove(), () => undefined).catch(() => {
        console.warn("Não foi possível remover o listener do login social.");
      });
    };
  }, [setSocialLoginError]);

  useEffect(() => {
    // A restauração pode encerrar uma sessão antiga; só troque o código depois dela.
    if (isBootstrapping || !callback) return;
    setCallback(null);
    const providerError = callback.searchParams.get("error");
    const code = callback.searchParams.get("code");
    if (!providerError && code) {
      if (lastCode.current === code) return; // getLaunchUrl e appUrlOpen podem entregar o mesmo retorno.
      lastCode.current = code;
    }

    void Browser.close().catch(() => {
      console.warn("Não foi possível fechar o navegador do login social.");
    });
    if (providerError || !code) {
      setSocialLoginError(socialLoginErrorMessage(providerError));
      return;
    }
    void loginWithSocialCode(code).catch(() => {
      // O AuthContext publica a falha da operação atual em authError.
    });
  }, [callback, isBootstrapping, loginWithSocialCode, setSocialLoginError]);
}
