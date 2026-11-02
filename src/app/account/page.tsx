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
      <p className="mt-2 text-sm text-[var(--muted)]">
        You&apos;re signed in. No confirmation email is required — accounts work right away.
      </p>

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

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Free includes</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            <li>• Full job board browse</li>
            <li>• Eligibility labels on every role</li>
            <li>• Search + seniority filters</li>
            <li>• Direct apply links (never paywalled)</li>
          </ul>
          <Link href="/jobs" className="mt-4 inline-block text-sm text-[var(--accent)] underline">
            Browse jobs →
          </Link>
        </div>

        <div
          className={`rounded-2xl border p-5 ${
            premium ? "border-[var(--accent)] bg-white" : "border-[var(--line)] bg-white/70"
          }`}
        >
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            Premium {premium ? "unlocked" : "adds"}
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            <li>• Verified-only filter (skip unverified postings)</li>
            <li>• Accepts-beginners filter</li>
            <li>
              • Daily email alerts{" "}
              <span className="text-xs">(wiring next — Resend)</span>
            </li>
            <li>
              • Saved searches{" "}
              <span className="text-xs">(coming soon)</span>
            </li>
          </ul>
          {!premium && (
            <>
              <Link
                href="/pricing"
                className="mt-4 inline-flex rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white"
              >
                See Premium Rs 999 / $3
              </Link>
              <p className="mt-3 text-xs text-[var(--muted)]">
                Checkout (Safepay) is not live yet. Until then, ask us at hello@remotejobspk.com or an
                admin can grant Premium manually.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
