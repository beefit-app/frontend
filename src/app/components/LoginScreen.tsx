import { useState } from "react";
import { IonCard, IonCardContent, IonCol, IonGrid, IonRow, IonText } from "@ionic/react";
import logoImg from "../../imports/logo.png";
import { HexagonPattern } from "./HexagonPattern";
import { BeeButton } from "./BeeButton";
import { BeeInput } from "./BeeInput";

interface LoginScreenProps {
  onNavigateToRegister: () => void;
  onLoginSuccess: () => void;
}

export function LoginScreen({ onNavigateToRegister, onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!email) e.email = "E-mail é obrigatório";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "E-mail inválido";
    if (!password) e.password = "Senha é obrigatória";
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    onLoginSuccess();
  }

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

  return (
    <div className="relative w-full overflow-hidden bg-[#0A0A0A]" style={{ minHeight: "100%" }}>
      <HexagonPattern />
      <div
        style={{
          position: "absolute",
          top: -180,
          left: 0,
          right: 0,
          height: 540,
          background: "linear-gradient(180deg, rgba(255,215,0,0.07) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      <IonGrid fixed className="relative z-10 min-h-full px-3 py-5">
        <IonRow className="ion-justify-content-center ion-align-items-center">
          <IonCol size="12" style={{ maxWidth: 393 }}>
            <div className="mb-8 flex flex-col items-center">
              <img
                src={logoImg}
                alt="BeeFit Logo"
                className="mb-4 h-24 w-24 rounded-2xl object-contain"
              />
              <h1
                className="leading-none text-white"
                style={{
                  fontFamily: "var(--font-montserrat)",
                  fontSize: 36,
                  fontWeight: 800,
                  letterSpacing: -1,
                }}
              >
                <span style={{ color: "#FFD700" }}>Bee</span>Fit
              </h1>
              <IonText
                className="mt-2 text-center"
                style={{ fontFamily: "var(--font-inter)", fontSize: 14, color: "#A3A3A3" }}
              >
                Sua academia na palma da mão
              </IonText>
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

              <IonCardContent style={{ padding: 24 }}>
                <h2
                  className="mb-1 text-white"
                  style={{ fontFamily: "var(--font-montserrat)", fontSize: 24, fontWeight: 700 }}
                >
                  Bem-vindo!
                </h2>
                <IonText
                  className="mb-8 block"
                  style={{ fontFamily: "var(--font-inter)", fontSize: 14, color: "#737373" }}
                >
                  Entre na sua conta para continuar
                </IonText>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <BeeInput
                    label="E-mail"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={errors.email}
                    icon={<EmailIcon />}
                  />

                  <BeeInput
                    label="Senha"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                    icon={<LockIcon />}
                    rightElement={
                      <span onClick={() => setShowPassword(!showPassword)}>
                        <EyeIcon />
                      </span>
                    }
                  />

                  <div className="mt-2">
                    <BeeButton type="submit" variant="primary" fullWidth>
                      Entrar
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
                  <BeeButton type="button" variant="dark" fullWidth onClick={onNavigateToRegister}>
                    Criar Conta
                  </BeeButton>
                </div>
              </IonCardContent>
            </IonCard>

            <div className="mt-8 text-center">
              <button
                className="cursor-pointer border-none bg-transparent"
                style={{
                  fontFamily: "var(--font-inter)",
                  fontSize: 13,
                  color: "#737373",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#FFD700")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#737373")}
              >
                Esqueceu sua senha?
              </button>
            </div>
          </IonCol>
        </IonRow>
      </IonGrid>
    </div>
  );
}
