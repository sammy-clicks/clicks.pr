import Link from "next/link";

export default function RoleGate() {
  return (
    <div className="container">
      <h2>Choose role</h2>
      <div className="row">
        <Link className="btn" href="/auth/signup?role=USER">I want to go out</Link>
        <Link className="btn secondary" href="/auth/login?role=VENUE">I manage a venue</Link>
        <Link className="btn secondary" href="/auth/login?role=ADMIN">Admin</Link>
      </div>
    </div>
  );
}
