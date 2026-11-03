import Link from "next/link";
import { redirect } from "next/navigation";
import { AskBox } from "@/components/ask-box";
import { JobCard } from "@/components/job-card";
import { jobsAskPath, matchAsk } from "@/lib/ask";
import { destinationFor, getCurrentUser, profileComplete } from "@/lib/auth";
import { listJobs } from "@/lib/jobs";

type SearchParams = Promise<{
  ask?: string;
  page?: string;
}>;

export default async function JobsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const ask = sp.ask?.trim() || "";
  const user = await getCurrentUser();

  if (ask) {
    if (!user) redirect(`/signup?ask=${encodeURIComponent(ask.slice(0, 500))}`);
    if (!user.emailVerifiedAt || !profileComplete(user)) {
      redirect(destinationFor(user, jobsAskPath(ask.slice(0, 500))));
    }
    const { intent, jobs, total, payMet } = await matchAsk(ask);
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <AskBox variant="page" defaultValue={ask} />
        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl">
              {payMet ? "Your matches" : "Same kind of role"}
            </h1>
            <p className="mt-2 text-[var(--muted)]">{intent.summary}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {total === 0
                ? "Nothing on the board is that role. A different title, language, or country was left off."
                : payMet
                  ? `${total} remote ${total === 1 ? "role" : "roles"} fit the work you described. Showing ${jobs.length}.`
                  : `No ${intent.roleLabel} listing publishes ${intent.minMonthlyUsd ? `$${intent.minMonthlyUsd.toLocaleString()}/month` : "that pay"}. These ${jobs.length} are the same kind of work, with the pay they actually list.`}
            </p>
          </div>
          <Link href="/jobs" className="text-sm text-[var(--accent)] underline">
            See all jobs
          </Link>
        </div>
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/80 px-4">
          {jobs.length === 0 ? (
            <p className="py-12 text-center text-[var(--muted)]">
              Try a nearby pay, or{" "}
              <Link href="/jobs" className="text-[var(--accent)] underline">
                see all remote jobs
              </Link>
              .
            </p>
          ) : (
            jobs.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </div>
      </div>
    );
  }

  const page = Math.max(1, Number(sp.page || "1") || 1);
  const { jobs, total, totalPages } = await listJobs({ page });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AskBox variant="page" />
      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl">All remote jobs</h1>
          <p className="mt-2 text-[var(--muted)]">
            {total} openings from around the world, for people in Pakistan. USD when pay is listed.
          </p>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/80 px-4">
        {jobs.length === 0 ? (
          <p className="py-12 text-center text-[var(--muted)]">No remote jobs yet.</p>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link href={`/jobs?page=${page - 1}`} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
              Previous
            </Link>
          )}
          <span className="text-sm text-[var(--muted)]">
            Page {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/jobs?page=${page + 1}`} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
