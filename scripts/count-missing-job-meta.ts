import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const missing = await prisma.job.count({
    where: {
      isActive: true,
      OR: [{ employmentType: null }, { employmentType: "" }],
    },
  });
  process.stdout.write(String(missing));
}

main()
  .catch(() => process.stdout.write("9999"))
  .finally(async () => {
    await prisma.$disconnect();
  });
