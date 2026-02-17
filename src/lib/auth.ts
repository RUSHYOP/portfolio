import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "alwayspurav@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "puravshri!@12";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "prtfl_s3cr3t_k3y_ch4ng3_1n_pr0d_2025!"
);
const TOKEN_NAME = "admin_token";
const TOKEN_EXPIRY = "8h";

// Rate limiting store
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}

export function validateCredentials(email: string, password: string): boolean {
  if (!email || !password) return false;
  const emailMatch = timingSafeEqual(email, ADMIN_EMAIL);
  const passMatch = timingSafeEqual(password, ADMIN_PASSWORD);
  return emailMatch && passMatch;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still iterate to prevent length-based timing leaks
    let result = 1;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function createToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function getTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_NAME)?.value || null;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getTokenFromCookies();
  if (!token) return false;
  return verifyToken(token);
}

export function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(TOKEN_NAME)?.value || null;
}

export async function verifyRequest(request: NextRequest): Promise<boolean> {
  const token = getTokenFromRequest(request);
  if (!token) return false;
  return verifyToken(token);
}

export { TOKEN_NAME };
