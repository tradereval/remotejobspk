export const USER_AGENT = "RemoteJobsPK/1.0 (hello@remotejobspk.com)";

const nextAllowed = new Map<string, number>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pace(host: string, gapMs: number) {
  const wait = (nextAllowed.get(host) || 0) - Date.now();
  if (wait > 0) await sleep(wait);
  nextAllowed.set(host, Date.now() + gapMs);
}

export async function fetchText(url: string, gapMs = 1200): Promise<string> {
  const host = new URL(url).host;
  let lastError = `Fetch failed ${host}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    await pace(host, gapMs);
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json, application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
          "User-Agent": USER_AGENT,
        },
        cache: "no-store",
        redirect: "follow",
        signal: AbortSignal.timeout(45_000),
      });
      if (res.status === 429 || res.status === 502 || res.status === 503) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const waitMs =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter, 120) * 1000
            : Math.min(30_000, 1500 * 2 ** attempt);
        console.log(`${host} ${res.status}, waiting ${waitMs}ms`);
        await sleep(waitMs);
        nextAllowed.set(host, Date.now() + Math.max(gapMs, waitMs));
        lastError = `${host} ${res.status}`;
        continue;
      }
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`${host} ${res.status}: ${text.slice(0, 160)}`);
      }
      return text;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith(`${host} `)) throw error;
      lastError = error instanceof Error ? error.message : lastError;
      await sleep(Math.min(20_000, 1000 * 2 ** attempt));
    }
  }
  throw new Error(lastError);
}

export async function fetchJson<T>(url: string, gapMs = 1200): Promise<T> {
  const text = await fetchText(url, gapMs);
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<")) {
    throw new Error(`Expected JSON from ${new URL(url).host}`);
  }
  return JSON.parse(text) as T;
}
