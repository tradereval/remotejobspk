import Link from "next/link";
import { redirect } from "next/navigation";
import { jobsAskPath } from "@/lib/ask";
import {
  destinationFor,
  getCurrentUser,
  getPendingVerificationUser,
  setPendingVerification,
} from "@/lib/auth";
import { sendAccountVerification } from "@/lib/email";
import { safeNextPath } from "@/lib/site";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ ask?: string; next?: string; error?: string; sent?: string }>;
}) {
  const sp = await searchParams;
  const ask = String(sp.ask || "").trim().slice(0, 500);
  const next = ask ? jobsAskPath(ask) : safeNextPath(sp.next, "/jobs");
  const sessionUser = await getCurrentUser();
  const pendingUser = await getPendingVerificationUser();
  const user = pendingUser && !pendingUser.emailVerifiedAt ? pendingUser : sessionUser;
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (user.emailVerifiedAt) redirect(destinationFor(user, next));

  const sendFailed = Boolean(sp.error);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <img src="/logo-signature.jpg" alt="RemoteJobsPK" className="mb-6 w-full max-w-sm" />
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        {sendFailed ? "The email did not send" : "Check your email"}
      </h1>
      {sendFailed ? (
        <p className="mt-3 text-sm text-rose-700">
          We could not send the welcome message to{" "}
          <strong className="text-[var(--ink)]">{user.email}</strong>. {sp.error}
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-[var(--muted)]">
            We sent a welcome message to <strong className="text-[var(--ink)]">{user.email}</strong>. It
            includes our terms and a <strong className="text-[var(--ink)]">Verify my email</strong> button.
            Your matches open after that button is pressed, so a made-up address cannot get in.
          </p>
          {sp.sent && (
            <p className="mt-3 text-sm text-[var(--accent)]">A new verification email is on its way.</p>
          )}
        </>
      )}
      <form action={resendAction} className="mt-6">
        {ask && <input type="hidden" name="ask" value={ask} />}
        <input type="hidden" name="next" value={next} />
        <button type="submit" className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-white">
          Resend the email
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Wrong address? <Link href="/signup" className="underline">Start again</Link> with a different
        email, or write to hello@remotejobspk.com.
      </p>
    </div>
  );
}

async function resendAction(formData: FormData) {
  "use server";
  const ask = String(formData.get("ask") || "").trim().slice(0, 500);
  const next = ask ? jobsAskPath(ask) : safeNextPath(String(formData.get("next") || ""), "/jobs");
  const sessionUser = await getCurrentUser();
  const pendingUser = await getPendingVerificationUser();
  const user = pendingUser && !pendingUser.emailVerifiedAt ? pendingUser : sessionUser;
  const back = `/verify-email?${new URLSearchParams({
    ...(ask ? { ask } : { next }),
  }).toString()}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (user.emailVerifiedAt) redirect(destinationFor(user, next));
  await setPendingVerification(user.id);
  const result = await sendAccountVerification(user, next, ask || undefined);
  if (!result.sent) {
    redirect(`${back}&error=${encodeURIComponent("We could not send the email. Write to hello@remotejobspk.com")}`);
  }
  redirect(`${back}&sent=1`);
}
