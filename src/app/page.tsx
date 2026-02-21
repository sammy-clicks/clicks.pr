import Link from "next/link";

export default function Page() {
  return (
    <div className="container">
      <div className="header">
        <h1>Clicks V1</h1>
        <span className="badge">PWA starter</span>
      </div>
      <p className="muted">Role gate → auth → user/venue/admin surfaces.</p>
      <div className="row">
        <Link className="btn" href="/role">Open</Link>
        <Link className="btn secondary" href="/auth/login">Login</Link>
        <Link className="btn secondary" href="/auth/signup">Signup</Link>
      </div>
    </div>
  );
}
