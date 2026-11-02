import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { importHimalayasJobs } from "@/lib/himalayas";
import { revalidatePath } from "next/cache";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/account");
  const sp = await searchParams;

  const [active, needsReview, users] = await Promise.all([
    prisma.job.count({ where: { isActive: true } }),
    prisma.job.count({ where: { needsReview: true, isActive: true } }),
    prisma.user.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { subscription: true },
    }),
  ]);

  const reviewJobs = await prisma.job.findMany({
    where: { needsReview: true, isActive: true },
    orderBy: { updatedAt: "desc" },
    take: 25,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Admin</h1>
        <p className="mt-2 text-[var(--muted)]">
          Active jobs: {active} · Needs review: {needsReview}
        </p>
        {sp.msg && <p className="mt-2 text-sm text-[var(--accent)]">{sp.msg}</p>}
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-white/80 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Refresh from Himalayas</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Imports Pakistan + worldwide feeds, dedupes, expires dead listings.
        </p>
        <form action={runImport} className="mt-4">
          <button type="submit" className="rounded-full bg-[var(--ink)] px-4 py-2 text-[var(--bg)]">
            Run import now
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white/80 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl">CSV bulk upload</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Columns: title, company, applicationUrl, eligibility, seniority, description, acceptsBeginners,
          isVerified
        </p>
        <form action={uploadCsv} className="mt-4 space-y-3">
          <textarea
            name="csv"
            rows={8}
            placeholder={`title,company,applicationUrl,eligibility,seniority,description,acceptsBeginners,isVerified\nFrontend Engineer,Acme,https://example.com/apply,worldwide,mid,Remote React role,false,true`}
            className="w-full rounded-xl border border-[var(--line)] bg-white p-3 font-mono text-xs"
          />
          <button type="submit" className="rounded-full border border-[var(--ink)] px-4 py-2">
            Upload CSV
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white/80 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Needs review</h2>
        <div className="mt-4 divide-y divide-[var(--line)]">
          {reviewJobs.map((job) => (
            <div key={job.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{job.title}</p>
                <p className="text-sm text-[var(--muted)]">
                  {job.company} · {job.eligibility}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={verifyJob.bind(null, job.id, "pakistan")}>
                  <button className="rounded-full border px-3 py-1 text-xs">Mark PK</button>
                </form>
                <form action={verifyJob.bind(null, job.id, "worldwide")}>
                  <button className="rounded-full border px-3 py-1 text-xs">Mark WW</button>
                </form>
                <form action={hideJob.bind(null, job.id)}>
                  <button className="rounded-full border border-rose-300 px-3 py-1 text-xs text-rose-700">
                    Hide
                  </button>
                </form>
              </div>
            </div>
          ))}
          {reviewJobs.length === 0 && <p className="text-sm text-[var(--muted)]">Queue empty.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white/80 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Users / grant Premium</h2>
        <div className="mt-4 divide-y divide-[var(--line)]">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p>{u.email}</p>
                <p className="text-xs text-[var(--muted)]">
                  {u.role} · sub: {u.subscription?.status || "none"}
                </p>
              </div>
              <form action={grantPremium.bind(null, u.id)}>
                <button className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs text-white">
                  Grant Premium 30d
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

async function runImport() {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login");
  const result = await importHimalayasJobs({ maxPages: 10 });
  revalidatePath("/jobs");
  revalidatePath("/");
  redirect(`/admin?msg=${encodeURIComponent(`Imported ${result.upserted} jobs (${result.uniqueSeen} unique)`)}`);
}

async function verifyJob(jobId: string, eligibility: string) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login");
  await prisma.job.update({
    where: { id: jobId },
    data: {
      eligibility,
      isVerified: true,
      needsReview: false,
      acceptsBeginners: false,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/jobs");
}

async function hideJob(jobId: string) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login");
  await prisma.job.update({
    where: { id: jobId },
    data: { isActive: false, needsReview: false },
  });
  revalidatePath("/admin");
  revalidatePath("/jobs");
}

async function grantPremium(userId: string) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login");
  const end = new Date();
  end.setDate(end.getDate() + 30);
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      status: "active",
      plan: "premium_pkr",
      currency: "PKR",
      currentPeriodEnd: end,
    },
    update: {
      status: "active",
      plan: "premium_pkr",
      currency: "PKR",
      currentPeriodEnd: end,
    },
  });
  revalidatePath("/admin");
}

async function uploadCsv(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login");
  const csv = String(formData.get("csv") || "").trim();
  if (!csv) redirect("/admin?msg=Empty%20CSV");

  const lines = csv.split(/\r?\n/).filter(Boolean);
  const start = lines[0].toLowerCase().includes("title") ? 1 : 0;
  let count = 0;
  for (let i = start; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const [title, company, applicationUrl, eligibility, seniority, description, acceptsBeginners, isVerified] =
      cols;
    if (!title || !company || !applicationUrl) continue;
    await prisma.job.create({
      data: {
        source: "manual",
        externalId: `manual-${Date.now()}-${i}`,
        title: title.trim(),
        company: company.trim(),
        applicationUrl: applicationUrl.trim(),
        eligibility: (eligibility || "unknown").trim().toLowerCase(),
        seniority: seniority?.trim() || null,
        description: description?.trim() || null,
        excerpt: description?.trim()?.slice(0, 240) || null,
        acceptsBeginners: String(acceptsBeginners).toLowerCase() === "true",
        isVerified: String(isVerified).toLowerCase() !== "false",
        needsReview: false,
        publishedAt: new Date(),
        isActive: true,
        categories: JSON.stringify([]),
        skills: JSON.stringify([]),
      },
    });
    count += 1;
  }
  revalidatePath("/jobs");
  redirect(`/admin?msg=${encodeURIComponent(`Uploaded ${count} manual jobs`)}`);
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current);
  return result;
}
