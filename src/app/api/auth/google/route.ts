import { NextResponse } from "next/server";
import { beginGoogleAuth } from "@/lib/google-auth";
import { safeNextPath } from "@/lib/site";

export async function GET(request: Request) {
  const next = safeNextPath(new URL(request.url).searchParams.get("next"), "/account");
  const url = await beginGoogleAuth(next);
  if (!url) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Google sign-in is not set up yet.")}`, request.url),
    );
  }
  return NextResponse.redirect(url);
}
