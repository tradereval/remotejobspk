import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, issuePasswordReset } from "@/lib/auth";
import { sendPasswordReset } from "@/lib/email";

export default async function ForgotPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; link?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/account");
  const sp = await searchParams;
  const devLink =
    process.env.NODE_ENV !== "production" && sp.link?.startsWith("/reset?token=") ? sp.link : undefined;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Reset password</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        We email a one-hour link if the account exists.
      </p>
      {sp.sent && (
        <p className="mt-3 text-sm text-[var(--accent)]">
          If that email is registered, a reset link is on its way. It expires in one hour.
        </p>
      )}
      {sp.error && <p className="mt-3 text-sm text-rose-700">{sp.error}</p>}
      {devLink && (
        <p className="mt-3 break-all text-sm">
          Local mail is off. Use this link:{" "}
          <Link href={devLink} className="underline">
            {devLink}
          </Link>
        </p>
      )}
      <form action={forgotAction} className="mt-6 space-y-4">
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
        />
        <button type="submit" className="w-full rounded-full bg-[var(--ink)] py-2.5 text-[var(--bg)]">
          Email me a link
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        <Link href="/login" className="underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}

async function forgotAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const issued = await issuePasswordReset(email);
  if (!issued) redirect("/forgot?sent=1");
  const result = await sendPasswordReset(issued.user, issued.token);
  if (!result.sent && process.env.NODE_ENV !== "production") {
    redirect(`/forgot?sent=1&link=${encodeURIComponent(`/reset?token=${issued.token}`)}`);
  }
  if (!result.sent && !result.skipped) {
    redirect("/forgot?error=We%20could%20not%20send%20email.%20Write%20to%20hello%40remotejobspk.com");
  }
  redirect("/forgot?sent=1");
}
