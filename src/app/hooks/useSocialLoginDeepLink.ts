import { useEffect } from "react";
import { App as CapApp, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { useAuth } from "../auth/AuthContext";

// com.beefit.app://auth/callback?code=...|error=... — ver AndroidManifest.xml
// (intent-filter) e Info.plist (CFBundleURLTypes), e o backend
// (OAuth2LoginSuccessHandler/FailureHandler, beefit.oauth2.callback-base-mobile).
const CALLBACK_HOST = "auth";

const SOCIAL_LOGIN_ERROR_MESSAGE =
  "O provedor rejeitou o login (token inválido ou expirado). Tente novamente.";

/**
 * Captura o retorno do navegador do sistema (aberto por authService.startSocialLogin
 * via @capacitor/browser) depois do fluxo OAuth2 do Google/Microsoft/Apple, fecha o
 * navegador e troca o código de uso único pela sessão real.
 *
 * Equivalente mobile do SocialLoginCallbackScreen (rota web /oauth-callback).
 */
export function useSocialLoginDeepLink() {
  const { loginWithSocialCode, setSocialLoginError } = useAuth();

  useEffect(() => {
    function handleCallbackUrl(rawUrl: string) {
      let url: URL;
      try {
        url = new URL(rawUrl);
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
        // sessão a estabelecer — mas o usuário ainda precisa ver que algo deu errado
        // (mesmo tratamento que a rota web /oauth-callback já dá).
        if (url.searchParams.get("error")) {
          setSocialLoginError(SOCIAL_LOGIN_ERROR_MESSAGE);
        }
        return;
      }

      void loginWithSocialCode(code).catch(() => {
        // authError já é setado pelo AuthContext; a tela de login exibe o alerta.
      });
    }

    const listenerPromise = CapApp.addListener("appUrlOpen", (event: URLOpenListenerEvent) =>
      handleCallbackUrl(event.url),
    );

    // O listener acima só pega o app já rodando em background recebendo a nova
    // intent. Se o Android matou o processo durante o OAuth2 (comum: usuário
    // passa um tempo no navegador do sistema), o retorno vira um cold start e
    // appUrlOpen nunca dispara — getLaunchUrl() é o jeito de pegar essa URL de
    // lançamento depois que o app termina de inicializar.
    void CapApp.getLaunchUrl().then((launch) => {
      if (launch?.url) {
        handleCallbackUrl(launch.url);
      }
    });

    return () => {
      void listenerPromise.then((handle) => handle.remove());
    };
  }, [loginWithSocialCode, setSocialLoginError]);
}
