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
          <p className="mb-4 text-sm uppercase tracking-[0.2em] text-white/70">RemoteJobsPK</p>
          <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-6xl">
            Remote jobs you can actually apply for from Pakistan
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80">
            We research worldwide and Pakistan-eligible openings, label eligibility honestly, and keep apply
            links free. Premium unlocks verified filters and alerts.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/jobs"
              className="rounded-full bg-[var(--accent)] px-6 py-3 text-[var(--bg)] hover:brightness-110"
            >
              Browse jobs
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-white/40 px-6 py-3 text-white hover:bg-white/10"
            >
              Premium Rs 999 / $3
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-3">
        <Stat label="Active listings" value={stats.active} />
        <Stat label="Accepts Pakistan" value={stats.pakistan} />
        <Stat label="Worldwide remote" value={stats.worldwide} />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="font-[family-name:var(--font-display)] text-3xl">Why RemoteJobsPK</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <Feature
            title="Eligibility first"
            body="Every role is labeled Pakistan, Worldwide, Restricted, or Unverified — so you stop wasting hours on US/EU-only posts."
          />
          <Feature
            title="Direct apply"
            body="Browse and apply for free. Himalayas-sourced jobs keep official apply links and attribution."
          />
          <Feature
            title="Fresh board"
            body="Dead jobs get delisted. New openings get categorized. Premium adds verified filters and daily alerts."
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
