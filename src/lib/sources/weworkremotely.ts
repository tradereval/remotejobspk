import { fetchText } from "./http";
import { decideListing, decodeHtml, employmentType, httpUrl, parseFeedDate } from "./keep";
import { saveJobDrafts, toDraft } from "./save";
import { emptyReport, type JobDraft, type SourceImportReport } from "./types";

const FEEDS = [
  "https://weworkremotely.com/remote-jobs.rss",
  "https://weworkremotely.com/categories/remote-customer-support-jobs.rss",
  "https://weworkremotely.com/categories/remote-product-jobs.rss",
  "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss",
  "https://weworkremotely.com/categories/remote-management-and-finance-jobs.rss",
  "https://weworkremotely.com/categories/remote-design-jobs.rss",
  "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
];

/**
 * We Work Remotely's RSS page says anyone may use the public feed if links are attributed
 * back to We Work Remotely. Apply stays on the WWR listing.
 */
export async function importWeWorkRemotelyJobs(): Promise<SourceImportReport> {
  const report = emptyReport("weworkremotely");
  const drafts: JobDraft[] = [];
  const seen = new Set<string>();
  const feedNotes: string[] = [];

  for (const feed of FEEDS) {
    let xml = "";
    try {
      xml = await fetchText(feed, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "feed failed";
      feedNotes.push(`${feed} ${message}`);
      console.log(`We Work Remotely feed failed: ${message}`);
      continue;
    }
    const items = xml.split("<item>").slice(1);
    console.log(`We Work Remotely ${feed}: ${items.length} items`);
    for (const item of items) {
      const link = httpUrl(inner(item, "link")) || httpUrl(inner(item, "guid"));
      const externalId = (link || inner(item, "guid")).trim();
      if (!externalId || seen.has(externalId)) continue;
      seen.add(externalId);
      report.fetched += 1;

      const split = splitCompany(inner(item, "title"));
      if (!link || !split) {
        report.failed += 1;
        continue;
      }

      const region = decodeHtml(inner(item, "region")).trim();
      const country = stripFlags(decodeHtml(inner(item, "country")));
      const location = eligibilityLocation(region, country);
      const description = inner(item, "description");
      const decision = decideListing({
        title: split.title,
        description,
        location,
        expiresAt: parseFeedDate(inner(item, "expires_at")),
      });
      if (!decision.ok) {
        report.dropped[decision.reason] += 1;
        continue;
      }

      drafts.push(
        toDraft(decision, {
          source: "weworkremotely",
          externalId,
          title: split.title,
          company: split.company,
          companyLogo: firstImage(description),
          descriptionHtml: description,
          applicationUrl: link,
          employmentType: employmentType([inner(item, "type")]),
          location,
          categories: [inner(item, "category")].filter(Boolean),
          publishedAt: parseFeedDate(inner(item, "pubDate")),
          expiresAt: parseFeedDate(inner(item, "expires_at")),
        }),
      );
    }
  }

  report.kept = drafts.length;
  const saved = await saveJobDrafts(drafts);
  report.upserted = saved.upserted;
  report.failed += saved.failed;
  report.note = "We Work Remotely public RSS (site-wide plus category feeds). Apply links go to We Work Remotely.";
  if (feedNotes.length) report.note += ` Feed errors: ${feedNotes.join("; ")}`;
  console.log(
    `We Work Remotely fetched ${report.fetched}, kept ${report.kept}, dropped ${JSON.stringify(report.dropped)}, failed ${report.failed}`,
  );
  return report;
}

function inner(item: string, name: string): string {
  const match = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  if (!match) return "";
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").trim();
}

function splitCompany(raw: string): { company: string; title: string } | null {
  const text = decodeHtml(raw).replace(/\s+/g, " ").trim();
  const index = text.indexOf(": ");
  if (index < 2 || index > 80) return null;
  const company = text.slice(0, index).trim();
  const title = text.slice(index + 2).trim();
  if (!company || !title) return null;
  return { company, title };
}

function stripFlags(value: string): string {
  return value.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim();
}

function eligibilityLocation(region: string, country: string): string {
  const countries = country
    .split(",")
    .map((part) => part.replace(/^and\s+/i, "").trim())
    .filter((part) => part && part.toLowerCase() !== "and");
  const openRegion = /anywhere|worldwide|\bworld\b/i.test(region);
  if (countries.length >= 2) return countries.join(", ");
  if (!openRegion) return region || country;
  return region || "Anywhere in the World";
}

function firstImage(html: string): string | null {
  const decoded = decodeHtml(html);
  const match = decoded.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || null;
}
