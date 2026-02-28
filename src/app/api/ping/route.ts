import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
// Lightweight health/wake-up endpoint — called on every page load to prevent cold-start delays
export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
