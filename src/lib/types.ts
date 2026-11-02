export type Eligibility = "pakistan" | "worldwide" | "restricted" | "unknown";

export type JobFilters = {
  q?: string;
  eligibility?: Eligibility | "pk_ready";
  category?: string;
  seniority?: string;
  verifiedOnly?: boolean;
  beginners?: boolean;
  page?: number;
};

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function formatSalary(job: {
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
}): string | null {
  if (!job.salaryMin && !job.salaryMax) return null;
  const currency = job.salaryCurrency || "USD";
  const period = job.salaryPeriod ? ` / ${job.salaryPeriod}` : "";
  if (job.salaryMin && job.salaryMax) {
    return `${currency} ${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}${period}`;
  }
  const amount = job.salaryMin || job.salaryMax;
  return `${currency} ${amount!.toLocaleString()}${period}`;
}
