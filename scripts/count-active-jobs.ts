import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.job.count({ where: { isActive: true } });
    process.stdout.write(String(count));
  } catch {
    process.stdout.write("0");
  } finally {
    await prisma.$disconnect();
  }
}

main();
