import { useEffect } from "react";
import { App as CapApp, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { useAuth } from "../auth/AuthContext";

// com.beefit.app://auth/callback?code=...|error=... — ver AndroidManifest.xml
// (intent-filter) e Info.plist (CFBundleURLTypes), e o backend
// (OAuth2LoginSuccessHandler/FailureHandler, beefit.oauth2.callback-base-mobile).
const CALLBACK_HOST = "auth";

/**
 * Captura o retorno do navegador do sistema (aberto por authService.startSocialLogin
 * via @capacitor/browser) depois do fluxo OAuth2 do Google/Microsoft, fecha o
 * navegador e troca o código de uso único pela sessão real.
 *
 * Equivalente mobile do SocialLoginCallbackScreen (rota web /auth/callback).
 */
export function useSocialLoginDeepLink() {
  const { loginWithSocialCode } = useAuth();

  useEffect(() => {
    const listenerPromise = CapApp.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      let url: URL;
      try {
        url = new URL(event.url);
      } catch {
        return;
      }

      if (url.host !== CALLBACK_HOST) return;

      void Browser.close().catch(() => {
        // Sem navegador aberto pra fechar (ex: usuário já voltou manualmente) — ignora.
      });

      const code = url.searchParams.get("code");
      if (!code) {
        // Provedor negou/expirou (?error=oauth_failed): sem código de troca, não há
        // sessão a estabelecer. O usuário permanece na tela de login e pode tentar
        // de novo pelo botão — não há aviso dedicado pra esse caso no mobile ainda.
        return;
      }

      void loginWithSocialCode(code).catch(() => {
        // authError já é setado pelo AuthContext; a tela de login exibe o alerta.
      });
    });

    return () => {
      void listenerPromise.then((handle) => handle.remove());
    };
  }, [loginWithSocialCode]);
}
