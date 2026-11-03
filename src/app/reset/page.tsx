import Link from "next/link";
import { redirect } from "next/navigation";
import { consumePasswordReset, getCurrentUser } from "@/lib/auth";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/account");
  const sp = await searchParams;
  if (!sp.token) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Reset password</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          This link is missing a token.{" "}
          <Link href="/forgot" className="underline">
            Request a new one
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Choose a new password</h1>
      {sp.error && <p className="mt-3 text-sm text-rose-700">{sp.error}</p>}
      <form action={resetAction} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={sp.token} />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="New password (8+ characters)"
          className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
        />
        <button type="submit" className="w-full rounded-full bg-[var(--ink)] py-2.5 text-[var(--bg)]">
          Update password
        </button>
      </form>
    </div>
  );
}

async function resetAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const ok = await consumePasswordReset(token, password);
  if (!ok) {
    redirect(`/reset?token=${encodeURIComponent(token)}&error=This%20link%20is%20invalid%20or%20expired`);
  }
  redirect("/login?error=Password%20updated.%20Log%20in%20with%20the%20new%20one");
}
