import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Set it in your .env file or hosting environment.`
    );
  }
  return value;
}

let _adminEmail: string | undefined;
let _adminPassword: string | undefined;
let _jwtSecret: Uint8Array | undefined;

function getAdminEmail(): string {
  if (!_adminEmail) _adminEmail = requireEnv("ADMIN_EMAIL");
  return _adminEmail;
}

function getAdminPassword(): string {
  if (!_adminPassword) _adminPassword = requireEnv("ADMIN_PASSWORD");
  return _adminPassword;
}

function getJwtSecret(): Uint8Array {
  if (!_jwtSecret) _jwtSecret = new TextEncoder().encode(requireEnv("JWT_SECRET"));
  return _jwtSecret;
}
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
  const emailMatch = timingSafeEqual(email, getAdminEmail());
  const passMatch = timingSafeEqual(password, getAdminPassword());
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
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getJwtSecret());
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
