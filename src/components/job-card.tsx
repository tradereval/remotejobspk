import Link from "next/link";
import type { Job } from "@prisma/client";
import { EligibilityBadge } from "./eligibility-badge";
import { formatSalary, parseJsonArray } from "@/lib/types";

export function JobCard({ job }: { job: Job }) {
  const categories = parseJsonArray(job.categories).slice(0, 3);
  const salary = formatSalary(job);

  return (
    <article className="border-b border-[var(--line)] py-5 transition hover:bg-[var(--panel)]/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <EligibilityBadge eligibility={job.eligibility} verified={job.isVerified} />
            {job.source === "himalayas" && (
              <span className="text-xs text-[var(--muted)]">via Himalayas</span>
            )}
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            <Link href={`/jobs/${job.id}`} className="hover:text-[var(--accent)]">
              {job.title}
            </Link>
          </h2>
          <p className="text-[var(--muted)]">
            {job.company}
            {job.seniority ? ` · ${job.seniority}` : ""}
            {salary ? ` · ${salary}` : ""}
          </p>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <span key={c} className="rounded-md border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--muted)]">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
        <Link
          href={`/jobs/${job.id}`}
          className="shrink-0 self-start rounded-full border border-[var(--ink)] px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        >
          View
        </Link>
      </div>
    </article>
  );
}
