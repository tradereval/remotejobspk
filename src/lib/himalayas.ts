import { prisma } from "./db";
import { scoreEligibility } from "./eligibility";
import { cleanJobDescriptionHtml, type Eligibility } from "./types";

type HimalayasJob = {
  title?: string;
  excerpt?: string;
  description?: string;
  companyName?: string;
  companyLogo?: string;
  employmentType?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  salaryPeriod?: string | null;
  seniority?: string | string[] | null;
  currency?: string | null;
  locationRestrictions?: string[] | string | null;
  timezoneRestrictions?: string[] | string | null;
  categories?: string[] | null;
  parentCategories?: string[] | null;
  pubDate?: string | number | null;
  expiryDate?: string | number | null;
  applicationLink?: string;
  guid?: string;
};

type HimalayasResponse = {
  jobs?: HimalayasJob[];
  totalCount?: number;
};

const BASE = "https://himalayas.app/jobs/api";

async function fetchJson(url: string): Promise<HimalayasResponse> {
  const headers: HeadersInit = {
    Accept: "application/json",
    "User-Agent": "RemoteJobsPK/1.0 (hello@remotejobspk.com)",
  };
  if (process.env.HIMALAYAS_API_KEY) {
    headers.Authorization = `Bearer ${process.env.HIMALAYAS_API_KEY}`;
  }
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Himalayas API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function buildSearchUrl(params: Record<string, string>) {
  const q = new URLSearchParams(params);
  return `${BASE}/search?${q.toString()}`;
}

function parseDate(value: string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    // Himalayas often returns unix seconds
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const asNum = Number(value);
  if (!Number.isNaN(asNum) && value.trim() !== "" && /^\d+$/.test(value.trim())) {
    const ms = asNum < 1e12 ? asNum * 1000 : asNum;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function asSeniority(value: string | string[] | null | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || null;
  return String(value);
}

function asStringList(value: string[] | string | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function asNumberList(value: Array<string | number> | string | null | undefined): number[] {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : String(value).split(",");
  return arr.map(Number).filter((n) => !Number.isNaN(n));
}

export async function importHimalayasJobs(options?: { maxPages?: number }) {
  const maxPages = options?.maxPages ?? 120;
  let upserted = 0;
  let failed = 0;
  let expired = 0;
  const seenGuids = new Set<string>();

  const feeds: Array<{ country?: string; worldwide?: string }> = [
    { country: "PK" },
    { worldwide: "true" },
  ];

  for (const feed of feeds) {
    for (let page = 1; page <= maxPages; page++) {
      const params: Record<string, string> = {
        page: String(page),
        limit: "20",
        sort: "recent",
      };
      if (feed.country) params.country = feed.country;
      if (feed.worldwide) params.worldwide = feed.worldwide;

      const data = await fetchJson(buildSearchUrl(params));
      const jobs = data.jobs || [];
      if (!jobs.length) break;
      console.log(
        `Himalayas ${feed.country || "worldwide"} page ${page}: ${jobs.length} (catalog ${data.totalCount ?? "?"})`,
      );

      for (const job of jobs) {
        const externalId = job.guid || job.applicationLink;
        if (!externalId || !job.title || !job.companyName || !job.applicationLink) continue;
        if (seenGuids.has(externalId)) continue;
        seenGuids.add(externalId);

        const scored = scoreEligibility({
          locationRestrictions: job.locationRestrictions,
          timezoneRestrictions: job.timezoneRestrictions,
          countries: feed.country ? ["Pakistan"] : undefined,
          description: `${job.excerpt || ""} ${job.description || ""}`,
          title: job.title,
          forceCountry: feed.country === "PK" ? "PK" : null,
        });

        let eligibility: Eligibility;
        if (feed.country === "PK") {
          eligibility = scored.eligibility === "restricted" ? "restricted" : "pakistan";
        } else if (scored.eligibility === "unknown") {
          eligibility = "worldwide";
        } else {
          eligibility = scored.eligibility;
        }

        const categories = [...(job.parentCategories || []), ...(job.categories || [])].filter(Boolean);
        const locations = asStringList(job.locationRestrictions);
        const timezones = asNumberList(job.timezoneRestrictions);
        const description = cleanJobDescriptionHtml(job.description);

        const expiresAt = parseDate(job.expiryDate);
        const publishedAt = parseDate(job.pubDate) || new Date();
        const isExpired = expiresAt ? expiresAt < new Date() : false;
        const needsReview = eligibility === "restricted" || scored.needsReview;

        try {
          await prisma.job.upsert({
            where: {
              source_externalId: { source: "himalayas", externalId },
            },
            create: {
              source: "himalayas",
              externalId,
              title: job.title,
              company: job.companyName,
              companyLogo: job.companyLogo || null,
              description,
              excerpt: job.excerpt || null,
              applicationUrl: job.applicationLink,
              sourceAttributionUrl: null,
              salaryMin: job.minSalary ?? null,
              salaryMax: job.maxSalary ?? null,
              salaryCurrency: job.currency || null,
              salaryPeriod: job.salaryPeriod || null,
              employmentType: job.employmentType || null,
              seniority: asSeniority(job.seniority),
              locationRestrictions: JSON.stringify(locations),
              timezoneRestrictions: JSON.stringify(timezones),
              categories: JSON.stringify(categories),
              skills: JSON.stringify([]),
              eligibility,
              acceptsBeginners: false,
              isVerified: false,
              needsReview,
              publishedAt,
              expiresAt,
              isActive: !isExpired,
            },
            update: {
              title: job.title,
              company: job.companyName,
              companyLogo: job.companyLogo || null,
              description,
              excerpt: job.excerpt || null,
              applicationUrl: job.applicationLink,
              sourceAttributionUrl: null,
              salaryMin: job.minSalary ?? null,
              salaryMax: job.maxSalary ?? null,
              salaryCurrency: job.currency || null,
              salaryPeriod: job.salaryPeriod || null,
              employmentType: job.employmentType || null,
              seniority: asSeniority(job.seniority),
              locationRestrictions: JSON.stringify(locations),
              timezoneRestrictions: JSON.stringify(timezones),
              categories: JSON.stringify(categories),
              eligibility,
              expiresAt,
              publishedAt,
              isActive: !isExpired,
              needsReview,
            },
          });
          upserted += 1;
          if (isExpired) expired += 1;
        } catch (err) {
          failed += 1;
          console.error("Failed job upsert", externalId, err);
        }
      }

      if (jobs.length < 20) break;
      if (data.totalCount && page * 20 >= data.totalCount) break;
    }
  }

  const deactivate = await prisma.job.updateMany({
    where: {
      source: "himalayas",
      isActive: true,
      expiresAt: { lt: new Date() },
    },
    data: { isActive: false },
  });

  return {
    upserted,
    failed,
    expiredMarked: expired + deactivate.count,
    uniqueSeen: seenGuids.size,
  };
}
