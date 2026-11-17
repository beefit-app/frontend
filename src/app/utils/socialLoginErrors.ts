/**
 * Mensagem para o código de erro que o backend anexa ao retorno do login social
 * (?error=... em /oauth-callback na web ou no deep link com.beefit.app://auth/callback
 * no mobile). Ver OAuth2LoginSuccessHandler/FailureHandler no backend.
 */
export const SOCIAL_LOGIN_ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "O provedor rejeitou o login (token inválido ou expirado). Tente novamente.",
  registration_closed: "O cadastro de novas contas está temporariamente fechado.",
  registration_restricted: "O cadastro está restrito a participantes autorizados durante o beta.",
};

export const SOCIAL_LOGIN_GENERIC_ERROR = "Não foi possível concluir o login social. Tente novamente.";

export function socialLoginErrorMessage(code: string | null | undefined): string {
  // hasOwn: o código vem da URL, então "toString" etc. não podem cair no protótipo.
  return code && Object.hasOwn(SOCIAL_LOGIN_ERROR_MESSAGES, code)
    ? SOCIAL_LOGIN_ERROR_MESSAGES[code]
    : SOCIAL_LOGIN_GENERIC_ERROR;
}
