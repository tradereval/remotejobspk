import Link from "next/link";
import { notFound } from "next/navigation";
import { EligibilityBadge } from "@/components/eligibility-badge";
import { prisma } from "@/lib/db";
import {
  cleanJobDescriptionHtml,
  formatDateLabel,
  formatLocations,
  formatPostedAge,
  formatSalary,
  formatTimezones,
  parseJsonArray,
} from "@/lib/types";

type Params = Promise<{ id: string }>;

export default async function JobDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || !job.isActive) notFound();

  const categories = parseJsonArray(job.categories);
  const salary = formatSalary(job);
  const locations = formatLocations(job.locationRestrictions);
  const timezones = formatTimezones(job.timezoneRestrictions);
  const posted = formatPostedAge(job.publishedAt);
  const postedDate = formatDateLabel(job.publishedAt);
  const expiresDate = formatDateLabel(job.expiresAt);
  const description = cleanJobDescriptionHtml(job.description) || job.excerpt;
  const isDemoApply =
    /example\.(com|org|net)/i.test(job.applicationUrl) || job.externalId?.startsWith("seed-");

  const facts: Array<{ label: string; value: string }> = [
    { label: "Company", value: job.company },
    ...(job.employmentType ? [{ label: "Job type", value: job.employmentType }] : []),
    ...(job.seniority ? [{ label: "Seniority", value: job.seniority }] : []),
    ...(salary ? [{ label: "Salary", value: salary }] : []),
    { label: "Location", value: locations },
    ...(timezones ? [{ label: "Timezones", value: timezones }] : []),
    ...(postedDate ? [{ label: "Posted", value: posted ? `${postedDate} (${posted})` : postedDate }] : []),
    ...(expiresDate ? [{ label: "Applies until", value: expiresDate }] : []),
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/jobs" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
        ← Back to jobs
      </Link>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex items-start gap-4">
            {job.companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.companyLogo}
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 shrink-0 rounded-2xl border border-[var(--line)] bg-white object-contain p-1.5"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--panel)] text-xl font-semibold text-[var(--muted)]">
                {job.company.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 space-y-3">
              <EligibilityBadge eligibility={job.eligibility} verified={job.isVerified} />
              <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
                {job.title}
              </h1>
              <p className="text-lg text-[var(--muted)]">
                {job.company}
                {job.employmentType ? ` · ${job.employmentType}` : ""}
                {job.seniority ? ` · ${job.seniority}` : ""}
              </p>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link
                  key={c}
                  href={`/jobs?category=${encodeURIComponent(c)}`}
                  className="rounded-md border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {c}
                </Link>
              ))}
            </div>
          )}

          <div className="prose-job rounded-2xl border border-[var(--line)] bg-white/80 p-6">
            <h2 className="!mt-0 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              About this role
            </h2>
            {description ? (
              <div
                className="mt-4"
                dangerouslySetInnerHTML={{
                  __html: description.includes("<")
                    ? description
                    : `<p>${description.replace(/\n+/g, "</p><p>")}</p>`,
                }}
              />
            ) : (
              <p className="mt-4 text-[var(--muted)]">No description provided for this listing.</p>
            )}
          </div>
        </div>

        <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-6 lg:w-80">
          <div className="rounded-2xl border border-[var(--line)] bg-white/90 p-5 shadow-sm">
            <h2 className="font-[family-name:var(--font-display)] text-lg">Role details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {facts.map((f) => (
                <div key={f.label} className="grid grid-cols-[7rem_1fr] gap-2">
                  <dt className="text-[var(--muted)]">{f.label}</dt>
                  <dd className="font-medium text-[var(--ink)]">{f.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5">
              {isDemoApply ? (
                <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Placeholder listing —{" "}
                  <Link href="/jobs" className="underline">
                    browse real openings
                  </Link>
                  .
                </p>
              ) : (
                <a
                  href={job.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-[var(--bg)] hover:brightness-110"
                >
                  Apply now
                </a>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
