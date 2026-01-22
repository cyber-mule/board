import { buildUrl } from './url';
import { authPath } from './paths';
import { parseErrorResponse } from './error';
import {
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  setRole,
} from '../auth/tokens';
import { USE_MOCK, mockFetch } from '../mock';
import { pushToast } from '../lib/toast';
import type {
  AuthenticatedUser,
  ForgotPasswordRequest,
  MessageResponse,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyRequest,
} from './types';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  role?: string;
  user?: AuthenticatedUser;
};

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  accessToken?: string;
  refreshToken?: string;
  role?: string;
  user?: AuthenticatedUser;
  requires_verification?: boolean;
};

function deriveRole(role?: string, user?: AuthenticatedUser): string | undefined {
  if (role) {
    return role;
  }

  const roles = user?.roles ?? [];
  if (roles.includes('admin')) {
    return 'admin';
  }
  if (roles.includes('user')) {
    return 'user';
  }

  return undefined;
}

function normalizeAuthResponse(data: AuthResponse): AuthTokens {
  const accessToken = data.access_token ?? data.accessToken;
  const refreshToken = data.refresh_token ?? data.refreshToken;

  if (!accessToken || !refreshToken) {
    throw new Error('Auth response missing tokens');
  }

  return {
    accessToken,
    refreshToken,
    role: deriveRole(data.role, data.user),
    user: data.user,
  };
}

function applyTokens(tokens: AuthTokens): void {
  setAccessToken(tokens.accessToken);
  setRefreshToken(tokens.refreshToken);

  if (tokens.role) {
    setRole(tokens.role);
  }
}

async function failWithToast(response: Response, fallback: string): Promise<Error> {
  const message = await parseErrorResponse(response, fallback);
  pushToast({ title: '操作失败', description: message, variant: 'error' });
  return new Error(message);
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const response = await (USE_MOCK ? mockFetch : fetch)(buildUrl(authPath('/login')), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw await failWithToast(response, `Login failed (${response.status})`);
  }

  const data = (await response.json()) as AuthResponse;
  const tokens = normalizeAuthResponse(data);
  applyTokens(tokens);
  return tokens;
}

export async function refreshTokens(): Promise<AuthTokens> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error('Missing refresh token');
  }

  const response = await (USE_MOCK ? mockFetch : fetch)(buildUrl(authPath('/refresh')), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    throw await failWithToast(response, `Refresh failed (${response.status})`);
  }

  const data = (await response.json()) as AuthResponse;
  const tokens = normalizeAuthResponse(data);
  applyTokens(tokens);
  return tokens;
}

export type RegisterResult = {
  requires_verification: boolean;
  tokens?: AuthTokens;
  user?: AuthenticatedUser;
};

export async function registerAccount(payload: RegisterRequest): Promise<RegisterResult> {
  const response = await (USE_MOCK ? mockFetch : fetch)(buildUrl(authPath('/register')), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await failWithToast(response, `Register failed (${response.status})`);
  }

  const data = (await response.json()) as AuthResponse;
  const requiresVerification = Boolean(data.requires_verification);
  if (!requiresVerification) {
    const tokens = normalizeAuthResponse(data);
    applyTokens(tokens);
    return { requires_verification: false, tokens, user: tokens.user ?? data.user };
  }
  return { requires_verification: true, user: data.user };
}

export async function verifyEmail(payload: VerifyRequest): Promise<AuthTokens> {
  const response = await (USE_MOCK ? mockFetch : fetch)(buildUrl(authPath('/verify')), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await failWithToast(response, `Verify failed (${response.status})`);
  }

  const data = (await response.json()) as AuthResponse;
  const tokens = normalizeAuthResponse(data);
  applyTokens(tokens);
  return tokens;
}

export async function requestPasswordReset(payload: ForgotPasswordRequest): Promise<MessageResponse> {
  const response = await (USE_MOCK ? mockFetch : fetch)(buildUrl(authPath('/forgot')), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await failWithToast(response, `Reset request failed (${response.status})`);
  }

  return (await response.json()) as MessageResponse;
}

export async function resetPassword(payload: ResetPasswordRequest): Promise<MessageResponse> {
  const response = await (USE_MOCK ? mockFetch : fetch)(buildUrl(authPath('/reset')), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await failWithToast(response, `Password reset failed (${response.status})`);
  }

  return (await response.json()) as MessageResponse;
}

