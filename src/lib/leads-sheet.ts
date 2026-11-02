import { prisma } from "./db";

export type LeadEventType = "signup" | "profile_update" | "premium_granted" | "premium_paid";

export type LeadPayload = {
  event: LeadEventType;
  at?: string;
  userId?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  qualification?: string | null;
  specialty?: string | null;
  plan?: string | null;
  subscriptionStatus?: string | null;
  notes?: string | null;
};

/** Persist CRM event in DB always; also append to Google Sheet when webhook is configured. */
export async function syncLeadToSpreadsheet(payload: LeadPayload): Promise<{ ok: boolean; skipped?: boolean }> {
  let sheetSynced = false;
  const url = process.env.LEADS_SHEET_WEBHOOK_URL?.trim();

  if (url) {
    const body = {
      ...payload,
      at: payload.at || new Date().toISOString(),
      source: "remotejobspk",
    };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.LEADS_SHEET_WEBHOOK_SECRET
            ? { Authorization: `Bearer ${process.env.LEADS_SHEET_WEBHOOK_SECRET}` }
            : {}),
        },
        body: JSON.stringify(body),
      });
      sheetSynced = res.ok;
      if (!res.ok) {
        console.error("[leads-sheet] webhook failed", res.status, await res.text().catch(() => ""));
      }
    } catch (err) {
      console.error("[leads-sheet] webhook error", err);
    }
  } else {
    console.warn("[leads-sheet] LEADS_SHEET_WEBHOOK_URL not set — storing lead in DB only");
  }

  try {
    await prisma.leadEvent.create({
      data: {
        event: payload.event,
        userId: payload.userId || null,
        name: payload.name || null,
        email: payload.email || null,
        phone: payload.phone || null,
        city: payload.city || null,
        state: payload.state || null,
        qualification: payload.qualification || null,
        specialty: payload.specialty || null,
        plan: payload.plan || null,
        subscriptionStatus: payload.subscriptionStatus || null,
        notes: payload.notes || null,
        sheetSynced,
      },
    });
  } catch (err) {
    console.error("[leads-sheet] DB lead log failed", err);
    return { ok: false };
  }

  return { ok: true, skipped: !url };
}

export function userToLeadPayload(
  user: {
    id: string;
    email: string;
    name?: string | null;
    phone?: string | null;
    city?: string | null;
    state?: string | null;
    qualification?: string | null;
    specialty?: string | null;
    subscription?: { status?: string | null; plan?: string | null } | null;
  },
  event: LeadEventType,
  notes?: string,
): LeadPayload {
  return {
    event,
    userId: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    city: user.city,
    state: user.state,
    qualification: user.qualification,
    specialty: user.specialty,
    plan: user.subscription?.plan || null,
    subscriptionStatus: user.subscription?.status || "inactive",
    notes: notes || null,
  };
}
