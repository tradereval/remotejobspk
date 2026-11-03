import { redirect } from "next/navigation";
import { clearPendingVerification, consumeEmailVerification, createSession, destinationFor, peekEmailVerification } from "@/lib/auth";
import { safeNextPath } from "@/lib/site";

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const token = String(sp.token || "");
  const next = safeNextPath(sp.next, "/jobs");
  const user = token ? await peekEmailVerification(token) : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <img src="/logo-signature.jpg" alt="RemoteJobsPK" className="mb-6 w-full max-w-sm" />
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Verify your email</h1>
      {user ? (
        <>
          <p className="mt-3 text-sm text-[var(--muted)]">
            This confirms <strong className="text-[var(--ink)]">{user.email}</strong> for RemoteJobsPK.
            After this, we open your account.
          </p>
          <form action={confirmAction} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="next" value={next} />
            <button type="submit" className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-white">
              Verify and continue
            </button>
          </form>
        </>
      ) : (
        <p className="mt-3 text-sm text-rose-700">
          {sp.error || "This verification link has expired. Log in and ask for a new email."}
        </p>
      )}
    </div>
  );
}

async function confirmAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") || "");
  const next = safeNextPath(String(formData.get("next") || ""), "/jobs");
  const user = await consumeEmailVerification(token);
  if (!user) {
    redirect(`/verify-email/confirm?error=${encodeURIComponent("This verification link has expired. Log in and ask for a new email.")}`);
  }
  await clearPendingVerification();
  await createSession(user);
  redirect(destinationFor(user, next));
}
