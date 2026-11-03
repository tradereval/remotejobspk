import { prisma } from "../src/lib/db";
import { importHimalayasJobs } from "../src/lib/himalayas";
import { buildJobWhere } from "../src/lib/jobs";

async function main() {
  console.log("Importing Himalayas jobs (PK + worldwide, until the API ends)...");
  const result = await importHimalayasJobs();
  const [board, active] = await Promise.all([
    prisma.job.count({ where: buildJobWhere({}) }),
    prisma.job.count({ where: { isActive: true } }),
  ]);
  console.log(JSON.stringify({ ...result, active, board }));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
