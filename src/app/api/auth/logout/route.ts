import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set("clicks_token", "", { httpOnly: true, expires: new Date(0), path: "/" });
  return res;
}
