import Link from "next/link";
import { notFound } from "next/navigation";
import { EligibilityBadge } from "@/components/eligibility-badge";
import { prisma } from "@/lib/db";
import { formatSalary, parseJsonArray } from "@/lib/types";

type Params = Promise<{ id: string }>;

export default async function JobDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || !job.isActive) notFound();

  const categories = parseJsonArray(job.categories);
  const salary = formatSalary(job);
  const isDemoApply =
    /example\.(com|org|net)/i.test(job.applicationUrl) || job.externalId?.startsWith("seed-");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/jobs" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
        ← Back to jobs
      </Link>

      <div className="mt-6 space-y-4">
        <EligibilityBadge eligibility={job.eligibility} verified={job.isVerified} />
        <h1 className="font-[family-name:var(--font-display)] text-4xl">{job.title}</h1>
        <p className="text-lg text-[var(--muted)]">
          {job.company}
          {job.seniority ? ` · ${job.seniority}` : ""}
          {salary ? ` · ${salary}` : ""}
        </p>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span key={c} className="rounded-md border border-[var(--line)] px-2 py-0.5 text-xs">
                {c}
              </span>
            ))}
          </div>
        )}

        {isDemoApply ? (
          <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This was a demo listing with a placeholder apply link. Browse{" "}
            <Link href="/jobs" className="underline">
              real Himalayas jobs
            </Link>{" "}
            instead.
          </p>
        ) : (
          <a
            href={job.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-full bg-[var(--accent)] px-6 py-3 text-[var(--bg)] hover:brightness-110"
          >
            Apply now
          </a>
        )}

        {job.source === "himalayas" && (
          <p className="text-sm text-[var(--muted)]">
            Job data sourced from{" "}
            <a
              href={job.sourceAttributionUrl || "https://himalayas.app"}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Himalayas
            </a>
            . Apply link preserved from the Himalayas API.
          </p>
        )}
      </div>

      <div className="prose-job mt-10 rounded-2xl border border-[var(--line)] bg-white/80 p-6">
        {job.description ? (
          <div dangerouslySetInnerHTML={{ __html: job.description }} />
        ) : (
          <p>{job.excerpt || "No description provided."}</p>
        )}
      </div>
    </div>
  );
}
