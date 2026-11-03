import { redirect } from "next/navigation";
import { destinationFor, getCurrentUser, profileComplete } from "@/lib/auth";
import { jobsAskPath } from "@/lib/ask";

export default async function FindPage({
  searchParams,
}: {
  searchParams: Promise<{ ask?: string }>;
}) {
  const ask = String((await searchParams).ask || "").trim();
  if (ask.length < 8) redirect("/");
  const user = await getCurrentUser();
  if (!user) redirect(`/signup?ask=${encodeURIComponent(ask.slice(0, 500))}`);
  if (!user.emailVerifiedAt || !profileComplete(user)) redirect(destinationFor(user, jobsAskPath(ask)));
  redirect(jobsAskPath(ask));
}
