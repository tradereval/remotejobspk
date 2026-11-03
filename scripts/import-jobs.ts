import fs from "fs";
import { prisma } from "../src/lib/db";

const importLog = process.env.IMPORT_LOG;
if (importLog) {
  const mirror = (write: (...args: unknown[]) => void) => (...args: unknown[]) => {
    write(...args);
    fs.appendFileSync(importLog, `${args.map(String).join(" ")}\n`);
  };
  console.log = mirror(console.log.bind(console));
  console.error = mirror(console.error.bind(console));
}
import { importHimalayasJobs } from "../src/lib/himalayas";
import { buildJobWhere } from "../src/lib/jobs";

async function main() {
  console.log("Importing Himalayas jobs (Pakistan, worldwide, then the full browse catalog)...");
  const result = await importHimalayasJobs();
  const [board, active, grouped] = await Promise.all([
    prisma.job.count({ where: buildJobWhere({}) }),
    prisma.job.count({ where: { isActive: true } }),
    prisma.job.groupBy({
      by: ["eligibility"],
      where: { source: "himalayas" },
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
