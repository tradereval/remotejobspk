import { cookies } from "next/headers";
import { connection } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const COOKIE = "rjp_session";
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

function sign(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token: string): SessionPayload | null {
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
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
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
