/**
 * Edge-compatible Open2 Auth client to fetch access tokens for the AI service.
 * Uses standard standard-compliant fetch calls.
 */

interface AppTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface AppHandshakeResponse {
  handshake_token: string;
  expires_in: number;
}

interface AIServiceLoginResponse {
  status: string;
  accessToken: string;
  tokenType: string;
}

interface CachedToken {
  token: string;
  /** Unix timestamp in ms when the token expires */
  exp: number;
}

let cachedToken: CachedToken | null = null;
let inFlightToken: Promise<string> | null = null;

const TOKEN_SKEW_MS = 90 * 1000; // 90 seconds skew

function getJwtExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (typeof payload.exp === 'number') {
      return payload.exp * 1000;
    }
  } catch (e) {
    console.error("Error decoding JWT expiry:", e);
  }
  return null;
}

async function mintAIServiceToken(): Promise<CachedToken> {
  const authServiceUrl = (process.env.OPEN2_AUTH_SERVICE_URL || "https://auth.open2.in").replace(/\/$/, "");
  const clientId = process.env.CHAVARUNDO_CLIENT_ID;
  const clientSecret = process.env.CHAVARUNDO_CLIENT_SECRET;
  const aiServiceClientId = process.env.AI_SERVICE_CLIENT_ID || "client_155e2dcd56482602f96e57a37670fa5e";
  const aiServiceUrl = (process.env.AI_SERVICE_URL || "http://localhost:5000/api/v1").replace(/\/$/, "");

  if (!clientId || !clientSecret) {
    throw new Error(
      "CHAVARUNDO_CLIENT_ID and CHAVARUNDO_CLIENT_SECRET environment variables are required in .env.local."
    );
  }

  // 1. Authenticate with Open2 Auth Service to get our App Access Token
  const tokenRes = await fetch(`${authServiceUrl}/auth/app/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    throw new Error(`Open2 App Auth failed: ${err.error || err.message || tokenRes.statusText}`);
  }

  const tokenData: AppTokenResponse = await tokenRes.json();
  const appAccessToken = tokenData.access_token;

  // 2. Generate Handshake Token targeting the AI Service
  const handshakeRes = await fetch(`${authServiceUrl}/auth/app/handshake`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-app-token": appAccessToken,
    },
    body: JSON.stringify({
      target_client_id: aiServiceClientId,
    }),
  });

  if (!handshakeRes.ok) {
    const err = await handshakeRes.json().catch(() => ({}));
    throw new Error(`Handshake token generation failed: ${err.error || err.message || handshakeRes.statusText}`);
  }

  const handshakeData: AppHandshakeResponse = await handshakeRes.json();
  const handshakeToken = handshakeData.handshake_token;

  // 3. Exchange Handshake Token for AI Service local Access Token
  const loginRes = await fetch(`${aiServiceUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      handshakeToken,
    }),
  });

  if (!loginRes.ok) {
    const err = await loginRes.json().catch(() => ({}));
    throw new Error(`AI Service login failed: ${err.error || err.message || loginRes.statusText}`);
  }

  const loginData: AIServiceLoginResponse = await loginRes.json();
  const token = loginData.accessToken;
  const exp = getJwtExpiry(token) || (Date.now() + 3600 * 1000);

  return { token, exp };
}

export async function getAIServiceToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cachedToken && cachedToken.exp - TOKEN_SKEW_MS > now) {
    return cachedToken.token;
  }
  if (inFlightToken) return inFlightToken;

  inFlightToken = mintAIServiceToken()
    .then((t) => {
      cachedToken = t;
      return t.token;
    })
    .finally(() => {
      inFlightToken = null;
    });

  return inFlightToken;
}
