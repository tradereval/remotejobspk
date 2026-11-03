import { Prisma } from "@prisma/client";
import { LOCAL_PAKISTAN_TITLE, OFF_BOARD_PHRASES } from "./board-rules";
import { prisma } from "./db";
import { parseJsonArray, type JobFilters } from "./types";

const PAGE_SIZE = 20;

const SYNONYM_GROUPS = [
  ["support", "service", "services"],
  ["engineer", "engineering", "developer"],
  ["writer", "writing"],
];

/** Turn a typed word into a few substrings that still hit real titles. */
export function searchNeedles(word: string): string[] {
  const lower = word.toLowerCase().replace(/[^a-z0-9+]/g, "");
  if (lower.length < 2) return [];
  const needles = new Set<string>([lower]);
  const collapsed = lower.replace(/(.)\1+/g, "$1");
  if (collapsed.length >= 3) needles.add(collapsed);
  if (lower.length >= 6) needles.add(lower.slice(0, 6));
  if (collapsed.length >= 6) needles.add(collapsed.slice(0, 6));
  for (const group of SYNONYM_GROUPS) {
    const hit = group.some(
      (item) => item === lower || item === collapsed || lower.startsWith(item.slice(0, Math.min(6, item.length))),
    );
    if (hit) for (const item of group) needles.add(item);
  }
  return [...needles].filter((needle) => needle.length >= 3);
}

const CATEGORY_NEEDLES: Record<string, string[]> = {
  Developer: ["Developer", "Engineer", "Engineering"],
  "Customer Support": ["Support", "Customer-Service", "Customer Success", "Service"],
  Writing: ["Writer", "Copywriter", "Editor"],
  HR: ["HR", "Recruit"],
  Management: ["Management", "Manager"],
  DevOps: ["DevOps", "SRE"],
};

function looseMatch(needle: string): Prisma.JobWhereInput[] {
  return [
    { title: { contains: needle } },
    { company: { contains: needle } },
    { categories: { contains: needle } },
    { skills: { contains: needle } },
  ];
}

const hiddenDemo: Prisma.JobWhereInput = {
  OR: [
    { applicationUrl: { contains: "example.com" } },
    { applicationUrl: { contains: "example.org" } },
    { applicationUrl: { contains: "example.net" } },
    { externalId: { startsWith: "seed-" } },
  ],
};

/** Remote USD board: drop restricted, non-USD pay, PKR/SAR, and roles that are hybrid or onsite. */
const boardExcludeWhere: Prisma.JobWhereInput = {
  OR: [
    { eligibility: "restricted" },
    {
      AND: [
        { salaryCurrency: { not: null } },
        { NOT: { salaryCurrency: { in: ["USD", "usd", "Usd"] } } },
      ],
    },
    ...OFF_BOARD_PHRASES.flatMap((phrase) => [
      { title: { contains: phrase } },
      { excerpt: { contains: phrase } },
      { description: { contains: phrase } },
    ]),
    ...LOCAL_PAKISTAN_TITLE.map((phrase) => ({ title: { contains: phrase } })),
  ],
};

const visibleBoard: Prisma.JobWhereInput = {
  isActive: true,
  NOT: [hiddenDemo, boardExcludeWhere],
};

export function buildJobWhere(
  filters: JobFilters,
  opts?: { premium?: boolean; publishedAfter?: Date },
): Prisma.JobWhereInput {
  const where: Prisma.JobWhereInput = { ...visibleBoard };
  const and: Prisma.JobWhereInput[] = [];

  if (filters.q) {
    for (const word of filters.q.split(/\s+/)) {
      const needles = searchNeedles(word);
      if (!needles.length) continue;
      and.push({
        OR: [
          ...needles.flatMap(looseMatch),
          { excerpt: { contains: word } },
          { description: { contains: word } },
        ],
      });
    }
  }

  if (filters.eligibility === "worldwide" || filters.eligibility === "pakistan") {
    where.eligibility = filters.eligibility;
  } else {
    where.eligibility = { in: ["pakistan", "worldwide"] };
  }

  if (filters.category) {
    const needles = CATEGORY_NEEDLES[filters.category] || [filters.category];
    and.push({ OR: needles.flatMap(looseMatch) });
  }
  if (filters.seniority) where.seniority = { contains: filters.seniority };
  if (filters.employmentType) where.employmentType = { contains: filters.employmentType };

  if (filters.salaryMin && filters.salaryMin > 0) {
    and.push({
      OR: [
        { salaryMin: { gte: filters.salaryMin } },
        { salaryMax: { gte: filters.salaryMin } },
      ],
    });
  }

  if (filters.verifiedOnly) where.isVerified = true;
  if (filters.beginners) where.acceptsBeginners = true;

  if (opts?.publishedAfter) {
    const since = opts.publishedAfter;
    and.push({
      OR: [
        { publishedAt: { gt: since } },
        { AND: [{ publishedAt: null }, { createdAt: { gt: since } }] },
      ],
    });
  }

  if (and.length) where.AND = and;
  return where;
}

export async function listJobs(filters: JobFilters, opts?: { premium?: boolean }) {
  const page = Math.max(1, filters.page || 1);
  const where = buildJobWhere(filters, opts);

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return {
    jobs,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

const publicJobWhere: Prisma.JobWhereInput = visibleBoard;

const CATEGORY_SKIP = new Set([
  "full-time",
  "part-time",
  "contractor",
  "freelance",
  "internship",
  "full time",
  "part time",
]);

export async function listBoardCategories(): Promise<string[]> {
  const rows = await prisma.job.findMany({
    where: publicJobWhere,
    select: { categories: true },
  });
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const raw of parseJsonArray(row.categories)) {
      const name = raw.trim();
      if (!name || name.length > 40 || CATEGORY_SKIP.has(name.toLowerCase())) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);
}

export async function getJobStats() {
  const [active, pakistan, worldwide, verified, categories] = await Promise.all([
    prisma.job.count({ where: publicJobWhere }),
    prisma.job.count({ where: { ...publicJobWhere, eligibility: "pakistan" } }),
    prisma.job.count({ where: { ...publicJobWhere, eligibility: "worldwide" } }),
    prisma.job.count({ where: { ...publicJobWhere, isVerified: true } }),
    listBoardCategories(),
  ]);
  return { active, pakistan, worldwide, verified, categories: categories.length };
}
