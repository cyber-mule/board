const accessTokenKey = 'znp_access_token';
const refreshTokenKey = 'znp_refresh_token';
const roleKey = 'znp_role';

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  if (accessToken) {
    return accessToken;
  }

  const storedToken = window.localStorage.getItem(accessTokenKey);
  if (storedToken) {
    accessToken = storedToken;
  }

  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token) {
    window.localStorage.setItem(accessTokenKey, token);
  } else {
    window.localStorage.removeItem(accessTokenKey);
  }
}

export function getRefreshToken(): string | null {
  return window.localStorage.getItem(refreshTokenKey);
}

export function setRefreshToken(token: string | null): void {
  if (token) {
    window.localStorage.setItem(refreshTokenKey, token);
  } else {
    window.localStorage.removeItem(refreshTokenKey);
  }
}

export function getRole(): string | null {
  return window.localStorage.getItem(roleKey);
}

export function setRole(role: string | null): void {
  if (role) {
    window.localStorage.setItem(roleKey, role);
  } else {
    window.localStorage.removeItem(roleKey);
  }
}

export function clearSession(): void {
  setAccessToken(null);
  setRefreshToken(null);
  setRole(null);
}
