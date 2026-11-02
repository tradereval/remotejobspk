import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { JobFilters } from "./types";

const PAGE_SIZE = 20;

export async function listJobs(filters: JobFilters, opts?: { premium?: boolean }) {
  const page = Math.max(1, filters.page || 1);
  const where: Prisma.JobWhereInput = {
    isActive: true,
    // Hide placeholder docs-domain apply links from the public board
    NOT: {
      OR: [
        { applicationUrl: { contains: "example.com" } },
        { applicationUrl: { contains: "example.org" } },
      ],
    },
  };

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q } },
      { company: { contains: filters.q } },
      { excerpt: { contains: filters.q } },
      { categories: { contains: filters.q } },
    ];
  }

  if (filters.eligibility === "pk_ready") {
    where.eligibility = { in: ["pakistan", "worldwide"] };
  } else if (filters.eligibility) {
    where.eligibility = filters.eligibility;
  } else {
    // Default public board: Pakistan + Worldwide (hide restricted)
    where.eligibility = { in: ["pakistan", "worldwide", "unknown"] };
  }

  if (filters.category) {
    where.categories = { contains: filters.category };
  }

  if (filters.seniority) {
    where.seniority = { contains: filters.seniority };
  }

  if (opts?.premium) {
    if (filters.verifiedOnly) where.isVerified = true;
    if (filters.beginners) where.acceptsBeginners = true;
  }

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

const publicJobWhere: Prisma.JobWhereInput = {
  isActive: true,
  NOT: {
    OR: [
      { applicationUrl: { contains: "example.com" } },
      { applicationUrl: { contains: "example.org" } },
    ],
  },
};

export async function getJobStats() {
  const [active, pakistan, worldwide, verified] = await Promise.all([
    prisma.job.count({ where: publicJobWhere }),
    prisma.job.count({ where: { ...publicJobWhere, eligibility: "pakistan" } }),
    prisma.job.count({ where: { ...publicJobWhere, eligibility: "worldwide" } }),
    prisma.job.count({ where: { ...publicJobWhere, isVerified: true } }),
  ]);
  return { active, pakistan, worldwide, verified };
}
