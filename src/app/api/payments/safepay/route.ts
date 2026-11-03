import { NextResponse } from "next/server";
import { fulfillPayment } from "@/lib/safepay";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const record = body as {
    tracker?: string | { token?: string };
    data?: { tracker?: string | { token?: string } };
  };
  const raw = record.data?.tracker || record.tracker;
  const tracker = typeof raw === "string" ? raw : raw?.token;
  if (!tracker) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const result = await fulfillPayment(tracker);
    return NextResponse.json({ ok: result.ok });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "failed" },
      { status: 500 },
    );
  }
}
