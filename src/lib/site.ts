const PUBLIC_SITE = "https://www.remotejobspk.com";

/** Runtime read. Next inlines a direct `process.env.NEXT_PUBLIC_*` access at build time. */
function runtimeEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function siteUrl() {
  return (runtimeEnv("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000").replace(/\/$/, "");
}

/** Links inside outbound email. Never a localhost address. */
export function emailSiteUrl() {
  const configured = (runtimeEnv("SITE_URL") || runtimeEnv("NEXT_PUBLIC_SITE_URL")).replace(/\/$/, "");
  if (!configured || /localhost|127\.0\.0\.1/i.test(configured)) return PUBLIC_SITE;
  return configured;
}

export function safeNextPath(value: string | null | undefined, fallback = "/account") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
