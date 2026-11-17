import { IonCheckbox, IonText } from "@ionic/react";
import type { LegalVersions } from "../types/auth";

interface LegalConsentFieldProps {
  checked: boolean;
  onChange: (accepted: boolean) => void;
  legalVersions: LegalVersions | null;
  isLoading: boolean;
  error?: string;
  onRetry: () => void;
}

/**
 * Aceite dos Termos de Uso e da Política de Privacidade, usado no cadastro
 * tradicional (RegisterScreen) e no "Complete seu cadastro" do login social
 * (CompleteProfileScreen). Sem as versões vigentes carregadas não há o que
 * registrar como aceite, então o checkbox fica desabilitado até elas chegarem.
 */
export function LegalConsentField({
  checked,
  onChange,
  legalVersions,
  isLoading,
  error,
  onRetry,
}: LegalConsentFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-start gap-3 cursor-pointer">
        <IonCheckbox
          aria-label="Aceito os Termos de Uso e a Política de Privacidade"
          checked={checked}
          disabled={isLoading || !legalVersions}
          onIonChange={(ev) => onChange(ev.detail.checked)}
          style={{ "--size": "20px", marginTop: 2 } as React.CSSProperties}
        />
        <IonText
          style={{
            fontFamily: "var(--font-inter)",
            fontSize: 13,
            color: "#8A8A8A",
            lineHeight: 1.4,
          }}
        >
          Li e aceito os{" "}
          {/* Sem cor propria, o sublinhado e a unica pista de que sao links. */}
          <a className="underline" href="/terms" target="_blank" rel="noreferrer">
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a className="underline" href="/privacy" target="_blank" rel="noreferrer">
            Política de Privacidade
          </a>
          .
        </IonText>
      </label>

      {isLoading && (
        <IonText style={{ fontFamily: "var(--font-inter)", fontSize: 12, color: "#8A8A8A" }}>
          Carregando os documentos...
        </IonText>
      )}

      {error && (
        <IonText role="alert" style={{ fontFamily: "var(--font-inter)", fontSize: 12, color: "#FF4D4D" }}>
          {error}
        </IonText>
      )}

      {!isLoading && !legalVersions && (
        <button
          type="button"
          className="self-start text-[#FFD700] text-xs underline"
          onClick={onRetry}
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
