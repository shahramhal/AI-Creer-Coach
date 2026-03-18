/**
 * In-memory token store.
 *
 * Access tokens are kept in a module-scoped variable instead of localStorage
 * so they are not accessible to XSS-injected scripts. On page refresh the
 * token is recovered via a silent refresh call using the httpOnly refresh cookie.
 */

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}
