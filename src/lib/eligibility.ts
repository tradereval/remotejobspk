import type { Eligibility } from "./types";

const PK_POSITIVE = [
  "pakistan",
  "pakistani",
  "south asia",
  "south asian",
  "asia",
  "worldwide",
  "anywhere",
  "global",
  "work from anywhere",
  "remote anywhere",
];

const RESTRICT_NEGATIVE = [
  "us only",
  "usa only",
  "united states only",
  "must be in the us",
  "must be based in the us",
  "eu only",
  "europe only",
  "uk only",
  "canada only",
  "must live in",
  "authorized to work in the us",
  "us work authorization",
  "gstin",
  "onsite",
  "on-site",
  "hybrid",
];

export function scoreEligibility(input: {
  locationRestrictions?: string[] | string | null;
  timezoneRestrictions?: string[] | string | null;
  countries?: string[] | string | null;
  description?: string | null;
  title?: string | null;
  forceCountry?: string | null;
}): { eligibility: Eligibility; needsReview: boolean } {
  if (input.forceCountry?.toLowerCase() === "pk" || input.forceCountry?.toLowerCase() === "pakistan") {
    return { eligibility: "pakistan", needsReview: false };
  }

  const blob = [
    flatten(input.locationRestrictions),
    flatten(input.timezoneRestrictions),
    flatten(input.countries),
    input.description || "",
    input.title || "",
  ]
    .join(" ")
    .toLowerCase();

  if (RESTRICT_NEGATIVE.some((n) => blob.includes(n))) {
    return { eligibility: "restricted", needsReview: true };
  }

  const countries = flatten(input.countries).toLowerCase();
  if (countries.includes("pakistan") || countries.includes("pk")) {
    return { eligibility: "pakistan", needsReview: false };
  }

  const locations = flatten(input.locationRestrictions).toLowerCase();
  if (!locations || locations.includes("worldwide") || locations.includes("anywhere") || locations.includes("global")) {
    if (PK_POSITIVE.some((p) => blob.includes(p)) || !locations) {
      // Empty location often means worldwide on Himalayas worldwide filter
      if (!locations || locations.includes("worldwide") || locations.includes("anywhere")) {
        return { eligibility: "worldwide", needsReview: false };
      }
    }
  }

  if (PK_POSITIVE.some((p) => blob.includes(p))) {
    return { eligibility: "worldwide", needsReview: true };
  }

  return { eligibility: "unknown", needsReview: true };
}

function flatten(value: string[] | string | null | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(" ");
  return value;
}

export function eligibilityLabel(eligibility: Eligibility): string {
  switch (eligibility) {
    case "pakistan":
      return "Accepts Pakistan";
    case "worldwide":
      return "Worldwide remote";
    case "restricted":
      return "Restricted";
    default:
      return "Unverified";
  }
}
