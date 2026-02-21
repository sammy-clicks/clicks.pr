import Link from "next/link";

export default function RoleGate() {
  return (
    <div className="container">
      <h2>Welcome</h2>
      <p className="muted" style={{ marginBottom: 24 }}>What brings you here tonight?</p>
      <div className="row">
        <Link className="btn" href="/auth/signup?role=USER">I want to go out</Link>
        <Link className="btn secondary" href="/auth/login?role=VENUE">I manage a venue</Link>
        <Link className="btn secondary" href="/auth/login?role=ADMIN">Admin</Link>
      </div>
    </div>
  );
}
