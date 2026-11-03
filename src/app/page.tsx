import Link from "next/link";
import { AskBox } from "@/components/ask-box";
import { getJobStats } from "@/lib/jobs";

export default async function HomePage() {
  let stats = { active: 0, pakistan: 0, worldwide: 0, verified: 0, categories: 0 };
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
            Worldwide remote jobs · For people in Pakistan
          </p>
          <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-6xl">
            Remote jobs from around the world, open to people in Pakistan
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80">
            Say the role, your experience, and the pay you need. You sign up free, then we open the
            remote jobs that fit. Or skip ahead and see every listing.
          </p>
          <AskBox />
          <p className="mt-4 text-sm text-white/80">
            <Link href="/jobs" className="underline">
              See all jobs
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-3">
        <Stat label="Remote openings" value={stats.active} />
        <Stat label="Categories" value={stats.categories} />
        <Stat label="Worldwide remote" value={stats.worldwide} />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <h2 className="font-[family-name:var(--font-display)] text-3xl">How the business works</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <Feature
            title="1. Free account"
            body="Sign up and the whole board is open: every remote job, every category, filters, and saved searches. Nothing is locked."
          />
          <Feature
            title="2. Apply on the employer"
            body="You never pay to open an apply link. Himalayas applications continue on Himalayas, where they ask you to sign in before the form."
          />
          <Feature
            title="3. We keep a signup list"
            body="Name, phone, city, and specialty land in our spreadsheet so we can see who joined and help people by hand."
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="font-[family-name:var(--font-display)] text-3xl">Why RemoteJobsPK</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <Feature
            title="Worldwide, not local"
            body="These are remote jobs from companies around the world that a person in Pakistan can take. Roles based in a Pakistani city are left off."
          />
          <Feature
            title="Profile matching"
            body="We collect specialty, qualification, and city so the board (and our team) can point you at better-fit openings."
          />
          <Feature
            title="Full access"
            body="Filters, categories, and saved searches are included with a free account. Payment is not part of the product right now."
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
