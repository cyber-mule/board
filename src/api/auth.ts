import { buildUrl } from './url';
import { authPath } from './paths';
import { errorFallbackForStatus, errorTitleForStatus, parseErrorResponse } from './error';
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

type FailToastOptions = {
  title?: string;
  fallback?: string;
};

async function failWithToast(response: Response, options: FailToastOptions = {}): Promise<Error> {
  const fallback = options.fallback ?? errorFallbackForStatus(response.status);
  const message = await parseErrorResponse(response, fallback);
  pushToast({
    title: options.title ?? errorTitleForStatus(response.status),
    description: message,
    variant: 'error',
  });
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
    throw await failWithToast(response, {
      title: '登录失败',
      fallback: '登录失败，请检查账号或密码后重试。',
    });
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
    throw await failWithToast(response, {
      title: '登录已失效',
      fallback: '登录已失效，请重新登录。',
    });
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
    throw await failWithToast(response, {
      title: '注册失败',
      fallback: '注册失败，请检查填写内容后重试。',
    });
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
    throw await failWithToast(response, {
      title: '验证失败',
      fallback: '验证失败，请确认验证码后重试。',
    });
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
    throw await failWithToast(response, {
      title: '发送验证码失败',
      fallback: '验证码发送失败，请稍后重试。',
    });
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
    throw await failWithToast(response, {
      title: '重置密码失败',
      fallback: '重置密码失败，请稍后重试。',
    });
  }

  return (await response.json()) as MessageResponse;
}

