import Link from "next/link";
import { redirect } from "next/navigation";
import { createSession, getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/account");
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Create account</h1>
      {sp.error && <p className="mt-3 text-sm text-rose-700">{sp.error}</p>}
      <form action={signupAction} className="mt-6 space-y-4">
        <input
          name="name"
          placeholder="Name"
          className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 chars)"
          className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
        />
        <button type="submit" className="w-full rounded-full bg-[var(--accent)] py-2.5 text-white">
          Sign up
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Already have an account? <Link href="/login" className="underline">Log in</Link>
      </p>
    </div>
  );
}

async function signupAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") || "").trim() || null;
  const password = String(formData.get("password") || "");
  if (password.length < 8) redirect("/signup?error=Password%20too%20short");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/signup?error=Email%20already%20registered");

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      subscription: { create: { status: "inactive" } },
    },
  });
  await createSession(user);
  redirect("/account");
}
