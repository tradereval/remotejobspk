import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { syncLeadToSpreadsheet, userToLeadPayload } from "@/lib/leads-sheet";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const [savedJobs, searches] = await Promise.all([
    prisma.savedJob.findMany({
      where: { userId: user.id },
      include: { job: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.savedSearch.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Account</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Keep your profile current — we use city, qualification, and specialty to suggest better job matches.
      </p>
      {sp.msg && <p className="mt-3 text-sm text-[var(--accent)]">{sp.msg}</p>}
      {sp.error && <p className="mt-3 text-sm text-rose-700">{sp.error}</p>}

      <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/80 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p>
            <span className="text-[var(--muted)]">Access:</span>{" "}
            <span className="text-[var(--accent)]">Free · full board</span>
            {user.emailVerifiedAt && (
              <span className="ml-3 text-[var(--muted)]">Email verified</span>
            )}
          </p>
          {user.specialty && (
            <Link
              href={`/jobs?q=${encodeURIComponent(user.specialty)}`}
              className="text-sm text-[var(--accent)] underline"
            >
              Jobs matching {user.specialty} →
            </Link>
          )}
        </div>

        <form action={updateProfileAction} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="text-[var(--muted)]">Full name</span>
            <input
              name="name"
              required
              defaultValue={user.name || ""}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-[var(--muted)]">Email</span>
            <input
              value={user.email}
              disabled
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[var(--muted)]"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-[var(--muted)]">Phone</span>
            <input
              name="phone"
              required
              defaultValue={user.phone || ""}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-[var(--muted)]">City</span>
            <input
              name="city"
              required
              defaultValue={user.city || ""}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-[var(--muted)]">State / province</span>
            <input
              name="state"
              required
              defaultValue={user.state || ""}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-[var(--muted)]">Qualification</span>
            <input
              name="qualification"
              required
              defaultValue={user.qualification || ""}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-[var(--muted)]">Specialty</span>
            <input
              name="specialty"
              required
              defaultValue={user.specialty || ""}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-[var(--bg)] sm:col-span-2 sm:justify-self-start"
          >
            Save profile
          </button>
        </form>
      </div>

      <div className="mt-8 rounded-2xl border border-[var(--line)] bg-white/70 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Included</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
          <li>• Every remote listing and category</li>
          <li>• Search, seniority, pay, and verified filters</li>
          <li>• Saved jobs and saved searches</li>
          <li>• Apply links, with no charge</li>
        </ul>
      </div>

      <section className="mt-8 rounded-2xl border border-[var(--line)] bg-white/80 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Saved and applied</h2>
        <div className="mt-3 divide-y divide-[var(--line)] text-sm">
          {savedJobs.length === 0 && <p className="text-[var(--muted)]">None yet. Open a job and choose Save or I applied.</p>}
          {savedJobs.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <Link href={`/jobs/${row.jobId}`} className="font-medium text-[var(--ink)] underline">
                  {row.job.title}
                </Link>
                <p className="text-xs text-[var(--muted)]">
                  {row.job.company} · {row.status === "applied" ? "Applied" : "Saved"}
                </p>
              </div>
              <form action={removeSaved.bind(null, row.jobId)}>
                <button className="text-xs text-[var(--muted)]">Remove</button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white/80 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Saved searches</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          A saved search can email you once a day when new remote roles match.
        </p>
        <div className="mt-3 divide-y divide-[var(--line)] text-sm">
          {searches.length === 0 && (
            <p className="text-[var(--muted)]">None yet. Filter the board, then save the search.</p>
          )}
          {searches.map((search) => (
            <div key={search.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="font-medium text-[var(--ink)]">{search.name || "Saved search"}</p>
                <p className="text-xs text-[var(--muted)]">
                  {search.alertFrequency === "daily" ? "Daily email" : "Email off"}
                  {search.lastAlertedAt ? ` · last check ${search.lastAlertedAt.toISOString().slice(0, 16)}` : ""}
                </p>
              </div>
              <form action={deleteSearch.bind(null, search.id)}>
                <button className="text-xs text-[var(--muted)]">Delete</button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white/80 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Password</h2>
        <form action={changePassword} className="mt-3 grid gap-3">
          <input
            name="current"
            type="password"
            required
            placeholder="Current password"
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          />
          <input
            name="next"
            type="password"
            required
            minLength={8}
            placeholder="New password (8+ characters)"
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          />
          <button type="submit" className="justify-self-start rounded-full border border-[var(--ink)] px-4 py-2 text-sm">
            Change password
          </button>
        </form>
      </section>
    </div>
  );
}

async function removeSaved(jobId: string) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.savedJob.deleteMany({ where: { userId: user.id, jobId } });
  redirect("/account");
}

async function deleteSearch(searchId: string) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.savedSearch.deleteMany({ where: { id: searchId, userId: user.id } });
  redirect("/account");
}

async function changePassword(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const current = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");
  if (next.length < 8) redirect("/account?error=New%20password%20is%20too%20short");
  if (!(await verifyPassword(current, user.passwordHash))) {
    redirect("/account?error=Current%20password%20is%20wrong");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next) },
  });
  redirect("/account?msg=Password%20updated");
}

async function updateProfileAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const state = String(formData.get("state") || "").trim();
  const qualification = String(formData.get("qualification") || "").trim();
  const specialty = String(formData.get("specialty") || "").trim();

  if (!name || !phone || !city || !state || !qualification || !specialty) {
    redirect("/account");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name, phone, city, state, qualification, specialty },
    include: { subscription: true },
  });
  await syncLeadToSpreadsheet(userToLeadPayload(updated, "profile_update", "Profile updated"));
  revalidatePath("/account");
  revalidatePath("/jobs");
  redirect("/account");
}
