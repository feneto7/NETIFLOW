import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";

// For local desktop apps, a random secret generated at startup ensures sessions
// are automatically invalidated when the app is restarted, meeting the requirement
// to always ask for login on a fresh start.
// In dev mode, we use a static secret to prevent hot-reload from killing the session.
// Use globalThis to persist the secret across different Webpack chunks in Next.js production build!
const globalAny: any = globalThis;

if (!globalAny.__SESSION_SECRET) {
  globalAny.__SESSION_SECRET = process.env.NODE_ENV === "development" 
    ? "dev-secret-key-12345678901234567890" 
    : crypto.randomBytes(32).toString("hex");
}

const secretKey = globalAny.__SESSION_SECRET;
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h") // fallback expiration, but it will be a session cookie
    .sign(key);
}

export async function decrypt(token: string) {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("auth_session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

// Para uso nos Route Handlers (API)
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return null;
}
