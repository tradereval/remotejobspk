export type Eligibility = "pakistan" | "worldwide" | "restricted" | "unknown";

export type JobFilters = {
  q?: string;
  eligibility?: Eligibility | "pk_ready";
  category?: string;
  seniority?: string;
  employmentType?: string;
  verifiedOnly?: boolean;
  beginners?: boolean;
  page?: number;
};

/** Common parent categories shown as board chips (curated for remote seekers). */
export const JOB_CATEGORY_CHIPS = [
  "Developer",
  "Design",
  "Marketing",
  "Sales",
  "Customer Support",
  "Product",
  "Management",
  "Finance",
  "Writing",
  "HR",
  "DevOps",
] as const;

export const EMPLOYMENT_TYPES = [
  "Full-Time",
  "Part-Time",
  "Contractor",
  "Freelance",
  "Internship",
] as const;

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function parseJsonNumbers(value: string | null | undefined): number[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(Number).filter((n) => !Number.isNaN(n));
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

/** Plain-text preview for list cards. */
export function jobPreview(
  job: { excerpt?: string | null; description?: string | null },
  max = 220,
): string | null {
  const raw = job.excerpt || job.description || "";
  const text = stripHtml(raw);
  if (!text) return null;
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "").trimEnd()}…`;
}

export function stripHtml(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Remove third-party “originally posted on …” footers from HTML descriptions. */
export function cleanJobDescriptionHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  return html
    .replace(/<p[^>]*>\s*Originally posted on[\s\S]*?<\/p>/gi, "")
    .replace(/<p[^>]*>\s*Source:[\s\S]*?<\/p>/gi, "")
    .trim() || null;
}

export function formatLocations(raw: string | null | undefined): string {
  const locs = parseJsonArray(raw);
  if (!locs.length) return "Worldwide / remote";
  if (locs.length <= 4) return locs.join(", ");
  return `${locs.slice(0, 3).join(", ")} +${locs.length - 3} more`;
}

export function formatTimezones(raw: string | null | undefined): string | null {
  const offsets = parseJsonNumbers(raw);
  if (!offsets.length) return null;
  const sorted = [...new Set(offsets)].sort((a, b) => a - b);
  const label = (n: number) => {
    const sign = n >= 0 ? "+" : "";
    return `UTC${sign}${n}`;
  };
  if (sorted.length === 1) return label(sorted[0]);
  if (sorted.length <= 4) return sorted.map(label).join(", ");
  return `${label(sorted[0])} to ${label(sorted[sorted.length - 1])}`;
}

export function formatPostedAge(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return "Just posted";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Just posted";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1mo ago" : `${months}mo ago`;
}

export function isNewJob(date: Date | string | null | undefined, withinHours = 48): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() < withinHours * 60 * 60 * 1000;
}

export function formatDateLabel(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
