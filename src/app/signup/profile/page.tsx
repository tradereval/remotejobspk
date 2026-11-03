import { redirect } from "next/navigation";
import { parseAsk } from "@/lib/ask";
import { destinationFor, getCurrentUser, profileComplete } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncLeadToSpreadsheet, userToLeadPayload } from "@/lib/leads-sheet";
import { safeNextPath } from "@/lib/site";

export default async function FinishProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next, "/jobs");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/signup/profile?next=${encodeURIComponent(next)}`)}`);
  if (!user.emailVerifiedAt) redirect(destinationFor(user, next));
  if (profileComplete(user)) redirect(destinationFor(user, next));

  const asked = next.startsWith("/jobs?ask=")
    ? parseAsk(decodeURIComponent(next.slice("/jobs?ask=".length))).roleLabel
    : "";

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Finish your free account</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Google confirmed {user.email}. Add the rest so we can match you and keep a record of the signup.
      </p>
      {sp.error && <p className="mt-3 text-sm text-rose-700">{sp.error}</p>}
      <form action={finishProfileAction} className="mt-6 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="next" value={next} />
        <input
          name="phone"
          type="tel"
          required
          placeholder="Phone (WhatsApp preferred)"
          defaultValue={user.phone || ""}
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 sm:col-span-2"
        />
        <input
          name="city"
          required
          placeholder="City"
          defaultValue={user.city || ""}
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
        />
        <input
          name="state"
          required
          placeholder="State / province"
          defaultValue={user.state || ""}
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
        />
        <input
          name="qualification"
          required
          placeholder="Qualification (e.g. BS CS, Intermediate)"
          defaultValue={user.qualification || ""}
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 sm:col-span-2"
        />
        <input
          name="specialty"
          required
          placeholder="Specialty (e.g. React, Customer Support, Design)"
          defaultValue={user.specialty || (asked && asked !== "Remote role" ? asked : "")}
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 sm:col-span-2"
        />
        <button type="submit" className="w-full rounded-full bg-[var(--accent)] py-2.5 text-white sm:col-span-2">
          Save and continue
        </button>
      </form>
    </div>
  );
}

async function finishProfileAction(formData: FormData) {
  "use server";
  const next = safeNextPath(String(formData.get("next") || ""), "/jobs");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const phone = String(formData.get("phone") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const state = String(formData.get("state") || "").trim();
  const qualification = String(formData.get("qualification") || "").trim();
  const specialty = String(formData.get("specialty") || "").trim();
  if (!phone || !city || !state || !qualification || !specialty) {
    redirect(`/signup/profile?next=${encodeURIComponent(next)}&error=${encodeURIComponent("Please fill all profile fields")}`);
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { phone, city, state, qualification, specialty },
    include: { subscription: true },
  });
  await syncLeadToSpreadsheet(
    userToLeadPayload(updated, user.phone ? "profile_update" : "signup", "Google signup profile completed"),
  );
  redirect(destinationFor(updated, next));
}
