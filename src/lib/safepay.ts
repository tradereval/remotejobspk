import { prisma } from "./db";
import { sendReceipt } from "./email";
import { syncLeadToSpreadsheet, userToLeadPayload, type LeadUser } from "./leads-sheet";
import { siteUrl } from "./site";

const PLANS = {
  premium_pkr: { currency: "PKR", amount: 99900, label: "Premium Rs 999" },
  premium_usd: { currency: "USD", amount: 300, label: "Premium $3" },
} as const;

export type CheckoutPlan = keyof typeof PLANS;

function host() {
  return process.env.SAFEPAY_ENV === "live"
    ? "https://api.getsafepay.com"
    : "https://sandbox.api.getsafepay.com";
}

function environmentName() {
  return process.env.SAFEPAY_ENV === "live" ? "production" : "sandbox";
}

function configured() {
  return Boolean(process.env.SAFEPAY_SECRET_KEY?.trim() && process.env.SAFEPAY_API_KEY?.trim());
}

async function safepayFetch(path: string, init?: RequestInit) {
  const secret = process.env.SAFEPAY_SECRET_KEY?.trim();
  if (!secret) throw new Error("Safepay secret is not set");
  const res = await fetch(`${host()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-SFPY-MERCHANT-SECRET": secret,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Safepay ${path} ${res.status}`);
  }
  return json as {
    data?: {
      tracker?: { token?: string; state?: string; purchase_totals?: { quote_amount?: { currency?: string; amount?: number } } };
      token?: string;
    } | string;
  };
}

export async function createCheckout(user: LeadUser, plan: CheckoutPlan) {
  if (!configured()) {
    return {
      ok: false as const,
      error:
        "Card checkout needs Safepay keys on the server. Email hello@remotejobspk.com with JazzCash or bank proof and we will turn Premium on.",
    };
  }
  const price = PLANS[plan];
  const session = await safepayFetch("/order/payments/v3/", {
    method: "POST",
    body: JSON.stringify({
      merchant_api_key: process.env.SAFEPAY_API_KEY,
      intent: process.env.SAFEPAY_INTENT || "CYBERSOURCE",
      mode: "payment",
      entry_mode: "raw",
      currency: price.currency,
      amount: price.amount,
      metadata: { user_id: user.id, plan },
      include_fees: false,
    }),
  });
  const tracker = typeof session.data === "object" ? session.data?.tracker?.token : undefined;
  if (!tracker) return { ok: false as const, error: "Safepay did not return a payment tracker." };

  await prisma.payment.create({
    data: {
      userId: user.id,
      tracker,
      plan,
      currency: price.currency,
      amount: price.amount,
      status: "pending",
    },
  });

  const passport = await safepayFetch("/client/passport/v1/token", { method: "POST", body: "{}" });
  const tbt = typeof passport.data === "string" ? passport.data : passport.data?.token;
  if (!tbt) return { ok: false as const, error: "Safepay did not return a checkout token." };

  const base =
    process.env.SAFEPAY_CHECKOUT_BASE?.replace(/\/$/, "") ||
    (process.env.SAFEPAY_ENV === "live" ? "https://getsafepay.com" : "https://sandbox.api.getsafepay.com");
  const params = new URLSearchParams({
    environment: environmentName(),
    tracker,
    tbt,
    source: "hosted",
    redirect_url: `${siteUrl()}/checkout/complete`,
    cancel_url: `${siteUrl()}/checkout/cancel`,
  });
  return { ok: true as const, url: `${base}/embedded/checkout?${params.toString()}` };
}

async function activatePremium(payment: { userId: string; plan: string; currency: string }) {
  const end = new Date();
  end.setDate(end.getDate() + 30);
  const existing = await prisma.subscription.findUnique({ where: { userId: payment.userId } });
  if (existing?.currentPeriodEnd && existing.currentPeriodEnd.getTime() > Date.now()) {
    end.setTime(existing.currentPeriodEnd.getTime());
    end.setDate(end.getDate() + 30);
  }
  await prisma.subscription.upsert({
    where: { userId: payment.userId },
    create: {
      userId: payment.userId,
      status: "active",
      plan: payment.plan,
      currency: payment.currency,
      currentPeriodEnd: end,
    },
    update: {
      status: "active",
      plan: payment.plan,
      currency: payment.currency,
      currentPeriodEnd: end,
    },
  });
  const user = await prisma.user.findUnique({
    where: { id: payment.userId },
    include: { subscription: true },
  });
  if (!user) return;
  const label = PLANS[payment.plan as CheckoutPlan]?.label || "Premium";
  await syncLeadToSpreadsheet(userToLeadPayload(user, "premium_paid", `${label} paid via Safepay`));
  await sendReceipt(user, label);
}

export async function fulfillPayment(tracker: string) {
  const payment = await prisma.payment.findUnique({ where: { tracker } });
  if (!payment) return { ok: false as const, error: "Unknown payment." };
  if (payment.status === "paid") return { ok: true as const, already: true };

  const report = await safepayFetch(`/reporter/api/v1/payments/${encodeURIComponent(tracker)}`);
  const trackerData = typeof report.data === "object" ? report.data?.tracker : undefined;
  if (trackerData?.state !== "TRACKER_ENDED") {
    return { ok: false as const, error: "Payment is not complete yet." };
  }
  const quote = trackerData.purchase_totals?.quote_amount;
  if (quote?.amount !== undefined && quote.amount !== payment.amount) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed" } });
    return { ok: false as const, error: "Paid amount did not match the plan." };
  }
  if (quote?.currency && quote.currency !== payment.currency) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed" } });
    return { ok: false as const, error: "Paid currency did not match the plan." };
  }

  const claimed = await prisma.payment.updateMany({
    where: { id: payment.id, status: "pending" },
    data: { status: "paid" },
  });
  if (claimed.count === 0) return { ok: true as const, already: true };
  await activatePremium(payment);
  return { ok: true as const, already: false };
}

export async function markCheckoutCanceled(tracker: string | undefined) {
  if (!tracker) return;
  await prisma.payment.updateMany({
    where: { tracker, status: "pending" },
    data: { status: "canceled" },
  });
}
