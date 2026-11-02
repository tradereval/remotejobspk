import Link from "next/link";
import { getCurrentUser, isPremium } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const premium = await isPremium(user);

  return (
    <header className="border-b border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--ink)]">
          RemoteJobs<span className="text-[var(--accent)]">PK</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
          <Link href="/jobs" className="hover:text-[var(--ink)]">
            Jobs
          </Link>
          <Link href="/pricing" className="hover:text-[var(--ink)]">
            Pricing
          </Link>
          {user ? (
            <>
              <Link href="/account" className="hover:text-[var(--ink)]">
                Account{premium ? " · Premium" : ""}
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className="hover:text-[var(--ink)]">
                  Admin
                </Link>
              )}
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="hover:text-[var(--ink)]">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-[var(--ink)]">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[var(--ink)] px-3 py-1.5 text-[var(--bg)] hover:bg-[var(--accent)]"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
