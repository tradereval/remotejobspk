import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Pricing</h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">
        Apply links stay free forever. Premium is for people who want stricter filters and alerts — not a
        paywall on jobs.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Plan
          name="Free"
          price="Rs 0"
          items={[
            { text: "Browse Pakistan + worldwide listings", status: "live" },
            { text: "Full job details + direct apply links", status: "live" },
            { text: "Search, eligibility & seniority filters", status: "live" },
          ]}
          cta={{ href: "/jobs", label: "Browse jobs" }}
        />
        <Plan
          name="Premium"
          price="Rs 999 / $3"
          highlight
          items={[
            { text: "Everything in Free", status: "live" },
            { text: "Verified-only filter", status: "live" },
            { text: "Accepts beginners filter", status: "live" },
            { text: "Daily email job alerts", status: "soon" },
            { text: "Saved searches", status: "soon" },
            { text: "Safepay self-serve checkout", status: "soon" },
          ]}
          cta={{ href: "/signup", label: "Create free account first" }}
          note="Premium filters work today once granted. Email alerts + Safepay checkout are next. Until checkout is live, email hello@remotejobspk.com or ask admin to grant 30 days."
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
  items: { text: string; status: "live" | "soon" }[];
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
      <p className="mt-2 text-3xl font-semibold">
        {price}
        <span className="text-base font-normal text-[var(--muted)]">/mo</span>
      </p>
      <ul className="mt-6 space-y-2 text-[var(--muted)]">
        {items.map((item) => (
          <li key={item.text} className="flex items-start justify-between gap-3">
            <span>• {item.text}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                item.status === "live"
                  ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "bg-[var(--panel)] text-[var(--muted)]"
              }`}
            >
              {item.status === "live" ? "Live" : "Soon"}
            </span>
          </li>
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
