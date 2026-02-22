import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/u/zones", req.url));
  res.cookies.set("clicks_guest", "1", {
    path: "/",
    maxAge: 86400,   // 24 h
    httpOnly: false, // readable by client so GuestModeProvider can detect it
    sameSite: "lax",
  });
  return res;
}
