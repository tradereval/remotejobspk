import { NextResponse } from "next/server";
import { createSession, destinationFor } from "@/lib/auth";
import { sendWelcome } from "@/lib/email";
import { finishGoogleAuth } from "@/lib/google-auth";
import { syncLeadToSpreadsheet, userToLeadPayload } from "@/lib/leads-sheet";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Google sign-in was cancelled.")}`, request.url),
    );
  }
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const result = await finishGoogleAuth(code, state);
  if ("error" in result) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(result.error)}`, request.url),
    );
  }

  if (result.created) {
    await syncLeadToSpreadsheet(
      userToLeadPayload(result.user, "signup", "Signed up with Google. Profile still needed."),
    );
    await sendWelcome(result.user);
  }

  await createSession(result.user);
  const dest = destinationFor(result.user, result.next);
  return NextResponse.redirect(new URL(dest, request.url));
}
