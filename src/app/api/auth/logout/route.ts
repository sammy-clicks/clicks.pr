import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const res = NextResponse.redirect(new URL("/", "http://localhost:3000"));
  res.cookies.set("clicks_token", "", { httpOnly: true, expires: new Date(0), path: "/" });
  return res;
}
