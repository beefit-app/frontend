import { useState } from "react";
import logoImg from "../../imports/logo.png";
import { BeeButton } from "./BeeButton";
import { BeeInput } from "./BeeInput";
import { BeeCard } from "./BeeCard";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div
        style={{
          width: 36,
          height: 42,
          background: "#FFD700",
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          flexShrink: 0,
        }}
      />
      <h2 className="font-montserrat text-[24px] font-bold text-white">{title}</h2>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-10">
      <div className="flex-1 h-px bg-[#2D2D2D]" />
      <div
        style={{
          width: 12,
          height: 14,
          background: "#FFD700",
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
        }}
      />
      <div className="flex-1 h-px bg-[#2D2D2D]" />
    </div>
  );
}

export function ComponentsShowcase() {
  const [showPwd, setShowPwd] = useState(false);

  const EyeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const MailIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );

  const LockIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] relative overflow-hidden">
      <div className="relative z-10 max-w-[430px] mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10 text-center flex flex-col items-center">
          <img
            src={logoImg}
            alt="BeeFit Logo"
            className="w-28 h-28 object-contain rounded-2xl mb-3 opacity-90"
          />
          <h1 className="font-montserrat text-[32px] font-[800] text-white tracking-[-1px]">
            <span className="text-[#FFD700]">Bee</span>Fit
          </h1>
          <p className="font-inter text-[14px] text-[#737373] mt-1">Biblioteca de Componentes</p>
        </div>

        {/* TYPOGRAPHY */}
        <SectionHeader title="Tipografia" />
        <BeeCard hover={false} className="mb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div style={{ width: 8, height: 9, background: "#FFD700", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
              <span className="font-inter text-[12px] text-[#737373] uppercase tracking-wide">Display / H1</span>
            </div>
            <h1 className="font-montserrat text-[40px] font-[800] text-white tracking-[-1px] leading-none">
              Treino de Força
            </h1>
            <div className="border-t border-[#2D2D2D] pt-4">
              <div className="flex items-center gap-2 mb-2">
                <div style={{ width: 8, height: 9, background: "#FFD700", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
                <span className="font-inter text-[12px] text-[#737373] uppercase tracking-wide">H2 / Heading</span>
              </div>
              <h2 className="font-montserrat text-[32px] font-bold text-white leading-none">Recordes Pessoais</h2>
            </div>
            <div className="border-t border-[#2D2D2D] pt-4">
              <div className="flex items-center gap-2 mb-2">
                <div style={{ width: 8, height: 9, background: "#FFD700", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
                <span className="font-inter text-[12px] text-[#737373] uppercase tracking-wide">H3 / Subhead</span>
              </div>
              <h3 className="font-montserrat text-[24px] font-bold text-white leading-none">Supino Reto</h3>
            </div>
            <div className="border-t border-[#2D2D2D] pt-4">
              <div className="flex items-center gap-2 mb-2">
                <div style={{ width: 8, height: 9, background: "#FFD700", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
                <span className="font-inter text-[12px] text-[#737373] uppercase tracking-wide">Body</span>
              </div>
              <p className="font-inter text-[16px] text-white">Acompanhe seu progresso e supere seus limites a cada treino.</p>
            </div>
            <div className="border-t border-[#2D2D2D] pt-4">
              <div className="flex items-center gap-2 mb-2">
                <div style={{ width: 8, height: 9, background: "#FFD700", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
                <span className="font-inter text-[12px] text-[#737373] uppercase tracking-wide">Caption</span>
              </div>
              <p className="font-inter text-[14px] font-medium text-[#A3A3A3]">Última sessão: Segunda, 10 Mai · 3 exercícios</p>
            </div>
          </div>
        </BeeCard>

        <Divider />

        {/* BUTTONS */}
        <SectionHeader title="Botões" />
        <BeeCard hover={false} className="mb-4">
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-montserrat text-[11px] font-bold uppercase tracking-wider text-[#737373] mb-3">Primários</p>
              <div className="flex flex-col gap-3">
                <BeeButton variant="primary" fullWidth>Criar Conta</BeeButton>
                <BeeButton variant="secondary" fullWidth>Ver Depois</BeeButton>
                <BeeButton variant="dark" fullWidth>Configurações</BeeButton>
              </div>
            </div>
            <div className="border-t border-[#2D2D2D] pt-4">
              <p className="font-montserrat text-[11px] font-bold uppercase tracking-wider text-[#737373] mb-3">Ações de Treino</p>
              <div className="flex flex-col gap-3">
                <BeeButton variant="blue" fullWidth>Iniciar Treino</BeeButton>
                <BeeButton variant="green" fullWidth>Finalizar Treino</BeeButton>
                <BeeButton variant="red" fullWidth>Cancelar</BeeButton>
              </div>
            </div>
            <div className="border-t border-[#2D2D2D] pt-4">
              <p className="font-montserrat text-[11px] font-bold uppercase tracking-wider text-[#737373] mb-3">Outline</p>
              <div className="flex flex-col gap-3">
                <BeeButton variant="outline-blue" fullWidth>Outline Azul</BeeButton>
                <BeeButton variant="outline-green" fullWidth>Outline Verde</BeeButton>
                <BeeButton variant="outline-red" fullWidth>Outline Vermelho</BeeButton>
              </div>
            </div>
            <div className="border-t border-[#2D2D2D] pt-4">
              <p className="font-montserrat text-[11px] font-bold uppercase tracking-wider text-[#737373] mb-3">Tamanhos</p>
              <div className="flex flex-wrap items-center gap-3">
                <BeeButton variant="primary" size="sm">Small</BeeButton>
                <BeeButton variant="primary" size="md">Default</BeeButton>
                <BeeButton variant="primary" size="lg">Large</BeeButton>
              </div>
            </div>
          </div>
        </BeeCard>

        <Divider />

        {/* INPUTS */}
        <SectionHeader title="Inputs" />
        <BeeCard hover={false} className="mb-4">
          <div className="flex flex-col gap-6">
            <div>
              <p className="font-montserrat text-[11px] font-bold uppercase tracking-wider text-[#737373] mb-4">Estado Padrão</p>
              <BeeInput label="Texto" type="text" placeholder="Digite algo..." />
            </div>
            <div>
              <p className="font-montserrat text-[11px] font-bold uppercase tracking-wider text-[#737373] mb-4">E-mail com ícone</p>
              <BeeInput label="E-mail" type="email" placeholder="seu@email.com" icon={<MailIcon />} />
            </div>
            <div>
              <p className="font-montserrat text-[11px] font-bold uppercase tracking-wider text-[#737373] mb-4">Senha com máscara</p>
              <BeeInput
                label="Senha"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                icon={<LockIcon />}
                rightElement={<span onClick={() => setShowPwd(!showPwd)}><EyeIcon /></span>}
              />
            </div>
            <div>
              <p className="font-montserrat text-[11px] font-bold uppercase tracking-wider text-[#737373] mb-4">Campo numérico</p>
              <BeeInput label="Peso (kg)" type="number" placeholder="75.5" step="0.1" />
            </div>
            <div>
              <p className="font-montserrat text-[11px] font-bold uppercase tracking-wider text-[#737373] mb-4">Estado de Erro</p>
              <BeeInput label="E-mail" type="email" placeholder="email inválido" defaultValue="nao-e-email" error="E-mail inválido. Verifique o formato." icon={<MailIcon />} />
            </div>
          </div>
        </BeeCard>

        <Divider />

        {/* CARDS */}
        <SectionHeader title="Cards / Containers" />
        <div className="flex flex-col gap-4">
          <BeeCard>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#FFD700] flex items-center justify-center text-2xl flex-shrink-0">🏋️</div>
              <div>
                <h3 className="font-montserrat text-[18px] font-bold text-white">Supino Reto</h3>
                <p className="font-inter text-[13px] text-[#737373]">4 séries · 8-10 reps · 80kg</p>
              </div>
              <span className="ml-auto text-[#FFD700]">→</span>
            </div>
          </BeeCard>

          <div className="flex gap-3">
            <div className="flex-1 relative bg-[#1A1A1A] border border-[#404040] rounded-xl p-4 overflow-hidden">
              <div className="absolute -top-2 -right-2 opacity-[0.08]" style={{ width: 30, height: 35, background: "#FFD700", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
              <p className="font-montserrat text-[28px] font-[800] text-[#FFD700] leading-none">12</p>
              <p className="font-inter text-[12px] uppercase text-[#737373] tracking-wide mt-1">Treinos</p>
            </div>
            <div className="flex-1 relative bg-[#1A1A1A] border border-[#404040] rounded-xl p-4 overflow-hidden">
              <div className="absolute -top-2 -right-2 opacity-[0.08]" style={{ width: 30, height: 35, background: "#FFD700", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
              <p className="font-montserrat text-[28px] font-[800] text-[#FFD700] leading-none">2.4k</p>
              <p className="font-inter text-[12px] uppercase text-[#737373] tracking-wide mt-1">Kcal</p>
            </div>
          </div>

          {/* Badges */}
          <BeeCard hover={false}>
            <p className="font-montserrat text-[11px] font-bold uppercase tracking-wider text-[#737373] mb-4">Badges / Tags</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-[#FFD700] text-[#0A0A0A] font-inter text-[12px] font-semibold uppercase tracking-wide">Yellow</span>
              <span className="px-3 py-1 rounded-full border border-[#FFD700] text-[#FFD700] font-inter text-[12px] font-semibold uppercase tracking-wide">Outline</span>
              <span className="px-3 py-1 rounded-full bg-[#1A1A1A] border border-[#404040] text-[#A3A3A3] font-inter text-[12px] font-semibold uppercase tracking-wide">Dark</span>
              <span className="px-3 py-1 rounded-full bg-[#22C55E] text-white font-inter text-[12px] font-semibold uppercase tracking-wide">Green</span>
              <span className="px-3 py-1 rounded-full bg-[#3B82F6] text-white font-inter text-[12px] font-semibold uppercase tracking-wide">Blue</span>
              <span className="px-3 py-1 rounded-full bg-[#EF4444] text-white font-inter text-[12px] font-semibold uppercase tracking-wide">Red</span>
              <span className="px-3 py-1 rounded-full bg-[rgba(168,85,247,0.15)] border border-[#A855F7] text-[#C084FC] font-inter text-[12px] font-semibold uppercase tracking-wide">🟣 Épica</span>
              <span className="px-3 py-1 rounded-full bg-[rgba(255,215,0,0.15)] border border-[#FFD700] text-[#FFE44D] font-inter text-[12px] font-semibold uppercase tracking-wide">🟡 Lendária</span>
              <span className="px-3 py-1 rounded-full bg-[rgba(59,130,246,0.15)] border border-[#3B82F6] text-[#60A5FA] font-inter text-[12px] font-semibold uppercase tracking-wide">🔵 Rara</span>
              <span className="px-3 py-1 rounded-full bg-[rgba(115,115,115,0.15)] border border-[#737373] text-[#A3A3A3] font-inter text-[12px] font-semibold uppercase tracking-wide">⚪ Comum</span>
            </div>
          </BeeCard>

          {/* Progress Bars */}
          <BeeCard hover={false}>
            <p className="font-montserrat text-[11px] font-bold uppercase tracking-wider text-[#737373] mb-4">Progress Bars</p>
            <div className="flex flex-col gap-4">
              {[
                { label: "Meta Semanal", pct: 75, color: "#FFD700" },
                { label: "Hidratação", pct: 55, color: "#3B82F6" },
                { label: "Recuperação", pct: 90, color: "#22C55E" },
                { label: "Energia", pct: 30, color: "#EF4444" },
              ].map(({ label, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="font-inter text-[12px] text-[#A3A3A3]">{label}</span>
                    <span className="font-montserrat text-[12px] font-bold" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#404040] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </BeeCard>
        </div>

        {/* Paleta de Cores */}
        <Divider />
        <SectionHeader title="Paleta de Cores" />
        <BeeCard hover={false}>
          <div className="grid grid-cols-4 gap-3">
            {[
              { name: "Yellow", hex: "#FFD700" },
              { name: "Yel. Light", hex: "#FFE44D" },
              { name: "Yel. Dark", hex: "#E6C200" },
              { name: "Black", hex: "#0A0A0A" },
              { name: "Blk. Soft", hex: "#1A1A1A" },
              { name: "Blk. Med.", hex: "#2D2D2D" },
              { name: "White", hex: "#FFFFFF" },
              { name: "Gray 500", hex: "#737373" },
              { name: "Green", hex: "#22C55E" },
              { name: "Blue", hex: "#3B82F6" },
              { name: "Red", hex: "#EF4444" },
              { name: "Purple", hex: "#A855F7" },
            ].map(({ name, hex }) => (
              <div key={hex} className="flex flex-col items-center gap-1">
                <div
                  className="w-full aspect-square rounded-lg border border-[#404040]"
                  style={{ background: hex }}
                />
                <span className="font-inter text-[9px] text-[#737373] text-center leading-tight">{name}</span>
              </div>
            ))}
          </div>
        </BeeCard>

        <div className="h-12" />
      </div>
    </div>
  );
}
