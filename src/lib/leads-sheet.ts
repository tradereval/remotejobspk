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

/** Append one CRM row to Google Sheets via Apps Script / Make / Zapier webhook. */
export async function syncLeadToSpreadsheet(payload: LeadPayload): Promise<{ ok: boolean; skipped?: boolean }> {
  const url = process.env.LEADS_SHEET_WEBHOOK_URL?.trim();
  if (!url) {
    console.warn("[leads-sheet] LEADS_SHEET_WEBHOOK_URL not set — skipping spreadsheet sync");
    return { ok: false, skipped: true };
  }

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
    if (!res.ok) {
      console.error("[leads-sheet] webhook failed", res.status, await res.text().catch(() => ""));
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[leads-sheet] webhook error", err);
    return { ok: false };
  }
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
