import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--panel)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>
          © 2026 RemoteJobsPK · Job research platform. Employment is not guaranteed.
        </p>
        <div className="flex gap-4">
          <Link href="/pricing" className="hover:text-[var(--ink)]">
            Pricing
          </Link>
          <a href="mailto:hello@remotejobspk.com" className="hover:text-[var(--ink)]">
            hello@remotejobspk.com
          </a>
        </div>
      </div>
    </footer>
  );
}
