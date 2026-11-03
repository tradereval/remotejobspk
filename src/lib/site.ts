const PUBLIC_SITE = "https://www.remotejobspk.com";

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Links inside outbound email. Never a localhost address. */
export function emailSiteUrl() {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (!configured || /localhost|127\.0\.0\.1/i.test(configured)) return PUBLIC_SITE;
  return configured;
}

export function safeNextPath(value: string | null | undefined, fallback = "/account") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
