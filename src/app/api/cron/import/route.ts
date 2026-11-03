import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { importHimalayasJobs } from "@/lib/himalayas";
import { buildJobWhere } from "@/lib/jobs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await importHimalayasJobs();
    const [board, active] = await Promise.all([
      prisma.job.count({ where: buildJobWhere({}) }),
      prisma.job.count({ where: { isActive: true } }),
    ]);
    return NextResponse.json({ ok: true, ...result, active, board });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 },
    );
  }
}
