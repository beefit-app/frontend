import { WEIGHT_MAX_KG, WEIGHT_MIN_KG, messages } from "../constants/messages";

// Regras de peso e meta semanal compartilhadas entre o cadastro tradicional
// (RegisterScreen) e o "Complete seu cadastro" do login social
// (CompleteProfileScreen). Espelham as anotações do RegisterDTO e do
// CompleteProfileRequestDTO no backend; validar aqui evita uma ida ao servidor
// para um erro que dá para prever.

/** Devolve a mensagem de erro, ou null se o valor é válido. */
export function validateWeeklyGoal(value: string): string | null {
  if (!value) return messages.required("sua meta semanal");
  const goal = Number(value);
  if (isNaN(goal) || goal < 1 || goal > 7) return messages.weeklyGoalRange;
  return null;
}

/** Devolve a mensagem de erro, ou null se o valor é válido. */
export function validateWeight(value: string): string | null {
  if (!value) return messages.required("seu peso");
  const weight = Number(value);
  if (isNaN(weight) || weight < WEIGHT_MIN_KG || weight > WEIGHT_MAX_KG) return messages.weightRange;
  return null;
}
