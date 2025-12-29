import { buildUrl } from './url';
import { authPath } from './paths';
import {
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  setRole,
} from '../auth/tokens';
import { USE_MOCK, mockFetch } from '../mock';
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

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  const text = await response.text().catch(() => '');

  if (text) {
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed && typeof parsed.message === 'string') {
        return parsed.message;
      }
      if (parsed && typeof (parsed as { error?: string }).error === 'string') {
        return (parsed as { error?: string }).error as string;
      }
    } catch (error) {
      return text;
    }

    return text;
  }

  return fallback;
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
    const message = await parseErrorMessage(response, `Login failed (${response.status})`);
    throw new Error(message);
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
    const message = await parseErrorMessage(response, `Refresh failed (${response.status})`);
    throw new Error(message);
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
    const message = await parseErrorMessage(response, `Register failed (${response.status})`);
    throw new Error(message);
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
    const message = await parseErrorMessage(response, `Verify failed (${response.status})`);
    throw new Error(message);
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
    const message = await parseErrorMessage(response, `Reset request failed (${response.status})`);
    throw new Error(message);
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
    const message = await parseErrorMessage(response, `Password reset failed (${response.status})`);
    throw new Error(message);
  }

  return (await response.json()) as MessageResponse;
}
