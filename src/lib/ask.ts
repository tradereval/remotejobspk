import type { Job } from "@prisma/client";
import { prisma } from "./db";
import { buildJobWhere } from "./jobs";

export type AskIntent = {
  raw: string;
  roleLabel: string;
  terms: string[];
  years: number | null;
  minMonthlyUsd: number | null;
  summary: string;
};

type Skill = { name: string; test: RegExp; title: RegExp; needle: string };
type Role = {
  test: RegExp;
  label: string;
  title: RegExp;
  reject?: RegExp;
  needles: string[];
};

const SKILLS: Skill[] = [
  { name: "React", test: /\breact\b/i, title: /\breact\b/i, needle: "react" },
  { name: "Next.js", test: /\bnext\.?js\b/i, title: /next\.?js/i, needle: "next.js" },
  { name: "Vue", test: /\bvue\b/i, title: /\bvue\b/i, needle: "vue" },
  { name: "Angular", test: /\bangular\b/i, title: /\bangular\b/i, needle: "angular" },
  { name: "Python", test: /\bpython\b/i, title: /\bpython\b/i, needle: "python" },
  { name: "Django", test: /\bdjango\b/i, title: /\bdjango\b/i, needle: "django" },
  { name: "Java", test: /\bjava\b/i, title: /\bjava\b/i, needle: "java" },
  { name: "Node", test: /\bnode(?:\.js)?\b/i, title: /\bnode(?:\.js)?\b/i, needle: "node" },
  { name: "PHP", test: /\bphp\b/i, title: /\bphp\b/i, needle: "php" },
  { name: "Flutter", test: /\bflutter\b/i, title: /\bflutter\b/i, needle: "flutter" },
  { name: "iOS", test: /\bios\b/i, title: /\bios\b/i, needle: "ios" },
  { name: "Android", test: /\bandroid\b/i, title: /\bandroid\b/i, needle: "android" },
  { name: "Go", test: /\bgolang\b|\bgo developer\b/i, title: /\bgolang\b|\bgo\b/i, needle: "golang" },
  { name: "Rust", test: /\brust\b/i, title: /\brust\b/i, needle: "rust" },
  { name: "Salesforce", test: /\bsalesforce\b/i, title: /\bsalesforce\b/i, needle: "salesforce" },
  { name: "WordPress", test: /\bwordpress\b/i, title: /\bwordpress\b/i, needle: "wordpress" },
];

const ROLES: Role[] = [
  {
    test: /call\s*cent(?:er|re)|contact\s*cent(?:er|re)|\bbpo\b|customer\s*support|customer\s*service|help\s*desk|helpdesk|support\s*agent/,
    label: "Call center / customer support",
    title:
      /\b(customer (support|service|care)|call cent(?:er|re)|contact cent(?:er|re)|help ?desk|support (agent|representative|specialist|rep))\b|\bbpo\b/i,
    reject: /\b(engineer|developer|designer|scientist|architect|technical support|it support|licensed insurance)\b/i,
    needles: [
      "customer support",
      "customer service",
      "customer care",
      "call center",
      "call centre",
      "contact center",
      "help desk",
      "helpdesk",
    ],
  },
  {
    test: /\b(design|designer|ui|ux)\b/,
    label: "Design",
    title: /\b(designer|ui\/ux|ux\/ui)\b/i,
    reject: /\bengineer\b/i,
    needles: ["designer", "ui/ux", "ux/ui"],
  },
  {
    test: /\b(sales|sdr|account executive|business development)\b/,
    label: "Sales",
    title: /\b(sales|sdr|account executive|business development)\b/i,
    reject: /\bengineer\b/i,
    needles: ["sales", "sdr", "account executive", "business development"],
  },
  {
    test: /\b(market(?:ing|er)?|seo)\b/,
    label: "Marketing",
    title: /\b(marketing|seo|content marketing|social media|growth)\b/i,
    reject: /\b(video editor|designer|developer|engineer)\b/i,
    needles: ["marketing", "seo", "content marketing", "social media"],
  },
  {
    test: /\b(writer|writing|copywriter|editor)\b/,
    label: "Writing",
    title: /\b(writer|copywriter|copy writer|editor)\b/i,
    reject: /\bvideo editor\b/i,
    needles: ["writer", "copywriter", "editor"],
  },
  {
    test: /\b(accountant|accounting|bookkeeper|finance|cfo)\b/,
    label: "Accounting",
    title: /\b(accountant|accounting|bookkeeper|book-keeper|accounts payable|accounts receivable|finance manager|financial analyst|cfo)\b/i,
    reject: /\b(sales|account executive|research)\b/i,
    needles: ["accountant", "accounting", "bookkeeper"],
  },
  {
    test: /\b(recruiter|recruiting|talent)\b|\bhr\b|human resources/,
    label: "HR",
    title: /\b(recruiter|recruiting|talent acquisition|human resources|\bhr\b)\b/i,
    needles: ["recruiter", "recruiting", "talent acquisition", "human resources"],
  },
  {
    test: /\b(data|analyst|analytics)\b/,
    label: "Data",
    title: /\b(data analyst|data scientist|data engineer|analytics|business intelligence)\b/i,
    needles: ["data analyst", "data scientist", "data engineer", "analytics"],
  },
  {
    test: /\b(virtual assistant|\bva\b|executive assistant)\b/,
    label: "Virtual assistant",
    title: /\b(virtual assistant|executive assistant|administrative assistant|personal assistant)\b/i,
    reject: /\b(designer|developer|engineer)\b/i,
    needles: ["virtual assistant", "executive assistant", "administrative assistant"],
  },
  {
    test: /\bproduct manager\b|\bproduct owner\b/,
    label: "Product",
    title: /\b(product manager|product owner|product management)\b/i,
    needles: ["product manager", "product owner"],
  },
  {
    test: /\b(developer|engineer|engineering|programmer|software)\b/,
    label: "Software",
    title:
      /\b(software (engineer|developer)|web developer|full[\s-]?stack|front[\s-]?end|back[\s-]?end)\b/i,
    reject: /\b(mechanical|civil|electrical|chemical|hardware|sales engineer|support engineer)\b/i,
    needles: ["software engineer", "software developer", "full stack", "fullstack", "frontend", "front-end", "backend", "back-end", "web developer"],
  },
];

const LANGUAGES = [
  "thai",
  "japanese",
  "korean",
  "mandarin",
  "cantonese",
  "german",
  "french",
  "spanish",
  "portuguese",
  "arabic",
  "hindi",
  "dutch",
  "italian",
  "chinese",
  "vietnamese",
  "indonesian",
  "tagalog",
  "polish",
  "russian",
  "turkish",
];

const OTHER_COUNTRIES = [
  "india",
  "philippines",
  "kenya",
  "nigeria",
  "brazil",
  "mexico",
  "colombia",
  "argentina",
  "latam",
  "south africa",
];

const STOP = new Set([
  "i",
  "im",
  "am",
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "for",
  "of",
  "in",
  "on",
  "with",
  "my",
  "me",
  "want",
  "wants",
  "looking",
  "find",
  "good",
  "which",
  "that",
  "this",
  "at",
  "least",
  "atleast",
  "pays",
  "pay",
  "paid",
  "salary",
  "job",
  "jobs",
  "role",
  "roles",
  "remote",
  "work",
  "working",
  "experience",
  "experienced",
  "years",
  "year",
  "yrs",
  "usd",
  "dollar",
  "dollars",
  "month",
  "monthly",
  "yearly",
  "annual",
  "per",
  "than",
  "more",
  "need",
  "please",
  "from",
  "have",
  "has",
  "been",
  "who",
  "what",
  "kind",
  "agent",
]);

export function parseAsk(raw: string): AskIntent {
  const text = raw.replace(/\s+/g, " ").trim().slice(0, 500);
  const lower = text.toLowerCase();
  const skills = SKILLS.filter((skill) => skill.test.test(text));
  const role = ROLES.find((item) => item.test.test(lower));
  const yearsMatch = lower.match(/(\d{1,2})\s*\+?\s*(?:years|yrs|year)\b/);
  const years = yearsMatch ? Number(yearsMatch[1]) : null;
  const minMonthlyUsd = monthlyFloor(lower);
  const builder = /\b(developer|engineer|programmer|software)\b/.test(lower);

  let terms: string[] = [];
  let roleLabel = "Remote role";
  if (skills.length && (builder || !role || role.label === "Software")) {
    terms = skills.map((skill) => skill.needle);
    roleLabel = skills.length === 1 && builder ? `${skills[0].name} developer` : skills.map((skill) => skill.name).join(" / ");
  } else if (role) {
    terms = role.needles;
    roleLabel = role.label;
  } else {
    terms = lower
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 4 && !STOP.has(word) && !/^\d+$/.test(word))
      .slice(0, 3);
    if (terms.length) roleLabel = terms.join(" ");
  }

  const bits = [roleLabel];
  if (years) bits.push(`${years} years`);
  if (minMonthlyUsd) bits.push(`at least $${minMonthlyUsd.toLocaleString()} / month`);

  return {
    raw: text,
    roleLabel,
    terms,
    years,
    minMonthlyUsd,
    summary: bits.join(" · "),
  };
}

function monthlyFloor(lower: string): number | null {
  const match =
    lower.match(/\$\s*(\d+(?:\.\d+)?)\s*(k)?/) ||
    lower.match(/(\d+(?:\.\d+)?)\s*(k)?\s*(?:usd|dollars?)/) ||
    lower.match(/(\d+(?:\.\d+)?)\s*\$/);
  if (!match) return null;
  let amount = Number(match[1]);
  if (match[2] === "k") amount *= 1000;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  if (/\b(per hour|an hour|hourly|\/hr|\/hour)\b/.test(lower)) return Math.round(amount * 160);
  if (/\b(per year|a year|yearly|annual|annually|\/yr|\/year)\b/.test(lower)) return Math.round(amount / 12);
  if (/\b(per month|a month|monthly|\/mo|\/month)\b/.test(lower)) return Math.round(amount);
  if (amount >= 8000) return Math.round(amount / 12);
  if (amount <= 80) return Math.round(amount * 160);
  return Math.round(amount);
}

export function monthlyUsd(job: {
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
}): number | null {
  if (job.salaryCurrency && job.salaryCurrency.toUpperCase() !== "USD") return null;
  const amount = job.salaryMax || job.salaryMin;
  if (!amount || amount <= 0) return null;
  const period = (job.salaryPeriod || "").toLowerCase();
  if (period.includes("hour")) return Math.round(amount * 160);
  if (period.includes("year") || period.includes("annual")) return Math.round(amount / 12);
  if (period.includes("week")) return Math.round(amount * 4);
  if (period.includes("day")) return Math.round(amount * 20);
  if (period.includes("month")) return amount;
  if (amount >= 20000) return Math.round(amount / 12);
  if (amount <= 150) return Math.round(amount * 160);
  return amount;
}

function isJunior(job: { title: string; seniority?: string | null }): boolean {
  return /\b(junior|entry|intern|internship|graduate|trainee)\b/i.test(`${job.title} ${job.seniority || ""}`);
}

function asksFor(raw: string, word: string): boolean {
  return raw.toLowerCase().includes(word);
}

/** A title that demands another language, or names another country and not Pakistan. */
function wrongAudience(title: string, ask: string): boolean {
  const lower = title.toLowerCase();
  if (LANGUAGES.some((language) => lower.includes(language) && !asksFor(ask, language))) {
    if (/\b(speaker|speaking|fluent|native|language)\b/i.test(title)) return true;
  }
  if (/\bpakistan\b/i.test(title)) return false;
  const foreignNeed = title.match(
    /\b(latvian|lithuanian|estonian|polish|german|french|spanish|dutch|swedish|norwegian|danish|finnish|italian|portuguese|brazilian|mexican)\b.{0,30}\b(tax|law|license|licence|speaker|speaking|citizen|resident)\b/i,
  );
  if (foreignNeed && !asksFor(ask, foreignNeed[1].toLowerCase())) return true;
  return OTHER_COUNTRIES.some((country) => lower.includes(country) && !asksFor(ask, country));
}

function titleFits(title: string, intent: AskIntent): boolean {
  if (wrongAudience(title, intent.raw)) return false;
  const skills = SKILLS.filter((skill) => skill.test.test(intent.raw));
  const role = ROLES.find((item) => item.test.test(intent.raw.toLowerCase()));
  const builder = /\b(developer|engineer|programmer|software)\b/i.test(intent.raw);

  if (skills.length && (builder || !role || role.label === "Software")) {
    const hasSkill = skills.some((skill) => skill.title.test(title));
    if (!hasSkill) return false;
    if (builder && !/\b(developer|engineer|full[\s-]?stack|front[\s-]?end|back[\s-]?end)\b/i.test(title)) return false;
    if (/\b(mechanical|civil|electrical|chemical|hardware)\b/i.test(title)) return false;
    return true;
  }

  if (role) {
    if (role.reject?.test(title)) return false;
    return role.title.test(title);
  }

  if (!intent.terms.length) return false;
  const lower = title.toLowerCase();
  return intent.terms.every((term) => lower.includes(term));
}

function seniorityScore(job: { title: string; seniority?: string | null }, years: number | null): number {
  const blob = `${job.title} ${job.seniority || ""}`.toLowerCase();
  if (/\b(lead|principal|head|director|manager)\b/.test(blob)) return years && years >= 8 ? 3 : 1;
  if (/\b(senior|sr\.?)\b/.test(blob)) return years && years >= 5 ? 2 : 1;
  return 0;
}

export async function matchAsk(raw: string): Promise<{
  intent: AskIntent;
  jobs: Job[];
  total: number;
  payMet: boolean;
}> {
  const intent = parseAsk(raw);
  const where = buildJobWhere({});
  const and = Array.isArray(where.AND) ? [...where.AND] : where.AND ? [where.AND] : [];
  if (intent.terms.length) {
    and.push({
      OR: intent.terms.map((term) => ({ title: { contains: term } })),
    });
  }
  if (and.length) where.AND = and;

  const candidates = intent.terms.length
    ? await prisma.job.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }],
        take: 400,
      })
    : [];

  const experienced = intent.years != null && intent.years >= 3;
  let pool = candidates.filter((job) => titleFits(job.title, intent));
  if (experienced) pool = pool.filter((job) => !isJunior(job));

  let meetingPay = pool;
  if (intent.minMonthlyUsd) {
    meetingPay = pool.filter((job) => {
      const monthly = monthlyUsd(job);
      return monthly != null && monthly >= intent.minMonthlyUsd!;
    });
  }
  const payMet = !intent.minMonthlyUsd || meetingPay.length > 0;
  pool = payMet ? meetingPay : pool;

  pool.sort((a, b) => {
    const senior = seniorityScore(b, intent.years) - seniorityScore(a, intent.years);
    if (senior) return senior;
    const pay = (monthlyUsd(b) || 0) - (monthlyUsd(a) || 0);
    if (pay) return pay;
    return (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0);
  });

  return { intent, jobs: pool.slice(0, 24), total: pool.length, payMet };
}

export function jobsAskPath(ask: string): string {
  return `/jobs?ask=${encodeURIComponent(ask.slice(0, 500))}`;
}
