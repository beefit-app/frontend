import { useCallback, useEffect, useState } from "react";
import { IonCard, IonCardContent, IonCol, IonGrid, IonRow, IonText } from "@ionic/react";
import logoImg from "../../imports/logo.png";
import { BeeButton } from "./BeeButton";
import { BeeInput } from "./BeeInput";
import { PageBackground } from "./PageBackground";
import { useAuth } from "../auth/AuthContext";
import { extractFieldErrors } from "../services/apiClient";
import { fetchLegalVersions } from "../services/legalService";
import type { LegalVersions } from "../types/auth";
import { BeeAlert } from "./BeeAlert";
import { LegalConsentField } from "./LegalConsentField";
import { PASSWORD_MIN_LENGTH, messages } from "../constants/messages";
import { validateWeeklyGoal, validateWeight } from "../utils/profileValidation";

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
}

// O payload da API usa nomes proprios (ver mapRegisterInputToApi em
// services/authService.ts); este e o caminho de volta, do campo que o servidor
// acusou para o input que o usuario ve.
const FORM_FIELD_BY_API_FIELD: Record<string, string> = {
  fullName: "name",
  username: "username",
  email: "email",
  password: "password",
  bodyWeight: "weight",
  weeklyGoal: "weeklyGoal",
  // Os dois documentos sao aceitos por um unico controle, entao ambos apontam
  // para ele: sem isto a recusa do servidor cairia no aviso geral e o checkbox
  // ficaria sem marcacao, como se o problema fosse outro.
  acceptedTermsVersion: "legalConsent",
  acceptedPrivacyVersion: "legalConsent",
};

export function RegisterScreen({ onNavigateToLogin }: RegisterScreenProps) {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    weeklyGoal: "",
    weight: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);
  const [legalVersions, setLegalVersions] = useState<LegalVersions | null>(null);
  const [isLoadingLegalVersions, setIsLoadingLegalVersions] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Quando o servidor devolve erro em todos os campos que a tela conhece, o aviso
  // geral repetiria o texto que ja esta embaixo do input.
  const [isAuthErrorHandled, setIsAuthErrorHandled] = useState(false);
  const { authError, clearAuthError, isSubmitting, register } = useAuth();

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

  function setLegalConsent(accepted: boolean) {
    setHasAcceptedLegal(accepted);
    if (errors.legalConsent && legalVersions) setErrors((prev) => ({ ...prev, legalConsent: "" }));
    if (authError) clearAuthError();
    setIsAuthErrorHandled(false);
  }

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    if (authError) clearAuthError();
    setIsAuthErrorHandled(false);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = messages.required("seu nome completo");
    if (!form.username.trim()) e.username = "Escolha um nome de usuário.";
    if (!form.email) e.email = messages.required("seu e-mail");
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = messages.emailInvalid;
    if (!form.password) e.password = messages.passwordCreate;
    else if (form.password.length < PASSWORD_MIN_LENGTH) e.password = messages.passwordMin;
    const weeklyGoalError = validateWeeklyGoal(form.weeklyGoal);
    if (weeklyGoalError) e.weeklyGoal = weeklyGoalError;
    const weightError = validateWeight(form.weight);
    if (weightError) e.weight = weightError;
    // Sem as versoes vigentes nao ha o que registrar como aceite, entao o bloqueio
    // vale mesmo com o checkbox marcado.
    if (!legalVersions) e.legalConsent = messages.legalVersionsUnavailable;
    else if (!hasAcceptedLegal) e.legalConsent = messages.legalConsentRequired;
    return e;
  }

  async function submitRegistration() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    setErrors({});
    setIsAuthErrorHandled(false);

    try {
      await register({
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        weeklyGoal: Number(form.weeklyGoal),
        weight: Number(form.weight),
        // `validate` ja garantiu que nao e nulo; as versoes sao as que o usuario
        // viu na tela, nao um valor recarregado agora.
        acceptedTermsVersion: legalVersions!.termsVersion,
        acceptedPrivacyVersion: legalVersions!.privacyVersion,
      });
    } catch (error) {
      const fieldErrors = extractFieldErrors(error);
      const mapped: Record<string, string> = {};
      let hasUnmappedField = false;

      for (const [apiField, message] of Object.entries(fieldErrors)) {
        const formField = FORM_FIELD_BY_API_FIELD[apiField];
        // deviceId e qualquer campo que a tela nao mostra: sem input para marcar,
        // a mensagem tem de continuar no aviso geral, senao o erro fica invisivel
        // e o botao parece nao fazer nada.
        if (formField) mapped[formField] = message;
        else hasUnmappedField = true;
      }

      if (Object.keys(mapped).length > 0) {
        setErrors(mapped);
        setIsAuthErrorHandled(!hasUnmappedField);
      }
      // O restante do estado de erro ja e tratado pelo AuthProvider.
    }
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    void submitRegistration();
  }

  const PersonIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  const EmailIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );

  const LockIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );

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

  const EyeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {showPassword ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );

  return (
    <PageBackground>
      <IonGrid fixed className="relative z-10 min-h-full px-3 py-5">
        <IonRow className="ion-justify-content-center ion-align-items-center">
          <IonCol size="12">
            <div className="mb-7 flex flex-col items-center">
              <img
                src={logoImg}
                alt="BeeFit Logo"
                className="mb-3 h-20 w-20 rounded-2xl object-contain"
              />
              <h1
                className="leading-none text-white"
                style={{
                  fontFamily: "var(--font-montserrat)",
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: -1,
                }}
              >
                <span style={{ color: "#FFD700" }}>Bee</span>Fit
              </h1>
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
                  position: "relative",
                } as React.CSSProperties
              }
            >
              <div
                className="pointer-events-none absolute -top-5 -right-5 opacity-[0.06]"
                style={{
                  width: 70,
                  height: 80,
                  background: "#FFD700",
                  clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                }}
              />

              <IonCardContent style={{ padding: 22 }}>
                <h2
                  className="mb-1 text-white"
                  style={{ fontFamily: "var(--font-montserrat)", fontSize: 24, fontWeight: 700 }}
                >
                  Criar Conta
                </h2>
                <IonText
                  className="mb-8 block"
                  style={{ fontFamily: "var(--font-inter)", fontSize: 14, color: "#8A8A8A" }}
                >
                  Comece sua jornada fitness hoje
                </IonText>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <BeeInput
                    label="Nome Completo"
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder="Seu nome completo"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    error={errors.name}
                    icon={<PersonIcon />}
                    disabled={isSubmitting}
                  />

                  <BeeInput
                    label="Nome de Usuário"
                    type="text"
                    name="username"
                    autoComplete="username"
                    placeholder="Seu username"
                    value={form.username}
                    onChange={(e) => setField("username", e.target.value)}
                    error={errors.username}
                    icon={<PersonIcon />}
                    disabled={isSubmitting}
                  />

                  <BeeInput
                    label="Endereço de E-mail"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    error={errors.email}
                    icon={<EmailIcon />}
                    disabled={isSubmitting}
                  />

                  <BeeInput
                    label="Senha"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    error={errors.password}
                    icon={<LockIcon />}
                    disabled={isSubmitting}
                    rightElement={
                      <button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="-m-2 flex items-center bg-transparent p-2 text-inherit">
                        <EyeIcon />
                      </button>
                    }
                  />

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
                    <div className="mt-2 flex items-start gap-2 px-1">
                      <div
                        className="mt-0.5 shrink-0"
                        style={{
                          width: 8,
                          height: 9,
                          background: "#FFD700",
                          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                        }}
                      />
                      <IonText
                        style={{
                          fontFamily: "var(--font-inter)",
                          fontSize: 12,
                          color: "#8A8A8A",
                          lineHeight: 1.4,
                        }}
                      >
                        Seu peso é fundamental para o{" "}
                        <span style={{ fontWeight: 600 }}>
                          sistema de raridade das cartas
                        </span>
                        . Quanto mais peso você levanta em relação ao seu corpo, mais rara fica sua carta de recorde!
                      </IonText>
                    </div>
                  </div>

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
                      type="button"
                      variant="primary"
                      shape="soft"
                      fullWidth
                      disabled={isSubmitting || isLoadingLegalVersions}
                      onClick={() => void submitRegistration()}
                    >
                      {isSubmitting ? "Criando conta..." : "Criar Conta"}
                    </BeeButton>
                  </div>
                </form>

                <div className="mt-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-[#2D2D2D]" />
                  <IonText
                    style={{
                      fontFamily: "var(--font-inter)",
                      fontSize: 12,
                      color: "#404040",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                    }}
                  >
                    OU
                  </IonText>
                  <div className="h-px flex-1 bg-[#2D2D2D]" />
                </div>

                <div className="mt-6">
                  <BeeButton
                    type="button"
                    variant="dark"
                    shape="soft"
                    fullWidth
                    onClick={onNavigateToLogin}
                    disabled={isSubmitting}
                  >
                    Fazer Login
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
