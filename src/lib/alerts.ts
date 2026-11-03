import { prisma } from "./db";
import { sendJobAlert } from "./email";
import { buildJobWhere } from "./jobs";
import type { JobFilters } from "./types";

function parseQuery(raw: string): JobFilters {
  try {
    const parsed = JSON.parse(raw) as JobFilters;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function sendDueAlerts() {
  const searches = await prisma.savedSearch.findMany({
    where: { alertFrequency: "daily" },
    include: { user: { include: { subscription: true } } },
  });

  let sent = 0;
  let skipped = 0;

  for (const search of searches) {
    const since = search.lastAlertedAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filters = parseQuery(search.queryJson);
    const jobs = await prisma.job.findMany({
      where: buildJobWhere(filters, { publishedAfter: since }),
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: { id: true, title: true, company: true },
    });

    await prisma.savedSearch.update({
      where: { id: search.id },
      data: { lastAlertedAt: new Date() },
    });

    if (jobs.length === 0) {
      skipped += 1;
      continue;
    }

    const result = await sendJobAlert(search.user, search.name || "Saved search", jobs);
    if (result.sent) sent += 1;
    else skipped += 1;
  }

  return { sent, skipped, checked: searches.length };
}
