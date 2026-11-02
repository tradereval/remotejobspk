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

  const samples = [
    {
      externalId: "seed-1",
      title: "Remote Full-Stack Engineer",
      company: "Sample Co",
      applicationUrl: "https://example.com/apply/fullstack",
      eligibility: "worldwide",
      seniority: "mid",
      description: "<p>Build product features for a distributed team. Pakistan applicants welcome.</p>",
      isVerified: true,
      needsReview: false,
      categories: JSON.stringify(["Engineering", "Full-stack"]),
    },
    {
      externalId: "seed-2",
      title: "Customer Support Specialist",
      company: "HelpDesk Asia",
      applicationUrl: "https://example.com/apply/support",
      eligibility: "pakistan",
      seniority: "entry",
      description: "<p>Support customers across APAC. Explicitly hiring in Pakistan.</p>",
      isVerified: true,
      needsReview: false,
      acceptsBeginners: true,
      categories: JSON.stringify(["Support", "Customer Success"]),
    },
    {
      externalId: "seed-3",
      title: "Senior Product Designer",
      company: "DesignLab",
      applicationUrl: "https://example.com/apply/design",
      eligibility: "worldwide",
      seniority: "senior",
      description: "<p>Lead product design for a SaaS platform. Work from anywhere.</p>",
      isVerified: true,
      needsReview: false,
      categories: JSON.stringify(["Design", "Product"]),
    },
  ];

  for (const sample of samples) {
    await prisma.job.upsert({
      where: { source_externalId: { source: "manual", externalId: sample.externalId } },
      update: {},
      create: {
        source: "manual",
        ...sample,
        excerpt: sample.description.replace(/<[^>]+>/g, "").slice(0, 160),
        publishedAt: new Date(),
        isActive: true,
        skills: JSON.stringify([]),
      },
    });
  }

  console.log(`Seeded admin ${admin.email} and ${samples.length} sample jobs`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
