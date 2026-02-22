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
    <div className="container">
      <h2>Welcome to Clicks</h2>
      <p className="muted" style={{ marginBottom: 24 }}>What brings you here tonight?</p>
      <div className="row">
        <Link className="btn" href="/auth/signup">Create account</Link>
        <Link className="btn secondary" href="/auth/login">I already have an account</Link>
      </div>
      <p className="muted" style={{ marginTop: 32, fontSize: 12 }}>
        Venue or admin access? <Link href="/auth/login" style={{ color: "var(--accent)" }}>Log in</Link>
      </p>
    </div>
  );
}
