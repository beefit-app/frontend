import type { AccountSettingsData } from "./types";

export const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
// Todo avatar é o HexAvatar, que tem altura = largura × 1,155; recortar nessa
// proporção faz o que o usuário enquadra ser exatamente o que aparece no app.
export const AVATAR_HEIGHT_RATIO = 1.155;
export const AVATAR_OUTPUT_SIZE = { width: 512, height: Math.round(512 * AVATAR_HEIGHT_RATIO) };
export const MONTH_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;
export const DAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

export const DEFAULT_ACCOUNT_SETTINGS: AccountSettingsData = {
  ghostModeEnabled: false,
};
