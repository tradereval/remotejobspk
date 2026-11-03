export type ApplyCta = {
  label: string;
  sourceName: string | null;
  sourceHome: string | null;
};

function hostname(applicationUrl: string): string {
  try {
    return new URL(applicationUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function hostIs(host: string, root: string): boolean {
  return host === root || host.endsWith(`.${root}`);
}

/** Honest apply label. Himalayas stays "Apply on Himalayas" only when the link is on himalayas.app. */
export function applyCta(source: string, applicationUrl: string): ApplyCta {
  const host = hostname(applicationUrl);
  if (hostIs(host, "himalayas.app")) {
    return { label: "Apply on Himalayas", sourceName: "Himalayas", sourceHome: "https://himalayas.app" };
  }
  if (source === "remoteok" || hostIs(host, "remoteok.com")) {
    return { label: "Apply on Remote OK", sourceName: "Remote OK", sourceHome: "https://remoteok.com" };
  }
  if (source === "jobicy" || hostIs(host, "jobicy.com")) {
    return { label: "Apply on Jobicy", sourceName: "Jobicy", sourceHome: "https://jobicy.com" };
  }
  if (source === "arbeitnow" || hostIs(host, "arbeitnow.com")) {
    return { label: "Apply on Arbeitnow", sourceName: "Arbeitnow", sourceHome: "https://www.arbeitnow.com" };
  }
  if (source === "weworkremotely" || hostIs(host, "weworkremotely.com")) {
    return {
      label: "Apply on We Work Remotely",
      sourceName: "We Work Remotely",
      sourceHome: "https://weworkremotely.com",
    };
  }
  if (source === "himalayas") {
    return { label: "Apply now", sourceName: "Himalayas", sourceHome: "https://himalayas.app" };
  }
  return { label: "Apply now", sourceName: null, sourceHome: null };
}
