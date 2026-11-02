import Link from "next/link";
import { redirect } from "next/navigation";
import { createSession, getCurrentUser, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/account");
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Log in</h1>
      {sp.error && <p className="mt-3 text-sm text-rose-700">{sp.error}</p>}
      <form action={loginAction} className="mt-6 space-y-4">
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
          placeholder="Password"
          className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
        />
        <button type="submit" className="w-full rounded-full bg-[var(--ink)] py-2.5 text-[var(--bg)]">
          Log in
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        No account? <Link href="/signup" className="underline">Sign up</Link>
      </p>
    </div>
  );
}

async function loginAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect("/login?error=Invalid%20email%20or%20password");
  }
  await createSession(user);
  redirect("/account");
}
