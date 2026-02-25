"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

const TYPE_COLORS: Record<string, string> = {
  BAR: "#8b5cf6", CLUB: "#ec4899", RESTAURANT: "#f59e0b",
  LOUNGE: "#06b6d4", ROOFTOP: "#22c55e", OTHER: "#94a3b8",
};

export default function Vote() {
  const [data, setData] = useState<any>(null);
  const [idx, setIdx] = useState(0);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    const r = await fetch("/api/vote");
    const j = await r.json();
    setData(j);
    setMyVote(j.userVote ?? null);
    if (j.userVote) setShowResults(true);
  }
  useEffect(() => { load(); }, []);

  async function castVote(venueId: string) {
    if (submitting) return;
    setSubmitting(true); setMsg("");
    const r = await fetch("/api/vote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ venueId }) });
    const j = await r.json();
    setSubmitting(false);
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setMyVote(venueId);
    setShowResults(true);
    await load();
  }

  if (!data) return (
    <div className="container">
      <Nav role="u" />
      <p className="muted">Loading…</p>
    </div>
  );

  const allVenues: any[] = data.venues ?? [];
  const venues: any[] = search.trim()
    ? allVenues.filter(v => v.name.toLowerCase().includes(search.trim().toLowerCase()))
    : allVenues;
  const results: any[] = data.results ?? [];
  const current = venues[idx];
  const total = venues.length;
  const maxVotes = results[0]?.votes || 1;

  return (
    <div className="container">
      <div className="header">
        <h2>Weekly Vote</h2>
        <span className="badge">Week {data.week.week} · {data.week.year}</span>
      </div>
      <Nav role="u" />

      {!showResults ? (
        <>
          <div style={{ marginBottom: 14 }}>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setIdx(0); }}
              placeholder="Search venues…"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>

          {venues.length === 0 && (
            <p className="muted">{search ? `No venues match "${search}".` : "No venues available to vote on."}</p>
          )}

          {current && (
            <div style={{ marginBottom: 20 }}>
              {/* Card */}
              <div style={{ borderRadius: 20, overflow: "hidden", background: "var(--surface)", border: "1.5px solid var(--border)", marginBottom: 12, position: "relative" }}>
                {/* Image */}
                {current.venueImageUrl
                  ? <img src={current.venueImageUrl} alt={current.name} style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
                  : <div style={{ width: "100%", height: 220, background: `linear-gradient(135deg, ${TYPE_COLORS[current.type] ?? "#8b5cf6"}33, rgba(8,12,18,0.8))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64 }}>
                      {current.type === "BAR" ? "🍺" : current.type === "CLUB" ? "🎵" : current.type === "RESTAURANT" ? "🍽️" : current.type === "ROOFTOP" ? "🌆" : current.type === "LOUNGE" ? "🥂" : "📍"}
                    </div>
                }
                {/* Type badge */}
                <div style={{ position: "absolute", top: 12, left: 14, background: `${TYPE_COLORS[current.type] ?? "#8b5cf6"}cc`, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#fff", backdropFilter: "blur(4px)" }}>
                  {current.type}
                </div>
                {/* Counter */}
                <div style={{ position: "absolute", top: 12, right: 14, background: "rgba(0,0,0,0.55)", borderRadius: 8, padding: "3px 10px", fontSize: 11, color: "#fff", backdropFilter: "blur(4px)" }}>
                  {idx + 1} / {total}
                </div>

                <div style={{ padding: "16px 18px 18px" }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: 20 }}>{current.name}</h3>

                  {/* Already voted indicator */}
                  {myVote === current.id && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#22c55e22", border: "1px solid #22c55e66", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#22c55e", fontWeight: 700, marginBottom: 8 }}>
                      ✓ Your current vote
                    </div>
                  )}

                  <button className="btn"
                    style={{ width: "100%", marginTop: 6, background: myVote === current.id ? "#22c55e" : "var(--venue-brand, #8b5cf6)", color: "#fff", fontWeight: 700, fontSize: 15 }}
                    onClick={() => castVote(current.id)} disabled={submitting}>
                    {submitting ? "Voting…" : myVote === current.id ? "Voted! Change vote" : "Vote for this venue"}
                  </button>
                  {msg && <p style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>{msg}</p>}
                </div>
              </div>

              {/* Nav arrows */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <button className="btn secondary" style={{ flex: 1, fontSize: 18 }} onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>←</button>
                {/* Dots */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center" }}>
                  {venues.map((_: any, i: number) => (
                    <div key={i} onClick={() => setIdx(i)} style={{ width: 8, height: 8, borderRadius: "50%", background: i === idx ? "#8b5cf6" : "rgba(255,255,255,0.15)", cursor: "pointer", transition: "background 0.2s" }} />
                  ))}
                </div>
                <button className="btn secondary" style={{ flex: 1, fontSize: 18 }} onClick={() => setIdx(i => Math.min(total - 1, i + 1))} disabled={idx === total - 1}>→</button>
              </div>

              {myVote && (
                <div style={{ marginTop: 14, textAlign: "center" }}>
                  <button className="btn secondary" onClick={() => setShowResults(true)} style={{ fontSize: 13 }}>
                    See current results →
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
            <h3 style={{ margin: 0 }}>This Week's Results</h3>
            <button className="btn secondary" style={{ fontSize: 12 }} onClick={() => { setShowResults(false); setIdx(0); }}>Change vote</button>
          </div>

          {results.length === 0
            ? <p className="muted">No votes yet.</p>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {results.map((r: any, i: number) => {
                  const pct = Math.max(2, Math.round((r.votes / maxVotes) * 100));
                  const isMyVote = myVote === r.venueId;
                  return (
                    <div key={r.venueId} style={{ borderRadius: 12, background: "var(--surface)", border: `1px solid ${isMyVote ? "#22c55e66" : "var(--border)"}`, padding: "12px 14px", position: "relative", overflow: "hidden" }}>
                      {/* Bar background */}
                      <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: isMyVote ? "#22c55e14" : "rgba(139,92,246,0.07)", borderRadius: 12 }} />
                      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, minWidth: 20, color: i === 0 ? "#f59e0b" : "var(--muted-text)" }}>#{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{r.venueName}</div>
                          {isMyVote && <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>✓ Your vote</div>}
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 15, color: i === 0 ? "#f59e0b" : "var(--ink)" }}>{r.votes}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </>
      )}
    </div>
  );
}
