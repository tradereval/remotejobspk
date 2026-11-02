import Link from "next/link";
import type { Job } from "@prisma/client";
import { EligibilityBadge } from "./eligibility-badge";
import {
  formatLocations,
  formatPostedAge,
  formatSalary,
  isNewJob,
  jobPreview,
  parseJsonArray,
} from "@/lib/types";

export function JobCard({ job }: { job: Job }) {
  const categories = parseJsonArray(job.categories)
    .filter((c) => c !== job.employmentType)
    .slice(0, 4);
  const salary = formatSalary(job);
  const preview = jobPreview(job);
  const locations = formatLocations(job.locationRestrictions);
  const posted = formatPostedAge(job.publishedAt);
  const isNew = isNewJob(job.publishedAt);

  return (
    <article className="border-b border-[var(--line)] py-5 transition hover:bg-[var(--panel)]/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3 sm:gap-4">
          {job.companyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.companyLogo}
              alt=""
              width={48}
              height={48}
              className="mt-0.5 h-12 w-12 shrink-0 rounded-xl border border-[var(--line)] bg-white object-contain p-1"
            />
          ) : (
            <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-sm font-semibold text-[var(--muted)]">
              {job.company.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <EligibilityBadge eligibility={job.eligibility} verified={job.isVerified} />
              {isNew && (
                <span className="rounded-md bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                  New
                </span>
              )}
              {posted && <span className="text-xs text-[var(--muted)]">{posted}</span>}
            </div>

            <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              <Link href={`/jobs/${job.id}`} className="hover:text-[var(--accent)]">
                {job.title}
              </Link>
            </h2>

            <p className="text-[var(--muted)]">
              {job.company}
              {job.employmentType ? ` · ${job.employmentType}` : ""}
              {job.seniority ? ` · ${job.seniority}` : ""}
              {salary ? ` · ${salary}` : ""}
            </p>

            <p className="text-sm text-[var(--muted)]">{locations}</p>

            {preview && (
              <p className="max-w-2xl text-sm leading-relaxed text-[var(--ink)]/80">{preview}</p>
            )}

            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <span
                    key={c}
                    className="rounded-md border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--muted)]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <Link
          href={`/jobs/${job.id}`}
          className="shrink-0 self-start rounded-full border border-[var(--ink)] px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        >
          View details
        </Link>
      </div>
    </article>
  );
}
