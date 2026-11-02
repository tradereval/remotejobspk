import Link from "next/link";
import { getJobStats } from "@/lib/jobs";

export default async function HomePage() {
  let stats = { active: 0, pakistan: 0, worldwide: 0, verified: 0 };
  try {
    stats = await getJobStats();
  } catch {
    // DB may not be migrated yet on first boot
  }

  return (
    <div>
      <section className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--hero)] text-[var(--bg)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(15,122,90,0.45), transparent 45%), linear-gradient(225deg, rgba(196,92,38,0.25), transparent 40%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <p className="mb-4 text-sm uppercase tracking-[0.2em] text-white/70">
            Screened remote jobs · Built for Pakistan
          </p>
          <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-6xl">
            Stop wasting weeks on jobs that never hire from Pakistan
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80">
            We screen every listing for Pakistan eligibility. Apply links stay free — Premium is Rs 999 /
            $3 for faster filters and matching. Tell us your specialty; we match roles that actually fit.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-[var(--accent)] px-6 py-3 text-[var(--bg)] hover:brightness-110"
            >
              Create free profile
            </Link>
            <Link
              href="/jobs"
              className="rounded-full border border-white/40 px-6 py-3 text-white hover:bg-white/10"
            >
              Browse jobs
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-3">
        <Stat label="Active listings" value={stats.active} />
        <Stat label="Accepts Pakistan" value={stats.pakistan} />
        <Stat label="Worldwide remote" value={stats.worldwide} />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <h2 className="font-[family-name:var(--font-display)] text-3xl">How the business works</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <Feature
            title="1. Free to apply"
            body="You never pay to open an apply link. Free accounts browse, filter by eligibility, and apply direct."
          />
          <Feature
            title="2. Premium for speed"
            body="Pay for verified-only filters, beginner-friendly roles, and (soon) daily alerts — screening that saves you time, priced for Pakistan."
          />
          <Feature
            title="3. We keep a CRM"
            body="Every signup (name, phone, city, specialty) and every paying customer lands in our spreadsheet so we can help people manually too."
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="font-[family-name:var(--font-display)] text-3xl">Why RemoteJobsPK</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <Feature
            title="Eligibility first"
            body="Every role is labeled Pakistan, Worldwide, Restricted, or Unverified — so you stop wasting hours on US/EU-only posts."
          />
          <Feature
            title="Profile matching"
            body="We collect specialty, qualification, and city so the board (and our team) can point you at better-fit openings."
          />
          <Feature
            title="Honest Premium"
            body="You’re not buying the job. You’re buying screening, filters, and alerts — Live vs Soon is labeled on Pricing."
          />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl">{value}</p>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/60 p-5">
      <h3 className="font-[family-name:var(--font-display)] text-xl">{title}</h3>
      <p className="mt-2 text-[var(--muted)]">{body}</p>
    </div>
  );
}
