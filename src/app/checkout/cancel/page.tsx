import Link from "next/link";
import { markCheckoutCanceled } from "@/lib/safepay";

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ tracker?: string }>;
}) {
  const sp = await searchParams;
  await markCheckoutCanceled(sp.tracker);

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Checkout canceled</h1>
      <p className="mt-3 text-[var(--muted)]">
        No charge was recorded. You can try the card again, or email hello@remotejobspk.com with JazzCash
        or bank proof.
      </p>
      <Link href="/pricing" className="mt-6 inline-flex rounded-full bg-[var(--ink)] px-5 py-2.5 text-[var(--bg)]">
        Back to pricing
      </Link>
    </div>
  );
}
