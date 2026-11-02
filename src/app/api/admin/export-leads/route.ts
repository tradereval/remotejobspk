import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

function csvEscape(value: string | null | undefined) {
  const v = value ?? "";
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { subscription: true },
  });

  const header = [
    "CreatedAt",
    "UserId",
    "Name",
    "Email",
    "Phone",
    "City",
    "State",
    "Qualification",
    "Specialty",
    "Role",
    "Plan",
    "SubscriptionStatus",
    "PeriodEnd",
  ];

  const lines = [header.join(",")];
  for (const u of users) {
    const premium =
      u.subscription?.status === "active"
        ? u.subscription.plan || "premium"
        : "";
    lines.push(
      [
        u.createdAt.toISOString(),
        u.id,
        csvEscape(u.name),
        csvEscape(u.email),
        csvEscape(u.phone),
        csvEscape(u.city),
        csvEscape(u.state),
        csvEscape(u.qualification),
        csvEscape(u.specialty),
        u.role,
        csvEscape(premium),
        csvEscape(u.subscription?.status || "inactive"),
        u.subscription?.currentPeriodEnd?.toISOString() || "",
      ].join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="remotejobspk-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
