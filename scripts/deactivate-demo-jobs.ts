import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.job.updateMany({
    where: {
      OR: [
        { applicationUrl: { contains: "example.com" } },
        { applicationUrl: { contains: "example.org" } },
        { source: "manual", externalId: { startsWith: "seed-" } },
        { company: "Sample Co" },
      ],
      isActive: true,
    },
    data: { isActive: false },
  });
  console.log(`Deactivated ${result.count} demo/example.com jobs`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
