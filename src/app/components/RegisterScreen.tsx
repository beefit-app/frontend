import { useState } from "react";
import logoImg from "../../imports/logo.png";
import { HexagonPattern } from "./HexagonPattern";
import { BeeButton } from "./BeeButton";
import { BeeInput } from "./BeeInput";

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  onRegisterSuccess: () => void;
}

export function RegisterScreen({ onNavigateToLogin, onRegisterSuccess }: RegisterScreenProps) {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    weeklyGoal: "",
    weight: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nome completo é obrigatório";
    if (!form.email) e.email = "E-mail é obrigatório";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "E-mail inválido";
    if (!form.password) e.password = "Senha é obrigatória";
    else if (form.password.length < 6) e.password = "Mínimo de 6 caracteres";
    if (!form.weeklyGoal) e.weeklyGoal = "Informe sua meta semanal";
    else if (isNaN(Number(form.weeklyGoal)) || Number(form.weeklyGoal) < 1)
      e.weeklyGoal = "Meta inválida (mínimo 1 dia)";
    if (!form.weight) e.weight = "Peso é obrigatório";
    else if (isNaN(Number(form.weight)) || Number(form.weight) <= 0)
      e.weight = "Peso inválido";
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
    onRegisterSuccess();
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
    <div
      className="w-full bg-[#0A0A0A] flex items-center justify-center relative overflow-hidden"
      style={{ minHeight: "100%" }}
    >
      <HexagonPattern />

      <div className="relative z-10 w-full max-w-[430px] mx-auto flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={logoImg}
            alt="BeeFit Logo"
            className="w-20 h-20 object-contain rounded-2xl mb-3"
          />
          <h1
            className="text-white leading-none"
            style={{
              fontFamily: "var(--font-montserrat)",
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            <span style={{ color: "#FFD700" }}>Bee</span>Fit
          </h1>
        </div>

        {/* Form card */}
        <div className="relative w-full bg-[#1A1A1A] border border-[#2D2D2D] rounded-2xl p-8 overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          <div
            className="pointer-events-none absolute -top-5 -right-5 opacity-[0.06]"
            style={{
              width: 70,
              height: 80,
              background: "#FFD700",
              clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            }}
          />

          <h2
            className="text-white mb-1"
            style={{ fontFamily: "var(--font-montserrat)", fontSize: 24, fontWeight: 700 }}
          >
            Criar Conta
          </h2>
          <p
            className="mb-8"
            style={{ fontFamily: "var(--font-inter)", fontSize: 14, color: "#737373" }}
          >
            Comece sua jornada fitness hoje
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <BeeInput
              label="Nome Completo"
              type="text"
              placeholder="Seu nome completo"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              error={errors.name}
              icon={<PersonIcon />}
            />

            <BeeInput
              label="Nome de Usuário"
              type="text"
              placeholder="Seu username"
              value={form.username}
              onChange={(e) => setField("username", e.target.value)}
              icon={<PersonIcon />}
            />

            <BeeInput
              label="Endereço de E-mail"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              error={errors.email}
              icon={<EmailIcon />}
            />

            <BeeInput
              label="Senha"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              error={errors.password}
              icon={<LockIcon />}
              rightElement={
                <span onClick={() => setShowPassword(!showPassword)}>
                  <EyeIcon />
                </span>
              }
            />

            <BeeInput
              label="Meta de Exercício Semanal"
              type="number"
              placeholder="Ex: 4 (dias por semana)"
              value={form.weeklyGoal}
              onChange={(e) => setField("weeklyGoal", e.target.value)}
              error={errors.weeklyGoal}
              icon={<TargetIcon />}
              min="1"
              max="7"
            />

            <div>
              <BeeInput
                label="Peso Corporal (kg)"
                type="number"
                placeholder="Ex: 75.5"
                value={form.weight}
                onChange={(e) => setField("weight", e.target.value)}
                error={errors.weight}
                icon={<WeightIcon />}
                step="0.1"
                min="1"
              />
              <div className="mt-2 flex items-start gap-2 px-1">
                <div
                  className="mt-0.5 flex-shrink-0"
                  style={{
                    width: 8,
                    height: 9,
                    background: "#FFD700",
                    clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                  }}
                />
                <p style={{ fontFamily: "var(--font-inter)", fontSize: 12, color: "#737373", lineHeight: 1.4 }}>
                  Seu peso é fundamental para o{" "}
                  <span style={{ color: "#FFD700", fontWeight: 600 }}>
                    sistema de raridade das cartas
                  </span>
                  . Quanto mais peso você levanta em relação ao seu corpo, mais rara fica sua carta de recorde!
                </p>
              </div>
            </div>

            <div className="mt-2">
              <BeeButton type="submit" variant="primary" fullWidth>
                Criar Conta
              </BeeButton>
            </div>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-[#2D2D2D]" />
            <span
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
            </span>
            <div className="flex-1 h-px bg-[#2D2D2D]" />
          </div>

          <div className="mt-6">
            <BeeButton type="button" variant="dark" fullWidth onClick={onNavigateToLogin}>
              Fazer Login
            </BeeButton>
          </div>
        </div>
      </div>
    </div>
  );
}
