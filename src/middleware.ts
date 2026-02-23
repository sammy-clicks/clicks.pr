import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");

async function getRole(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("clicks_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload as any).role ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = await getRole(req);

  // Unauthenticated → login
  if (!role) {
    const login = req.nextUrl.clone();
    login.pathname = "/auth/login";
    return NextResponse.redirect(login);
  }

  // /u/* requires USER (ADMIN may also browse)
  if (pathname.startsWith("/u/") && role !== "USER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL(roleHome(role), req.url));
  }

  // /v/* requires VENUE (ADMIN may also browse)
  if (pathname.startsWith("/v/") && role !== "VENUE" && role !== "ADMIN") {
    return NextResponse.redirect(new URL(roleHome(role), req.url));
  }

  // /admin/* requires ADMIN only
  if (pathname.startsWith("/admin/") && role !== "ADMIN") {
    return NextResponse.redirect(new URL(roleHome(role), req.url));
  }

  return NextResponse.next();
}

function roleHome(role: string): string {
  if (role === "VENUE") return "/v/dashboard";
  if (role === "ADMIN") return "/admin/analytics";
  return "/u/zones";
}

export const config = {
  matcher: ["/u/:path*", "/v/:path*", "/admin/:path*"],
};
