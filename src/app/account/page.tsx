import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isPremium } from "@/lib/auth";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const premium = await isPremium(user);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Account</h1>
      <div className="mt-6 space-y-3 rounded-2xl border border-[var(--line)] bg-white/80 p-5">
        <p>
          <span className="text-[var(--muted)]">Email:</span> {user.email}
        </p>
        <p>
          <span className="text-[var(--muted)]">Plan:</span>{" "}
          {premium ? (
            <span className="text-[var(--accent)]">Premium active</span>
          ) : (
            "Free"
          )}
        </p>
        {user.subscription?.currentPeriodEnd && (
          <p className="text-sm text-[var(--muted)]">
            Period ends {user.subscription.currentPeriodEnd.toLocaleDateString()}
          </p>
        )}
      </div>
      {!premium && (
        <p className="mt-6 text-[var(--muted)]">
          Want verified filters and alerts?{" "}
          <Link href="/pricing" className="text-[var(--accent)] underline">
            See Premium
          </Link>
          . Safepay checkout will appear here after merchant approval.
        </p>
      )}
    </div>
  );
}
