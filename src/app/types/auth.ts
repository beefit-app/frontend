export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  weeklyGoal?: number | null;
  weight?: number | null;
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

export interface AuthTokenResponse {
  accessToken: string;
}
