import { stripHtml } from "./types";

/** Phrases that mean the role is not a remote USD job. Matched case-insensitively. */
export const OFF_BOARD_PHRASES = [
  "PKR",
  "SAR salary",
  "rupee",
  "this is a hybrid",
  "hybrid role",
  "hybrid working",
  "hybrid work",
  "or onsite",
  "or on-site",
  "us only",
  "usa only",
  "united states only",
  "eu only",
  "uk only",
  "canada only",
  "europe only",
];

/** Title signals a local Pakistan role, not a worldwide remote job someone in Pakistan can take. */
export const LOCAL_PAKISTAN_TITLE = [
  "pakistan",
  "pakistani",
  "karachi",
  "lahore",
  "islamabad",
  "rawalpindi",
  "multan",
  "faisalabad",
  "peshawar",
  "quetta",
  "sindh",
];

export function textIsOffBoard(text: string): boolean {
  const blob = text.toLowerCase();
  return OFF_BOARD_PHRASES.some((phrase) => blob.includes(phrase.toLowerCase()));
}

export function isOffBoard(job: {
  title: string;
  excerpt?: string | null;
  description?: string | null;
  salaryCurrency?: string | null;
  eligibility?: string | null;
}): boolean {
  if (job.eligibility === "restricted") return true;
  if (job.salaryCurrency && job.salaryCurrency.toUpperCase() !== "USD") return true;
  const title = job.title.toLowerCase();
  if (LOCAL_PAKISTAN_TITLE.some((phrase) => title.includes(phrase))) return true;
  return textIsOffBoard(`${job.title}\n${job.excerpt || ""}\n${job.description || ""}`);
}

export function himalayasCompanyUrl(applicationUrl: string | null | undefined): string | null {
  if (!applicationUrl) return null;
  try {
    const url = new URL(applicationUrl);
    if (!url.hostname.endsWith("himalayas.app")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] !== "companies" || !parts[1]) return null;
    return `https://himalayas.app/companies/${parts[1]}`;
  } catch {
    return null;
  }
}

const DIRECT_HOST =
  /(^|\.)((greenhouse|boards\.greenhouse)\.io|lever\.co|ashbyhq\.com|jobs\.ashbyhq\.com|workable\.com|bamboohr\.com|recruitee\.com|smartrecruiters\.com|myworkdayjobs\.com)$/i;

/** Employer form URL when the description actually contains one. Himalayas links are not direct. */
export function directApplyUrl(description: string | null | undefined): string | null {
  if (!description) return null;
  const found = [
    ...description.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi),
    ...description.matchAll(/https?:\/\/[^\s"'<>]+/g),
  ].map((match) => match[1] || match[0]);

  for (const raw of found) {
    try {
      const url = new URL(raw.replace(/&amp;/g, "&"));
      if (url.hostname.endsWith("himalayas.app")) continue;
      const careers = /\/(apply|careers|jobs)(\/|$)/i.test(url.pathname);
      if (DIRECT_HOST.test(url.hostname) || careers) return url.toString();
    } catch {
      continue;
    }
  }
  return null;
}

const INTRO_MARKERS = [
  "about our client",
  "client company introduction",
  "about the company",
  "company introduction",
];

const INTRO_STOP =
  /\b(Job Summary|Role Overview|Key Responsibilities|About the role|What you(?:'|’)ll do|Requirements|Responsibilities)\b/i;

/** Company blurb from the listing, when the description includes one. */
export function companyIntro(description: string | null | undefined, company: string): string | null {
  const text = stripHtml(description || "");
  if (!text) return null;
  const lower = text.toLowerCase();
  const markers = [...INTRO_MARKERS, `about ${company.toLowerCase()}`];
  let start = -1;
  let markerLength = 0;
  for (const marker of markers) {
    const index = lower.indexOf(marker);
    if (index !== -1 && (start === -1 || index < start)) {
      start = index;
      markerLength = marker.length;
    }
  }
  if (start === -1) return null;
  let rest = text.slice(start + markerLength).replace(/^[\s:.\-–]+/, "");
  const stop = rest.search(INTRO_STOP);
  if (stop > 40) rest = rest.slice(0, stop);
  rest = rest.replace(/\s+/g, " ").trim();
  if (rest.length < 40) return null;
  if (rest.length <= 420) return rest;
  return `${rest.slice(0, 420).replace(/\s+\S*$/, "").trimEnd()}…`;
}
