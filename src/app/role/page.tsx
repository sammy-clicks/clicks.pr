import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");

export default async function RoleGate() {
  // Redirect already-authenticated users straight to their surface
  const token = cookies().get("clicks_token")?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      const role = (payload as any).role as string | undefined;
      if (role === "ADMIN") redirect("/admin/analytics");
      else if (role === "VENUE") redirect("/v/dashboard");
      else redirect("/u/zones");
    } catch { /* invalid token — fall through to welcome */ }
  }

  return (
    <div className="auth-bg">
      <div className="auth-inner">
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Clicks" className="auth-logo" />
        <p className="auth-tagline">Puerto Rico&apos;s nightlife radar</p>

        {/* CTAs */}
        <div className="auth-btn-group">
          <Link href="/auth/signup" className="auth-btn-primary">
            Create account
          </Link>
          <Link href="/auth/login" className="auth-btn-secondary">
            I already have an account
          </Link>
        </div>

        <p className="auth-role-note">
          Venue or admin access?{" "}
          <Link href="/auth/login">Log in</Link>
        </p>

        <a href="/api/auth/guest" className="auth-guest-link">
          Continue as guest
        </a>

        {/* Copyright */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/copyright.png" alt="© Clicks" className="auth-copyright" />
      </div>
    </div>
  );
}
