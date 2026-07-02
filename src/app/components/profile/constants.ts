import type { CSSProperties } from "react";
import { HEX_CLIP } from "../workout-post";

export { HEX_CLIP };

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
