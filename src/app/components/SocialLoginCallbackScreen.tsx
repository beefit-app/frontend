import { useEffect, useRef, useState } from "react";
import { IonText } from "@ionic/react";
import { useAuth } from "../auth/AuthContext";
import { BeeAlert } from "./BeeAlert";
import { BeeButton } from "./BeeButton";
import { PageBackground } from "./PageBackground";
import { SOCIAL_LOGIN_GENERIC_ERROR, socialLoginErrorMessage } from "../utils/socialLoginErrors";

/**
 * Rota de callback web do login social (/oauth-callback?code=...|error=...).
 * O backend (OAuth2LoginSuccessHandler/FailureHandler) redireciona pra aqui depois
 * do fluxo Authorization Code com o Google/Microsoft/Apple. No mobile o equivalente é o
 * deep link capturado por useSocialLoginDeepLink.ts — essa tela só existe pra web.
 *
 * O path não pode começar com /auth: o vite.config.ts faz proxy de /auth/** pro
 * backend em dev, e essa rota nunca chegaria aqui se começasse assim.
 */
export function SocialLoginCallbackScreen({ onDone }: { onDone: () => void }) {
  const { loginWithSocialCode } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const providerError = params.get("error");

    if (providerError || !code) {
      setError(socialLoginErrorMessage(providerError));
      return;
    }

    loginWithSocialCode(code)
      .then(() => onDone())
      .catch(() => {
        setError(SOCIAL_LOGIN_GENERIC_ERROR);
      });
  }, [loginWithSocialCode, onDone]);

  return (
    <PageBackground className="flex min-h-full flex-col items-center justify-center gap-4 px-6 text-center">
      {!error && (
        <IonText style={{ fontFamily: "var(--font-inter)", fontSize: 14, color: "#A3A3A3" }}>
          Concluindo login…
        </IonText>
      )}

      {error && (
        <div className="w-full max-w-[320px]">
          <BeeAlert>{error}</BeeAlert>
          <div className="mt-4">
            {/* No callback o boot não restaura sessão; ao voltar, restaure a que foi preservada. */}
            <BeeButton type="button" variant="primary" shape="soft" fullWidth onClick={() => window.location.replace("/")}>
              Voltar
            </BeeButton>
          </div>
        </div>
      )}
    </PageBackground>
  );
}
