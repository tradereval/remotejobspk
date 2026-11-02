import { importHimalayasJobs } from "../src/lib/himalayas";

async function main() {
  console.log("Importing Himalayas jobs (PK + worldwide)...");
  const result = await importHimalayasJobs({ maxPages: 12 });
  console.log(result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
