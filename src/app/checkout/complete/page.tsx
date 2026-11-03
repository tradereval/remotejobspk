import Link from "next/link";
import { fulfillPayment } from "@/lib/safepay";

export default async function CheckoutCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ tracker?: string }>;
}) {
  const sp = await searchParams;
  const result = sp.tracker ? await fulfillPayment(sp.tracker).catch(() => ({ ok: false as const, error: "Could not confirm the payment yet." })) : { ok: false as const, error: "Missing payment reference." };

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        {result.ok ? "Premium is on" : "Payment not confirmed"}
      </h1>
      <p className="mt-3 text-[var(--muted)]">
        {result.ok
          ? "Your account has Premium for 30 days. Verified filters, saved searches, and daily email are included."
          : result.error}
      </p>
      <Link href="/account" className="mt-6 inline-flex rounded-full bg-[var(--ink)] px-5 py-2.5 text-[var(--bg)]">
        Go to account
      </Link>
    </div>
  );
}
