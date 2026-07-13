const REALM_URL = "https://keycloak.naas.noders.services/realms/noders-appsfactory";
const CLIENT_ID =
  import.meta.env.VITE_DAMLLENS_OIDC_CLIENT_ID || "damllens-web-app-hackcanton-01-devnet";
const AUTHORIZATION_ENDPOINT = `${REALM_URL}/protocol/openid-connect/auth`;
const TOKEN_ENDPOINT = `${REALM_URL}/protocol/openid-connect/token`;
const LOGOUT_ENDPOINT = `${REALM_URL}/protocol/openid-connect/logout`;

const SESSION_KEY = "damllens-auth-session";
const VERIFIER_KEY = "damllens-pkce-verifier";
const STATE_KEY = "damllens-oauth-state";
const RETURN_KEY = "damllens-auth-return";

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresAt: number;
  refreshExpiresAt: number;
};

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  refresh_expires_in?: number;
};

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function randomValue(size = 48) {
  return base64Url(window.crypto.getRandomValues(new Uint8Array(size)));
}

async function sha256(value: string) {
  const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

function appOrigin() {
  if (window.location.hostname !== "127.0.0.1") return window.location.origin;
  return `${window.location.protocol}//localhost${window.location.port ? `:${window.location.port}` : ""}`;
}

function callbackUrl() {
  return `${appOrigin()}/auth/callback`;
}

function saveTokenResponse(tokens: TokenResponse, previous?: AuthSession) {
  const now = Date.now();
  const session: AuthSession = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || previous?.refreshToken || "",
    idToken: tokens.id_token || previous?.idToken,
    expiresAt: now + tokens.expires_in * 1000,
    refreshExpiresAt:
      now + (tokens.refresh_expires_in || Math.max(tokens.expires_in, 24 * 60 * 60)) * 1000,
  };
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

async function requestTokens(body: URLSearchParams) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json().catch(() => ({}))) as TokenResponse & {
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Canton sign-in failed");
  }
  return payload;
}

export async function beginLogin(returnTo = "/app/analyze") {
  const verifier = randomValue();
  const state = randomValue(24);
  const challenge = await sha256(verifier);
  window.sessionStorage.setItem(VERIFIER_KEY, verifier);
  window.sessionStorage.setItem(STATE_KEY, state);
  window.sessionStorage.setItem(RETURN_KEY, returnTo);

  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: callbackUrl(),
    response_type: "code",
    scope: "openid daml_ledger_api offline_access",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  }).toString();
  window.location.assign(url.toString());
}

export async function completeLogin(code: string, state: string) {
  const verifier = window.sessionStorage.getItem(VERIFIER_KEY);
  const expectedState = window.sessionStorage.getItem(STATE_KEY);
  if (!verifier || !expectedState || state !== expectedState) {
    throw new Error("The sign-in response could not be verified. Please try connecting again.");
  }

  const tokens = await requestTokens(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      redirect_uri: callbackUrl(),
      code,
      code_verifier: verifier,
    }),
  );

  window.sessionStorage.removeItem(VERIFIER_KEY);
  window.sessionStorage.removeItem(STATE_KEY);
  return saveTokenResponse(tokens);
}

export function getAuthSession() {
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export async function refreshAuthSession() {
  const current = getAuthSession();
  if (!current?.refreshToken || current.refreshExpiresAt <= Date.now()) {
    clearAuthSession();
    return null;
  }
  const tokens = await requestTokens(
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token: current.refreshToken,
    }),
  );
  return saveTokenResponse(tokens, current);
}

export function clearAuthSession() {
  window.sessionStorage.removeItem(SESSION_KEY);
}

export function logout() {
  const session = getAuthSession();
  clearAuthSession();
  const url = new URL(LOGOUT_ENDPOINT);
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("post_logout_redirect_uri", appOrigin());
  if (session?.idToken) url.searchParams.set("id_token_hint", session.idToken);
  window.location.assign(url.toString());
}

export function getAuthReturnPath() {
  const path = window.sessionStorage.getItem(RETURN_KEY) || "/app/analyze";
  window.sessionStorage.removeItem(RETURN_KEY);
  return path.startsWith("/") ? path : "/app/analyze";
}
