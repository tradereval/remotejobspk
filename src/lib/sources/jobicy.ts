import { fetchJson } from "./http";
import { decideListing, employmentType, httpUrl, parseFeedDate } from "./keep";
import { saveJobDrafts, toDraft } from "./save";
import { emptyReport, type JobDraft, type SourceImportReport } from "./types";

type JobicyJob = {
  id?: number;
  url?: string;
  jobTitle?: string;
  companyName?: string;
  companyLogo?: string;
  jobIndustry?: string[];
  jobType?: string[];
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
};

type JobicyPage = {
  jobs?: JobicyJob[];
  nextCursor?: string | null;
  hasMore?: boolean;
  success?: boolean;
  error?: string;
};

const BASE = "https://jobicy.com/api/jobs";
const PAGE_CAP = 200;

/**
 * Jobicy's public jobs API allows job boards. Apply links must stay on the Jobicy listing
 * URL (direct ATS links need a paid key this project does not have). The feed is the last 7 days.
 * Do not start a new polling pass more than once an hour; cursor pages in one pass are allowed.
 */
export async function importJobicyJobs(): Promise<SourceImportReport> {
  const report = emptyReport("jobicy");
  const drafts: JobDraft[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  let pages = 0;

  for (let page = 1; page <= PAGE_CAP; page++) {
    const params = new URLSearchParams({ count: "100" });
    if (cursor) params.set("cursor", cursor);
    const data = await fetchJson<JobicyPage>(`${BASE}?${params.toString()}`, 1100);
    if (data.success === false) {
      throw new Error(data.error || "Jobicy API failed");
    }
    const jobs = data.jobs || [];
    pages += 1;
    console.log(`Jobicy page ${page}: ${jobs.length} (hasMore ${data.hasMore === true})`);
    if (!jobs.length) break;

    for (const job of jobs) {
      if (job.id === undefined || job.id === null) continue;
      const externalId = String(job.id);
      if (seen.has(externalId)) continue;
      seen.add(externalId);
      report.fetched += 1;

      const applicationUrl = httpUrl(job.url);
      const title = (job.jobTitle || "").trim();
      const company = (job.companyName || "").trim();
      if (!applicationUrl || !title || !company) {
        report.failed += 1;
        continue;
      }

      const decision = decideListing({
        title,
        description: `${job.jobExcerpt || ""}\n${job.jobDescription || ""}`,
        location: job.jobGeo,
        salaryCurrency: job.salaryCurrency,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
      });
      if (!decision.ok) {
        report.dropped[decision.reason] += 1;
        continue;
      }

      drafts.push(
        toDraft(decision, {
          source: "jobicy",
          externalId,
          title,
          company,
          companyLogo: job.companyLogo,
          descriptionHtml: job.jobDescription,
          excerpt: job.jobExcerpt,
          applicationUrl,
          salaryPeriod: job.salaryPeriod,
          employmentType: employmentType(job.jobType || []),
          seniority: job.jobLevel,
          location: job.jobGeo,
          categories: job.jobIndustry || [],
          publishedAt: parseFeedDate(job.pubDate),
        }),
      );
    }

    if (!data.hasMore || !data.nextCursor) break;
    if (data.nextCursor === cursor) break;
    cursor = data.nextCursor;
  }

  report.kept = drafts.length;
  const saved = await saveJobDrafts(drafts);
  report.upserted = saved.upserted;
  report.failed += saved.failed;
  report.note = `Jobicy public API, last 7 days, ${pages} page(s). Apply links go to the Jobicy listing.`;
  if (pages >= PAGE_CAP) report.note += " Stopped at the page cap.";
  console.log(
    `Jobicy fetched ${report.fetched}, kept ${report.kept}, dropped ${JSON.stringify(report.dropped)}, failed ${report.failed}`,
  );
  return report;
}
