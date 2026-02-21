import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Use the public-facing host rather than the internal Render port
  const fwdHost  = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto") ?? "https";
  const origin   = fwdHost
    ? `${fwdProto}://${fwdHost}`
    : new URL(req.url).origin;

  const res = NextResponse.redirect(new URL("/", origin));
  res.cookies.set("clicks_token", "", { httpOnly: true, expires: new Date(0), path: "/" });
  return res;
}
