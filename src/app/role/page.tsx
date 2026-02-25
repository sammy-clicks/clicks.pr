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
      else redirect("/u/dashboard");
    } catch { /* invalid token — fall through to welcome */ }
  }

  return (
    <div className="auth-bg">
      <div className="auth-inner">
        {/* Flow diagram — first thing people see */}
        <div style={{ width: "100%", overflowX: "auto", marginBottom: 32, paddingBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: "max-content", margin: "0 auto", justifyContent: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/flow-1.png" alt="Step 1" style={{ width: 130, height: "auto", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }} />
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
              <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/flow-2.png" alt="Step 2" style={{ width: 130, height: "auto", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }} />
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
              <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/flow-3.png" alt="Step 3" style={{ width: 130, height: "auto", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }} />
          </div>
        </div>

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

        {/* Copyright */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/copyright.png" alt="© Clicks" className="auth-copyright" />
      </div>
    </div>
  );
}
