import { fetchJson } from "./http";
import { decideListing, employmentType, httpUrl, parseFeedDate } from "./keep";
import { saveJobDrafts, toDraft } from "./save";
import { emptyReport, type JobDraft, type SourceImportReport } from "./types";

type ArbeitnowJob = {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  remote?: boolean;
  url?: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number;
};

type ArbeitnowPage = {
  data?: ArbeitnowJob[];
  links?: { next?: string | null };
  meta?: { terms?: string };
};

const BASE = "https://www.arbeitnow.com/api/job-board-api";
const PAGE_CAP = 500;

/**
 * Arbeitnow documents a free job-board API and requires a link back to Arbeitnow.
 * The remote query is not reliable, so remote:false rows are dropped here.
 * Their board is mostly Europe. City- or country-limited rows are dropped.
 */
export async function importArbeitnowJobs(): Promise<SourceImportReport> {
  const report = emptyReport("arbeitnow");
  const drafts: JobDraft[] = [];
  const seen = new Set<string>();
  let pages = 0;
  let remoteTrue = 0;

  for (let page = 1; page <= PAGE_CAP; page++) {
    const data = await fetchJson<ArbeitnowPage>(`${BASE}?remote=true&page=${page}`, 2200);
    const jobs = data.data || [];
    if (!jobs.length) break;
    pages += 1;
    const slugs = jobs.map((job) => job.slug).filter((slug): slug is string => Boolean(slug));
    const novel = slugs.filter((slug) => !seen.has(slug));
    if (slugs.length > 0 && novel.length === 0) {
      console.log(`Arbeitnow page ${page} repeated earlier jobs, stopping`);
      break;
    }

    let remote = 0;
    let keptOnPage = 0;
    for (const job of jobs) {
      if (!job.slug || seen.has(job.slug)) continue;
      seen.add(job.slug);
      report.fetched += 1;
      if (job.remote === true) {
        remote += 1;
        remoteTrue += 1;
      }

      const applicationUrl = httpUrl(job.url);
      const title = (job.title || "").trim();
      const company = (job.company_name || "").trim();
      if (!applicationUrl || !title || !company) {
        report.failed += 1;
        continue;
      }

      const decision = decideListing({
        title,
        description: job.description,
        location: job.location,
        remote: job.remote === true ? true : false,
      });
      if (!decision.ok) {
        report.dropped[decision.reason] += 1;
        continue;
      }

      keptOnPage += 1;
      drafts.push(
        toDraft(decision, {
          source: "arbeitnow",
          externalId: job.slug,
          title,
          company,
          descriptionHtml: job.description,
          applicationUrl,
          employmentType: employmentType(job.job_types || []),
          location: job.location,
          categories: job.tags || [],
          publishedAt: parseFeedDate(job.created_at),
        }),
      );
    }

    console.log(`Arbeitnow page ${page}: ${jobs.length} listings, ${remote} remote, ${keptOnPage} kept`);
    if (!data.links?.next) break;
  }

  report.kept = drafts.length;
  const saved = await saveJobDrafts(drafts);
  report.upserted = saved.upserted;
  report.failed += saved.failed;
  report.note = `Arbeitnow public API, ${pages} page(s), ${remoteTrue} with remote=true. The feed also includes onsite roles, which are dropped. Apply links go to the Arbeitnow listing.`;
  if (pages >= PAGE_CAP) report.note += " Stopped at the page cap.";
  console.log(
    `Arbeitnow fetched ${report.fetched}, kept ${report.kept}, dropped ${JSON.stringify(report.dropped)}, failed ${report.failed}`,
  );
  return report;
}
