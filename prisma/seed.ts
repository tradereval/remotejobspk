import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@remotejobspk.com";
  const password = process.env.ADMIN_PASSWORD || "admin123456";

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "admin" },
    create: {
      email,
      name: "Admin",
      role: "admin",
      passwordHash: await bcrypt.hash(password, 10),
      subscription: {
        create: {
          status: "active",
          plan: "premium_pkr",
          currency: "PKR",
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  // Deactivate any leftover demo jobs that point at example.com
  await prisma.job.updateMany({
    where: {
      OR: [
        { applicationUrl: { contains: "example.com" } },
        { source: "manual", externalId: { startsWith: "seed-" } },
      ],
    },
    data: { isActive: false },
  });

  console.log(`Seeded admin ${admin.email} (no demo jobs — use Himalayas import)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
