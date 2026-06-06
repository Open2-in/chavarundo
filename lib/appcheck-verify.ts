const JWKS_URL = "https://firebaseappcheck.googleapis.com/v1/jwks";

let _keys: Record<string, CryptoKey> | null = null;
let _keysExpiry = 0;

async function getPublicKeys(): Promise<Record<string, CryptoKey>> {
  if (_keys && Date.now() < _keysExpiry) return _keys;

  const res = await fetch(JWKS_URL);
  const { keys } = await res.json();

  const result: Record<string, CryptoKey> = {};
  for (const jwk of keys) {
    result[jwk.kid] = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
  }

  _keys = result;
  _keysExpiry = Date.now() + 3600_000;
  return result;
}

function b64url(s: string) {
  let base64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad === 2) {
    base64 += "==";
  } else if (pad === 3) {
    base64 += "=";
  }
  return atob(base64);
}

export async function verifyAppCheckToken(token: string | null): Promise<boolean> {
  if (process.env.DISABLE_APP_CHECK === "true") {
    return true;
  }
  if (!token) return false;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [headerB64, payloadB64, sigB64] = parts;

    const header = JSON.parse(b64url(headerB64));
    const payload = JSON.parse(b64url(payloadB64));

    const now = Date.now() / 1000;
    if (payload.exp < now) {
      console.warn("[App Check] Token has expired.");
      return false;
    }
    if (payload.nbf !== undefined && payload.nbf > now) {
      console.warn("[App Check] Token not active yet.");
      return false;
    }

    const projectNumber = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    if (!payload.aud?.includes(`projects/${projectNumber}`)) {
      console.warn(`[App Check] Audience mismatch. Expected projects/${projectNumber}, got:`, payload.aud);
      return false;
    }
    if (payload.iss !== `https://firebaseappcheck.googleapis.com/${projectNumber}`) {
      console.warn(`[App Check] Issuer mismatch. Expected https://firebaseappcheck.googleapis.com/${projectNumber}, got:`, payload.iss);
      return false;
    }

    const keys = await getPublicKeys();
    const key = keys[header.kid];
    if (!key) {
      console.warn("[App Check] Key ID (kid) not found in JWKS:", header.kid);
      return false;
    }

    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const sig = Uint8Array.from(b64url(sigB64), (c) => c.charCodeAt(0));

    const isValid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, data);
    if (!isValid) {
      console.warn("[App Check] Signature verification failed.");
    }
    return isValid;
  } catch (err: any) {
    console.error("[App Check Verify Error]:", err);
    return false;
  }
}
