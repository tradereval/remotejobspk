import Link from "next/link";
import { redirect } from "next/navigation";
import { createSession, getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncLeadToSpreadsheet, userToLeadPayload } from "@/lib/leads-sheet";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/account");
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Create account</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Tell us about yourself so we can surface better-fit remote roles. No confirmation email — you&apos;re
        signed in immediately.
      </p>
      {sp.error && <p className="mt-3 text-sm text-rose-700">{sp.error}</p>}
      <form action={signupAction} className="mt-6 grid gap-3 sm:grid-cols-2">
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
        <button
          type="submit"
          className="w-full rounded-full bg-[var(--accent)] py-2.5 text-white sm:col-span-2"
        >
          Sign up
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/login" className="underline">
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

  if (!name || !phone || !city || !state || !qualification || !specialty) {
    redirect("/signup?error=Please%20fill%20all%20profile%20fields");
  }
  if (password.length < 8) redirect("/signup?error=Password%20too%20short");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/signup?error=Email%20already%20registered");

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
  await syncLeadToSpreadsheet(userToLeadPayload(user, "signup", "New free signup"));
  await createSession(user);
  redirect(`/jobs?q=${encodeURIComponent(specialty)}`);
}
