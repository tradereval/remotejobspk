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
  nextCursor?: string;
};

type Feed = { country?: string; worldwide?: string };

type Counters = { upserted: number; failed: number; expired: number };

const BASE = "https://himalayas.app/jobs/api";
const PAGE_SIZE = 20;
/** Stops a stuck browse cursor. The live catalog is well under this. */
const BROWSE_LOOP_GUARD = 20000;
let minGapMs = 1000;
let nextAllowedAt = 0;

async function pace() {
  const wait = nextAllowedAt - Date.now();
  if (wait > 0) await sleep(wait);
  nextAllowedAt = Date.now() + minGapMs;
}

function slowDown() {
  minGapMs = Math.min(8000, Math.max(2000, minGapMs * 2));
  nextAllowedAt = Date.now() + minGapMs;
}

function speedUp() {
  minGapMs = Math.max(1000, Math.floor(minGapMs * 0.95));
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url: string): Promise<HimalayasResponse> {
  const headers: HeadersInit = {
    Accept: "application/json",
    "User-Agent": "RemoteJobsPK/1.0 (hello@remotejobspk.com)",
  };
  if (process.env.HIMALAYAS_API_KEY) {
    headers.Authorization = `Bearer ${process.env.HIMALAYAS_API_KEY}`;
  }

  let lastError = "Himalayas API failed";
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      await pace();
      const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(25_000) });
      if (res.status === 429 || res.status === 502 || res.status === 503) {
        slowDown();
        const retryAfter = Number(res.headers.get("retry-after"));
        const waitMs =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter, 120) * 1000
            : Math.min(30_000, 1000 * 2 ** attempt);
        console.log(`Himalayas ${res.status}, waiting ${waitMs}ms`);
        await sleep(waitMs);
        lastError = `Himalayas API ${res.status}`;
        continue;
      }
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`Himalayas API ${res.status}: ${text.slice(0, 180)}`);
      }
      if (text.trimStart().startsWith("<")) {
        const waitMs = Math.min(30_000, 1000 * 2 ** attempt);
        console.log(`Himalayas returned HTML, waiting ${waitMs}ms`);
        await sleep(waitMs);
        lastError = "Himalayas API returned HTML";
        continue;
      }
      const data = JSON.parse(text) as HimalayasResponse;
      speedUp();
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Himalayas API ")) throw error;
      lastError = error instanceof Error ? error.message : "Himalayas API failed";
      await sleep(Math.min(30_000, 1000 * 2 ** attempt));
    }
  }
  throw new Error(lastError);
}

function buildSearchUrl(params: Record<string, string>) {
  const q = new URLSearchParams(params);
  return `${BASE}/search?${q.toString()}`;
}

function buildBrowseUrl(params: Record<string, string>) {
  const q = new URLSearchParams(params);
  return `${BASE}?${q.toString()}`;
}

function parseDate(value: string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
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

function asInt(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return Math.round(Number(value));
}

async function tuneSqlite() {
  const url = process.env.DATABASE_URL || "";
  if (!url.startsWith("file:")) return;
  try {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL");
    await prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout=30000");
    await prisma.$queryRawUnsafe("PRAGMA cache_size=-65536");
  } catch (error) {
    console.error("SQLite tune skipped", error instanceof Error ? error.message : error);
  }
}

type Row = { job: HimalayasJob; eligibility: Eligibility; needsReview: boolean };

function buildUpsert(row: Row) {
  const job = row.job;
  const externalId = job.guid || job.applicationLink || "";
  const categories = [...(job.parentCategories || []), ...(job.categories || [])].filter(Boolean);
  const locations = asStringList(job.locationRestrictions);
  const timezones = asNumberList(job.timezoneRestrictions as Array<string | number> | string | null | undefined);
  const description = cleanJobDescriptionHtml(job.description);
  const expiresAt = parseDate(job.expiryDate);
  const publishedAt = parseDate(job.pubDate) || new Date();
  const isExpired = expiresAt ? expiresAt < new Date() : false;
  const shared = {
    title: job.title || "",
    company: job.companyName || "",
    companyLogo: job.companyLogo || null,
    description,
    excerpt: job.excerpt || null,
    applicationUrl: job.applicationLink || "",
    sourceAttributionUrl: null,
    salaryMin: asInt(job.minSalary),
    salaryMax: asInt(job.maxSalary),
    salaryCurrency: job.currency || null,
    salaryPeriod: job.salaryPeriod || null,
    employmentType: job.employmentType || null,
    seniority: asSeniority(job.seniority),
    locationRestrictions: JSON.stringify(locations),
    timezoneRestrictions: JSON.stringify(timezones),
    categories: JSON.stringify(categories),
    eligibility: row.eligibility,
    expiresAt,
    publishedAt,
    isActive: !isExpired,
    needsReview: row.needsReview,
  };
  return {
    externalId,
    isExpired,
    create: {
      source: "himalayas",
      externalId,
      ...shared,
      skills: JSON.stringify([]),
      acceptsBeginners: false,
      isVerified: false,
    },
    update: shared,
  };
}

async function saveBatch(rows: Row[], counters: Counters) {
  if (!rows.length) return;
  const prepared = rows.map(buildUpsert);
  const runOne = async (data: ReturnType<typeof buildUpsert>) => {
    await prisma.job.upsert({
      where: { source_externalId: { source: "himalayas", externalId: data.externalId } },
      create: data.create,
      update: data.update,
    });
    counters.upserted += 1;
    if (data.isExpired) counters.expired += 1;
  };

  try {
    await prisma.$transaction(
      prepared.map((data) =>
        prisma.job.upsert({
          where: { source_externalId: { source: "himalayas", externalId: data.externalId } },
          create: data.create,
          update: data.update,
        }),
      ),
      { maxWait: 30_000, timeout: 120_000 },
    );
    counters.upserted += prepared.length;
    counters.expired += prepared.filter((data) => data.isExpired).length;
  } catch (error) {
    console.error("Page transaction failed, retrying one by one", error instanceof Error ? error.message : error);
    for (const data of prepared) {
      try {
        await runOne(data);
      } catch (one) {
        counters.failed += 1;
        console.error("Failed job upsert", data.externalId, one instanceof Error ? one.message : one);
      }
    }
  }
}

function takeNewJobs(jobs: HimalayasJob[], seenGuids: Set<string>) {
  const fresh: HimalayasJob[] = [];
  for (const job of jobs) {
    const externalId = job.guid || job.applicationLink;
    if (!externalId || !job.title || !job.companyName || !job.applicationLink) continue;
    if (seenGuids.has(externalId)) continue;
    seenGuids.add(externalId);
    fresh.push(job);
  }
  return fresh;
}

async function importSearchFeed(
  feed: Feed,
  seenGuids: Set<string>,
  counters: Counters,
  maxPages: number | undefined,
) {
  let pages = 0;
  let fetched = 0;
  let stall = 0;
  const feedSeen = new Set<string>();
  for (let page = 1; maxPages === undefined || page <= maxPages; page++) {
    const params: Record<string, string> = {
      page: String(page),
      limit: String(PAGE_SIZE),
      sort: "recent",
    };
    if (feed.country) params.country = feed.country;
    if (feed.worldwide) params.worldwide = feed.worldwide;

    const data = await fetchJson(buildSearchUrl(params));
    const jobs = data.jobs || [];
    const catalog = typeof data.totalCount === "number" ? data.totalCount : null;
    const premature = jobs.length < PAGE_SIZE && catalog !== null && fetched + jobs.length < catalog;
    if (premature && stall < 4) {
      stall += 1;
      console.log(
        `Himalayas ${feed.country || "worldwide"} page ${page} returned ${jobs.length} before catalog ${catalog}, retrying`,
      );
      await sleep(1500 * stall);
      page -= 1;
      continue;
    }
    if (!jobs.length) break;

    const pageIds = jobs
      .map((job) => job.guid || job.applicationLink)
      .filter((id): id is string => Boolean(id));
    const novel = pageIds.filter((id) => !feedSeen.has(id));
    for (const id of pageIds) feedSeen.add(id);
    if (pageIds.length > 0 && novel.length === 0) {
      console.log(`Himalayas ${feed.country || "worldwide"} page ${page} repeated an earlier page, stopping`);
      break;
    }

    stall = 0;
    pages += 1;
    console.log(
      `Himalayas ${feed.country || "worldwide"} page ${page}: ${jobs.length} (catalog ${data.totalCount ?? "?"})`,
    );

    const batch: Row[] = takeNewJobs(jobs, seenGuids).map((job) => {
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
      return {
        job,
        eligibility,
        needsReview: eligibility === "restricted" || scored.needsReview,
      };
    });
    await saveBatch(batch, counters);
    fetched += jobs.length;
    if (catalog !== null && fetched >= catalog) break;
    if (jobs.length < PAGE_SIZE && catalog === null) break;
  }
  return pages;
}

/** Empty location restrictions mean worldwide. Any other country list is not open to Pakistan. */
function classifyBrowse(job: HimalayasJob): { eligibility: Eligibility; needsReview: boolean } {
  const scored = scoreEligibility({
    locationRestrictions: job.locationRestrictions,
    timezoneRestrictions: job.timezoneRestrictions,
    description: `${job.excerpt || ""} ${job.description || ""}`,
    title: job.title,
  });
  if (scored.eligibility === "restricted") return scored;

  const locations = asStringList(job.locationRestrictions).map((value) => value.toLowerCase());
  const openEnded =
    locations.length === 0 ||
    locations.some((loc) => loc.includes("worldwide") || loc.includes("anywhere") || loc === "global");
  if (openEnded) return { eligibility: "worldwide", needsReview: false };
  if (locations.some((loc) => loc === "pk" || loc.includes("pakistan"))) {
    return { eligibility: "pakistan", needsReview: false };
  }
  return { eligibility: "restricted", needsReview: false };
}

async function importBrowseFeed(
  seenGuids: Set<string>,
  counters: Counters,
  maxBrowsePages: number | undefined,
) {
  let cursor: string | undefined;
  let pages = 0;
  let reportedTotal: number | null = null;
  let finished = false;
  let prefetch: Promise<HimalayasResponse> | null = null;
  const guard = maxBrowsePages ?? BROWSE_LOOP_GUARD;

  const loadPage = (nextCursor?: string) => {
    const params: Record<string, string> = { limit: String(PAGE_SIZE) };
    if (nextCursor) params.cursor = nextCursor;
    return fetchJson(buildBrowseUrl(params));
  };

  while (pages < guard) {
    const data = prefetch ? await prefetch : await loadPage(cursor);
    prefetch = null;
    if (reportedTotal === null && typeof data.totalCount === "number") {
      reportedTotal = data.totalCount;
      console.log(`Himalayas browse catalog reported ${reportedTotal}`);
    }
    const jobs = data.jobs || [];
    if (!jobs.length) {
      finished = true;
      break;
    }
    pages += 1;
    const batch = takeNewJobs(jobs, seenGuids).map((job) => ({ job, ...classifyBrowse(job) }));
    const next = data.nextCursor;
    if (next && next !== cursor && pages < guard) prefetch = loadPage(next);
    await saveBatch(batch, counters);
    if (pages === 1 || pages % 25 === 0) {
      console.log(
        `Himalayas browse page ${pages}: new ${batch.length}, unique ${seenGuids.size}, upserted ${counters.upserted}, failed ${counters.failed}`,
      );
    }
    if (!next || next === cursor) {
      finished = true;
      break;
    }
    cursor = next;
  }

  if (!finished && maxBrowsePages === undefined) {
    console.error(`Himalayas browse stopped at safety guard of ${guard} pages with a cursor still set`);
  }
  console.log(`Himalayas browse done: pages ${pages}, unique ${seenGuids.size}, reported ${reportedTotal ?? "?"}`);
  return { pages, reportedTotal };
}

export async function importHimalayasJobs(options?: { maxPages?: number; maxBrowsePages?: number }) {
  await tuneSqlite();
  const counters: Counters = { upserted: 0, failed: 0, expired: 0 };
  const seenGuids = new Set<string>();
  const stored = await prisma.job.findMany({
    where: { source: "himalayas" },
    select: { externalId: true },
  });
  for (const row of stored) {
    if (row.externalId) seenGuids.add(row.externalId);
  }
  if (seenGuids.size) console.log(`Himalayas resume: ${seenGuids.size} jobs already stored`);

  const pakistanPages = await importSearchFeed({ country: "PK" }, seenGuids, counters, options?.maxPages);
  const worldwidePages = await importSearchFeed({ worldwide: "true" }, seenGuids, counters, options?.maxPages);

  let browsePages = 0;
  let browseReportedTotal: number | null = null;
  // A capped search (the admin button) stays a short refresh. A full import also walks /jobs/api.
  if (options?.maxBrowsePages !== 0 && options?.maxPages === undefined) {
    const browse = await importBrowseFeed(seenGuids, counters, options?.maxBrowsePages);
    browsePages = browse.pages;
    browseReportedTotal = browse.reportedTotal;
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
    upserted: counters.upserted,
    failed: counters.failed,
    expiredMarked: counters.expired + deactivate.count,
    uniqueSeen: seenGuids.size,
    pagesWalked: pakistanPages + worldwidePages,
    browsePages,
    browseReportedTotal,
  };
}
