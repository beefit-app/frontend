import type { CSSProperties } from "react";
import type { Rarity } from "./types";

export const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

export const RARITY_STYLE: Record<
  Rarity,
  { bg: string; border: string; text: string; label: string; glow: string }
> = {
  lendaria: {
    bg: "rgba(255,215,0,0.12)",
    border: "#FFD700",
    text: "#FFE44D",
    label: "🟡 Lendária",
    glow: "rgba(255,215,0,0.25)",
  },
  epica: {
    bg: "rgba(168,85,247,0.12)",
    border: "#A855F7",
    text: "#C084FC",
    label: "🟣 Épica",
    glow: "rgba(168,85,247,0.25)",
  },
  rara: {
    bg: "rgba(59,130,246,0.12)",
    border: "#3B82F6",
    text: "#60A5FA",
    label: "🔵 Rara",
    glow: "rgba(59,130,246,0.25)",
  },
  comum: {
    bg: "rgba(115,115,115,0.12)",
    border: "#737373",
    text: "#A3A3A3",
    label: "⚪ Comum",
    glow: "rgba(115,115,115,0.2)",
  },
};

export const TOOLBAR_STYLE: CSSProperties = {
  "--background": "#0A0A0A",
  "--border-color": "#2D2D2D",
  "--color": "#ffffff",
  "--min-height": "56px",
} as CSSProperties;

export const TITLE_STYLE: CSSProperties = {
  fontFamily: "var(--font-montserrat)",
  fontSize: "17px",
  fontWeight: 700,
  color: "#ffffff",
};

export const MONTH_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
