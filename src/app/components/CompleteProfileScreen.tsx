import { useCallback, useEffect, useState } from "react";
import { IonCard, IonCardContent, IonCol, IonGrid, IonRow, IonText } from "@ionic/react";
import logoImg from "../../imports/logo.png";
import { BeeAlert } from "./BeeAlert";
import { BeeButton } from "./BeeButton";
import { BeeInput } from "./BeeInput";
import { LegalConsentField } from "./LegalConsentField";
import { PageBackground } from "./PageBackground";
import { useAuth } from "../auth/AuthContext";
import { extractFieldErrors } from "../services/apiClient";
import { fetchLegalVersions } from "../services/legalService";
import { messages } from "../constants/messages";
import type { LegalVersions } from "../types/auth";
import { validateWeeklyGoal, validateWeight } from "../utils/profileValidation";

// Campo que o servidor acusou (CompleteProfileRequestDTO) -> campo da tela.
const FORM_FIELD_BY_API_FIELD: Record<string, string> = {
  bodyWeight: "weight",
  weeklyGoal: "weeklyGoal",
  acceptedTermsVersion: "legalConsent",
  acceptedPrivacyVersion: "legalConsent",
};

const TargetIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const WeightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);

/**
 * Exibida no lugar do app inteiro quando uma conta criada via login social
 * (Google/Apple) ainda não tem peso, meta semanal e aceite dos termos — o
 * provedor não fornece nada disso. O backend também bloqueia as rotas /api/**
 * até este envio (ProfileCompletionFilter), então não há como pular a tela.
 */
export function CompleteProfileScreen() {
  const { user, authError, clearAuthError, isSubmitting, completeProfile, logout } = useAuth();
  const [form, setForm] = useState({ weeklyGoal: "", weight: "" });
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);
  const [legalVersions, setLegalVersions] = useState<LegalVersions | null>(null);
  const [isLoadingLegalVersions, setIsLoadingLegalVersions] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAuthErrorHandled, setIsAuthErrorHandled] = useState(false);

  const loadLegalVersions = useCallback(async () => {
    setIsLoadingLegalVersions(true);
    try {
      setLegalVersions(await fetchLegalVersions());
      setErrors((prev) => ({ ...prev, legalConsent: "" }));
    } catch {
      setLegalVersions(null);
      setErrors((prev) => ({ ...prev, legalConsent: messages.legalVersionsUnavailable }));
    } finally {
      setIsLoadingLegalVersions(false);
    }
  }, []);

  useEffect(() => {
    void loadLegalVersions();
  }, [loadLegalVersions]);

  function resetServerError() {
    if (authError) clearAuthError();
    setIsAuthErrorHandled(false);
  }

  function setField(field: "weeklyGoal" | "weight", value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    resetServerError();
  }

  function setLegalConsent(accepted: boolean) {
    setHasAcceptedLegal(accepted);
    if (errors.legalConsent && legalVersions) setErrors((prev) => ({ ...prev, legalConsent: "" }));
    resetServerError();
  }

  function validate() {
    const e: Record<string, string> = {};
    const weightError = validateWeight(form.weight);
    if (weightError) e.weight = weightError;
    const weeklyGoalError = validateWeeklyGoal(form.weeklyGoal);
    if (weeklyGoalError) e.weeklyGoal = weeklyGoalError;
    if (!legalVersions) e.legalConsent = messages.legalVersionsUnavailable;
    else if (!hasAcceptedLegal) e.legalConsent = messages.legalConsentRequired;
    return e;
  }

  async function submit() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    setErrors({});
    setIsAuthErrorHandled(false);

    try {
      await completeProfile({
        weight: Number(form.weight),
        weeklyGoal: Number(form.weeklyGoal),
        // As versões que o usuário viu na tela, não um valor recarregado agora.
        acceptedTermsVersion: legalVersions!.termsVersion,
        acceptedPrivacyVersion: legalVersions!.privacyVersion,
      });
    } catch (error) {
      const mapped: Record<string, string> = {};
      let hasUnmappedField = false;
      for (const [apiField, message] of Object.entries(extractFieldErrors(error))) {
        const formField = FORM_FIELD_BY_API_FIELD[apiField];
        if (formField) mapped[formField] = message;
        else hasUnmappedField = true;
      }
      if (Object.keys(mapped).length > 0) {
        setErrors(mapped);
        setIsAuthErrorHandled(!hasUnmappedField);
      }
      // O restante (ex.: versões dos termos desatualizadas) aparece no aviso geral via authError.
    }
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    void submit();
  }

  const firstName = user?.name?.trim().split(/\s+/)[0];

  return (
    <PageBackground>
      <IonGrid fixed className="relative z-10 min-h-full px-3 py-5">
        <IonRow className="ion-justify-content-center ion-align-items-center">
          <IonCol size="12">
            <div className="mb-7 flex flex-col items-center">
              <img src={logoImg} alt="BeeFit Logo" className="mb-3 h-20 w-20 rounded-2xl object-contain" />
            </div>

            <IonCard
              style={
                {
                  "--background": "#1A1A1A",
                  "--color": "#FFFFFF",
                  "--border-radius": "24px",
                  margin: 0,
                  border: "1px solid #2D2D2D",
                  overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                } as React.CSSProperties
              }
            >
              <IonCardContent style={{ padding: 22 }}>
                <h2
                  className="mb-1 text-white"
                  style={{ fontFamily: "var(--font-montserrat)", fontSize: 24, fontWeight: 700 }}
                >
                  {firstName ? `Olá, ${firstName}! Falta pouco` : "Falta pouco"}
                </h2>
                <IonText
                  className="mb-8 block"
                  style={{ fontFamily: "var(--font-inter)", fontSize: 14, color: "#8A8A8A" }}
                >
                  Complete seu cadastro para começar a treinar.
                </IonText>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div>
                    <BeeInput
                      label="Peso Corporal (kg)"
                      type="number"
                      name="weight"
                      inputMode="decimal"
                      placeholder="Ex: 75.5"
                      value={form.weight}
                      onChange={(e) => setField("weight", e.target.value)}
                      error={errors.weight}
                      icon={<WeightIcon />}
                      step="0.1"
                      min="1"
                      max="300"
                      disabled={isSubmitting}
                    />
                    <IonText
                      className="mt-2 block px-1"
                      style={{ fontFamily: "var(--font-inter)", fontSize: 12, color: "#8A8A8A", lineHeight: 1.4 }}
                    >
                      Usamos seu peso para calcular as calorias dos treinos e a raridade das cartas de recorde.
                    </IonText>
                  </div>

                  <BeeInput
                    label="Meta de Exercício Semanal"
                    type="number"
                    name="weeklyGoal"
                    inputMode="numeric"
                    placeholder="Ex: 4 (dias por semana)"
                    value={form.weeklyGoal}
                    onChange={(e) => setField("weeklyGoal", e.target.value)}
                    error={errors.weeklyGoal}
                    icon={<TargetIcon />}
                    min="1"
                    max="7"
                    disabled={isSubmitting}
                  />

                  <LegalConsentField
                    checked={hasAcceptedLegal}
                    onChange={setLegalConsent}
                    legalVersions={legalVersions}
                    isLoading={isLoadingLegalVersions}
                    error={errors.legalConsent}
                    onRetry={() => void loadLegalVersions()}
                  />

                  {authError && !isAuthErrorHandled && <BeeAlert>{authError}</BeeAlert>}

                  <div className="mt-2">
                    <BeeButton
                      type="submit"
                      variant="primary"
                      shape="soft"
                      fullWidth
                      disabled={isSubmitting || isLoadingLegalVersions}
                    >
                      {isSubmitting ? "Salvando..." : "Continuar"}
                    </BeeButton>
                  </div>
                </form>

                <div className="mt-4">
                  <BeeButton
                    type="button"
                    variant="dark"
                    shape="soft"
                    fullWidth
                    onClick={() => void logout()}
                    disabled={isSubmitting}
                  >
                    Sair
                  </BeeButton>
                </div>
              </IonCardContent>
            </IonCard>
          </IonCol>
        </IonRow>
      </IonGrid>
    </PageBackground>
  );
}
