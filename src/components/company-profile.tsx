import Link from "next/link";

type OtherRole = { id: string; title: string };

export function CompanyProfile({
  company,
  logo,
  intro,
  hiringFrom,
  pay,
  otherRoles,
  companyUrl,
}: {
  company: string;
  logo?: string | null;
  intro?: string | null;
  hiringFrom: string;
  pay?: string | null;
  otherRoles: OtherRole[];
  companyUrl?: string | null;
}) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white/90 p-6">
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">Company</h2>
      <div className="mt-4 flex items-start gap-4">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-2xl border border-[var(--line)] bg-white object-contain p-1.5"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--panel)] text-lg font-semibold text-[var(--muted)]">
            {company.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-[family-name:var(--font-display)] text-xl">{company}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Remote company</p>
        </div>
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        <div className="grid grid-cols-[8rem_1fr] gap-2">
          <dt className="text-[var(--muted)]">Work</dt>
          <dd className="font-medium">Remote</dd>
        </div>
        <div className="grid grid-cols-[8rem_1fr] gap-2">
          <dt className="text-[var(--muted)]">Hiring from</dt>
          <dd className="font-medium">{hiringFrom}</dd>
        </div>
        <div className="grid grid-cols-[8rem_1fr] gap-2">
          <dt className="text-[var(--muted)]">Pay</dt>
          <dd className="font-medium">{pay || "Not published"}</dd>
        </div>
      </dl>

      {intro && <p className="mt-5 text-sm leading-relaxed text-[var(--ink)]/90">{intro}</p>}

      {otherRoles.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-medium text-[var(--muted)]">Open roles</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {otherRoles.map((role) => (
              <li key={role.id}>
                <Link href={`/jobs/${role.id}`} className="text-[var(--accent)] hover:underline">
                  {role.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {companyUrl && (
        <p className="mt-5 text-sm text-[var(--muted)]">
          Company size, founding year, and leadership are on the{" "}
          <a href={companyUrl} target="_blank" rel="noopener noreferrer" className="underline">
            Himalayas company page
          </a>
          . Their jobs feed does not include those fields.
        </p>
      )}
    </section>
  );
}
