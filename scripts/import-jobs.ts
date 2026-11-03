import { prisma } from "../src/lib/db";
import { importHimalayasJobs } from "../src/lib/himalayas";
import { importPublicJobSources, jobCountSummary } from "../src/lib/sources/import-public";
import { SKIPPED_JOB_SOURCES } from "../src/lib/sources/skipped";

const PUBLIC = ["remoteok", "jobicy", "weworkremotely", "arbeitnow"];

async function main() {
  const args = process.argv.slice(2);
  const runAll = args.length === 0;
  const wantHimalayas = runAll || args.includes("himalayas");
  const publicOnly = runAll ? undefined : args.filter((name) => PUBLIC.includes(name));

  const sources = [];
  if (wantHimalayas) {
    console.log("Importing Himalayas jobs (PK + worldwide, until each search feed ends)...");
    const himalayas = await importHimalayasJobs();
    sources.push({ source: "himalayas", ...himalayas });
  }
  if (runAll || (publicOnly && publicOnly.length)) {
    const extra = await importPublicJobSources({ only: publicOnly });
    sources.push(...extra.sources);
  }

  const counts = await jobCountSummary();
  console.log(JSON.stringify({ sources, skipped: SKIPPED_JOB_SOURCES, ...counts }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
