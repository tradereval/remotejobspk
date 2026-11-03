import Link from "next/link";
import { redirect } from "next/navigation";
import { jobsAskPath, parseAsk } from "@/lib/ask";
import { destinationFor, getCurrentUser, hashPassword, setPendingVerification } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendAccountVerification } from "@/lib/email";
import { GoogleAuthLink } from "@/components/google-auth-link";
import { syncLeadToSpreadsheet, userToLeadPayload } from "@/lib/leads-sheet";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ask?: string }>;
}) {
  const sp = await searchParams;
  const ask = String(sp.ask || "").trim().slice(0, 500);
  const user = await getCurrentUser();
  if (user) redirect(destinationFor(user, ask ? jobsAskPath(ask) : "/account"));
  const googleNext = ask ? jobsAskPath(ask) : "/jobs";
  const intent = ask ? parseAsk(ask) : null;
  const loginHref = ask ? `/login?next=${encodeURIComponent(jobsAskPath(ask))}` : "/login";

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Create your free account</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {intent
          ? "Add your details. We email our terms and a verify button. Your matches open after you confirm the inbox."
          : "Free account. We email a verify button first, so the address has to be real."}
      </p>
      {intent && (
        <p className="mt-4 rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
          <span className="text-[var(--muted)]">You asked for</span>
          <br />
          <strong>{intent.summary}</strong>
        </p>
      )}
      {sp.error && <p className="mt-3 text-sm text-rose-700">{sp.error}</p>}
      <form action={signupAction} className="mt-6 grid gap-3 sm:grid-cols-2">
        {ask && <input type="hidden" name="ask" value={ask} />}
        <input
          name="name"
          required
          placeholder="Full name"
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 sm:col-span-2"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 sm:col-span-2"
        />
        <input
          name="phone"
          type="tel"
          required
          placeholder="Phone (WhatsApp preferred)"
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 sm:col-span-2"
        />
        <input
          name="city"
          required
          placeholder="City"
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
        />
        <input
          name="state"
          required
          placeholder="State / province"
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
        />
        <input
          name="qualification"
          required
          placeholder="Qualification (e.g. BS CS, Intermediate)"
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 sm:col-span-2"
        />
        <input
          name="specialty"
          required
          defaultValue={intent?.roleLabel && intent.roleLabel !== "Remote role" ? intent.roleLabel : ""}
          placeholder="Specialty (e.g. React, Customer Support, Design)"
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 sm:col-span-2"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 chars)"
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 sm:col-span-2"
        />
        <label className="flex items-start gap-2 text-sm text-[var(--muted)] sm:col-span-2">
          <input name="terms" type="checkbox" required className="mt-1" />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="underline" target="_blank">
              Terms
            </Link>
            . RemoteJobsPK is not the employer, and employment is not guaranteed.
          </span>
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-[var(--accent)] py-2.5 text-white sm:col-span-2"
        >
          {intent ? "Create account and email me" : "Sign up"}
        </button>
      </form>
      <div className="mt-4">
        <GoogleAuthLink next={googleNext} label="Sign up with Google" />
      </div>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href={loginHref} className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

async function signupAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const state = String(formData.get("state") || "").trim();
  const qualification = String(formData.get("qualification") || "").trim();
  const specialty = String(formData.get("specialty") || "").trim();
  const password = String(formData.get("password") || "");
  const ask = String(formData.get("ask") || "").trim().slice(0, 500);
  const back = (message: string) => {
    const params = new URLSearchParams({ error: message });
    if (ask) params.set("ask", ask);
    redirect(`/signup?${params.toString()}`);
  };

  if (!name || !phone || !city || !state || !qualification || !specialty) {
    back("Please fill all profile fields");
  }
  if (formData.get("terms") !== "on") back("Please agree to the Terms");
  if (password.length < 8) back("Password too short");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    back(
      existing.emailVerifiedAt
        ? "Email already registered"
        : "That email is already registered. Open the verification email, or log in to send it again.",
    );
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      phone,
      city,
      state,
      qualification,
      specialty,
      passwordHash: await hashPassword(password),
      subscription: { create: { status: "inactive" } },
    },
    include: { subscription: true },
  });
  const notes = ask ? `New free signup. Looking for: ${ask}` : "New free signup";
  await syncLeadToSpreadsheet(userToLeadPayload(user, "signup", notes));
  const next = ask ? jobsAskPath(ask) : "/jobs";
  await setPendingVerification(user.id);
  const mailed = await sendAccountVerification(user, next, ask || undefined);
  const params = new URLSearchParams(ask ? { ask } : { next });
  if (!mailed.sent) params.set("error", "Account saved, but the email did not send. Use Resend below or write to hello@remotejobspk.com");
  redirect(`/verify-email?${params.toString()}`);
}
