export type AuthProvider = 'google' | string;

export interface AuthUser {
  id: string;
  email: string;
  provider: AuthProvider;
  nickname: string;
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export interface GoogleCodeExchangeRequest {
  code: string;
  redirectUri: string;
  codeVerifier?: string;
}
