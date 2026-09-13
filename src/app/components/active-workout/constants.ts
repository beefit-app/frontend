export const MUSCLE_STYLE: Record<string, { border: string; text: string; bg: string }> = {
  Braços: { border: "#F97316", text: "#FDBA74", bg: "rgba(249,115,22,0.14)" },
  Core: { border: "#EF4444", text: "#FCA5A5", bg: "rgba(239,68,68,0.14)" },
  Costas: { border: "#3B82F6", text: "#60A5FA", bg: "rgba(59,130,246,0.14)" },
  Ombros: { border: "#A855F7", text: "#C084FC", bg: "rgba(168,85,247,0.14)" },
  Peito: { border: "#FFD700", text: "#FFE44D", bg: "rgba(255,215,0,0.14)" },
  Pernas: { border: "#22C55E", text: "#86EFAC", bg: "rgba(34,197,94,0.14)" },
};

export const DEFAULT_MUSCLE_STYLE = {
  border: "#737373",
  text: "#D4D4D4",
  bg: "rgba(115,115,115,0.14)",
};

export const ACTIVE_WORKOUT_SLIDE_STYLE: React.CSSProperties = {
  minWidth: "100%",
  flex: "0 0 100%",
  scrollSnapAlign: "start",
  display: "flex",
  justifyContent: "center",
  alignItems: "stretch",
  minHeight: 440,
  boxSizing: "border-box",
};

export const ACTIVE_WORKOUT_CARD_STYLE: React.CSSProperties = {
  width: "calc(100% - 24px)",
  maxWidth: "clamp(348px, 82vw, 480px)",
};
