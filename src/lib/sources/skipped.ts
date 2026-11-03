/** Sources checked and not imported. Reasons are from their public terms, read before any fetch of listings. */
export const SKIPPED_JOB_SOURCES = [
  {
    source: "remotive",
    reason:
      "Remotive's API terms forbid submitting their jobs to third-party websites and say that displaying listings in order to collect signups or email addresses is a breach. RemoteJobsPK is another job board with accounts, so Remotive is not imported.",
  },
  {
    source: "workingnomads",
    reason:
      "Working Nomads' terms prohibit using the service to build a competitive product and do not grant a licence to republish listings. A public JSON endpoint is not permission to put those jobs on this board.",
  },
  {
    source: "flexjobs",
    reason: "FlexJobs is a paid board and does not publish a public JSON or RSS feed.",
  },
] as const;
