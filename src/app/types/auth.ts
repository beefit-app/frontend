export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  weeklyGoal?: number | null;
  weight?: number | null;
}

export interface AuthApiUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  bodyWeight: number;
  weeklyGoal: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LegalVersions {
  termsVersion: string;
  privacyVersion: string;
}

export interface RegisterInput {
  name: string;
  username: string;
  email: string;
  password: string;
  weeklyGoal: number;
  weight: number;
  // O servidor recusa versao diferente da vigente, entao estes valores vem de
  // /auth/legal-versions e nunca de constante local: e o registro de que o
  // usuario aceitou exatamente o documento que lhe foi apresentado.
  acceptedTermsVersion: string;
  acceptedPrivacyVersion: string;
}

export interface RegisterApiInput {
  fullName: string;
  username: string;
  email: string;
  password: string;
  weeklyGoal: number;
  bodyWeight: number;
  acceptedTermsVersion: string;
  acceptedPrivacyVersion: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface AuthSessionResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthApiUser;
}

export interface RefreshSessionResponse {
  accessToken: string;
  refreshToken: string;
}
