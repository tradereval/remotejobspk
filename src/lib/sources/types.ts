export type DropReason = "onsite" | "non_usd" | "wrong_country" | "expired";

export type DropCounts = Record<DropReason, number>;

export type SourceImportReport = {
  source: string;
  fetched: number;
  kept: number;
  dropped: DropCounts;
  upserted: number;
  failed: number;
  note?: string;
};

export function emptyDrops(): DropCounts {
  return { onsite: 0, non_usd: 0, wrong_country: 0, expired: 0 };
}

export function emptyReport(source: string): SourceImportReport {
  return {
    source,
    fetched: 0,
    kept: 0,
    dropped: emptyDrops(),
    upserted: 0,
    failed: 0,
  };
}

export type JobDraft = {
  source: string;
  externalId: string;
  title: string;
  company: string;
  companyLogo: string | null;
  description: string | null;
  excerpt: string | null;
  applicationUrl: string;
  sourceAttributionUrl: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  employmentType: string | null;
  seniority: string | null;
  locationRestrictions: string;
  categories: string;
  eligibility: "pakistan" | "worldwide";
  needsReview: boolean;
  publishedAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
};
