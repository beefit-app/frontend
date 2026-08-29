import type { AccountSettingsData } from "./types";

export const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
export const MONTH_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;
export const DAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

export const DEFAULT_ACCOUNT_SETTINGS: AccountSettingsData = {
  ghostModeEnabled: false,
};
