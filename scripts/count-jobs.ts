import { prisma } from "../src/lib/db";

async function main() {
  const active = await prisma.job.count({ where: { isActive: true } });
  const groups = await prisma.job.groupBy({
    by: ["eligibility"],
    where: { isActive: true },
    _count: true,
  });
  console.log({ active, groups });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
