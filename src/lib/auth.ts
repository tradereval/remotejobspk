import { cookies } from "next/headers";
import { connection } from "next/server";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { safeNextPath } from "./site";

const COOKIE = "rjp_session";
const PENDING = "rjp_pending";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

type SessionPayload = {
  userId: string;
  email: string;
  role: string;
  exp: number;
};

function secret() {
  return process.env.AUTH_SECRET || "dev-change-me-remotejobspk-secret";
}

function signJson(payload: { exp: number; [key: string]: unknown }): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function readJson<T extends { exp: number }>(token: string): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
    if (!payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function sign(payload: SessionPayload): string {
  return signJson(payload);
}

function verify(token: string): SessionPayload | null {
  return readJson<SessionPayload>(token);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: { id: string; email: string; role: string }) {
  const token = sign({
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + MAX_AGE * 1000,
  });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verify(token);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { subscription: true },
  });
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}

export async function issuePasswordReset(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { subscription: true },
  });
  if (!user) return null;
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
  await prisma.passwordReset.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });
  return { user, token };
}

export async function consumePasswordReset(token: string, password: string) {
  if (password.length < 8) return false;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const row = await prisma.passwordReset.findUnique({ where: { tokenHash } });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return false;
  await prisma.user.update({
    where: { id: row.userId },
    data: { passwordHash: await hashPassword(password) },
  });
  await prisma.passwordReset.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return true;
}

export function profileComplete(user: {
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  qualification?: string | null;
  specialty?: string | null;
}) {
  return Boolean(user.phone && user.city && user.state && user.qualification && user.specialty);
}

/** Where this person should go next. Unverified email never reaches matches. */
export function destinationFor(
  user: {
    emailVerifiedAt: Date | null;
    phone?: string | null;
    city?: string | null;
    state?: string | null;
    qualification?: string | null;
    specialty?: string | null;
  },
  requested?: string | null,
) {
  const next = safeNextPath(requested, "");
  if (!user.emailVerifiedAt) {
    return `/verify-email${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  }
  if (!profileComplete(user)) {
    return `/signup/profile?next=${encodeURIComponent(next || "/account")}`;
  }
  return next || "/account";
}

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function setPendingVerification(userId: string) {
  const token = signJson({ userId, exp: Date.now() + 24 * 60 * 60 * 1000 });
  const jar = await cookies();
  jar.set(PENDING, token, { ...cookieBase, maxAge: 60 * 60 * 24 });
}

export async function clearPendingVerification() {
  const jar = await cookies();
  jar.delete(PENDING);
}

export async function getPendingVerificationUser() {
  const jar = await cookies();
  const token = jar.get(PENDING)?.value;
  if (!token) return null;
  const payload = readJson<{ userId: string; exp: number }>(token);
  if (!payload?.userId) return null;
  return prisma.user.findUnique({
    where: { id: payload.userId },
    include: { subscription: true },
  });
}

export async function issueEmailVerification(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.emailVerification.deleteMany({ where: { userId } });
  await prisma.emailVerification.create({
    data: { userId, tokenHash, expiresAt },
  });
  return token;
}

export async function peekEmailVerification(token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const row = await prisma.emailVerification.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return null;
  return row.user;
}

export async function consumeEmailVerification(token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const row = await prisma.emailVerification.findUnique({ where: { tokenHash } });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return null;
  const user = await prisma.user.update({
    where: { id: row.userId },
    data: { emailVerifiedAt: new Date() },
    include: { subscription: true },
  });
  await prisma.emailVerification.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return user;
}

export async function isPremium(user: {
  subscription?: { status: string; currentPeriodEnd: Date | null } | null;
} | null) {
  if (!user?.subscription) return false;
  if (user.subscription.status !== "active") return false;
  if (user.subscription.currentPeriodEnd) {
    await connection();
    if (user.subscription.currentPeriodEnd.getTime() < Date.now()) return false;
  }
  return true;
}
