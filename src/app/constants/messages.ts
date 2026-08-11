/**
 * Fonte única do texto das mensagens exibidas ao usuário.
 *
 * Existe porque a mesma regra tinha texto diferente conforme a tela: senha curta
 * era "A senha precisa de pelo menos 6 caracteres." no cadastro e "Mínimo de 6
 * caracteres" nas configurações; obrigatoriedade era ora "E-mail é obrigatório",
 * ora "Informe seu e-mail.".
 *
 * Regra de estilo, também registrada em guidelines/Guidelines.md: frase completa,
 * primeira letra maiúscula, ponto final, e dizendo o que fazer em vez de só
 * apontar o que está errado.
 */

/** Mínimo aceito pelo backend em RegisterDTO e na edição de perfil. */
export const WEIGHT_MIN_KG = 30;
export const WEIGHT_MAX_KG = 300;
export const PASSWORD_MIN_LENGTH = 6;
export const WEEKLY_GOAL_MIN = 1;
export const WEEKLY_GOAL_MAX = 7;

export const messages = {
  /** `campo` entra no meio da frase, então vem em minúscula: "seu e-mail". */
  required: (campo: string) => `Informe ${campo}.`,

  emailInvalid: "Informe um e-mail válido, como nome@email.com.",

  passwordCreate: "Crie uma senha.",
  passwordMin: `A senha precisa de pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  passwordMismatch: "As senhas não coincidem.",
  passwordSameAsCurrent: "A nova senha deve ser diferente da atual.",

  weightRange: `O peso deve ser de ${WEIGHT_MIN_KG} a ${WEIGHT_MAX_KG} kg.`,
  weeklyGoalRange: `A meta semanal deve ser de ${WEEKLY_GOAL_MIN} a ${WEEKLY_GOAL_MAX} dias.`,

  maxLength: (limite: number) => `Use no máximo ${limite} caracteres.`,

  /**
   * Falha de operação. Esta família já era consistente no app — "Não foi possível
   * <verbo> <objeto>." — e virou o padrão; `acao` completa a frase.
   */
  actionFailed: (acao: string) => `Não foi possível ${acao}.`,
} as const;
