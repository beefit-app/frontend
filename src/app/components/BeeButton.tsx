import { ReactNode } from "react";
import { motion as Motion } from "motion/react";
import { IonButton } from "@ionic/react";

export type BeeButtonVariant =
  | "primary"
  | "secondary"
  | "dark"
  | "blue"
  | "green"
  | "red"
  | "outline-blue"
  | "outline-green"
  | "outline-red";

export type BeeButtonSize = "sm" | "md" | "lg";

interface BeeButtonProps {
  variant?: BeeButtonVariant;
  size?: BeeButtonSize;
  children: ReactNode;
  fullWidth?: boolean;
  className?: string;
  onClick?: React.MouseEventHandler;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

type VariantTokens = {
  bg: string;
  color: string;
  fill: "solid" | "outline" | "clear";
  border?: string;
  shadow?: string;
};

const VARIANTS: Record<BeeButtonVariant, VariantTokens> = {
  primary: {
    bg: "#FFD700",
    color: "#0A0A0A",
    fill: "solid",
    shadow: "0 4px 20px rgba(255,215,0,0.3)",
  },
  secondary: {
    bg: "transparent",
    color: "#FFD700",
    fill: "outline",
    border: "#FFD700",
  },
  dark: {
    bg: "#1A1A1A",
    color: "#ffffff",
    fill: "solid",
    border: "#404040",
  },
  blue: {
    bg: "#3B82F6",
    color: "#ffffff",
    fill: "solid",
    shadow: "0 4px 20px rgba(59,130,246,0.3)",
  },
  green: {
    bg: "#22C55E",
    color: "#ffffff",
    fill: "solid",
    shadow: "0 4px 20px rgba(34,197,94,0.3)",
  },
  red: {
    bg: "#EF4444",
    color: "#ffffff",
    fill: "solid",
    shadow: "0 4px 20px rgba(239,68,68,0.3)",
  },
  "outline-blue": {
    bg: "transparent",
    color: "#3B82F6",
    fill: "outline",
    border: "#3B82F6",
  },
  "outline-green": {
    bg: "transparent",
    color: "#22C55E",
    fill: "outline",
    border: "#22C55E",
  },
  "outline-red": {
    bg: "transparent",
    color: "#EF4444",
    fill: "outline",
    border: "#EF4444",
  },
};

const SIZE_PADDING: Record<BeeButtonSize, React.CSSProperties> = {
  sm: {
    "--padding-start": "16px",
    "--padding-end": "16px",
    "--padding-top": "8px",
    "--padding-bottom": "8px",
    fontSize: "14px",
  } as React.CSSProperties,
  md: {
    "--padding-start": "32px",
    "--padding-end": "32px",
    "--padding-top": "16px",
    "--padding-bottom": "16px",
    fontSize: "16px",
  } as React.CSSProperties,
  lg: {
    "--padding-start": "48px",
    "--padding-end": "48px",
    "--padding-top": "24px",
    "--padding-bottom": "24px",
    fontSize: "18px",
  } as React.CSSProperties,
};

export function BeeButton({
  variant = "primary",
  size = "md",
  children,
  fullWidth = false,
  onClick,
  type = "button",
  disabled = false,
}: BeeButtonProps) {
  const v = VARIANTS[variant];

  return (
    <Motion.div
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      style={{
        width: fullWidth ? "100%" : "fit-content",
        borderRadius: "100px",
        overflow: "hidden",
        display: fullWidth ? "block" : "inline-block",
      }}
    >
      <IonButton
        expand={fullWidth ? "block" : undefined}
        fill={v.fill}
        disabled={disabled}
        onClick={onClick}
        type={type}
        style={
          {
            "--background": v.bg,
            "--background-activated": v.bg,
            "--background-focused": v.bg,
            "--background-hover": v.bg,
            "--background-activated-opacity": "0.9",
            "--color": v.color,
            "--border-radius": "100px",
            "--border-color": v.border ?? "transparent",
            "--border-width": v.border ? "2px" : "0",
            "--border-style": v.border ? "solid" : "none",
            "--box-shadow": v.shadow ?? "none",
            "--ripple-color": "rgba(255,255,255,0.1)",
            margin: 0,
            ...SIZE_PADDING[size],
          } as React.CSSProperties
        }
      >
        {children}
      </IonButton>
    </Motion.div>
  );
}
