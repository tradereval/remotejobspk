import { eligibilityLabel } from "@/lib/eligibility";
import type { Eligibility } from "@/lib/types";

export function EligibilityBadge({
  eligibility,
  verified,
}: {
  eligibility: string;
  verified?: boolean;
}) {
  const e = eligibility as Eligibility;
  const styles: Record<string, string> = {
    pakistan: "bg-emerald-100 text-emerald-900",
    worldwide: "bg-sky-100 text-sky-900",
    restricted: "bg-rose-100 text-rose-900",
    unknown: "bg-amber-100 text-amber-950",
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[e] || styles.unknown}`}>
        {eligibilityLabel(e)}
      </span>
      {verified && (
        <span className="rounded-full bg-[var(--ink)] px-2 py-0.5 text-xs text-[var(--bg)]">Verified</span>
      )}
    </span>
  );
}
