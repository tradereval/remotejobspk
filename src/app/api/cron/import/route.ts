import { NextResponse } from "next/server";
import { importHimalayasJobs } from "@/lib/himalayas";
import { importPublicJobSources, jobCountSummary } from "@/lib/sources/import-public";
import { SKIPPED_JOB_SOURCES } from "@/lib/sources/skipped";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const only = new URL(request.url).searchParams
    .getAll("only")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  const selected = only.length ? only : null;
  const wantHimalayas = !selected || selected.includes("himalayas");
  const publicOnly = selected ? selected.filter((name) => name !== "himalayas") : undefined;

  const sources = [];
  if (wantHimalayas) {
    try {
      const himalayas = await importHimalayasJobs();
      sources.push({ source: "himalayas", ...himalayas });
    } catch (error) {
      sources.push({
        source: "himalayas",
        error: error instanceof Error ? error.message : "Import failed",
      });
    }
  }

  try {
    const extra = await importPublicJobSources(publicOnly ? { only: publicOnly } : undefined);
    sources.push(...extra.sources);
    const counts = await jobCountSummary();
    const himalayasFailed = sources.some((item) => item.source === "himalayas" && "error" in item);
    return NextResponse.json({
      ok: !himalayasFailed,
      sources,
      skipped: SKIPPED_JOB_SOURCES,
      ...counts,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, sources, error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 },
    );
  }
}
