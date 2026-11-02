import Link from "next/link";
import { JobCard } from "@/components/job-card";
import { getCurrentUser, isPremium } from "@/lib/auth";
import { listJobs } from "@/lib/jobs";
import type { Eligibility } from "@/lib/types";

type SearchParams = Promise<{
  q?: string;
  eligibility?: string;
  category?: string;
  seniority?: string;
  verified?: string;
  beginners?: string;
  page?: string;
}>;

export default async function JobsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const premium = await isPremium(user);

  const filters = {
    q: sp.q,
    eligibility: (sp.eligibility as Eligibility | "pk_ready" | undefined) || "pk_ready",
    category: sp.category,
    seniority: sp.seniority,
    verifiedOnly: premium && sp.verified === "1",
    beginners: premium && sp.beginners === "1",
    page: Number(sp.page || "1"),
  };

  const { jobs, total, page, totalPages } = await listJobs(filters, { premium });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl">Remote jobs</h1>
          <p className="mt-2 text-[var(--muted)]">
            {total} openings · Pakistan-eligible and worldwide by default
          </p>
        </div>
        {!premium && (
          <Link href="/pricing" className="text-sm text-[var(--accent)] hover:underline">
            Unlock verified filters & alerts →
          </Link>
        )}
      </div>

      <form className="mb-8 grid gap-3 rounded-2xl border border-[var(--line)] bg-white/70 p-4 sm:grid-cols-4">
        <input
          name="q"
          defaultValue={sp.q || ""}
          placeholder="Search title, company, skill"
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 sm:col-span-2"
        />
        <select
          name="eligibility"
          defaultValue={filters.eligibility}
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
        >
          <option value="pk_ready">Pakistan + Worldwide</option>
          <option value="pakistan">Accepts Pakistan</option>
          <option value="worldwide">Worldwide</option>
          <option value="unknown">Unverified</option>
        </select>
        <select
          name="seniority"
          defaultValue={sp.seniority || ""}
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
        >
          <option value="">Any seniority</option>
          <option value="entry">Entry</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
          <option value="lead">Lead</option>
        </select>
        <label
          className={`flex items-center gap-2 text-sm sm:col-span-2 ${premium ? "" : "opacity-60"}`}
        >
          <input
            type="checkbox"
            name="verified"
            value="1"
            disabled={!premium}
            defaultChecked={premium && sp.verified === "1"}
          />
          Verified only
          {!premium && (
            <Link href="/pricing" className="rounded-full bg-[var(--panel)] px-2 py-0.5 text-xs text-[var(--accent)]">
              Premium
            </Link>
          )}
        </label>
        <label
          className={`flex items-center gap-2 text-sm sm:col-span-2 ${premium ? "" : "opacity-60"}`}
        >
          <input
            type="checkbox"
            name="beginners"
            value="1"
            disabled={!premium}
            defaultChecked={premium && sp.beginners === "1"}
          />
          Accepts beginners
          {!premium && (
            <Link href="/pricing" className="rounded-full bg-[var(--panel)] px-2 py-0.5 text-xs text-[var(--accent)]">
              Premium
            </Link>
          )}
        </label>
        <button
          type="submit"
          className="rounded-xl bg-[var(--ink)] px-4 py-2 text-[var(--bg)] hover:bg-[var(--accent)] sm:col-span-4 sm:justify-self-start"
        >
          Filter
        </button>
      </form>

      <div className="rounded-2xl border border-[var(--line)] bg-white/80 px-4">
        {jobs.length === 0 ? (
          <p className="py-12 text-center text-[var(--muted)]">
            No jobs yet. Run an import from Admin or{" "}
            <code className="rounded bg-[var(--panel)] px-1">npm run import:jobs</code>.
          </p>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link
              href={`/jobs?${new URLSearchParams({ ...sp, page: String(page - 1) } as Record<string, string>).toString()}`}
              className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-[var(--muted)]">
            Page {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/jobs?${new URLSearchParams({ ...sp, page: String(page + 1) } as Record<string, string>).toString()}`}
              className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
