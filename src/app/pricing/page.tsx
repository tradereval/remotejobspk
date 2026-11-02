import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Pricing</h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">
        Browse and apply for free. Premium is for people who want verified filters, eligibility detail, and
        alerts — not a paywall on apply links.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Plan
          name="Free"
          price="Rs 0"
          items={[
            "Browse Pakistan + worldwide listings",
            "Full job details",
            "Direct apply links",
            "Basic keyword & seniority filters",
          ]}
          cta={{ href: "/jobs", label: "Browse jobs" }}
        />
        <Plan
          name="Premium"
          price="Rs 999 / $3"
          highlight
          items={[
            "Everything in Free",
            "Verified-only filter",
            "Accepts beginners filter",
            "Saved searches (coming online with alerts)",
            "Daily email alerts via Resend",
          ]}
          cta={{ href: "/signup", label: "Create account" }}
          note="Safepay checkout wires after merchant approval. Until then, admin can grant Premium manually."
        />
      </div>
    </div>
  );
}

function Plan({
  name,
  price,
  items,
  cta,
  highlight,
  note,
}: {
  name: string;
  price: string;
  items: string[];
  cta: { href: string; label: string };
  highlight?: boolean;
  note?: string;
}) {
  return (
    <div
      className={`rounded-3xl border p-6 ${
        highlight ? "border-[var(--accent)] bg-white shadow-sm" : "border-[var(--line)] bg-white/70"
      }`}
    >
      <h2 className="font-[family-name:var(--font-display)] text-2xl">{name}</h2>
      <p className="mt-2 text-3xl font-semibold">{price}<span className="text-base font-normal text-[var(--muted)]">/mo</span></p>
      <ul className="mt-6 space-y-2 text-[var(--muted)]">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className={`mt-8 inline-flex rounded-full px-5 py-2.5 ${
          highlight ? "bg-[var(--accent)] text-white" : "border border-[var(--ink)] text-[var(--ink)]"
        }`}
      >
        {cta.label}
      </Link>
      {note && <p className="mt-4 text-xs text-[var(--muted)]">{note}</p>}
    </div>
  );
}
