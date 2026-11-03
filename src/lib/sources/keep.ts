import { LOCAL_PAKISTAN_TITLE } from "../board-rules";
import { stripHtml } from "../types";
import type { DropReason } from "./types";

const OPEN_PLACE = new Set([
  "anywhere",
  "anywhere in the world",
  "earth",
  "global",
  "work from anywhere",
  "world",
  "worldwide",
]);

const WORKPLACE_ONLY = new Set([
  "100% remote",
  "100 % remote",
  "fully remote",
  "remote",
  "remote job",
  "remote-only",
]);

/** Regions a person in Pakistan can work. A country list must name one of these. */
const PAKISTAN_REGION = new Set([
  "apac",
  "asia",
  "asia pacific",
  "asia-pacific",
  "pakistan",
  "pakistani",
  "south asia",
]);

const COUNTRY_RESTRICT: RegExp[] = [
  /\busa only\b/i,
  /\bu\.s\.a\. only\b/i,
  /\bu\.s\. only\b/i,
  /\bunited states only\b/i,
  /\bUS only\b/,
  /\bUS-only\b/i,
  /\beurope only\b/i,
  /\beu only\b/i,
  /\buk only\b/i,
  /\bu\.k\. only\b/i,
  /\bcanada only\b/i,
  /\bindia only\b/i,
  /\baustralia only\b/i,
  /\bgermany only\b/i,
  /\bnorth america only\b/i,
  /\blatin america only\b/i,
  /\blatam only\b/i,
  /\bemea only\b/i,
  /\bremote in (europe|the eu|the uk|the us|the usa|the united states|canada|germany|india|australia|latin america)\b/i,
  /\bremote\s*[-–]\s*(us|usa|uk|eu|europe)\b/i,
  /\bremote within (the )?(us|usa|uk|europe|eu|canada|germany|india|australia)\b/i,
  /\bmust be (located|based|resident|residing|living) in (the )?(us\b|u\.s\.|usa|united states|uk\b|united kingdom|europe|european union|eu\b|canada|india|australia|germany)/i,
  /\bmust (live|reside) in (the )?(us\b|u\.s\.|usa|united states|uk\b|united kingdom|europe|canada|india|australia|germany)/i,
  /\b(authorized|authorised) to work in the (us\b|u\.s\.|usa|united states|uk\b|eu\b)/i,
  /\b(us|u\.s\.|european|uk) time ?zones? only\b/i,
  /\bmust be (located|based) in (a )?(us|u\.s\.|european|uk) time ?zone/i,
  /\b(only|exclusively) (open to|hiring|considering) (candidates|applicants) (in|from) (the )?(us\b|usa|united states|uk\b|europe|eu\b|canada|india|australia)/i,
  /\bcandidates must be (in|based in) (the )?(us\b|usa|united states|uk\b|europe|canada)\b/i,
  /\bnot (open|available) (to|in) pakistan\b/i,
  /\b(cannot|can't|can not) (hire|employ) (in|from) pakistan\b/i,
  /\bdeutschlandweit\b/i,
  /\bnur in deutschland\b/i,
  /\bwithin (germany|the uk|the us|the united states|canada|india|australia|europe)\b/i,
  /\b(u\.s\.|us) citizenship\b/i,
  /\bmust be a u\.s\. citizen\b/i,
];

const TITLE_CLOSED_PLACE =
  /\b(latam|latin america|emea|northern california|southern california|bay area|new york|texas|ohio|canada|united kingdom|united states)\b/i;

const TITLE_ONSITE = /\b(wind turbine|field phlebotomy|field technician|field nurse|field supervisor)\b/i;

const NON_USD_PAY =
  /(?:€|£|₹)\s?\d|\d[\d,.]{0,12}\s?(?:€|£|₹)|\b(?:EUR|GBP|CAD|AUD|INR|PKR|SAR|AED|CHF|JPY|SGD|NZD|SEK|NOK|DKK|PLN|BRL|MXN|ZAR|CNY|HKD)\s?\$?\s?\d{2,}|\d[\d,.]{2,}\s?(?:EUR|GBP|CAD|AUD|INR|PKR|SAR|AED|CHF|JPY)\b|\b(?:salary|compensation|paid|pay|package)\b[^.\n]{0,48}\b(?:euros?|pounds sterling|rupees?|riyals?|EUR|GBP|CAD|AUD|INR|PKR|SAR)\b/i;

export type ListingInput = {
  title: string;
  description?: string | null;
  location?: string | null;
  remote?: boolean | null;
  salaryCurrency?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  expiresAt?: Date | null;
};

export type KeepDecision =
  | {
      ok: true;
      eligibility: "pakistan" | "worldwide";
      needsReview: boolean;
      salaryMin: number | null;
      salaryMax: number | null;
      salaryCurrency: "USD" | null;
    }
  | { ok: false; reason: DropReason };

export function decodeHtml(value: string): string {
  let text = value;
  for (let pass = 0; pass < 2; pass++) {
    const next = text
      .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&");
    if (next === text) break;
    text = next;
  }
  return text;
}

export function plainText(value: string | null | undefined): string {
  return stripHtml(decodeHtml(value || ""));
}

export function positiveMoney(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount);
}

function currencyKind(raw: string | null | undefined): "usd" | "other" | "none" {
  if (!raw || !String(raw).trim()) return "none";
  const text = String(raw).trim();
  if (text === "$" || text === "US$" || text === "USD$") return "usd";
  const letters = text.toUpperCase().replace(/[^A-Z]/g, "");
  if (!letters && !/[€£₹]/.test(text)) return "none";
  if (letters === "USD" || letters === "US") return "usd";
  return "other";
}

function locationTokens(location: string): string[] {
  return location
    .replace(/\s+/g, " ")
    .split(/[,;/|]+/)
    .map((part) => part.replace(/^and\s+/i, "").trim().toLowerCase())
    .filter((part) => part && part !== "and");
}

export function locationEligibility(location: string | null | undefined): {
  eligibility: "pakistan" | "worldwide" | "closed";
  explicit: boolean;
} {
  const tokens = locationTokens(location || "");
  if (!tokens.length) return { eligibility: "worldwide", explicit: false };
  if (tokens.some((token) => OPEN_PLACE.has(token))) return { eligibility: "worldwide", explicit: true };
  if (tokens.some((token) => PAKISTAN_REGION.has(token))) return { eligibility: "pakistan", explicit: true };
  if (tokens.every((token) => WORKPLACE_ONLY.has(token) || OPEN_PLACE.has(token))) {
    return { eligibility: "worldwide", explicit: true };
  }
  return { eligibility: "closed", explicit: true };
}

export function textRestrictsCountry(text: string): boolean {
  return COUNTRY_RESTRICT.some((pattern) => pattern.test(text));
}

export function workplaceIsOnsite(text: string): boolean {
  const hybridNeg = /\b(not|no|non|without)\s+hybrid\b/i.test(text);
  const onsiteNeg = /\b(not|no|non|without|never)\s+(?:an?\s+)?(?:on-?site|onsite|in-office)\b/i.test(text);
  const hybrid = /\bhybrid\b/i.test(text) && !hybridNeg;
  const onsite = /\b(on-?site|onsite|in-office|on site)\b/i.test(text) && !onsiteNeg;
  return hybrid || onsite;
}

export function statesNonUsd(text: string): boolean {
  return NON_USD_PAY.test(text);
}

function localPakistanTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return LOCAL_PAKISTAN_TITLE.some((phrase) => lower.includes(phrase));
}

export function decideListing(input: ListingInput): KeepDecision {
  if (input.expiresAt && input.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  const description = plainText(input.description);
  const blob = `${input.title}\n${description}`;
  if (input.remote === false || workplaceIsOnsite(blob) || TITLE_ONSITE.test(input.title)) {
    return { ok: false, reason: "onsite" };
  }
  const stated = currencyKind(input.salaryCurrency);
  if (stated === "other" || statesNonUsd(blob)) {
    return { ok: false, reason: "non_usd" };
  }
  const titleAllowsPakistan = /\b(apac|pakistan|south asia|worldwide|anywhere)\b/i.test(input.title);
  if (
    localPakistanTitle(input.title) ||
    textRestrictsCountry(`${input.title}\n${input.location || ""}\n${description}`) ||
    (TITLE_CLOSED_PLACE.test(input.title) && !titleAllowsPakistan)
  ) {
    return { ok: false, reason: "wrong_country" };
  }
  const place = locationEligibility(input.location);
  const titleSaysWorldwide = /\b(remote[-\s]+worldwide|worldwide remote|work from anywhere)\b/i.test(input.title);
  if (place.eligibility === "closed" && !titleSaysWorldwide) {
    return { ok: false, reason: "wrong_country" };
  }
  const salaryMin = stated === "usd" ? positiveMoney(input.salaryMin) : null;
  const salaryMax = stated === "usd" ? positiveMoney(input.salaryMax) : null;
  let eligibility: "pakistan" | "worldwide" = place.eligibility === "closed" ? "worldwide" : place.eligibility;
  const namedForPakistan = /\b(apac|pakistan|pakistani|south asia|asia-pacific|asia pacific)\b/i.test(
    `${input.title}\n${input.location || ""}`,
  );
  const namedWorldwide = /\b(worldwide|anywhere|work from anywhere|global)\b/i.test(`${input.title}\n${input.location || ""}`);
  if (eligibility === "worldwide" && namedForPakistan && !namedWorldwide) eligibility = "pakistan";
  return {
    ok: true,
    eligibility,
    needsReview: place.eligibility === "closed" ? false : !place.explicit,
    salaryMin,
    salaryMax,
    salaryCurrency: salaryMin || salaryMax ? "USD" : null,
  };
}

export function employmentType(values: Array<string | null | undefined>): string | null {
  const blob = values.filter(Boolean).join(" ").toLowerCase();
  if (!blob) return null;
  if (/intern/.test(blob)) return "Internship";
  if (/part[- ]?time/.test(blob)) return "Part-Time";
  if (/freelance/.test(blob)) return "Freelance";
  if (/contract/.test(blob)) return "Contractor";
  if (/full[- ]?time/.test(blob)) return "Full-Time";
  return null;
}

export function httpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function excerptFrom(description: string | null | undefined, fallback?: string | null): string | null {
  const text = plainText(fallback) || plainText(description);
  if (!text) return null;
  if (text.length <= 280) return text;
  return `${text.slice(0, 280).replace(/\s+\S*$/, "").trimEnd()}…`;
}

export function parseFeedDate(value: string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return parseFeedDate(Number(trimmed));
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}
