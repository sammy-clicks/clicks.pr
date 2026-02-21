import Link from "next/link";
import { Nav } from "@/components/Nav";

async function getZones() {
  const res = await fetch(process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/zones` : "http://localhost:3000/api/zones", { cache: "no-store" });
  return await res.json();
}

export default async function Zones() {
  const data = await getZones();
  return (
    <div className="container">
      <div className="header">
        <h2>Zones</h2>
        <span className="badge">{data.weekLabel}</span>
      </div>
      <Nav role="u" />
      <p className="muted">Dominant zone is highlighted. Isla Verde is disabled by policy.</p>

      <div className="row">
        {data.zones.map((z: any) => (
          <div key={z.id} className="card" style={{flex:"1 1 280px", opacity: z.isEnabled ? 1 : 0.5}}>
            <div className="header">
              <strong>{z.name}</strong>
              {z.isDominant && <span className="badge">Dominant</span>}
            </div>
            <p className="muted">{z.activeUsers} active</p>
            {!z.isEnabled && <p className="muted">{z.disabledReason || "Disabled"}</p>}
            {z.isEnabled ? (
              <Link className="btn" href={`/u/zone/${z.id}`}>Open</Link>
            ) : (
              <span className="badge">Disabled</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
