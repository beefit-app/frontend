import { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

type BeeAlertVariant = "error" | "success" | "info";

interface BeeAlertProps {
  variant?: BeeAlertVariant;
  title?: string;
  children: ReactNode;
  /** Some o ícone e a caixa, deixando só o texto. Para erro embaixo de campo. */
  plain?: boolean;
}

const VARIANTS: Record<BeeAlertVariant, { color: string; border: string; background: string; Icon: typeof AlertTriangle }> = {
  error: {
    color: "var(--beefit-danger)",
    border: "var(--beefit-danger-border)",
    background: "var(--beefit-danger-surface)",
    Icon: AlertTriangle,
  },
  success: {
    color: "var(--beefit-success)",
    border: "var(--beefit-success-border)",
    background: "var(--beefit-success-surface)",
    Icon: CheckCircle2,
  },
  info: {
    color: "var(--beefit-info)",
    border: "var(--beefit-info-border)",
    background: "var(--beefit-info-surface)",
    Icon: Info,
  },
};

/**
 * Aviso padrão do app. Substitui os banners que cada tela desenhava à mão, com
 * três vermelhos diferentes e nenhum `role`, o que deixava o erro mudo para
 * leitores de tela.
 */
export function BeeAlert({ variant = "error", title, children, plain = false }: BeeAlertProps) {
  const { color, border, background, Icon } = VARIANTS[variant];
  // assertive só para erro: sucesso e informação não devem interromper o que o
  // leitor de tela está anunciando.
  const live = variant === "error" ? "assertive" : "polite";

  if (plain) {
    return (
      <span
        role="alert"
        aria-live={live}
        style={{ fontFamily: "var(--font-inter)", fontSize: 13, color, lineHeight: 1.4 }}
      >
        {children}
      </span>
    );
  }

  return (
    <div
      role="alert"
      aria-live={live}
      style={{
        borderRadius: 18,
        border: `1px solid ${border}`,
        background,
        padding: "14px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <Icon size={18} color={color} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
        {title && (
          <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 13, fontWeight: 700, color }}>
            {title}
          </span>
        )}
        <span style={{ fontFamily: "var(--font-inter)", fontSize: 13, color: "#D4D4D4", lineHeight: 1.5 }}>
          {children}
        </span>
      </div>
    </div>
  );
}
