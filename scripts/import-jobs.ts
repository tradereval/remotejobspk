import { prisma } from "../src/lib/db";
import { importHimalayasJobs } from "../src/lib/himalayas";
import { buildJobWhere } from "../src/lib/jobs";

async function main() {
  console.log("Importing Himalayas jobs (PK + worldwide, until each search feed ends)...");
  const result = await importHimalayasJobs();
  const [board, active, grouped] = await Promise.all([
    prisma.job.count({ where: buildJobWhere({}) }),
    prisma.job.count({ where: { isActive: true } }),
    prisma.job.groupBy({
      by: ["eligibility"],
      where: { source: "himalayas", isActive: true },
      _count: true,
    }),
  ]);
  console.log(JSON.stringify({ ...result, active, board, byEligibility: grouped }));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
