import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function JobActions({ jobId }: { jobId: string }) {
  const user = await getCurrentUser();
  const saved = user
    ? await prisma.savedJob.findUnique({
        where: { userId_jobId: { userId: user.id, jobId } },
      })
    : null;
  const next = `/jobs/${jobId}`;

  return (
    <div className="space-y-4">
      {user ? (
        <form action={markJob} className="grid gap-2">
          <input type="hidden" name="jobId" value={jobId} />
          <p className="text-sm text-[var(--muted)]">
            {saved?.status === "applied"
              ? "Marked as applied."
              : saved
                ? "Saved on your account."
                : "Keep this role on your account."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              name="status"
              value="saved"
              className="rounded-full border border-[var(--ink)] px-3 py-1.5 text-sm"
            >
              Save
            </button>
            <button
              name="status"
              value="applied"
              className="rounded-full border border-[var(--ink)] px-3 py-1.5 text-sm"
            >
              I applied
            </button>
            {saved && (
              <button name="status" value="remove" className="rounded-full px-3 py-1.5 text-sm text-[var(--muted)]">
                Remove
              </button>
            )}
          </div>
        </form>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="underline">
            Log in
          </Link>{" "}
          to save this role or mark it applied.
        </p>
      )}

      <form action={reportJob} className="space-y-2 border-t border-[var(--line)] pt-4">
        <p className="text-sm font-medium">Report this listing</p>
        <input type="hidden" name="jobId" value={jobId} />
        {!user && (
          <input
            name="email"
            type="email"
            placeholder="Your email (optional)"
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
          />
        )}
        <select
          name="reason"
          required
          className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
          defaultValue="scam"
        >
          <option value="scam">Looks like a scam</option>
          <option value="closed">Role is closed</option>
          <option value="not_remote">Not remote</option>
          <option value="wrong_country">Does not hire from Pakistan</option>
          <option value="other">Something else</option>
        </select>
        <textarea
          name="details"
          rows={2}
          placeholder="What should we check?"
          className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-full border border-rose-300 px-3 py-1.5 text-sm text-rose-800">
          Send report
        </button>
      </form>
    </div>
  );
}

async function markJob(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  const jobId = String(formData.get("jobId") || "");
  if (!user) redirect(`/login?next=${encodeURIComponent(`/jobs/${jobId}`)}`);
  const status = String(formData.get("status") || "");
  if (status === "remove") {
    await prisma.savedJob.deleteMany({ where: { userId: user.id, jobId } });
  } else if (status === "saved" || status === "applied") {
    await prisma.savedJob.upsert({
      where: { userId_jobId: { userId: user.id, jobId } },
      create: { userId: user.id, jobId, status },
      update: { status },
    });
  }
  redirect(`/jobs/${jobId}`);
}

async function reportJob(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  const jobId = String(formData.get("jobId") || "");
  const reason = String(formData.get("reason") || "").trim();
  const details = String(formData.get("details") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!jobId || !reason) redirect(`/jobs/${jobId}`);
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) redirect("/jobs");
  await prisma.jobReport.create({
    data: {
      jobId,
      userId: user?.id || null,
      email: user?.email || email || null,
      reason,
      details: details || null,
    },
  });
  redirect(`/jobs/${jobId}?reported=1`);
}
