import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { importHimalayasJobs } from "@/lib/himalayas";
import { buildJobWhere } from "@/lib/jobs";

const globalForImport = globalThis as typeof globalThis & {
  __himalayasImport?: Promise<unknown> | null;
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (globalForImport.__himalayasImport) {
    return NextResponse.json({ ok: true, started: false, alreadyRunning: true });
  }

  // Browse is thousands of pages. Keep the walk alive after this response.
  const pending = importHimalayasJobs()
    .then(async (result) => {
      const [board, active] = await Promise.all([
        prisma.job.count({ where: buildJobWhere({}) }),
        prisma.job.count({ where: { isActive: true } }),
      ]);
      console.log("Himalayas import finished", JSON.stringify({ ...result, active, board }));
      return result;
    })
    .catch((error) => {
      console.error("Himalayas import failed", error instanceof Error ? error.message : "Import failed");
    })
    .finally(() => {
      if (globalForImport.__himalayasImport === pending) globalForImport.__himalayasImport = null;
    });
  globalForImport.__himalayasImport = pending;

  return NextResponse.json({ ok: true, started: true });
}
