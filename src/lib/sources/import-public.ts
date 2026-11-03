import { prisma } from "../db";
import { buildJobWhere } from "../jobs";
import { importArbeitnowJobs } from "./arbeitnow";
import { importJobicyJobs } from "./jobicy";
import { importRemoteOkJobs } from "./remoteok";
import { SKIPPED_JOB_SOURCES } from "./skipped";
import type { SourceImportReport } from "./types";
import { importWeWorkRemotelyJobs } from "./weworkremotely";

const IMPORTERS: Array<[string, () => Promise<SourceImportReport>]> = [
  ["remoteok", importRemoteOkJobs],
  ["jobicy", importJobicyJobs],
  ["weworkremotely", importWeWorkRemotelyJobs],
  ["arbeitnow", importArbeitnowJobs],
];

export async function importPublicJobSources(options?: { only?: string[] }): Promise<{
  sources: SourceImportReport[];
  skipped: typeof SKIPPED_JOB_SOURCES;
}> {
  const only = options?.only;
  const sources: SourceImportReport[] = [];
  for (const [name, run] of IMPORTERS) {
    if (only && !only.includes(name)) continue;
    try {
      sources.push(await run());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed";
      console.error(`${name} import failed`, message);
      sources.push({
        source: name,
        fetched: 0,
        kept: 0,
        dropped: { onsite: 0, non_usd: 0, wrong_country: 0, expired: 0 },
        upserted: 0,
        failed: 1,
        note: message,
      });
    }
  }
  return { sources, skipped: SKIPPED_JOB_SOURCES };
}

export async function jobCountSummary() {
  const sources = ["himalayas", "remoteok", "jobicy", "arbeitnow", "weworkremotely"];
  const [active, board, activeBySource, visibleCounts] = await Promise.all([
    prisma.job.count({ where: { isActive: true } }),
    prisma.job.count({ where: buildJobWhere({}) }),
    prisma.job.groupBy({
      by: ["source"],
      where: { isActive: true },
      _count: true,
    }),
    Promise.all(
      sources.map(async (source) => {
        const visible = await prisma.job.count({
          where: { AND: [buildJobWhere({}), { source }] },
        });
        return [source, visible] as const;
      }),
    ),
  ]);
  return {
    active,
    board,
    activeBySource,
    visibleBySource: Object.fromEntries(visibleCounts),
  };
}
