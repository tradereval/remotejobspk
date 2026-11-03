import { fetchJson } from "./http";
import { decideListing, employmentType, httpUrl, parseFeedDate, positiveMoney } from "./keep";
import { saveJobDrafts, toDraft } from "./save";
import { emptyReport, type JobDraft, type SourceImportReport } from "./types";

type RemoteOkJob = {
  id?: string | number;
  position?: string;
  company?: string;
  company_logo?: string;
  tags?: string[];
  description?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  date?: string;
  epoch?: number;
  url?: string;
  apply_url?: string;
  legal?: string;
};

const URL = "https://remoteok.com/api";

/**
 * Remote OK's public API terms (also returned on the feed) allow reuse when each listing
 * links back to its Remote OK URL, without nofollow, and the page names Remote OK.
 * Salary figures on this feed are USD. Unpublished salaries stay empty.
 */
export async function importRemoteOkJobs(): Promise<SourceImportReport> {
  const report = emptyReport("remoteok");
  const payload = await fetchJson<RemoteOkJob[]>(URL, 1000);
  const jobs = Array.isArray(payload) ? payload : [];
  const drafts: JobDraft[] = [];
  const seen = new Set<string>();

  for (const job of jobs) {
    if (job.legal || job.id === undefined || job.id === null) continue;
    const externalId = String(job.id);
    if (seen.has(externalId)) continue;
    seen.add(externalId);
    report.fetched += 1;

    const applicationUrl = httpUrl(job.url) || httpUrl(job.apply_url);
    const title = (job.position || "").trim();
    const company = (job.company || "").trim();
    if (!applicationUrl || !title || !company) {
      report.failed += 1;
      continue;
    }

    const salaryMin = positiveMoney(job.salary_min);
    const salaryMax = positiveMoney(job.salary_max);
    const decision = decideListing({
      title,
      description: job.description,
      location: job.location,
      salaryCurrency: salaryMin || salaryMax ? "USD" : null,
      salaryMin,
      salaryMax,
    });
    if (!decision.ok) {
      report.dropped[decision.reason] += 1;
      continue;
    }

    drafts.push(
      toDraft(decision, {
        source: "remoteok",
        externalId,
        title,
        company,
        companyLogo: job.company_logo,
        descriptionHtml: job.description,
        applicationUrl,
        employmentType: employmentType(job.tags || []),
        location: job.location,
        categories: job.tags || [],
        publishedAt: parseFeedDate(job.date) || parseFeedDate(job.epoch),
      }),
    );
  }

  report.kept = drafts.length;
  const saved = await saveJobDrafts(drafts);
  report.upserted = saved.upserted;
  report.failed += saved.failed;
  report.note = "Remote OK public API returns the newest 100 jobs. Apply links go to the Remote OK listing.";
  console.log(
    `Remote OK fetched ${report.fetched}, kept ${report.kept}, dropped ${JSON.stringify(report.dropped)}, failed ${report.failed}`,
  );
  return report;
}
