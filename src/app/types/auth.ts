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

export interface RegisterInput {
  name: string;
  username: string;
  email: string;
  password: string;
  weeklyGoal: number;
  weight: number;
}

export interface RegisterApiInput {
  fullName: string;
  username: string;
  email: string;
  password: string;
  weeklyGoal: number;
  bodyWeight: number;
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
