import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Page not found</h1>
      <p className="mt-3 text-[var(--muted)]">That page does not exist or the job was removed.</p>
      <Link
        href="/jobs"
        className="mt-6 inline-flex rounded-full bg-[var(--ink)] px-5 py-2.5 text-[var(--bg)]"
      >
        Browse jobs
      </Link>
    </div>
  );
}
