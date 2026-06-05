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

export async function getAIServiceToken(): Promise<string> {
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
  return loginData.accessToken;
}
