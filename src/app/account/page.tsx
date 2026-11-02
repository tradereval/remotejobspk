import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isPremium } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const premium = await isPremium(user);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Account</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Keep your profile current — we use city, qualification, and specialty to suggest better job matches.
      </p>

      <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/80 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p>
            <span className="text-[var(--muted)]">Plan:</span>{" "}
            {premium ? (
              <span className="text-[var(--accent)]">Premium active</span>
            ) : (
              "Free"
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Free includes</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            <li>• Full job board browse</li>
            <li>• Eligibility labels on every role</li>
            <li>• Search + seniority filters</li>
            <li>• Direct apply links (never paywalled)</li>
          </ul>
        </div>
        <div
          className={`rounded-2xl border p-5 ${
            premium ? "border-[var(--accent)] bg-white" : "border-[var(--line)] bg-white/70"
          }`}
        >
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            Premium {premium ? "unlocked" : "adds"}
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            <li>• Verified-only filter</li>
            <li>• Accepts-beginners filter</li>
            <li>
              • Daily email alerts <span className="text-xs">(wiring next)</span>
            </li>
            <li>
              • Saved searches <span className="text-xs">(coming soon)</span>
            </li>
          </ul>
          {!premium && (
            <Link
              href="/pricing"
              className="mt-4 inline-flex rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white"
            >
              See Premium Rs 999 / $3
            </Link>
          )}
        </div>
      </div>
    </div>
  );
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

  await prisma.user.update({
    where: { id: user.id },
    data: { name, phone, city, state, qualification, specialty },
  });
  revalidatePath("/account");
  revalidatePath("/jobs");
  redirect("/account");
}
