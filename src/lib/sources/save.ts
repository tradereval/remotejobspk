import { prisma } from "../db";
import { cleanJobDescriptionHtml } from "../types";
import { decodeHtml, excerptFrom, httpUrl, type KeepDecision } from "./keep";
import type { JobDraft } from "./types";

export function toDraft(
  decision: Extract<KeepDecision, { ok: true }>,
  input: {
    source: string;
    externalId: string;
    title: string;
    company: string;
    companyLogo?: string | null;
    descriptionHtml?: string | null;
    excerpt?: string | null;
    applicationUrl: string;
    salaryPeriod?: string | null;
    employmentType?: string | null;
    seniority?: string | null;
    location?: string | null;
    categories?: string[];
    publishedAt?: Date | null;
    expiresAt?: Date | null;
  },
): JobDraft {
  const description = cleanJobDescriptionHtml(decodeHtml(input.descriptionHtml || ""));
  const categories = [...new Set((input.categories || []).map((item) => item.trim()).filter(Boolean))].slice(0, 12);
  return {
    source: input.source,
    externalId: input.externalId,
    title: input.title.trim().slice(0, 300),
    company: input.company.trim().slice(0, 200),
    companyLogo: httpUrl(input.companyLogo),
    description,
    excerpt: excerptFrom(description, input.excerpt),
    applicationUrl: input.applicationUrl,
    sourceAttributionUrl: input.applicationUrl,
    salaryMin: decision.salaryMin,
    salaryMax: decision.salaryMax,
    salaryCurrency: decision.salaryCurrency,
    salaryPeriod: input.salaryPeriod || null,
    employmentType: input.employmentType || null,
    seniority: input.seniority?.trim().slice(0, 80) || null,
    locationRestrictions: JSON.stringify(input.location?.trim() ? [input.location.trim()] : []),
    categories: JSON.stringify(categories),
    eligibility: decision.eligibility,
    needsReview: decision.needsReview,
    publishedAt: input.publishedAt || new Date(),
    expiresAt: input.expiresAt || null,
    isActive: true,
  };
}

async function tuneSqlite() {
  const url = process.env.DATABASE_URL || "";
  if (!url.startsWith("file:")) return;
  try {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL");
    await prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout=30000");
  } catch (error) {
    console.error("SQLite tune skipped", error instanceof Error ? error.message : error);
  }
}

function dedupe(drafts: JobDraft[]): JobDraft[] {
  const unique = new Map<string, JobDraft>();
  for (const draft of drafts) unique.set(`${draft.source}\u0000${draft.externalId}`, draft);
  return [...unique.values()];
}

export async function saveJobDrafts(drafts: JobDraft[]): Promise<{ upserted: number; failed: number }> {
  const rows = dedupe(drafts);
  if (!rows.length) return { upserted: 0, failed: 0 };
  await tuneSqlite();
  let upserted = 0;
  let failed = 0;

  const writeOne = async (draft: JobDraft) => {
    const shared = {
      title: draft.title,
      company: draft.company,
      companyLogo: draft.companyLogo,
      description: draft.description,
      excerpt: draft.excerpt,
      applicationUrl: draft.applicationUrl,
      sourceAttributionUrl: draft.sourceAttributionUrl,
      salaryMin: draft.salaryMin,
      salaryMax: draft.salaryMax,
      salaryCurrency: draft.salaryCurrency,
      salaryPeriod: draft.salaryPeriod,
      employmentType: draft.employmentType,
      seniority: draft.seniority,
      locationRestrictions: draft.locationRestrictions,
      categories: draft.categories,
      eligibility: draft.eligibility,
      needsReview: draft.needsReview,
      publishedAt: draft.publishedAt,
      expiresAt: draft.expiresAt,
      isActive: draft.isActive,
    };
    await prisma.job.upsert({
      where: { source_externalId: { source: draft.source, externalId: draft.externalId } },
      create: {
        source: draft.source,
        externalId: draft.externalId,
        ...shared,
        skills: JSON.stringify([]),
        timezoneRestrictions: JSON.stringify([]),
        acceptsBeginners: false,
        isVerified: false,
      },
      update: shared,
    });
  };

  const chunkSize = 12;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    try {
      await prisma.$transaction(
        chunk.map((draft) => {
          const shared = {
            title: draft.title,
            company: draft.company,
            companyLogo: draft.companyLogo,
            description: draft.description,
            excerpt: draft.excerpt,
            applicationUrl: draft.applicationUrl,
            sourceAttributionUrl: draft.sourceAttributionUrl,
            salaryMin: draft.salaryMin,
            salaryMax: draft.salaryMax,
            salaryCurrency: draft.salaryCurrency,
            salaryPeriod: draft.salaryPeriod,
            employmentType: draft.employmentType,
            seniority: draft.seniority,
            locationRestrictions: draft.locationRestrictions,
            categories: draft.categories,
            eligibility: draft.eligibility,
            needsReview: draft.needsReview,
            publishedAt: draft.publishedAt,
            expiresAt: draft.expiresAt,
            isActive: draft.isActive,
          };
          return prisma.job.upsert({
            where: { source_externalId: { source: draft.source, externalId: draft.externalId } },
            create: {
              source: draft.source,
              externalId: draft.externalId,
              ...shared,
              skills: JSON.stringify([]),
              timezoneRestrictions: JSON.stringify([]),
              acceptsBeginners: false,
              isVerified: false,
            },
            update: shared,
          });
        }),
      );
      upserted += chunk.length;
    } catch (error) {
      console.error("Batch upsert failed, retrying one by one", error instanceof Error ? error.message : error);
      for (const draft of chunk) {
        try {
          await writeOne(draft);
          upserted += 1;
        } catch (one) {
          failed += 1;
          console.error("Failed job upsert", draft.source, draft.externalId, one instanceof Error ? one.message : one);
        }
      }
    }
  }

  return { upserted, failed };
}
