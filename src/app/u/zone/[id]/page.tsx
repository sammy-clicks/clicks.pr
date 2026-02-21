import Link from "next/link";
import { Nav } from "@/components/Nav";

async function getZone(id: string) {
  const res = await fetch(`http://localhost:3000/api/zones/${id}`, { cache: "no-store" });
  return await res.json();
}

export default async function ZonePage({ params }: { params: { id: string } }) {
  const data = await getZone(params.id);
  return (
    <div className="container">
      <div className="header">
        <h2>{data.zone.name}</h2>
        <span className="badge">{data.zone.activeUsers} active</span>
      </div>
      <Nav role="u" />

      <div className="row">
        {data.venues.map((v: any) => (
          <div key={v.id} className="card" style={{flex:"1 1 320px"}}>
            <div className="header">
              <strong>{v.name}</strong>
              <span className="badge">{v.type}</span>
            </div>
            <p className="muted">{v.description || ""}</p>
            <p className="muted">Crowd: {v.crowdLevel}/10</p>
            <div className="row">
              <Link className="btn" href={`/u/venue/${v.id}`}>View</Link>
              <a className="btn secondary" href={`https://www.google.com/maps?q=${v.lat},${v.lng}`} target="_blank">Maps</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
