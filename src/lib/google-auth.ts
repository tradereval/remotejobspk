import type { Prisma } from "@prisma/client";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { hashPassword } from "./auth";
import { prisma } from "./db";
import { safeNextPath, siteUrl } from "./site";

type UserWithSubscription = Prisma.UserGetPayload<{ include: { subscription: true } }>;
type GoogleAuthResult =
  | { error: string }
  | { user: UserWithSubscription; created: boolean; next: string };

const STATE_COOKIE = "rjp_google";

function secret() {
  return process.env.AUTH_SECRET || "dev-change-me-remotejobspk-secret";
}

export function googleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function googleRedirectUri() {
  return `${siteUrl()}/api/auth/google/callback`;
}

function signState(payload: { nonce: string; next: string; exp: number }) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function readState(token: string) {
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
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      nonce?: string;
      next?: string;
      exp?: number;
    };
    if (!payload.nonce || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function beginGoogleAuth(nextPath: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return null;
  const nonce = randomBytes(16).toString("hex");
  const next = safeNextPath(nextPath, "/account");
  const token = signState({ nonce, next, exp: Date.now() + 10 * 60 * 1000 });
  const jar = await cookies();
  jar.set(STATE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", googleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", nonce);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function finishGoogleAuth(code: string, state: string): Promise<GoogleAuthResult> {
  const jar = await cookies();
  const stored = readState(jar.get(STATE_COOKIE)?.value || "");
  jar.delete(STATE_COOKIE);
  if (!stored || stored.nonce !== state) return { error: "Google sign-in expired. Try again." as const };

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return { error: "Google sign-in is not set up yet." as const };

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = (await tokenRes.json().catch(() => null)) as { access_token?: string } | null;
  if (!tokenRes.ok || !tokenJson?.access_token) {
    return { error: "Google did not confirm that account." as const };
  }

  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const info = (await infoRes.json().catch(() => null)) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  } | null;
  const email = info?.email?.trim().toLowerCase();
  if (!infoRes.ok || !info?.sub || !email || info.email_verified === false) {
    return { error: "That Google account has no verified email." as const };
  }

  const linked = await linkGoogleUser({ sub: info.sub, email, name: info.name?.trim() || null });
  if ("error" in linked) return linked;
  return {
    user: linked.user,
    created: linked.created,
    next: stored.next || "/account",
  };
}

async function linkGoogleUser(profile: {
  sub: string;
  email: string;
  name: string | null;
}): Promise<{ error: string } | { user: UserWithSubscription; created: boolean }> {
  const bySub = await prisma.user.findUnique({
    where: { googleSub: profile.sub },
    include: { subscription: true },
  });
  if (bySub) {
    if (!bySub.emailVerifiedAt) {
      return {
        user: await prisma.user.update({
          where: { id: bySub.id },
          data: { emailVerifiedAt: new Date() },
          include: { subscription: true },
        }),
        created: false,
      };
    }
    return { user: bySub, created: false };
  }

  const byEmail = await prisma.user.findUnique({
    where: { email: profile.email },
    include: { subscription: true },
  });
  if (byEmail) {
    if (byEmail.googleSub && byEmail.googleSub !== profile.sub) {
      return { error: "That email is already linked to a different Google account." as const };
    }
    return {
      user: await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleSub: profile.sub,
          emailVerifiedAt: byEmail.emailVerifiedAt || new Date(),
          name: byEmail.name || profile.name,
        },
        include: { subscription: true },
      }),
      created: false,
    };
  }

  const created = await prisma.user.create({
    data: {
      email: profile.email,
      name: profile.name,
      googleSub: profile.sub,
      emailVerifiedAt: new Date(),
      passwordHash: await hashPassword(randomBytes(24).toString("base64url")),
      subscription: { create: { status: "inactive" } },
    },
    include: { subscription: true },
  });
  return { user: created, created: true };
}
